import { useState, useEffect } from "react";
import { SKINS, TITLES, BORDERS, RARITIES, RARITY_CSS, AVATAR_BACKGROUNDS } from "../../constants";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, displayName } from "../shared/index";

const PRECIO_TITULO_CUSTOM = 20;
const PRECIO_ESTADO        = 10;


function APerfil({me,balance,logout,showToast,setMe,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg,inputBg} = useTheme();

  const unlockedSkins   = me.unlocked_skins   || ["s1"];
  const unlockedBorders = me.unlocked_borders || ["b1"];
  const unlockedTitles  = me.unlocked_titles  || ["tl1"];

  // Estados
  const [buying,          setBuying]          = useState(null);
  const [saving,          setSaving]          = useState(null);
  // Apodo
  const [apodoVal,        setApodoVal]        = useState(me.apodo||"");
  const [apodoPerm,       setApodoPerm]       = useState(false);
  const [savingApodo,     setSavingApodo]     = useState(false);
  // Estado
  const [editEstado,      setEditEstado]      = useState(false);
  const [estadoVal,       setEstadoVal]       = useState(me.estado||"");
  // Títulos activos (slots)
  const initTitles = Array.isArray(me.active_titles)&&me.active_titles.length>0
    ? me.active_titles : [];
  const [activeTitles,    setActiveTitles]    = useState(initTitles); // max 5
  const [editingSlot,     setEditingSlot]     = useState(null);
  const [customTitleVal,  setCustomTitleVal]  = useState("");
  // Títulos ganados
  const [earnedTitles,    setEarnedTitles]    = useState([]);
  // Emojis
  const [emojiPacks,      setEmojiPacks]      = useState([]);
  const [loanedItems,     setLoanedItems]     = useState([]);
  const [apodoCosto,      setApodoCosto]      = useState(15); // default, se carga del server
  const [apodoItemId,     setApodoItemId]     = useState(null);
  const [buyingApodo,     setBuyingApodo]     = useState(false);
  // Avatar bg
  const [avatarBg,        setAvatarBg]        = useState(me.avatar_bg||null);
  const [unlockedAvatarBgs,setUnlockedAvatarBgs]=useState(me.unlocked_avatar_bgs||["ab0"]);
  const [fotoShop,  setFotoShop]   = useState(null);  // item photo_profile de la tienda
  const [fotoAccess,setFotoAccess] = useState(false); // tiene acceso activo (compró en la última hora)

  useEffect(()=>{
    api.customMe().then(d=>{
      const owned = (d?.data||d)?.owned||[];
      const active = (d?.data||d)?.active;
      setApodoPerm(owned.some(o=>o.tipo==="nickname"));
      if(active?.emoji_pack_config){
        const cfg = typeof active.emoji_pack_config==="string"
          ? JSON.parse(active.emoji_pack_config) : active.emoji_pack_config;
        setEmojiPacks(cfg?.emojis||[]);
      }
    }).catch(()=>{});
    api.earnedTitles().then(d=>{
      setEarnedTitles(Array.isArray(d)?d:(d?.data||[]));
    }).catch(()=>{});
    api.loanedItems().then(d=>{
      setLoanedItems(Array.isArray(d)?d:(d?.data||[]));
    }).catch(()=>{});
    // Cargar item de foto
    api.customShop("photo_profile").then(d=>{
      const arr=Array.isArray(d)?d:(d?.data||d||[]);
      const item=arr.find(i=>i.tipo==="photo_profile");
      setFotoShop(item||null);
    }).catch(()=>{});
    // Cargar precio e ID del apodo desde el shop
    api.customShop("nickname").then(d=>{
      const arr=Array.isArray(d)?d:(d?.data||d||[]);
      const item=arr.find(i=>i.tipo==="nickname");
      if(item?.precio) setApodoCosto(item.precio);
      if(item?.id)     setApodoItemId(item.id);
    }).catch(()=>{});
  },[]);

  const card = {background:cardBg,borderRadius:16,marginBottom:8,
    boxShadow:dark?"0 2px 12px rgba(0,0,0,.3)":"0 2px 12px rgba(0,0,0,.06)"};

  // ── Acciones ────────────────────────────────────────────────
  const buyItem=async(type,item)=>{
    if(buying) return;
    if(item.price>0&&balance<item.price){showToast(`Necesitás 🪙${item.price}`,"error");return;}
    setBuying(item.id);
    try{
      await api.buyItem(type,item.id);
      showToast(`✅ ${item.name} desbloqueado!`);
      if(refreshBalance) refreshBalance();
      const updated=await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  const equip=async(type,item_id)=>{
    try{
      await api.equip(type,item_id);
      const updated=await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const comprarPermisoApodo=async()=>{
    if(!apodoItemId){showToast("El admin aún no habilitó este item","error");return;}
    if(balance<apodoCosto){showToast(`Necesitás 🪙${apodoCosto}`,"error");return;}
    setBuyingApodo(true);
    try{
      await api.customBuy(apodoItemId);
      setApodoPerm(true);
      if(refreshBalance) refreshBalance();
      showToast("¡Permiso de apodo desbloqueado! 🏷️");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuyingApodo(false);}
  };

  const guardarApodo=async()=>{
    if(!apodoVal.trim()){showToast("Escribí un apodo","error");return;}
    setSavingApodo(true);
    try{
      await api.setApodo(apodoVal.trim());
      setMe(prev=>({...prev,apodo:apodoVal.trim()}));
      if(refreshBalance) refreshBalance();
      showToast(`Apodo guardado 🏷️${apodoCosto>0?` (-🪙${apodoCosto})`:""}`);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingApodo(false);}
  };

  const quitarApodo=async()=>{
    setSavingApodo(true);
    try{
      await api.setApodo(null);
      setApodoVal(""); setMe(prev=>({...prev,apodo:null}));
      showToast("Apodo eliminado");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingApodo(false);}
  };

  const guardarEstado=async()=>{
    if(balance<PRECIO_ESTADO){showToast(`Necesitás 🪙${PRECIO_ESTADO}`,"error");return;}
    setSaving("estado");
    try{
      await api.setEstado(estadoVal.trim().slice(0,40));
      setMe(prev=>({...prev,estado:estadoVal.trim().slice(0,40)}));
      if(refreshBalance) refreshBalance();
      showToast(`Estado guardado (-🪙${PRECIO_ESTADO})`);
      setEditEstado(false);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  const saveActiveTitles=async(newTitles)=>{
    setSaving("titles");
    // Filter out nulls/undefined but allow empty array
    const cleaned = newTitles.filter(Boolean);
    try{
      await api.setActiveTitles(cleaned);
      setActiveTitles(cleaned);
      setMe(prev=>({...prev,active_titles:cleaned}));
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  const saveCustomSlot=async(slot,text)=>{
    if(!text.trim()){showToast("Escribí algo","error");return;}
    if(balance<PRECIO_TITULO_CUSTOM){showToast(`Necesitás 🪙${PRECIO_TITULO_CUSTOM}`,"error");return;}
    setSaving("cs"+slot);
    try{
      await api.buyTituloChange(text.trim(),PRECIO_TITULO_CUSTOM);
      if(refreshBalance) refreshBalance();
      const newT=[...activeTitles]; newT[slot]="custom:"+text.trim();
      await api.setActiveTitles(newT);
      setActiveTitles(newT); setMe(prev=>({...prev,active_titles:newT}));
      showToast(`Guardado (-🪙${PRECIO_TITULO_CUSTOM})`);
      setEditingSlot(null); setCustomTitleVal("");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  const setAvatarBgAndSave=async(bg)=>{
    setSaving("avatar_bg");
    try{
      await api.setAvatarBg(bg);
      setAvatarBg(bg); setMe(prev=>({...prev,avatar_bg:bg}));
      showToast("Fondo actualizado ✨");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(null);}
  };

  const buyAvatarBg=async(item)=>{
    if(item.price>0&&balance<item.price){showToast(`Necesitás 🪙${item.price}`,"error");return;}
    setBuying(item.id);
    try{
      // Pass item.id as the item_id, not the full object
      await api.buyItem("avatar_bg", item.id);
      setUnlockedAvatarBgs(prev=>[...prev,item.id]);
      // Equip immediately after buying
      setAvatarBgAndSave({id:item.id,name:item.name,type:item.type,value:item.value,glow:item.glow||null});
      if(refreshBalance) refreshBalance();
      showToast(`✅ ${item.name} desbloqueado!`);
    }catch(e){
      if(item.price===0) setUnlockedAvatarBgs(prev=>[...prev,item.id]);
      else showToast(e.message||"Error","error");
    }
    finally{setBuying(null);}
  };

  return(
    <div style={{background:pageBg}}>
      <style>{RARITY_CSS}</style>
      <OHdrA title="Mi Perfil 👤"/>
      <div style={{padding:"0 14px 32px",marginTop:12}}>

        {/* Card principal */}
        <div style={{...card,padding:20,textAlign:"center",marginBottom:20}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
            <Av user={me} sz={72} avatarBg={avatarBg||null}/>
            <label style={{position:"absolute",bottom:0,right:0,zIndex:2,
              background:accent,borderRadius:"50%",width:22,height:22,
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",fontSize:11}}>
              📷
              <input type="file" accept="image/*" onChange={async e=>{
                const file=e.target.files?.[0]; if(!file) return;
                if(file.size>500000){showToast("Max 500KB","error");return;}
                const reader=new FileReader();
                reader.onload=async ev=>{
                  setSaving("foto");
                  try{
                    await api.setFoto(ev.target.result);
                    showToast("Foto actualizada 📸");
                    const updated=await api.me(); setMe(updated);
                  }catch(err){showToast(err.message||"Error","error");}
                  finally{setSaving(null);}
                };
                reader.readAsDataURL(file);
              }} style={{display:"none"}}/>
            </label>
          </div>
          <div style={{fontWeight:900,fontSize:18,color:txt}}>{displayName(me)}</div>
          {/* Preview de títulos activos */}
          {activeTitles.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginTop:6}}>
              {activeTitles.slice(0,3).map((t,i)=>{
                const label = t.startsWith("custom:") ? t.slice(7)
                  : t.startsWith("earned:") ? (earnedTitles.find(et=>et.id===t.slice(7))?.name||"Título")
                  : TITLES.find(ti=>ti.id===t)?.name||t;
                return(
                  <div key={i} style={{background:accent+"22",borderRadius:99,
                    padding:"2px 10px",fontSize:11,fontWeight:700,color:accent}}>
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          {me.estado&&(
            <div style={{fontSize:11,color:sub,marginTop:6,fontStyle:"italic"}}>
              "{me.estado}"
            </div>
          )}
          <div style={{fontWeight:800,color:accent,fontSize:15,marginTop:8}}>
            🪙 {balance.toLocaleString("es-AR")}
          </div>
        </div>

        {/* ── 1. APODO ──────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:6}}>🏷️ Apodo</div>
        <div style={{...card,padding:"14px 16px",marginBottom:16}}>
          {!apodoPerm?(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:6}}>🏷️</div>
              <div style={{fontSize:11,color:sub,marginBottom:12,lineHeight:1.5}}>
                Con un apodo todos te ven diferente en el chat, ranking y perfil.<br/>Tu nombre real no cambia.
              </div>
              {apodoItemId?(
                <button onClick={comprarPermisoApodo}
                  disabled={buyingApodo||balance<apodoCosto}
                  style={{background:buyingApodo||balance<apodoCosto?(dark?"rgba(255,255,255,.2)":"rgba(0,0,0,.12)"):accent,
                    border:"none",borderRadius:99,color:"white",padding:"10px 22px",
                    fontSize:13,fontWeight:900,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif",
                    boxShadow:buyingApodo||balance<apodoCosto?"none":`0 4px 14px ${accent}44`}}>
                  {buyingApodo?"Comprando..."
                    :balance<apodoCosto?`Sin saldo (necesitás 🪙${apodoCosto})`
                    :`Comprar permiso 🪙${apodoCosto}`}
                </button>
              ):(
                <div style={{fontSize:11,color:sub}}>
                  El admin aún no habilitó este item
                </div>
              )}
            </div>
          ):(
            <>
              {me.apodo&&(
                <div style={{fontSize:13,color:accent,fontWeight:700,marginBottom:8}}>
                  Actual: <strong>{me.apodo}</strong>
                </div>
              )}
              <input value={apodoVal} onChange={e=>setApodoVal(e.target.value)} maxLength={30}
                placeholder="Escribí tu apodo..."
                style={{width:"100%",boxSizing:"border-box",background:inputBg,
                  border:`1.5px solid ${inputBg}`,borderRadius:10,padding:"9px 12px",
                  fontSize:14,fontWeight:700,outline:"none",color:txt,
                  fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarApodo} disabled={savingApodo||!apodoVal.trim()||balance<apodoCosto}
                  style={{flex:1,background:savingApodo||!apodoVal.trim()||balance<apodoCosto?(dark?"rgba(255,255,255,.2)":"rgba(0,0,0,.12)"):accent,
                    border:"none",borderRadius:50,color:"white",padding:"10px",fontWeight:800,
                    fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {savingApodo?"Guardando...":balance<apodoCosto?"Sin saldo":apodoCosto>0?`Guardar 🪙${apodoCosto}`:"Guardar"}
                </button>
                {me.apodo&&(
                  <button onClick={quitarApodo} disabled={savingApodo}
                    style={{background:inputBg,border:"none",borderRadius:50,color:sub,
                      padding:"10px 14px",fontWeight:700,fontSize:12,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>Quitar</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 2. ESTADO ─────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:6}}>💬 Estado</div>
        <div style={{...card,padding:"14px 16px",marginBottom:16,
          border:`1.5px solid ${me.estado?accent:inputBg}`}}>
          {me.estado&&!editEstado&&(
            <div style={{fontSize:13,color:sub,fontStyle:"italic",marginBottom:8}}>
              "{me.estado}"
            </div>
          )}
          {editEstado?(
            <>
              <input value={estadoVal} onChange={e=>setEstadoVal(e.target.value.slice(0,40))}
                placeholder="¿Qué estás pensando? (máx 40)"
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                  borderRadius:10,padding:"9px 12px",fontSize:13,fontWeight:600,outline:"none",
                  color:txt,background:inputBg,fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarEstado}
                  disabled={saving==="estado"||balance<PRECIO_ESTADO}
                  style={{flex:1,background:balance<PRECIO_ESTADO?(dark?"rgba(255,255,255,.2)":"rgba(0,0,0,.12)"):accent,
                    border:"none",borderRadius:50,color:"white",padding:"10px",fontWeight:800,
                    fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {saving==="estado"?"...":balance<PRECIO_ESTADO?"Sin saldo":`Guardar 🪙${PRECIO_ESTADO}`}
                </button>
                <button onClick={()=>{setEditEstado(false);setEstadoVal(me.estado||"");}}
                  style={{background:inputBg,border:"none",borderRadius:50,color:sub,
                    padding:"10px 14px",fontWeight:700,fontSize:12,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>Cancelar</button>
              </div>
            </>
          ):(
            <button onClick={()=>{setEstadoVal(me.estado||"");setEditEstado(true);}}
              style={{background:accent+"22",color:accent,border:"none",borderRadius:99,
                padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {me.estado?"✏️ Cambiar":"+ Agregar estado"}
            </button>
          )}
          <div style={{fontSize:10,color:sub,marginTop:6}}>🪙{PRECIO_ESTADO} por cambio</div>
        </div>

        {/* ── 3. TÍTULOS ────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:6}}>📛 Títulos</div>

        {/* 3a. Slots personalizados (hasta 3) */}
        <div style={{fontSize:11,color:sub,marginBottom:8}}>
          Hasta 5 títulos activos. Los ganados del admin también aparecen aquí para activar.
        </div>
        {[0,1,2,3,4].map(slot=>{
          const cur = activeTitles[slot]||null;
          const isCustom  = cur?.startsWith("custom:");
          const isEarned  = cur?.startsWith("earned:");
          const earnedT   = isEarned ? earnedTitles.find(t=>t.id===cur.slice(7)) : null;
          const label = cur
            ? isCustom  ? cur.slice(7)
            : isEarned  ? (earnedT?.name || cur)
            : (TITLES.find(t=>t.id===cur)?.name||cur)
            : null;
          const labelColor = isEarned && earnedT
            ? (RARITIES[earnedT.rarity]||RARITIES.common).color
            : accent;
          const isEditing = editingSlot===slot;
          return(
            <div key={slot} style={{...card,padding:"12px 16px",marginBottom:8,
              border:`1.5px solid ${label?accent:inputBg}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{flex:1}}>
                  {label
                    ? <span style={{fontWeight:800,fontSize:13,color:labelColor}}>
                        {isCustom?"✏️ ":isEarned&&earnedT?.emoji?earnedT.emoji+" ":""}{label}
                      </span>
                    : <span style={{fontSize:12,color:sub}}>Slot {slot+1} vacío</span>
                  }
                </div>
                <div style={{display:"flex",gap:6}}>
                  {!isEditing&&(
                    <button onClick={()=>{setEditingSlot(slot);setCustomTitleVal(isCustom?label:"");}}
                      style={{background:accent+"22",border:"none",borderRadius:99,
                        color:accent,padding:"4px 10px",fontSize:11,fontWeight:800,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {label?"✏️":"+ Agregar"}
                    </button>
                  )}
                  {label&&!isEditing&&(
                    <button onClick={()=>{
                      const n=[...activeTitles]; n.splice(slot,1);
                      saveActiveTitles(n);
                    }} style={{background:inputBg,border:"none",borderRadius:99,
                      color:sub,padding:"4px 10px",fontSize:11,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>✕</button>
                  )}
                </div>
              </div>

              {isEditing&&(
                <div style={{marginTop:10}}>
                  {/* Earned titles from admin - free to activate */}
                  {earnedTitles.filter(t=>!activeTitles.includes("earned:"+t.id)).length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:sub,marginBottom:6}}>
                        🏅 Tus títulos obtenidos (gratis):
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {earnedTitles
                          .filter(t=>!t.expires_at||new Date(t.expires_at)>new Date())
                          .map(t=>{
                            const r = RARITIES[t.rarity]||RARITIES.common;
                            return(
                              <div key={t.id}
                                onClick={()=>{
                                  const newT=[...activeTitles];
                                  newT[slot]="earned:"+t.id;
                                  saveActiveTitles(newT);
                                  setEditingSlot(null);
                                }}
                                style={{background:r.color+"22",border:`1.5px solid ${r.color}44`,
                                  borderRadius:99,padding:"5px 12px",cursor:"pointer",
                                  display:"inline-flex",alignItems:"center",gap:4}}>
                                {t.emoji&&<span style={{fontSize:12}}>{t.emoji}</span>}
                                <span style={{fontSize:11,fontWeight:800,color:r.color}}>{t.name}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  <div style={{fontSize:11,fontWeight:700,color:sub,marginBottom:6}}>
                    ✏️ Escribí tu título (🪙{PRECIO_TITULO_CUSTOM} por cambio):
                  </div>
                  <input value={customTitleVal}
                    onChange={e=>setCustomTitleVal(e.target.value.slice(0,30))}
                    placeholder="Tu título..."
                    style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                      borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:700,
                      outline:"none",color:txt,background:inputBg,
                      fontFamily:"Nunito,sans-serif",marginBottom:6}}/>
                  {emojiPacks.length>0&&(
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8,
                      padding:"5px 8px",background:inputBg,borderRadius:8}}>
                      {emojiPacks.slice(0,15).map((em,i)=>(
                        <span key={i} onClick={()=>setCustomTitleVal(v=>v+em)}
                          style={{fontSize:16,cursor:"pointer"}}>{em}</span>
                      ))}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>saveCustomSlot(slot,customTitleVal)}
                      disabled={!customTitleVal.trim()||saving===("cs"+slot)||balance<PRECIO_TITULO_CUSTOM}
                      style={{flex:1,background:!customTitleVal.trim()||balance<PRECIO_TITULO_CUSTOM?(dark?"rgba(255,255,255,.2)":"rgba(0,0,0,.12)"):accent,
                        border:"none",borderRadius:50,color:"white",padding:"9px",fontWeight:800,
                        fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {saving===("cs"+slot)?"...":balance<PRECIO_TITULO_CUSTOM?"Sin saldo":`Guardar 🪙${PRECIO_TITULO_CUSTOM}`}
                    </button>
                    <button onClick={()=>{setEditingSlot(null);setCustomTitleVal("");}}
                      style={{background:inputBg,border:"none",borderRadius:50,color:sub,
                        padding:"9px 14px",fontWeight:700,fontSize:12,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}



        {/* ── 4. SKINS ──────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,margin:"20px 0 8px"}}>🎨 Skins</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {SKINS.filter(s=>!s.exclusive).map(s=>{
            const owned   = unlockedSkins.includes(s.id);
            const equipped = me.skin===s.id;
            const canBuy  = !owned&&balance>=s.price;
            return(
              <div key={s.id} onClick={()=>{
                  if(equipped) return;
                  if(owned) equip("skin",s.id);
                  else if(canBuy||s.price===0) buyItem("skin",s);
                  else showToast(`Necesitás 🪙${s.price}`,"error");
                }}
                style={{...card,padding:"12px 6px",textAlign:"center",
                  background:equipped?s.bg:cardBg,
                  border:`2px solid ${equipped?"#FFB800":owned?accent+"44":inputBg}`,
                  cursor:equipped?"default":"pointer",
                  opacity:!owned&&s.price>balance?.5:1,marginBottom:0,position:"relative"}}>
                {equipped&&<div style={{position:"absolute",top:3,right:4,fontSize:9}}>✅</div>}
                {buying===s.id&&<div style={{position:"absolute",inset:0,
                  background:"rgba(0,0,0,.3)",borderRadius:14,display:"flex",
                  alignItems:"center",justifyContent:"center",fontSize:10,color:"white"}}>...</div>}
                <div style={{fontSize:26,marginBottom:3}}>{s.emoji}</div>
                <div style={{fontSize:9,fontWeight:800,color:equipped?"white":txt}}>{s.name}</div>
                {!owned&&s.price>0&&(
                  <div style={{fontSize:9,color:canBuy?accent:sub,fontWeight:800,marginTop:2}}>
                    🪙{s.price}
                  </div>
                )}
                {owned&&!equipped&&(
                  <div style={{fontSize:9,color:accent,fontWeight:700,marginTop:2}}>Equipar</div>
                )}
              </div>
            );
          })}
          {/* Slot de foto — compra acceso por 1 hora */}
          {(()=>{
            const precio = fotoShop?.precio || 0;
            const handleUpload = async(e) => {
              const file=e.target.files?.[0]; if(!file) return;
              if(file.size>500000){showToast("Max 500KB","error");return;}
              const r2=new FileReader();
              r2.onload=async ev=>{
                setSaving("foto");
                try{
                  await api.setFoto(ev.target.result);
                  showToast("Foto actualizada 📸");
                  const u=await api.me(); setMe(u);
                }catch(err){
                  // If access expired, offer to buy again
                  if(err.message?.includes("expiró")||err.message?.includes("Comprá")) {
                    setFotoAccess(false);
                    showToast(err.message,"error");
                  } else {
                    showToast(err.message||"Error","error");
                  }
                }
                finally{setSaving(null);}
              };
              r2.readAsDataURL(file);
            };
            const comprarAcceso = async() => {
              if(!fotoShop){showToast("Item no disponible","error");return;}
              if(precio>0&&balance<precio){showToast(`Necesitás 🪙${precio}`,"error");return;}
              setBuying("foto");
              try{
                await api.customBuy(fotoShop.id);
                setFotoAccess(true);
                if(refreshBalance) refreshBalance();
                showToast(`Acceso desbloqueado por 1 hora 📸${precio>0?` (-🪙${precio})`:""}`);
              }catch(e){showToast(e.message||"Error","error");}
              finally{setBuying(null);}
            };
            return(
              <div style={{...card,padding:"12px 6px",textAlign:"center",marginBottom:0,
                border:`2px solid ${me.foto_url?accent:fotoAccess?accent+"44":inputBg}`,
                position:"relative",gridColumn:"span 1"}}>
                {me.foto_url
                  ? <img src={me.foto_url} alt="" style={{width:36,height:36,borderRadius:"50%",
                      objectFit:"cover",margin:"0 auto 4px",display:"block"}}/>
                  : <div style={{fontSize:26,marginBottom:3}}>📸</div>
                }
                <div style={{fontSize:9,fontWeight:800,color:txt,marginBottom:3}}>Foto</div>
                {fotoAccess||me.foto_url?(
                  <label style={{cursor:saving==="foto"?"not-allowed":"pointer"}}>
                    <input type="file" accept="image/*" disabled={saving==="foto"}
                      onChange={handleUpload} style={{display:"none"}}/>
                    <span style={{fontSize:9,color:accent,fontWeight:800}}>
                      {saving==="foto"?"...":me.foto_url?"Cambiar":"Subir"}
                    </span>
                  </label>
                ):(
                  <button onClick={comprarAcceso} disabled={buying==="foto"}
                    style={{background:"none",border:"none",cursor:"pointer",
                      fontSize:9,color:precio>0?accent:"#10b981",fontWeight:800,
                      fontFamily:"Nunito,sans-serif",padding:0}}>
                    {buying==="foto"?"...":precio>0?`🪙${precio}`:"Gratis"}
                  </button>
                )}
                {me.foto_url&&(
                  <button onClick={async()=>{
                    setSaving("foto");
                    try{await api.setFoto(null);showToast("Foto eliminada");
                      const u=await api.me();setMe(u);}
                    catch(e){showToast(e.message||"Error","error");}
                    finally{setSaving(null);}
                  }} style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,.4)",
                    border:"none",borderRadius:"50%",color:"white",width:16,height:16,
                    fontSize:8,cursor:"pointer",display:"flex",alignItems:"center",
                    justifyContent:"center"}}>✕</button>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── 5. BORDES ─────────────────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:8}}>🔲 Bordes</div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {BORDERS.map(b=>{
            const owned   = unlockedBorders.includes(b.id);
            const equipped = me.border===b.id;
            const canBuy  = !owned&&balance>=b.price;
            return(
              <div key={b.id} onClick={()=>{
                  if(equipped) return;
                  if(owned) equip("border",b.id);
                  else if(canBuy||b.price===0) buyItem("border",b);
                  else showToast(`Necesitás 🪙${b.price}`,"error");
                }}
                style={{...card,padding:"8px 14px",marginBottom:0,
                  border:`2px solid ${equipped?"#FFB800":owned?accent+"44":inputBg}`,
                  cursor:equipped?"default":"pointer",
                  opacity:!owned&&b.price>balance?.5:1,position:"relative"}}>
                {buying===b.id&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",
                  borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,color:"white"}}>...</div>}
                <div style={{fontSize:11,fontWeight:800,color:equipped?"#FFB800":txt}}>{b.name}</div>
                {!owned&&b.price>0&&<div style={{fontSize:10,color:canBuy?accent:sub,fontWeight:800}}>🪙{b.price}</div>}
                {owned&&!equipped&&<div style={{fontSize:10,color:accent,fontWeight:700}}>Equipar</div>}
                {equipped&&<div style={{fontSize:10,color:"#FFB800",fontWeight:800}}>✅</div>}
              </div>
            );
          })}
        </div>

        {/* ── 6. FONDOS DEL AVATAR ──────────────────────────── */}
        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:8}}>🖼️ Fondo del avatar</div>
        {/* Marcos/fondos prestados por el admin */}
        {loanedItems.filter(l=>l.type==="avatar_bg").map(loan=>{
          const item = typeof loan.item_data==="string" ? JSON.parse(loan.item_data) : loan.item_data;
          const equipped = avatarBg?.loaned_id===loan.id;
          return(
            <div key={loan.id} style={{...card,padding:"12px 14px",marginBottom:8,
              border:`2px solid ${equipped?"#FFB800":"#f59e0b44"}`,
              background:dark?"#1a140a":"#fffbeb"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                  background:item.type==="gradient"?item.value:item.type==="solid"?item.value:"transparent",
                  border:item.type==="frame"?item.value:"none",
                  boxShadow:item.glow?`0 0 8px 3px ${item.glow}`:undefined}}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:12,color:txt}}>
                    🎁 {item.name} <span style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>Prestado</span>
                  </div>
                  {loan.note&&<div style={{fontSize:10,color:sub,fontStyle:"italic"}}>{loan.note}</div>}
                  {loan.expires_at&&(
                    <div style={{fontSize:10,color:sub}}>
                      Vence: {new Date(loan.expires_at).toLocaleDateString("es-AR")}
                    </div>
                  )}
                </div>
                <button onClick={()=>setAvatarBgAndSave(equipped?null:{...item,loaned_id:loan.id})}
                  style={{background:equipped?"#FFB800":"#f59e0b",border:"none",borderRadius:99,
                    color:"white",padding:"6px 12px",fontSize:11,fontWeight:800,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {equipped?"✅ Activo":"Equipar"}
                </button>
              </div>
            </div>
          );
        })}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:24}}>
          {AVATAR_BACKGROUNDS.map(bg=>{
            const owned   = unlockedAvatarBgs.includes(bg.id);
            const equipped = avatarBg?.id===bg.id || (bg.id==="ab0"&&!avatarBg);
            const canBuy  = !owned&&balance>=bg.price;
            return(
              <div key={bg.id} onClick={()=>{
                  if(equipped) return;
                  if(owned||bg.price===0){
                    if(!owned) setUnlockedAvatarBgs(prev=>[...prev,bg.id]);
                    setAvatarBgAndSave(bg.id==="ab0"?null:{...bg});
                  } else if(canBuy) buyAvatarBg(bg);
                  else showToast(`Necesitás 🪙${bg.price}`,"error");
                }}
                style={{...card,padding:"10px 8px",textAlign:"center",marginBottom:0,
                  border:`2px solid ${equipped?"#FFB800":owned?accent+"44":inputBg}`,
                  cursor:equipped?"default":"pointer",
                  opacity:!owned&&bg.price>balance?.5:1,position:"relative",
                  overflow:"hidden"}}>
                {/* Preview */}
                <div style={{width:36,height:36,borderRadius:"50%",margin:"0 auto 6px",
                  background:bg.type==="gradient"?bg.value:
                             bg.type==="solid"?bg.value:"transparent",
                  border:bg.type==="frame"?bg.value:"2px solid "+inputBg,
                  boxShadow:bg.glow?`0 0 8px 3px ${bg.glow}`:undefined,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16}}>
                  {bg.type==="none"?"🚫":""}
                </div>
                <div style={{fontSize:10,fontWeight:800,color:equipped?"#FFB800":txt}}>{bg.name}</div>
                {!owned&&bg.price>0&&(
                  <div style={{fontSize:9,color:canBuy?accent:"#aaa",fontWeight:800,marginTop:1}}>🪙{bg.price}</div>
                )}
                {equipped&&<div style={{position:"absolute",top:3,right:4,fontSize:9}}>✅</div>}
              </div>
            );
          })}
        </div>

        {/* Cerrar sesión */}
        <button onClick={logout}
          style={{width:"100%",background:cardBg,border:`1.5px solid ${inputBg}`,
            borderRadius:50,color:sub,padding:"14px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}

export default APerfil;
