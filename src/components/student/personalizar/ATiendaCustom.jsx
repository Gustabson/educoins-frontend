import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../../api";
import { useTheme } from "../../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../../shared/index";


function ATiendaCustom({me,balance,showToast,refreshBalance,onBack,onCustomChange,onThemeChange,onDarkChange,currentThemeId,isDark,currentPrimary}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
  const [sec,setSec]     = useState("pantalla");  // pantalla|texto|colores|emojis|efectos|apodo
  const [items,setItems] = useState([]);
  const [owned,setOwned]   = useState([]);
  const [active,setActive]  = useState(null);
  const [subs,setSubs]      = useState([]);
  const [gifts,setGifts]   = useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]  = useState(null);
  const [preview,setPreview]= useState(null); // item en preview temporal
  const [giftOpen,setGiftOpen]=useState(null);
  const [giftTo,setGiftTo]  = useState("");
  const [giftMsg,setGiftMsg]= useState("");

  // originalPrimaryRef — guardamos el color REAL al montar para restaurar al salir
  const originalPrimaryRef = useRef(currentPrimary);

  // Al salir, siempre restaurar el color real (borrar preview)
  const handleBack = () => {
    if(onThemeChange) onThemeChange(null, originalPrimaryRef.current, false); // restaura real
    onBack();
  };

  const SECS=[["pantalla","🖥️ Pantalla"],["texto","✍️ Estilo"],["colores","🖊️ Nombres"],["emojis","😄 Emojis"],["efectos","✨ Efectos"],["apodo","🏷️ Apodo"]];

  const loadAll=async()=>{
    setLoading(true);
    try{
      const [shop,me2,g,mysubs]=await Promise.all([
        api.customShop(), api.customMe(), api.customGifts(), api.mySubscriptions()
      ]);
      setItems(Array.isArray(shop)?shop:shop.data||[]);
      setOwned((me2.data||me2)?.owned||[]);
      setActive((me2.data||me2)?.active||null);
      setGifts((g.data||g||[]).filter(x=>!x.leido));
      setSubs((mysubs.data||mysubs||[]));
    }catch(e){}
    setLoading(false);
  };
  useEffect(()=>{ loadAll(); },[]);

  // Helper: días restantes de suscripción de un item
  const diasRestantes=(item_nombre)=>{
    const sub=subs.find(s=>s.item_nombre===item_nombre);
    if(!sub) return null;
    const diff=new Date(sub.next_charge)-new Date();
    return Math.max(0,Math.ceil(diff/86400000));
  };

  const comprar=async(item)=>{
    if(item.precio>balance){showToast("Saldo insuficiente","error");return;}
    setBuying(item.id);
    try{
      await api.customBuy(item.id);
      showToast(`Compraste: ${item.nombre} ✅`);
      await refreshBalance();
      await loadAll();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  const suscribir=async(item,periodo="monthly")=>{
    const precio=item.precio_mensual??item.precio??0;
    if(precio>balance){showToast("Saldo insuficiente","error");return;}
    setBuying(item.id);
    try{
      await api.subscribe(item.id,periodo);
      showToast(`Suscripción activada: ${item.nombre} ✅`);
      await refreshBalance();
      await loadAll();
      const d=await api.customEquip("theme",item.id);
      const newActive=d.data||d;
      setActive(newActive);
      if(onCustomChange) onCustomChange(newActive);
      // Aplicar color directo
      if(onThemeChange){
        const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
        onThemeChange(null, cfg.primary||null);
      }
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  const equipar=async(tipo,item_id)=>{
    const isActive=active?.[`${tipo}_id`]===item_id;
    try{
      const d=await api.customEquip(tipo,isActive?null:item_id);
      const newActive=d.data||d;
      setActive(newActive);
      setPreview(null);
      if(onCustomChange) onCustomChange(newActive);
      if(tipo==="theme"){
        if(!isActive&&onThemeChange){
          // Intentar leer primary del response del servidor (más confiable)
          let primary = null;
          if(newActive?.theme_config){
            const tc=typeof newActive.theme_config==="string"?JSON.parse(newActive.theme_config||"{}"):newActive.theme_config;
            primary = tc?.primary||null;
          }
          // Fallback: leer del item local
          if(!primary){
            const tItem=items.find(i=>i.id===item_id);
            if(tItem){
              const cfg=typeof tItem.config==="string"?JSON.parse(tItem.config||"{}"):tItem.config||{};
              primary = cfg.primary||null;
            }
          }
          if(primary){
            onThemeChange(null, primary);
            originalPrimaryRef.current = primary;
          }
        } else if(isActive&&onThemeChange){
          onThemeChange("oceano",null);
          originalPrimaryRef.current = null;
        }
      }
      showToast(isActive?"Desequipado":"Equipado ✅");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const regalar=async()=>{
    if(!giftTo.trim()){showToast("Ingresá el ID del destinatario","error");return;}
    try{
      await api.customGift({to_user_id:giftTo.trim(),item_id:giftOpen.id,mensaje:giftMsg.trim()||null});
      showToast(`Regalaste ${giftOpen.nombre}! 🎁`);
      setGiftOpen(null);setGiftTo("");setGiftMsg("");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const ownedIds=new Set(owned.map(o=>o.id));

  const filteredItems=items.filter(i=>{
    if(sec==="pantalla") return false; // sección especial
    if(sec==="texto")    return false; // sección especial
    if(sec==="colores")  return i.tipo==="name_color";
    if(sec==="emojis")   return i.tipo==="emoji_pack";
    if(sec==="efectos")  return ["title_effect","name_effect","avatar_frame"].includes(i.tipo);
    if(sec==="apodo")    return i.tipo==="nickname";
    return true;
  });

  // Modal de regalo
  if(giftOpen) return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🎁 Regalar" onBack={()=>setGiftOpen(null)}/>
      <div style={{padding:"16px 14px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:16,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:48}}>{giftOpen.preview||"🎁"}</div>
            <div style={{fontWeight:800,color:txt,fontSize:16}}>{giftOpen.nombre}</div>
            <div style={{fontSize:12,color:sub,marginTop:2}}>
              Regalás este item a otro alumno
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:6}}>ID del destinatario</div>
          <input value={giftTo} onChange={e=>setGiftTo(e.target.value)}
            placeholder="Pegá el ID del alumno..."
            style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
              borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:8}}/>
          <textarea value={giftMsg} onChange={e=>setGiftMsg(e.target.value)}
            placeholder="Mensaje opcional..."
            rows={2} style={{width:"100%",boxSizing:"border-box",background:inputBg,
              border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"10px 14px",fontSize:13,
              outline:"none",color:txt,fontFamily:"Nunito,sans-serif",resize:"none",marginBottom:12}}/>
          <button onClick={regalar} style={{width:"100%",background:accent,border:"none",
            borderRadius:50,color:"white",padding:"13px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Enviar regalo 🎁
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🎨 Personalización" onBack={handleBack}/>

      {/* Regalos pendientes */}
      {gifts.length>0&&(
        <div style={{margin:"10px 14px 0",background:dark?"#2d1a4e":"#fff7ed",borderRadius:16,
          padding:"12px 14px",border:`1.5px solid ${accent}44`}}>
          <div style={{fontWeight:800,color:accent,fontSize:13,marginBottom:6}}>
            🎁 {gifts.length} regalo{gifts.length!==1?"s":""} sin leer
          </div>
          {gifts.map(g=>(
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:18}}>{g.item_preview||"🪙"}</span>
              <div style={{flex:1}}>
                <span style={{fontWeight:700,color:txt,fontSize:12}}>{g.from_nombre}</span>
                <span style={{color:sub,fontSize:12}}> te regaló {g.item_nombre||`🪙${g.coins}`}</span>
                {g.mensaje&&<div style={{fontSize:11,color:sub,fontStyle:"italic"}}>"{g.mensaje}"</div>}
              </div>
              <button onClick={()=>api.customGiftRead(g.id).then(loadAll)}
                style={{background:"none",border:"none",color:accent,fontWeight:800,
                  fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>OK</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,
        borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`,margin:"10px 0 0"}}>
        {SECS.map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)}
            style={{flex:1,padding:"10px 2px",background:"none",border:"none",
              fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:sec===id?accent:sub,
              borderBottom:`2.5px solid ${sec===id?accent:"transparent"}`,
              transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"10px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}

        {/* Sección especial de apodo */}
        {sec==="apodo"&&!loading&&<ApodoPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent} inputBg={inputBg} inputBd={inputBd}/>}
        {sec==="foto"&&!loading&&<FotoPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent}/>}
        {sec==="titulo"&&!loading&&<TituloCustomPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent} inputBg={inputBg} inputBd={inputBd}/>}

        {/* Sección de tema de APP — duales primario+secundario */}
        {/* ── SECCIÓN PANTALLA ─────────────────────────────── */}
        {sec==="pantalla"&&!loading&&(
          <div>
            {/* ── Modos de pantalla ─── */}
            <div style={{background:cardBg,borderRadius:18,padding:"14px 16px",marginBottom:12,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt,marginBottom:12}}>🖥️ Modo de pantalla</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>

                {/* Claro y Oscuro — botones grandes con fondo del color del modo */}
                {[
                  {d:false,icon:"☀️",lbl:"Claro",  bg:"#4fc3f7",bgSel:"#0288d1"},
                  {d:true, icon:"🌙",lbl:"Oscuro", bg:"#5e35b1",bgSel:"#311b92"},
                ].map(m=>{
                  const isActive=!active?.screen_mode_id&&isDark===m.d;
                  return(
                    <div key={m.lbl} onClick={()=>{
                      onDarkChange&&onDarkChange(m.d);
                      if(active?.screen_mode_id) equipar("screen_mode",active.screen_mode_id);
                    }}
                      style={{borderRadius:16,overflow:"hidden",cursor:"pointer",
                        background:isActive?m.bgSel:m.bg,
                        border:`2px solid ${isActive?m.bgSel:m.bg}`,
                        boxShadow:isActive?`0 4px 16px ${m.bg}88`:"0 2px 8px rgba(0,0,0,.12)",
                        transition:"all .2s",padding:"22px 10px 14px",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                      <span style={{fontSize:34}}>{m.icon}</span>
                      <span style={{fontWeight:800,fontSize:14,color:"white",
                        textShadow:"0 1px 3px rgba(0,0,0,.3)"}}>{m.lbl}</span>
                      {isActive&&<span style={{fontSize:10,color:"rgba(255,255,255,.8)",fontWeight:700}}>✓ Activo</span>}
                    </div>
                  );
                })}

                {/* Modos de la DB */}
                {items.filter(i=>i.tipo==="screen_mode").map(item=>{
                  const isOwned=ownedIds.has(item.id)||item.precio===0;
                  const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
                  const isActive=active?.screen_mode_id===item.id;
                  const isSub=item.es_suscripcion;
                  const precio=isSub?(item.precio_mensual??item.precio):item.precio;
                  if(cfg.custom) return null;
                  const modeBg = cfg.bg||cfg.pageBg||"#888";
                  const modeBgSel = cfg.card||modeBg;
                  return(
                    <div key={item.id}
                      onClick={()=>{
                        if(isOwned) equipar("screen_mode",item.id);
                        else if(precio>0&&precio<=balance) isSub?suscribir(item,item.periodo_default||"monthly"):comprar(item);
                      }}
                      style={{borderRadius:16,overflow:"hidden",cursor:"pointer",
                        background:isActive?modeBgSel:modeBg,
                        border:`2px solid ${isActive?accent:modeBg}`,
                        boxShadow:isActive?`0 4px 16px ${modeBg}99`:"0 2px 8px rgba(0,0,0,.12)",
                        transition:"all .2s",padding:"22px 10px 14px",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                        position:"relative",opacity:!isOwned&&precio>balance?.5:1}}>
                      {/* Precio si no tiene */}
                      {!isOwned&&precio>0&&(
                        <div style={{position:"absolute",top:6,right:8,
                          background:"rgba(0,0,0,.35)",borderRadius:99,
                          padding:"2px 7px",fontSize:9,color:"white",fontWeight:800}}>
                          {buying===item.id?"...":`🪙${precio}${isSub?"/mes":""}`}
                        </div>
                      )}
                      <span style={{fontSize:32}}>{item.preview||"🖥️"}</span>
                      <span style={{fontWeight:800,fontSize:13,
                        color:cfg.isDark||cfg.dark?"rgba(255,255,255,.9)":"rgba(0,0,0,.75)",
                        textAlign:"center"}}>{item.nombre}</span>
                      {isActive&&<span style={{fontSize:10,fontWeight:700,
                        color:cfg.isDark||cfg.dark?"rgba(255,255,255,.7)":"rgba(0,0,0,.5)"}}>✓ Activo</span>}
                      {!isActive&&isOwned&&<span style={{fontSize:10,fontWeight:600,
                        color:cfg.isDark||cfg.dark?"rgba(255,255,255,.5)":"rgba(0,0,0,.4)"}}>Equipar</span>}
                      {!isOwned&&precio>balance&&<span style={{fontSize:10,fontWeight:600,
                        color:"rgba(255,255,255,.5)"}}>Sin saldo</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Paletas de acento ─── */}
            <div style={{background:cardBg,borderRadius:18,padding:"14px 16px",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt,marginBottom:10}}>🎨 Paleta de acento</div>
              {items.filter(i=>i.tipo==="theme").length===0&&(
                <div style={{textAlign:"center",color:sub,fontSize:12,padding:16}}>Sin paletas configuradas</div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {items.filter(i=>i.tipo==="theme").map(item=>{
                  const isOwned=ownedIds.has(item.id)||item.precio===0||item.precio_mensual===0;
                  const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
                  const isActive=active?.theme_id===item.id;
                  const isSub=item.es_suscripcion;
                  const precio=isSub?(item.precio_mensual??item.precio):item.precio;
                  const isPreviewing=preview?.id===item.id;
                  const dias=diasRestantes(item.nombre);
                  // Colores vibrantes — usar primary y accent/secondary del config
                  const col1=cfg.primary||"#00c1fc";
                  const col2=cfg.accent||cfg.secondary||col1;
                  return(
                    <div key={item.id} style={{borderRadius:16,overflow:"hidden",
                      border:`2px solid ${isActive?col1:isPreviewing?col1+"99":dark?"#2d2a45":"transparent"}`,
                      boxShadow:isActive?`0 4px 16px ${col1}55`:isPreviewing?`0 2px 8px ${col1}44`:"0 2px 8px rgba(0,0,0,.08)",
                      transition:"all .2s",opacity:!isOwned&&precio>0?.82:1}}>
                      {/* Preview degradado vibrante diagonal */}
                      <div style={{height:70,cursor:"pointer",
                        background:`linear-gradient(135deg,${col1} 50%,${col2} 50%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:28,position:"relative"}}
                        onClick={()=>{
                          if(isOwned){ equipar("theme",item.id); }
                          else{
                            if(isPreviewing){ setPreview(null); if(onThemeChange) onThemeChange(currentThemeId,originalPrimaryRef.current); }
                            else{ setPreview(item); if(onThemeChange) onThemeChange(null,col1); }
                          }
                        }}>
                        {isActive
                          ? <div style={{background:"rgba(0,0,0,.25)",borderRadius:"50%",
                              width:32,height:32,display:"flex",alignItems:"center",
                              justifyContent:"center",fontSize:16}}>✅</div>
                          : isPreviewing
                            ? <div style={{background:"rgba(0,0,0,.25)",borderRadius:"50%",
                                width:32,height:32,display:"flex",alignItems:"center",
                                justifyContent:"center",fontSize:16}}>👁️</div>
                            : item.preview||cfg.icon||"🎨"}
                        {!isOwned&&!isPreviewing&&precio>0&&(
                          <div style={{position:"absolute",top:5,right:6,
                            background:"rgba(0,0,0,.4)",borderRadius:99,
                            padding:"2px 7px",fontSize:9,color:"white",fontWeight:800}}>🔒</div>
                        )}
                      </div>
                      {/* Footer */}
                      <div style={{background:dark?"#2d2a45":"#f8f8f8",padding:"8px 10px"}}>
                        <div style={{fontWeight:800,fontSize:12,color:isActive?col1:txt,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>
                          {item.nombre}
                        </div>
                        {/* Círculos de color */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",gap:4}}>
                            <div style={{width:13,height:13,borderRadius:"50%",background:col1,
                              boxShadow:`0 0 0 1.5px ${dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.1)"}`}}/>
                            <div style={{width:13,height:13,borderRadius:"50%",background:col2,
                              boxShadow:`0 0 0 1.5px ${dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.1)"}`}}/>
                          </div>
                          {/* Estado */}
                          {isActive&&dias!==null&&(
                            <span style={{fontSize:9,fontWeight:700,
                              color:dias<=3?"#ef4444":dias<=7?"#f59e0b":"#10b981"}}>⏳{dias}d</span>
                          )}
                          {isActive&&dias===null&&<span style={{fontSize:9,color:"#10b981",fontWeight:700}}>✓</span>}
                          {!isActive&&isOwned&&(
                            <button onClick={()=>equipar("theme",item.id)}
                              style={{background:"none",border:`1px solid ${col1}`,borderRadius:99,
                                padding:"2px 8px",fontSize:9,color:col1,fontWeight:700,
                                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Equipar</button>
                          )}
                          {!isOwned&&precio===0&&(
                            <button onClick={()=>equipar("theme",item.id)}
                              style={{background:"none",border:"none",fontSize:9,color:"#10b981",
                                fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Gratis</button>
                          )}
                          {!isOwned&&precio>0&&(
                            <button onClick={()=>isSub?suscribir(item,item.periodo_default||"monthly"):comprar(item)}
                              disabled={buying===item.id||precio>balance}
                              style={{background:precio>balance?"transparent":col1,
                                color:precio>balance?"#aaa":"white",border:"none",borderRadius:99,
                                padding:"3px 8px",fontSize:9,fontWeight:800,
                                cursor:precio>balance?"not-allowed":"pointer",
                                fontFamily:"Nunito,sans-serif"}}>
                              {buying===item.id?"...":`🪙${precio}${isSub?`/${item.periodo_default==="weekly"?"sem":item.periodo_default==="annual"?"año":"mes"}`:""}`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
                {/* Claro y Oscuro */}
                {[
                  {d:false,icon:"☀️",lbl:"Claro",c1:"#f0f0f0",c2:"#ffffff",sub2:"Gratis"},
                  {d:true, icon:"🌙",lbl:"Oscuro",c1:"#0d0d1a",c2:"#1a1828",sub2:"Gratis"}
                ].map(m=>{
                  const isActive=!active?.screen_mode_id&&isDark===m.d;
                  return(
                    <div key={m.lbl} onClick={()=>{
                      onDarkChange&&onDarkChange(m.d);
                      if(active?.screen_mode_id) equipar("screen_mode",active.screen_mode_id);
                    }}
                      style={{borderRadius:16,overflow:"hidden",cursor:"pointer",
                        border:`2px solid ${isActive?accent:dark?"#2d2a45":"#e0e0e0"}`,
                        boxShadow:isActive?`0 0 0 3px ${accent}33`:"none",
                        transition:"all .2s"}}>
                      {/* Preview degradado */}
                      <div style={{height:56,
                        background:`linear-gradient(135deg,${m.c1} 50%,${m.c2} 50%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:26,position:"relative"}}>
                        {isActive
                          ? <div style={{background:"rgba(0,0,0,.3)",borderRadius:"50%",
                              width:28,height:28,display:"flex",alignItems:"center",
                              justifyContent:"center",fontSize:14}}>✅</div>
                          : m.icon}
                      </div>
                      {/* Info + puntitos */}
                      <div style={{background:dark?"#2d2a45":"#f8f8f8",padding:"8px 10px",
                        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div>
                          <div style={{fontWeight:800,fontSize:12,color:txt}}>{m.lbl}</div>
                          <div style={{fontSize:9,color:sub,fontWeight:600}}>{m.sub2}</div>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <div style={{width:12,height:12,borderRadius:"50%",background:m.c1,
                            border:`1px solid ${dark?"#555":"#ddd"}`}}/>
                          <div style={{width:12,height:12,borderRadius:"50%",background:m.c2,
                            border:`1px solid ${dark?"#555":"#ddd"}`}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Modos de pantalla de la DB */}
                {items.filter(i=>i.tipo==="screen_mode").map(item=>{
                  const isOwned=ownedIds.has(item.id)||item.precio===0;
                  const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
                  const isActive=active?.screen_mode_id===item.id;
                  const isSub=item.es_suscripcion;
                  const precio=isSub?(item.precio_mensual??item.precio):item.precio;
                  if(cfg.custom) return null;
                  // Extraer los dos colores principales para los puntitos
                  const c1=cfg.bg||cfg.pageBg||"#888";
                  const c2=cfg.card||"#aaa";
                  const prevBg=cfg.bg_preview||`linear-gradient(135deg,${c1} 50%,${c2} 50%)`;
                  return(
                    <div key={item.id} style={{borderRadius:16,overflow:"hidden",
                      border:`2px solid ${isActive?accent:dark?"#2d2a45":"#e0e0e0"}`,
                      boxShadow:isActive?`0 0 0 3px ${accent}33`:"none",
                      transition:"all .2s",
                      opacity:!isOwned&&precio>0?.75:1}}>
                      {/* Preview degradado */}
                      <div style={{height:56,cursor:isOwned?"pointer":"default",
                        background:prevBg,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:26,position:"relative"}}
                        onClick={isOwned?()=>equipar("screen_mode",item.id):undefined}>
                        {isActive
                          ? <div style={{background:"rgba(0,0,0,.3)",borderRadius:"50%",
                              width:28,height:28,display:"flex",alignItems:"center",
                              justifyContent:"center",fontSize:14}}>✅</div>
                          : item.preview||"🖥️"}
                        {!isOwned&&precio>0&&(
                          <div style={{position:"absolute",top:4,right:4,
                            background:"rgba(0,0,0,.45)",borderRadius:99,
                            padding:"2px 6px",fontSize:9,color:"white",fontWeight:800}}>
                            🔒
                          </div>
                        )}
                      </div>
                      {/* Info + puntitos */}
                      <div style={{background:dark?"#2d2a45":"#f8f8f8",padding:"8px 10px",
                        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:800,fontSize:12,color:txt,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {item.nombre}
                          </div>
                          <div style={{fontSize:9,color:isActive?"#10b981":sub,fontWeight:600}}>
                            {isActive?"✓ Activo":isOwned?"Toca para equipar"
                              :`🪙${precio}${isSub?"/mes":""}`}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:6}}>
                          <div style={{width:12,height:12,borderRadius:"50%",background:c1,
                            border:`1px solid ${dark?"#555":"#ddd"}`}}/>
                          <div style={{width:12,height:12,borderRadius:"50%",background:c2,
                            border:`1px solid ${dark?"#555":"#ddd"}`}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {sec==="texto"&&!loading&&(
          <TextoStylePanel
            items={items.filter(i=>i.tipo==="text_style")}
            owned={owned} ownedIds={ownedIds} active={active} subs={subs}
            balance={balance} buying={buying} dark={dark} cardBg={cardBg}
            txt={txt} sub={sub} accent={accent} inputBg={inputBg} inputBd={inputBd}
            equipar={equipar} comprar={comprar} suscribir={suscribir}
            showToast={showToast} onCustomChange={onCustomChange}
          />
        )}
        {sec!=="apodo"&&sec!=="pantalla"&&sec!=="texto"&&filteredItems.map(item=>{
          const isOwned   = ownedIds.has(item.id)||item.precio===0;
          const isFree    = item.precio===0;
          const isEquipped= active&&Object.values(active).includes(item.id);
          const tipoMap   = {theme:"theme",name_color:"name_color",emoji_pack:"emoji_pack",
                             title_effect:"title_effect",name_effect:"name_effect",avatar_frame:"avatar_frame"};

          return(
            <div key={item.id} style={{background:cardBg,borderRadius:18,marginBottom:10,
              overflow:"hidden",boxShadow:isEquipped?`0 2px 12px ${accent}33`:"0 1px 8px rgba(0,0,0,.06)",
              border:`1.5px solid ${isEquipped?accent:dark?"#2d2a45":"transparent"}`}}>

              {/* Preview visual según tipo */}
              {item.tipo==="theme"&&(
                <div style={{height:40,background:`linear-gradient(135deg,${item.config.primary},${item.config.accent})`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                  {item.config.icon||"🎨"}
                </div>
              )}
              {item.tipo==="name_color"&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  background:dark?"#2d2a45":"#f8f8f8"}}>
                  <span style={{fontWeight:900,fontSize:18,
                    color:item.config.rainbow?"transparent":item.config.color,
                    background:item.config.rainbow?"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6,#00c1fc)":"none",
                    WebkitBackgroundClip:item.config.rainbow?"text":"none",
                    WebkitTextFillColor:item.config.rainbow?"transparent":"unset"}}>
                    Tu Nombre
                  </span>
                </div>
              )}
              {item.tipo==="emoji_pack"&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  gap:4,background:dark?"#2d2a45":"#f8f8f8",fontSize:20}}>
                  {(item.config.emojis||[]).slice(0,6).map((e,i)=><span key={i}>{e}</span>)}
                </div>
              )}
              {["title_effect","name_effect"].includes(item.tipo)&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  background:dark?"#2d2a45":"#f8f8f8"}}>
                  <span style={{fontWeight:900,fontSize:16,color:accent,
                    textShadow:item.tipo==="title_effect"?item.config.css?.split(":")?.[1]?.trim():"none"}}>
                    {item.config.label||item.nombre}
                  </span>
                </div>
              )}

              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{item.nombre}</div>
                  {item.descripcion&&<div style={{fontSize:11,color:sub,marginTop:1}}>{item.descripcion}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                    {isFree
                      ? <span style={{background:"#10b98122",color:"#10b981",borderRadius:99,
                          padding:"2px 8px",fontSize:10,fontWeight:800}}>Gratis</span>
                      : <span style={{fontWeight:800,color:accent,fontSize:13}}>🪙{item.precio}</span>
                    }
                    {isEquipped&&<span style={{background:accent+"22",color:accent,borderRadius:99,
                      padding:"2px 8px",fontSize:10,fontWeight:800}}>✅ Activo</span>}
                    {isOwned&&!isEquipped&&<span style={{background:"#10b98122",color:"#10b981",
                      borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>Tenés</span>}
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  {/* Equipar */}
                  {isOwned&&(
                    <button onClick={()=>equipar(tipoMap[item.tipo],item.id)}
                      style={{background:isEquipped?"#ef444422":accent+"22",
                        color:isEquipped?"#ef4444":accent,border:"none",borderRadius:99,
                        padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {isEquipped?"Quitar":"Equipar"}
                    </button>
                  )}
                  {/* Comprar */}
                  {!isOwned&&!isFree&&(
                    <button onClick={()=>comprar(item)} disabled={buying===item.id||item.precio>balance}
                      style={{background:buying===item.id?"#ccc":item.precio>balance?"#f0f0f0":accent,
                        color:item.precio>balance?"#aaa":"white",border:"none",borderRadius:99,
                        padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {buying===item.id?"...":item.precio>balance?"Sin saldo":"Comprar"}
                    </button>
                  )}
                  {/* Regalar (si lo tenés) */}
                  {isOwned&&(
                    <button onClick={()=>setGiftOpen(item)}
                      style={{background:dark?"#2d2a45":"#f0f0f0",color:sub,border:"none",
                        borderRadius:99,padding:"5px 10px",fontSize:10,fontWeight:700,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      🎁 Regalar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NOTIFICACIONES ────────────────────────────────────────────

export default ATiendaCustom;
