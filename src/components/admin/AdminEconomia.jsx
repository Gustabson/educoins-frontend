import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";


function AdminEconomia({showToast, onBack}){
  const [sec,setSec] = useState(null); // null=home, o nombre de sección

  const SECCIONES = [
    {id:"colores",    icon:"🖊️", title:"Colores de Nombre",  sub:"Precios y suscripciones", col:"#8b5cf6"},
    {id:"temas",      icon:"🎨", title:"Temas de App",        sub:"Paletas y suscripciones", col:"#ec4899"},
    {id:"fondos",      icon:"🖼️", title:"Fondos de Pantalla",  sub:"Claro, Oscuro, Sepia y más", col:"#6366f1"},
    {id:"estilos",    icon:"✍️", title:"Estilos de Texto",    sub:"Precios y colores",       col:"#06b6d4"},
    {id:"emojis",     icon:"😄", title:"Packs de Emojis",     sub:"Precios de packs",        col:"#f59e0b"},
    {id:"efectos",    icon:"✨", title:"Efectos y Animaciones",sub:"Títulos y nombre",        col:"#3b82f6"},
    {id:"ranking",    icon:"🏆", title:"Premios del Ranking", sub:"Diario, semanal, mensual", col:"#10b981"},
    {id:"checkin",    icon:"🔥", title:"Check-in Diario",     sub:"Recompensas por racha",    col:"#ef4444"},
    {id:"suscripciones",icon:"🔄",title:"Suscripciones",      sub:"Ver cobros pendientes",    col:"#0ea5e9"},
    {id:"perfil",     icon:"👤", title:"Personalización Perfil",sub:"Apodo, títulos, fondos, préstamos",col:"#f59e0b"},
    {id:"premios",    icon:"🏆", title:"Premios y Recompensas",  sub:"Ranking, manual, historial",     col:"#10b981"},
    {id:"historial",  icon:"📋", title:"Historial de Pagos",  sub:"Premios, banco, impuestos",col:"#64748b"},
  ];

  if(!sec) return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#10b981",color:"white",padding:"22px 16px 20px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",
            alignItems:"center",justifyContent:"center"}}>←</button>
          <div>
            <div style={{fontWeight:900,fontSize:20}}>💹 Economía</div>
            <div style={{fontSize:11,opacity:.85}}>Gestión completa de items y premios</div>
          </div>
        </div>
      </div>
      <div style={{padding:"14px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {SECCIONES.map(s=>(
          <div key={s.id} onClick={()=>setSec(s.id)}
            style={{background:"white",borderRadius:20,padding:"20px 16px",cursor:"pointer",
              boxShadow:"0 2px 12px rgba(0,0,0,.06)",
              borderTop:`4px solid ${s.col}`,transition:"transform .15s"}}>
            <div style={{fontSize:36,marginBottom:8}}>{s.icon}</div>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",lineHeight:1.2}}>{s.title}</div>
            <div style={{fontSize:11,color:"#aaa",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return <AdminEconomiaSec sec={sec} onBack={()=>setSec(null)} showToast={showToast}/>;
}

function AdminEconomiaSec({sec, onBack, showToast}){
  const [items,setItems]   = useState([]);
  const [config,setConfig] = useState([]);
  const [payouts,setPayouts]= useState([]);
  const [loading,setLoading]= useState(true);
  const [editing,setEditing]  = useState(null);
  const [creating,setCreating] = useState(false);
  const [newItem,setNewItem]   = useState({nombre:"",precio:0,precio_mensual:0,es_suscripcion:false,periodo_default:"monthly",activo:true,preview:"✨"});
  const [editVal,setEditVal]= useState({});
  const [saving,setSaving]  = useState(false);
  const [closingSec,setClosing]= useState(null);
  // Perfil section state
  const [perfilTab,setPerfilTab]= useState("items"); // items|titles|loans
  const [grantUser,setGrantUser]= useState("");
  const [grantForm,setGrantForm]= useState({name:"",rarity:"common",color:"#8b5cf6",glow_color:"#8b5cf6",emoji:"",note:""});
  const [loanUser,setLoanUser]  = useState("");
  const [loanFrame,setLoanFrame]= useState("Marco Dorado");
  const [loanNote,setLoanNote]  = useState("");
  const [loanDays,setLoanDays]  = useState("");
  const [granting,setGranting]  = useState(false);
  // Premios section
  const [premioTab,setPremioTab]   = useState("ranking"); // ranking|manual|historial
  const [prizeSets,setPrizeSets]   = useState([]);
  const [prizeHistory,setPrizeHistory] = useState([]);
  const [manualUser,setManualUser] = useState("");
  const [manualPremios,setManualPremios] = useState([]); // [{tipo,valor}]
  const [addingPremio,setAddingPremio] = useState(null); // {tipo}
  const [premioForm,setPremioForm] = useState({});
  const [executing,setExecuting]   = useState(null);
  const [closeMotivo,setCloseMotivo]=useState("");
  const [periodoClose,setPClose]=useState("weekly");
  const [scopeClose,setSClose]=useState("global");

  const SEC_TIPO = {
    colores: "name_color", temas: "theme", fondos: "screen_mode", emojis: "emoji_pack",
    estilos: "text_style",
    efectos: ["title_effect","name_effect","avatar_frame"],
  };
  const PERIODO_PER_SEC = ["colores","temas","estilos","fondos"];

  useEffect(()=>{
    if(["colores","temas","fondos","emojis","estilos","efectos"].includes(sec)){
      const tipo = SEC_TIPO[sec];
      const tipoParam = Array.isArray(tipo)?tipo[0]:tipo;
      api.customAdminItems()
        .then(d=>{
          const arr=d.data||d||[];
          if(Array.isArray(SEC_TIPO[sec])){
            setItems(arr.filter(i=>SEC_TIPO[sec].includes(i.tipo)));
          } else {
            setItems(arr.filter(i=>i.tipo===tipoParam));
          }
        }).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="ranking"){
      api.rankingConfig().then(d=>setConfig(d.data||d||[])).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="checkin"){
      api.checkinConfig().then(d=>setConfig(d.data?[d.data]:d||[])).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="historial"){
      Promise.all([api.rankingPayouts(), api.auditLog()]).then(([rp,al])=>{
        const rpArr=(rp.data||rp||[]).map(x=>({...x,categoria:"premio_ranking"}));
        const alArr=(al.data||al||[]).filter(l=>l.action==="reward"||l.details?.tax||l.details?.banco).map(x=>({...x,categoria:x.details?.tax?"impuesto":x.details?.banco?"banco":"reward"}));
        setPayouts([...rpArr,...alArr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,50));
      }).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="suscripciones"){
      api.chargeAll().then(d=>setItems(d.data?.results||[])).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="premios"){
      Promise.all([api.prizeSets(), api.prizeHistory(), api.adminUsers()])
        .then(([ps, ph, us])=>{
          setPrizeSets(ps.data||ps||[]);
          setPrizeHistory(ph.data||ph||[]);
          setConfig(us.data||us||[]);
        }).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="perfil"){
      // Cargar items de perfil (apodo, titulo_custom, estado) + users + loaned items
      Promise.all([
        api.customAdminItems(),
        api.adminUsers(),
      ]).then(([items, usersRes])=>{
        const allItems = items.data||items||[];
        const profileItems = allItems.filter(i=>['nickname','title_custom','estado'].includes(i.tipo));
        setItems(profileItems);
        setConfig(usersRes.data||usersRes||[]);
      }).catch(()=>{}).finally(()=>setLoading(false));
    }
  },[sec]);

  const guardar=async()=>{
    if(!editing) return;
    setSaving(true);
    try{
      if(sec==="ranking"){
        await api.rankingConfigUpdate(editing.id, editVal);
        setConfig(prev=>prev.map(c=>c.id===editing.id?{...c,...editVal}:c));
      } else if(sec==="checkin"){
        await api.checkinConfigUpdate(editVal);
        setConfig(prev=>prev.map(c=>c.id===editing.id?{...c,...editVal}:c));
      } else {
        // El PATCH devuelve el item actualizado — usarlo directo, sin segunda llamada
        const res = await api.customAdminUpdate(editing.id, editVal);
        const updated = res.data || res;
        setItems(prev=>prev.map(i=>i.id===editing.id ? {...i,...updated} : i));
      }
      showToast("✅ Guardado");
      setEditing(null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const crearItem=async()=>{
    if(!newItem.nombre.trim()){showToast("Escribí un nombre","error");return;}
    setSaving(true);
    try{
      const tipo = Array.isArray(SEC_TIPO[sec])?SEC_TIPO[sec][0]:SEC_TIPO[sec];
      const data = {...newItem, tipo,
        config: tipo==="screen_mode"
          ? {bg:"#1a1a2e",pageBg:"#1a1a2e",card:"#16213e",nav:"#16213e",inputBg:"#0f3460",isDark:true}
          : tipo==="theme"
          ? {primary:"#00c1fc",accent:"#0369a1",secondary:"#0369a1"}
          : {}
      };
      const d = await api.customAdminCreate(data);
      setItems(prev=>[...prev, d.data||d]);
      setCreating(false);
      setNewItem({nombre:"",precio:0,precio_mensual:0,es_suscripcion:false,periodo_default:"monthly",activo:true,preview:"✨"});
      showToast("Item creado ✅");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const cerrarPeriodo=async()=>{
    setSaving(true);
    try{
      const d=await api.rankingClose({periodo:periodoClose,scope:scopeClose});
      const r=d.data||d;
      showToast(`Premios distribuidos a ${r.pagados} alumnos`);
      setClosing(null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const revertirPago=async(payout)=>{
    try{
      await api.rankingRevert(payout.id,"Revertido por admin");
      setPayouts(prev=>prev.map(p=>p.id===payout.id?{...p,revertida:true}:p));
      showToast("Pago revertido");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const SEC_TITLE = {
    colores:"🖊️ Colores de Nombre", temas:"🎨 Temas", fondos:"🖼️ Fondos de Pantalla",
    emojis:"😄 Packs Emoji", efectos:"✨ Efectos", ranking:"🏆 Premios Ranking",
    checkin:"🔥 Check-in", suscripciones:"🔄 Suscripciones", historial:"📋 Historial",
  };

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#10b981",color:"white",padding:"22px 16px 16px",
        position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",
            alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{fontWeight:900,fontSize:18}}>{SEC_TITLE[sec]||sec}</div>
        </div>
      </div>

      {/* Modal edición */}
      {editing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setEditing(null);}}>
          <div style={{background:"white",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
            padding:"20px 20px 44px",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>
              ✏️ {editing.nombre||editing.descripcion||editing.item_key||"Item"}
            </div>

            {/* Precio único (compra) — para todos los tipos de item */}
            {sec!=="ranking"&&sec!=="checkin"&&sec!=="suscripciones"&&sec!=="historial"&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>
                  💰 Precio de compra único (0 = solo suscripción)
                </div>
                <input type="number" min="0"
                  value={editVal.precio??editing.precio??0}
                  onChange={e=>setEditVal(v=>({...v,precio:parseInt(e.target.value)||0}))}
                  style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                    borderRadius:12,padding:"10px 14px",fontSize:20,fontWeight:900,outline:"none",
                    color:"#10b981",textAlign:"center",fontFamily:"Nunito,sans-serif"}}/>
              </div>
            )}

            {/* Suscripción */}
            {sec!=="ranking"&&sec!=="checkin"&&sec!=="suscripciones"&&sec!=="historial"&&(
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#666"}}>🔄 Es suscripción</span>
                  <div style={{display:"flex",gap:6}}>
                    {[true,false].map(v=>(
                      <button key={String(v)} onClick={()=>setEditVal(ev=>({...ev,es_suscripcion:v}))}
                        style={{background:(editVal.es_suscripcion??editing.es_suscripcion)===v
                          ?(v?"#8b5cf6":"#e5e7eb"):"#f0f0f0",
                          color:(editVal.es_suscripcion??editing.es_suscripcion)===v&&v?"white":"#555",
                          border:"none",borderRadius:99,padding:"5px 14px",fontSize:11,
                          fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        {v?"Sí":"No"}
                      </button>
                    ))}
                  </div>
                </div>

                {(editVal.es_suscripcion??editing.es_suscripcion)&&(
                  <div style={{background:"#f8f4ff",borderRadius:14,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:8}}>💸 Precio mensual</div>
                    <input type="number" min="0"
                      value={editVal.precio_mensual??editing.precio_mensual??0}
                      onChange={e=>setEditVal(v=>({...v,precio_mensual:parseInt(e.target.value)||0}))}
                      style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                        borderRadius:12,padding:"10px 14px",fontSize:20,fontWeight:900,outline:"none",
                        color:"#8b5cf6",textAlign:"center",fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
                    <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>Período de renovación</div>
                    <div style={{display:"flex",gap:6}}>
                      {[["weekly","📅 Semanal"],["monthly","🗓️ Mensual"],["annual","📆 Anual"]].map(([v,l])=>{
                        const sel=(editVal.periodo_default??editing.periodo_default??"monthly")===v;
                        return(
                          <button key={v} onClick={()=>setEditVal(ev=>({...ev,periodo_default:v}))}
                            style={{flex:1,background:sel?"#8b5cf6":"#f0f0f0",color:sel?"white":"#555",
                              border:`2px solid ${sel?"#8b5cf6":"transparent"}`,borderRadius:10,
                              padding:"8px 4px",fontWeight:800,fontSize:10,cursor:"pointer",
                              fontFamily:"Nunito,sans-serif",textAlign:"center"}}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Premio ranking */}
            {sec==="ranking"&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>🏆 Premio 🪙</div>
                <input type="number" min="0"
                  value={editVal.premio??editing.premio??0}
                  onChange={e=>setEditVal(v=>({...v,premio:parseInt(e.target.value)||0}))}
                  style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                    borderRadius:12,padding:"10px 14px",fontSize:20,fontWeight:900,outline:"none",
                    color:"#f59e0b",textAlign:"center",fontFamily:"Nunito,sans-serif"}}/>
              </div>
            )}

            {/* Activo/Inactivo */}
            <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>Estado</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[true,false].map(v=>(
                <button key={String(v)} onClick={()=>setEditVal(ev=>({...ev,activo:v}))}
                  style={{flex:1,background:(editVal.activo??editing.activo??true)===v
                    ?(v?"#10b981":"#ef4444"):"#f0f0f0",
                    color:(editVal.activo??editing.activo??true)===v?"white":"#555",
                    border:"none",borderRadius:12,padding:"10px",fontWeight:800,fontSize:13,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {v?"✅ Activo":"❌ Inactivo"}
                </button>
              ))}
            </div>

            <button onClick={guardar} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":"#10b981",border:"none",borderRadius:50,
                color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {saving?"Guardando...":"💾 Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}

        {/* Built-ins para fondos — solo Claro es gratis */}
        {sec==="fondos"&&!loading&&(
          <>
            {[
              {id:"claro", nombre:"Claro", icon:"☀️", note:"Gratis · Predeterminado para todos"},
            ].map(b=>(
              <div key={b.id} style={{background:"white",borderRadius:14,marginBottom:8,
                overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.06)",opacity:.7}}>
                <div style={{height:4,background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{b.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{b.nombre}</div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{b.note}</div>
                  </div>
                  <span style={{fontSize:10,color:"#10b981",fontWeight:700,background:"#10b98122",
                    borderRadius:99,padding:"3px 8px"}}>Built-in</span>
                </div>
              </div>
            ))}
            <div style={{borderBottom:"1px dashed #eee",margin:"8px 0 12px",
              fontSize:11,color:"#aaa",textAlign:"center",paddingBottom:8}}>
              ▼ Fondos de la tienda
            </div>
          </>
        )}

        {/* Items de personalización */}
        {["colores","temas","fondos","emojis","estilos","efectos"].includes(sec)&&!loading&&items.map(item=>(
          <div key={item.id} style={{background:"white",borderRadius:14,marginBottom:8,
            overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.06)",opacity:item.activo?1:.5}}>
            {item.tipo==="theme"&&(
              <div style={{height:6,background:`linear-gradient(90deg,${item.config?.primary||"#00c1fc"},${item.config?.accent||"#00c1fc"})`}}/>
            )}
            {item.tipo==="name_color"&&(
              <div style={{height:6,background:item.config?.rainbow
                ?"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6,#00c1fc)"
                :item.config?.color||"#00c1fc"}}/>
            )}
            <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{item.preview||"✨"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{item.nombre}</div>
                <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap",alignItems:"center"}}>
                  {item.es_suscripcion?(
                    <span style={{fontSize:11,fontWeight:800,color:"#8b5cf6"}}>
                      🔄 🪙{item.precio_mensual??0}/{item.periodo_default==="weekly"?"sem":item.periodo_default==="annual"?"año":"mes"}
                    </span>
                  ):(
                    <span style={{fontSize:11,fontWeight:800,color:"#10b981"}}>
                      {item.precio===0?"Gratis":`🪙${item.precio} único`}
                    </span>
                  )}
                  {!item.activo&&<span style={{fontSize:9,color:"#aaa",fontWeight:700}}>Inactivo</span>}
                </div>
              </div>
              <button onClick={()=>{setEditing(item);setEditVal({
                precio: item.precio??0,
                precio_mensual: item.precio_mensual??0,
                es_suscripcion: item.es_suscripcion??false,
                periodo_default: item.periodo_default??"monthly",
                activo: item.activo??true,
              });}}
                style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 12px",
                  fontSize:11,fontWeight:800,cursor:"pointer",color:"#555",fontFamily:"Nunito,sans-serif"}}>
                Editar
              </button>
            </div>
          </div>
        ))}

        {/* Botón crear nuevo item (para modos, temas, estilos, colores, emojis) */}
        {["fondos","temas","estilos","colores","emojis"].includes(sec)&&!loading&&(
          <button onClick={()=>setCreating(true)}
            style={{width:"100%",background:"#10b981",border:"none",borderRadius:14,
              color:"white",padding:"13px",fontWeight:800,fontSize:13,cursor:"pointer",
              fontFamily:"Nunito,sans-serif",marginTop:8}}>
            + Crear nuevo {sec==="fondos"?"fondo":sec==="temas"?"tema":sec==="estilos"?"estilo":sec==="colores"?"color":"pack"}
          </button>
        )}

        {/* Modal crear nuevo item */}
        {creating&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}
            onClick={e=>{if(e.target===e.currentTarget)setCreating(false);}}>
            <div style={{background:"white",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
              padding:"20px 20px 44px",maxHeight:"80vh",overflowY:"auto"}}>
              <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 14px"}}/>
              <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>➕ Nuevo item</div>

              {[["nombre","Nombre","text"],["preview","Emoji preview","text"]].map(([k,label,type])=>(
                <div key={k} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>{label}</div>
                  <input type={type} value={newItem[k]}
                    onChange={e=>setNewItem(v=>({...v,[k]:e.target.value}))}
                    style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                      borderRadius:12,padding:"10px 14px",fontSize:14,outline:"none",
                      fontFamily:"Nunito,sans-serif"}}/>
                </div>
              ))}

              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>💰 Precio de compra</div>
                <input type="number" min="0" value={newItem.precio}
                  onChange={e=>setNewItem(v=>({...v,precio:parseInt(e.target.value)||0}))}
                  style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                    borderRadius:12,padding:"10px 14px",fontSize:20,fontWeight:900,outline:"none",
                    color:"#10b981",textAlign:"center",fontFamily:"Nunito,sans-serif"}}/>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:700,color:"#666"}}>🔄 Es suscripción</span>
                <div style={{display:"flex",gap:6}}>
                  {[true,false].map(v=>(
                    <button key={String(v)} onClick={()=>setNewItem(ev=>({...ev,es_suscripcion:v}))}
                      style={{background:newItem.es_suscripcion===v?(v?"#8b5cf6":"#e5e7eb"):"#f0f0f0",
                        color:newItem.es_suscripcion===v&&v?"white":"#555",border:"none",borderRadius:99,
                        padding:"5px 14px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {v?"Sí":"No"}
                    </button>
                  ))}
                </div>
              </div>

              {newItem.es_suscripcion&&(
                <div style={{background:"#f8f4ff",borderRadius:14,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:6}}>💸 Precio mensual</div>
                  <input type="number" min="0" value={newItem.precio_mensual}
                    onChange={e=>setNewItem(v=>({...v,precio_mensual:parseInt(e.target.value)||0}))}
                    style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                      borderRadius:12,padding:"10px 14px",fontSize:20,fontWeight:900,outline:"none",
                      color:"#8b5cf6",textAlign:"center",fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
                  <div style={{display:"flex",gap:6}}>
                    {[["weekly","📅 Semanal"],["monthly","🗓️ Mensual"],["annual","📆 Anual"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setNewItem(ev=>({...ev,periodo_default:v}))}
                        style={{flex:1,background:newItem.periodo_default===v?"#8b5cf6":"#f0f0f0",
                          color:newItem.periodo_default===v?"white":"#555",border:"none",borderRadius:10,
                          padding:"8px 4px",fontWeight:800,fontSize:10,cursor:"pointer",
                          fontFamily:"Nunito,sans-serif",textAlign:"center"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={crearItem} disabled={saving}
                style={{width:"100%",background:saving?"#ccc":"#10b981",border:"none",borderRadius:50,
                  color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {saving?"Creando...":"✅ Crear item"}
              </button>
            </div>
          </div>
        )}

        {/* Ranking config */}
        {sec==="ranking"&&!loading&&(
          <>
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:12,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:10}}>Distribuir premios ahora</div>
              <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                {[["daily","Diario"],["weekly","Semanal"],["monthly","Mensual"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setPClose(v)}
                    style={{background:periodoClose===v?"#10b981":"#f0f0f0",
                      color:periodoClose===v?"white":"#555",border:"none",borderRadius:99,
                      padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {[["global","🌐 Global"],["aula","🏫 Aula"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setSClose(v)}
                    style={{flex:1,background:scopeClose===v?"#10b981":"#f0f0f0",
                      color:scopeClose===v?"white":"#555",border:"none",borderRadius:10,
                      padding:"8px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={cerrarPeriodo} disabled={saving}
                style={{width:"100%",background:saving?"#ccc":"#10b981",border:"none",borderRadius:50,
                  color:"white",padding:"12px",fontWeight:800,fontSize:14,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {saving?"Distribuyendo...":"🏆 Distribuir premios"}
              </button>
            </div>

            {/* Tabla de premios por período */}
            {[["daily","Diario"],["weekly","Semanal"],["monthly","Mensual"]].map(([p,pl])=>(
              <div key={p} style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
                boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:8}}>{pl} — Global</div>
                {config.filter(c=>c.periodo===p&&c.scope==="global").map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:14}}>{c.posicion<=3?["🥇","🥈","🥉"][c.posicion-1]:`#${c.posicion}`}</span>
                    <div style={{flex:1,fontSize:12,color:"#555"}}>Posición {c.posicion}</div>
                    <span style={{fontWeight:800,color:"#10b981",fontSize:13}}>🪙{c.premio}</span>
                    <button onClick={()=>{setEditing(c);setEditVal({});}}
                      style={{background:"#f0f0f0",border:"none",borderRadius:8,padding:"4px 10px",
                        fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Check-in config */}
        {sec==="checkin"&&!loading&&config.map(c=>(
          <div key={c.id} style={{background:"white",borderRadius:14,padding:"12px 14px",
            marginBottom:8,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            {[
              ["base_reward","🪙 Recompensa base/día"],
              ["bonus_3days","🥉 Bonus 3 días"],
              ["bonus_7days","🥈 Bonus 7 días"],
              ["bonus_30days","🥇 Bonus 30 días"],
            ].map(([k,l])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{flex:1,fontSize:12,color:"#333",fontWeight:600}}>{l}</div>
                <span style={{fontWeight:800,color:"#f59e0b"}}>🪙{c[k]}</span>
                <button onClick={()=>{setEditing({...c,nombre:l,id:c.id});setEditVal({});}}
                  style={{background:"#f0f0f0",border:"none",borderRadius:8,padding:"4px 10px",
                    fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Editar
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Historial unificado */}
        {sec==="historial"&&!loading&&(
          <>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              {[
                {v:"premio_ranking",l:"🏆 Ranking",c:"#10b981"},
                {v:"banco",l:"🏛️ Banco",c:"#3b82f6"},
                {v:"impuesto",l:"⚖️ Impuesto",c:"#f97316"},
              ].map(f=>(
                <span key={f.v} style={{background:f.c+"22",color:f.c,borderRadius:99,
                  padding:"4px 10px",fontSize:10,fontWeight:800}}>
                  {f.l} ({payouts.filter(p=>p.categoria===f.v).length})
                </span>
              ))}
            </div>
            {payouts.map((p,i)=>(
              <div key={p.id||i} style={{background:"white",borderRadius:14,marginBottom:8,
                boxShadow:"0 1px 6px rgba(0,0,0,.05)",padding:"10px 14px",
                opacity:p.revertida?.7:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>
                    {p.categoria==="premio_ranking"?"🏆":p.categoria==="banco"?"🏛️":"⚖️"}
                  </span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:12,color:"#1a1a1a"}}>
                      {p.nombre||p.target_nombre||p.actor_nombre||"Usuario"}
                    </div>
                    <div style={{fontSize:10,color:"#aaa"}}>
                      {p.categoria==="premio_ranking"?`Pos #${p.posicion} · ${p.periodo_label}`:
                       p.categoria==="banco"?`Banco · ${p.details?.tipo||""}`:
                       `Impuesto · ${p.details?.motivo||""}`}
                    </div>
                    <div style={{fontSize:10,color:"#bbb"}}>
                      {new Date(p.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:13,
                      color:p.categoria==="impuesto"?"#f97316":"#10b981"}}>
                      {p.categoria==="impuesto"?"-":"+"}🪙{p.premio||p.details?.amount||"?"}
                    </div>
                    {!p.revertida&&p.categoria==="premio_ranking"&&(
                      <button onClick={()=>revertirPago(p)}
                        style={{background:"#fee2e2",border:"none",borderRadius:99,color:"#ef4444",
                          padding:"3px 8px",fontSize:9,fontWeight:800,cursor:"pointer",
                          fontFamily:"Nunito,sans-serif",marginTop:3}}>
                        Revertir
                      </button>
                    )}
                    {p.revertida&&<span style={{fontSize:9,color:"#aaa"}}>Revertido</span>}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Modal agregar ítem a prize set */}
      {addingPremio&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setAddingPremio(null);setPremioForm({});}}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",
            fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>
              {addingPremio.isManual?"🎁 Agregar premio manual":"🎁 Premio para "+addingPremio.puesto+"° puesto"}
            </div>
            <div style={{fontSize:12,color:"#888",marginBottom:14}}>
              Tipo: <strong>{addingPremio.tipo||"elegí abajo"}</strong>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>

              {/* Duración */}
              {addingPremio.tipo&&addingPremio.tipo!=="monedas"&&addingPremio.tipo!=="skin"&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Duración:</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[
                      {label:"1 día",days:1},{label:"3 días",days:3},{label:"1 semana",days:7},
                      {label:"1 mes",days:30},{label:"6 meses",days:180},{label:"1 año",days:365},
                      {label:"Para siempre",days:null}
                    ].map(opt=>(
                      <button key={opt.label}
                        onClick={()=>setPremioForm(v=>({...v,expires_days:opt.days}))}
                        style={{background:premioForm.expires_days===opt.days?"#10b98122":"#f7f7f7",
                          border:`1.5px solid ${premioForm.expires_days===opt.days?"#10b981":"#eee"}`,
                          borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,
                          cursor:"pointer",color:premioForm.expires_days===opt.days?"#065f46":"#555",
                          fontFamily:"Nunito,sans-serif"}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos según tipo */}
              {addingPremio.tipo==="monedas"&&(
                <input type="number" value={premioForm.cantidad||""} min="1"
                  onChange={e=>setPremioForm(v=>({...v,cantidad:parseInt(e.target.value)||0}))}
                  placeholder="Cantidad de monedas"
                  style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                    padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
              )}
              {addingPremio.tipo==="titulo"&&(<>
                <input value={premioForm.name||""} onChange={e=>setPremioForm(v=>({...v,name:e.target.value}))}
                  placeholder="Nombre del título"
                  style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                    padding:"10px 12px",fontSize:13,fontWeight:700,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                <input value={premioForm.emoji||""} onChange={e=>setPremioForm(v=>({...v,emoji:e.target.value.slice(0,4)}))}
                  placeholder="Emoji (ej: 🏆)"
                  style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                <div style={{display:"flex",gap:6}}>
                  {[{id:"common",label:"Común",col:"#94a3b8"},{id:"rare",label:"Raro",col:"#3b82f6"},
                    {id:"epic",label:"Épico",col:"#8b5cf6"},{id:"legendary",label:"Legendario",col:"#f59e0b"}
                  ].map(r=>(
                    <button key={r.id} onClick={()=>setPremioForm(v=>({...v,rarity:r.id,color:r.col,glow_color:r.col}))}
                      style={{flex:1,background:premioForm.rarity===r.id?r.col+"22":"#f7f7f7",
                        border:`1.5px solid ${premioForm.rarity===r.id?r.col:"#eee"}`,
                        borderRadius:8,padding:"7px 4px",fontSize:10,fontWeight:800,
                        cursor:"pointer",color:r.col,fontFamily:"Nunito,sans-serif"}}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </>)}
              {(addingPremio.tipo==="borde"||addingPremio.tipo==="skin")&&(
                <select value={premioForm.item_id||""}
                  onChange={e=>setPremioForm(v=>({...v,item_id:e.target.value,name:e.target.options[e.target.selectedIndex].text}))}
                  style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}>
                  <option value="">— Elegí —</option>
                  {addingPremio.tipo==="borde"
                    ?[{id:"b2",n:"Dorado"},{id:"b3",n:"Verde"},{id:"b4",n:"Rojo"},{id:"b5",n:"Violeta"}]
                      .map(b=><option key={b.id} value={b.id}>{b.n}</option>)
                    :[{id:"s2",n:"Ninja"},{id:"s3",n:"Astro"},{id:"s4",n:"Mago"},{id:"s5",n:"Robot"},{id:"s6",n:"Vikingo"},{id:"s7",n:"Pirata"},{id:"s8",n:"Alien"}]
                      .map(s=><option key={s.id} value={s.id}>{s.n}</option>)
                  }
                </select>
              )}
              {addingPremio.tipo==="marco"&&(
                <select value={premioForm.name||""}
                  onChange={e=>{
                    const FRAMES=[
                      {name:"Marco Dorado",type:"frame",value:"3px solid #f59e0b",glow:"#f59e0b66"},
                      {name:"Marco Épico",type:"frame",value:"3px solid #8b5cf6",glow:"#8b5cf666"},
                      {name:"Marco Rojo",type:"frame",value:"3px solid #ef4444",glow:"#ef444466"},
                      {name:"Fuego",type:"gradient",value:"linear-gradient(135deg,#f97316,#ef4444)",glow:null},
                      {name:"Aurora",type:"gradient",value:"linear-gradient(135deg,#a855f7,#ec4899,#f59e0b)",glow:null},
                    ];
                    const f=FRAMES.find(x=>x.name===e.target.value);
                    if(f) setPremioForm(v=>({...v,...f}));
                  }}
                  style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}>
                  <option value="">— Elegí marco —</option>
                  {["Marco Dorado","Marco Épico","Marco Rojo","Fuego","Aurora"].map(n=>(
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}

              <input value={premioForm.note||""} onChange={e=>setPremioForm(v=>({...v,note:e.target.value}))}
                placeholder="Nota para el alumno (opcional)"
                style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                  padding:"10px 12px",fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>

              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{
                  if(!addingPremio.tipo) return;
                  // Build valor
                  let valor = {...premioForm};
                  if(addingPremio.tipo==="monedas") valor = {cantidad:premioForm.cantidad||0,motivo:premioForm.note};
                  const premio = {tipo:addingPremio.tipo, valor};

                  if(addingPremio.isManual){
                    setManualPremios(prev=>[...prev, premio]);
                    setAddingPremio(null); setPremioForm({});
                  } else {
                    setGranting(true);
                    try{
                      await api.prizeAddItem(addingPremio.setId, premio);
                      showToast("Premio agregado ✅");
                      api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                      setAddingPremio(null); setPremioForm({});
                    }catch(e){showToast(e.message||"Error","error");}
                    finally{setGranting(false);}
                  }
                }} disabled={granting}
                  style={{flex:1,background:granting?"#ccc":"#10b981",border:"none",borderRadius:50,
                    color:"white",padding:"12px",fontWeight:800,fontSize:14,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {granting?"Guardando...":addingPremio.isManual?"+ Agregar a la lista":"✅ Guardar"}
                </button>
                <button onClick={()=>{setAddingPremio(null);setPremioForm({});}}
                  style={{background:"#f0f0f0",border:"none",borderRadius:50,color:"#555",
                    padding:"12px 18px",fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sec==="suscripciones"&&!loading&&(
          <>
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:8}}>Cobrar suscripciones vencidas</div>
              <button onClick={()=>{setSaving(true);api.chargeAll().then(d=>{
                showToast(`Procesadas ${d.data?.procesados||0} suscripciones`);
                setItems(d.data?.results||[]);
              }).catch(e=>showToast(e.message||"Error","error")).finally(()=>setSaving(false));}} disabled={saving}
                style={{width:"100%",background:saving?"#ccc":"#0ea5e9",border:"none",borderRadius:50,
                  color:"white",padding:"12px",fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                {saving?"Procesando...":"🔄 Cobrar todas las vencidas"}
              </button>
            </div>
            {items.map((r,i)=>(
              <div key={i} style={{background:"white",borderRadius:14,padding:"10px 14px",marginBottom:6,
                boxShadow:"0 1px 6px rgba(0,0,0,.05)",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:14,
                  color:r.status==="charged"?"#10b981":r.status==="cancelled_no_funds"?"#ef4444":"#aaa"}}>
                  {r.status==="charged"?"✅":r.status==="cancelled_no_funds"?"❌":"⚠️"}
                </span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{r.user}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>{r.item}</div>
                </div>
                <span style={{fontWeight:800,fontSize:12,color:r.status==="charged"?"#10b981":"#ef4444"}}>
                  {r.status==="charged"?`-🪙${r.precio}`:r.status==="cancelled_no_funds"?"Cancelada":"Error"}
                </span>
              </div>
            ))}
          </>
        )}
      {sec==="perfil"&&!loading&&(
        <div>
          {/* Tabs */}
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[["items","⚙️ Items"],["titles","🏅 Títulos"],["loans","🎁 Préstamos"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setPerfilTab(id)}
                style={{flex:1,background:perfilTab===id?"#f59e0b22":"white",
                  border:`1.5px solid ${perfilTab===id?"#f59e0b":"#eee"}`,
                  borderRadius:10,padding:"8px 4px",fontSize:11,fontWeight:800,
                  cursor:"pointer",color:perfilTab===id?"#b45309":"#555",
                  fontFamily:"Nunito,sans-serif"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Items de perfil (apodo, titulo_custom, estado) */}
          {perfilTab==="items"&&(
            <>
              <div style={{fontSize:11,color:"#888",marginBottom:10,lineHeight:1.5}}>
                Estos son los items comprables de perfil. Editá precio, suscripción y estado.
              </div>
              {items.length===0&&(
                <div style={{background:"white",borderRadius:14,padding:16,textAlign:"center",
                  color:"#aaa",fontSize:12}}>
                  No hay items de perfil. Creá uno desde la sección Personalización → Efectos.
                </div>
              )}
              {items.map(item=>(
                <div key={item.id} style={{background:"white",borderRadius:14,marginBottom:8,
                  overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                  <div style={{height:4,background:"linear-gradient(90deg,#f59e0b,#ef4444)"}}/>
                  <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{item.tipo==="nickname"?"🏷️":item.tipo==="title_custom"?"📛":"💬"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{item.nombre}</div>
                      <div style={{fontSize:10,color:"#888"}}>{item.tipo}</div>
                      {item.es_suscripcion
                        ? <span style={{fontSize:10,color:"#8b5cf6",fontWeight:700}}>
                            🔄 🪙{item.precio_mensual}/mes · compra: 🪙{item.precio}
                          </span>
                        : <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>
                            🪙{item.precio} compra · 🪙{item.precio} por cambio
                          </span>
                      }
                    </div>
                    <button onClick={()=>{setEditing(item);setEditVal({
                      precio:item.precio||0,
                      precio_mensual:item.precio_mensual||0,
                      es_suscripcion:item.es_suscripcion||false,
                      periodo_default:item.periodo_default||"monthly",
                      activo:item.activo??true,
                    });}}
                      style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 12px",
                        fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Otorgar títulos */}
          {perfilTab==="titles"&&(
            <>
              <div style={{fontSize:11,color:"#888",marginBottom:12,lineHeight:1.5}}>
                Otorgá títulos únicos a alumnos. Aparecen con efectos especiales según rareza.
              </div>
              <div style={{background:"white",borderRadius:14,padding:16,
                boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                {/* Buscar usuario */}
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Alumno destinatario:</div>
                <select value={grantUser} onChange={e=>{
                  const uid=e.target.value; setGrantUser(uid);
                  if(uid) api.earnedTitlesOf(uid).then(d=>{
                    setPayouts(prev=>({...prev,[uid]:Array.isArray(d)?d:(d?.data||[])}));
                  }).catch(()=>{});
                }}
                  style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",
                    borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none",
                    fontFamily:"Nunito,sans-serif",marginBottom:12,boxSizing:"border-box"}}>
                  <option value="">— Seleccioná un alumno —</option>
                  {(config||[]).filter(u=>u.rol==="student").map(u=>(
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input value={grantForm.name} onChange={e=>setGrantForm(v=>({...v,name:e.target.value.slice(0,40)}))}
                    placeholder="Nombre del título (ej: El Primero 🥇)"
                    style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:13,fontWeight:700,outline:"none",
                      fontFamily:"Nunito,sans-serif"}}/>
                  <input value={grantForm.emoji} onChange={e=>setGrantForm(v=>({...v,emoji:e.target.value.slice(0,4)}))}
                    placeholder="Emoji único (ej: 🏆)"
                    style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                  <div style={{display:"flex",gap:6}}>
                    {[
                      {id:"common",label:"Común",color:"#94a3b8"},
                      {id:"rare",label:"Raro",color:"#3b82f6"},
                      {id:"epic",label:"Épico",color:"#8b5cf6"},
                      {id:"legendary",label:"Legendario",color:"#f59e0b"},
                    ].map(r=>(
                      <button key={r.id} onClick={()=>setGrantForm(v=>({...v,rarity:r.id,color:r.color,glow_color:r.color}))}
                        style={{flex:1,background:grantForm.rarity===r.id?r.color+"22":"#f7f7f7",
                          border:`1.5px solid ${grantForm.rarity===r.id?r.color:"#eee"}`,
                          borderRadius:8,padding:"7px 4px",fontSize:10,fontWeight:800,
                          cursor:"pointer",color:r.color,fontFamily:"Nunito,sans-serif"}}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#555",fontWeight:700}}>Color:</span>
                    <input type="color" value={grantForm.color}
                      onChange={e=>setGrantForm(v=>({...v,color:e.target.value}))}
                      style={{width:40,height:32,border:"none",borderRadius:8,cursor:"pointer"}}/>
                    <span style={{fontSize:12,color:"#555",fontWeight:700}}>Glow:</span>
                    <input type="color" value={grantForm.glow_color||"#8b5cf6"}
                      onChange={e=>setGrantForm(v=>({...v,glow_color:e.target.value}))}
                      style={{width:40,height:32,border:"none",borderRadius:8,cursor:"pointer"}}/>
                  </div>
                  <input value={grantForm.note} onChange={e=>setGrantForm(v=>({...v,note:e.target.value.slice(0,100)}))}
                    placeholder="Motivo (visible al alumno, opcional)"
                    style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                  <button
                    onClick={async()=>{
                      if(!grantUser||!grantForm.name.trim()){showToast("Completá todos los campos","error");return;}
                      setGranting(true);
                      try{
                        await api.grantTitle({user_id:grantUser,...grantForm});
                        showToast("🏅 Título otorgado!");
                        setGrantForm({name:"",rarity:"common",color:"#8b5cf6",glow_color:"#8b5cf6",emoji:"",note:""});
                        // Reload granted titles for selected user
                        if(grantUser) {
                          api.earnedTitlesOf(grantUser).then(d=>{
                            setPayouts(prev=>({...prev,[grantUser]:Array.isArray(d)?d:(d?.data||[])}));
                          }).catch(()=>{});
                        }
                        setGrantUser("");
                      }catch(e){showToast(e.message||"Error","error");}
                      finally{setGranting(false);}
                    }}
                    disabled={granting||!grantUser||!grantForm.name.trim()}
                    style={{background:granting||!grantUser||!grantForm.name.trim()?"#ccc":"#f59e0b",
                      border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
                      fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {granting?"Otorgando...":"🏅 Otorgar título"}
                  </button>
                  {/* Ver y revocar títulos del alumno seleccionado */}
                  {grantUser&&payouts[grantUser]?.length>0&&(
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:8}}>
                        Títulos otorgados a este alumno:
                      </div>
                      {payouts[grantUser].map(t=>(
                        <div key={t.id} style={{background:"#f9f9f9",borderRadius:10,
                          padding:"8px 12px",marginBottom:6,display:"flex",
                          alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>{t.emoji||"🏅"}</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:12,color:t.color||"#333"}}>{t.name}</div>
                            <div style={{fontSize:10,color:"#aaa"}}>{t.rarity} · {new Date(t.created_at).toLocaleDateString("es-AR")}</div>
                          </div>
                          <button onClick={async()=>{
                            try{
                              await api.revokeTitle(t.id);
                              setPayouts(prev=>({...prev,[grantUser]:prev[grantUser].filter(x=>x.id!==t.id)}));
                              showToast("Título revocado");
                            }catch(e){showToast(e.message||"Error","error");}
                          }} style={{background:"#fee2e2",border:"none",borderRadius:8,
                            color:"#ef4444",padding:"4px 8px",fontSize:10,fontWeight:700,
                            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                            Revocar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Préstamos de marcos */}
          {perfilTab==="loans"&&(
            <>
              <div style={{fontSize:11,color:"#888",marginBottom:12,lineHeight:1.5}}>
                Prestá marcos especiales a alumnos. Pueden ser temporales o permanentes.
              </div>
              <div style={{background:"white",borderRadius:14,padding:16,
                boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Alumno destinatario:</div>
                <select value={loanUser} onChange={e=>{
                  const uid=e.target.value; setLoanUser(uid);
                  if(uid) api.loanedItemsOf(uid)
                    .then(d=>setPayouts(prev=>({...prev,["loans_"+uid]:Array.isArray(d)?d:(d?.data||[])})))
                    .catch(()=>{});
                }}
                  style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",
                    borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none",
                    fontFamily:"Nunito,sans-serif",marginBottom:12,boxSizing:"border-box"}}>
                  <option value="">— Seleccioná un alumno —</option>
                  {(config||[]).filter(u=>u.rol==="student").map(u=>(
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Marco a prestar:</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {[
                    {name:"Marco Dorado",type:"frame",value:"3px solid #f59e0b",glow:"#f59e0b66"},
                    {name:"Marco Épico", type:"frame",value:"3px solid #8b5cf6",glow:"#8b5cf666"},
                    {name:"Marco Rojo",  type:"frame",value:"3px solid #ef4444",glow:"#ef444466"},
                    {name:"Marco Cyan",  type:"frame",value:"3px solid #06b6d4",glow:"#06b6d466"},
                    {name:"Fuego",       type:"gradient",value:"linear-gradient(135deg,#f97316,#ef4444)",glow:null},
                    {name:"Aurora",      type:"gradient",value:"linear-gradient(135deg,#a855f7,#ec4899,#f59e0b)",glow:null},
                  ].map(f=>(
                    <button key={f.name} onClick={()=>setLoanFrame(f.name)}
                      style={{background:loanFrame===f.name?"#f59e0b22":"#f7f7f7",
                        border:`1.5px solid ${loanFrame===f.name?"#f59e0b":"#eee"}`,
                        borderRadius:8,padding:"7px 12px",fontSize:11,fontWeight:700,
                        cursor:"pointer",color:loanFrame===f.name?"#b45309":"#555",
                        fontFamily:"Nunito,sans-serif"}}>
                      {f.name}
                    </button>
                  ))}
                </div>
                <input value={loanNote} onChange={e=>setLoanNote(e.target.value)}
                  placeholder="Motivo / mensaje para el alumno (opcional)"
                  style={{width:"100%",boxSizing:"border-box",background:"#f7f7f7",border:"1.5px solid #eee",
                    borderRadius:10,padding:"10px 12px",fontSize:12,outline:"none",
                    fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
                <input value={loanDays} onChange={e=>setLoanDays(e.target.value)}
                  placeholder="Días de duración (vacío = sin límite)" type="number" min="1"
                  style={{width:"100%",boxSizing:"border-box",background:"#f7f7f7",border:"1.5px solid #eee",
                    borderRadius:10,padding:"10px 12px",fontSize:12,outline:"none",
                    fontFamily:"Nunito,sans-serif",marginBottom:12}}/>
                <button
                  onClick={async()=>{
                    if(!loanUser){showToast("Seleccioná un alumno","error");return;}
                    const FRAMES=[
                      {name:"Marco Dorado",type:"frame",value:"3px solid #f59e0b",glow:"#f59e0b66"},
                      {name:"Marco Épico", type:"frame",value:"3px solid #8b5cf6",glow:"#8b5cf666"},
                      {name:"Marco Rojo",  type:"frame",value:"3px solid #ef4444",glow:"#ef444466"},
                      {name:"Marco Cyan",  type:"frame",value:"3px solid #06b6d4",glow:"#06b6d466"},
                      {name:"Fuego",       type:"gradient",value:"linear-gradient(135deg,#f97316,#ef4444)",glow:null},
                      {name:"Aurora",      type:"gradient",value:"linear-gradient(135deg,#a855f7,#ec4899,#f59e0b)",glow:null},
                    ];
                    const frame = FRAMES.find(f=>f.name===loanFrame);
                    setGranting(true);
                    try{
                      await api.loanItem({
                        user_id: loanUser,
                        type: "avatar_bg",
                        item_data: {id:"loaned_"+Date.now(),name:frame.name,type:frame.type,value:frame.value,glow:frame.glow||null},
                        note: loanNote||null,
                        expires_days: loanDays?parseInt(loanDays):null,
                      });
                      showToast(`🎁 ${frame.name} prestado!`);
                      setLoanUser(""); setLoanNote(""); setLoanDays("");
                    }catch(e){showToast(e.message||"Error","error");}
                    finally{setGranting(false);}
                  }}
                  disabled={granting||!loanUser}
                  style={{width:"100%",background:granting||!loanUser?"#ccc":"#f59e0b",
                    border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
                    fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {granting?"Prestando...":"🎁 Prestar marco"}
                </button>
                {/* Ver préstamos activos del alumno seleccionado */}
                {loanUser&&payouts["loans_"+loanUser]?.length>0&&(
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:8}}>
                      Préstamos activos:
                    </div>
                    {payouts["loans_"+loanUser].map(l=>{
                      const item = typeof l.item_data==="string"?JSON.parse(l.item_data):l.item_data;
                      return(
                        <div key={l.id} style={{background:"#f9f9f9",borderRadius:10,
                          padding:"8px 12px",marginBottom:6,display:"flex",
                          alignItems:"center",gap:8}}>
                          <span style={{fontSize:14}}>🖼️</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:12}}>{item?.name}</div>
                            {l.expires_at&&<div style={{fontSize:10,color:"#aaa"}}>
                              Vence: {new Date(l.expires_at).toLocaleDateString("es-AR")}
                            </div>}
                          </div>
                          <button onClick={async()=>{
                            try{
                              await api.revokeLoan(l.id);
                              setPayouts(prev=>({...prev,["loans_"+loanUser]:prev["loans_"+loanUser].filter(x=>x.id!==l.id)}));
                              showToast("Préstamo revocado");
                            }catch(e){showToast(e.message||"Error","error");}
                          }} style={{background:"#fee2e2",border:"none",borderRadius:8,
                            color:"#ef4444",padding:"4px 8px",fontSize:10,fontWeight:700,
                            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                            Revocar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}


      {sec==="premios"&&!loading&&(
        <div>
          {/* Tabs */}
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[["ranking","🏆 Por Ranking"],["manual","🎁 Manual"],["historial","📋 Historial"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setPremioTab(id)}
                style={{flex:1,background:premioTab===id?"#10b98122":"white",
                  border:`1.5px solid ${premioTab===id?"#10b981":"#eee"}`,
                  borderRadius:10,padding:"8px 4px",fontSize:11,fontWeight:800,
                  cursor:"pointer",color:premioTab===id?"#065f46":"#555",
                  fontFamily:"Nunito,sans-serif"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── Tab Ranking ─────────────────────────────────── */}
          {premioTab==="ranking"&&(
            <>
              <div style={{fontSize:11,color:"#888",marginBottom:10,lineHeight:1.5}}>
                Configurá qué recibe cada puesto al cerrar el período.
                Los premios se ejecutan automáticamente o podés forzarlos manualmente.
              </div>
              {/* Ejecutar manualmente */}
              <div style={{background:"white",borderRadius:14,padding:"14px 16px",
                marginBottom:16,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>⚡ Ejecutar premios ahora</div>
                <div style={{display:"flex",gap:8}}>
                  {["weekly","monthly"].map(p=>(
                    <button key={p} onClick={async()=>{
                      if(!window.confirm(`¿Ejecutar premios ${p==="weekly"?"semanales":"mensuales"}?`)) return;
                      setExecuting(p);
                      try{
                        const r = await api.prizeExecute(p);
                        const res = r.data||r;
                        showToast(`✅ ${res.ejecutados||0} premios entregados`);
                        api.prizeHistory().then(d=>setPrizeHistory(d.data||d||[])).catch(()=>{});
                      }catch(e){showToast(e.message||"Error","error");}
                      finally{setExecuting(null);}
                    }} disabled={executing===p}
                      style={{flex:1,background:executing===p?"#ccc":"#10b981",
                        border:"none",borderRadius:50,color:"white",padding:"10px",
                        fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {executing===p?"Ejecutando...":`${p==="weekly"?"📅 Semanales":"📆 Mensuales"}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prize sets por período */}
              {["weekly","monthly"].map(periodo=>{
                const sets = prizeSets.filter(s=>s.periodo===periodo).sort((a,b)=>a.puesto-b.puesto);
                return(
                  <div key={periodo} style={{marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:13,marginBottom:8,color:"#333"}}>
                      {periodo==="weekly"?"📅 Semanal":"📆 Mensual"}
                    </div>
                    {sets.map(set=>{
                      const items = typeof set.items==="string"?JSON.parse(set.items):set.items||[];
                      return(
                        <div key={set.id} style={{background:"white",borderRadius:14,
                          padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:items.length?8:0}}>
                            <div style={{width:28,height:28,borderRadius:8,
                              background:set.puesto===1?"#f59e0b22":set.puesto===2?"#94a3b822":"#cd7c3422",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontWeight:900,fontSize:13,color:set.puesto===1?"#b45309":set.puesto===2?"#475569":"#92400e"}}>
                              {set.puesto}°
                            </div>
                            <div style={{fontWeight:800,fontSize:13}}>Puesto {set.puesto}</div>
                            <div style={{flex:1}}/>
                            <button onClick={()=>setAddingPremio({setId:set.id,periodo,puesto:set.puesto})}
                              style={{background:"#10b98122",border:"none",borderRadius:8,
                                color:"#065f46",padding:"4px 10px",fontSize:11,fontWeight:800,
                                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                              + Premio
                            </button>
                          </div>
                          {items.map((item,i)=>{
                            const v = typeof item.valor==="string"?JSON.parse(item.valor):item.valor;
                            return(
                              <div key={item.id||i} style={{display:"flex",alignItems:"center",
                                gap:8,padding:"5px 8px",background:"#f9f9f9",borderRadius:8,marginBottom:4}}>
                                <span style={{fontSize:14}}>
                                  {item.tipo==="monedas"?"🪙":item.tipo==="titulo"?"🏅":
                                   item.tipo==="borde"?"🔲":item.tipo==="skin"?"🎨":
                                   item.tipo==="marco"?"🖼️":item.tipo==="name_color"?"✏️":"🎁"}
                                </span>
                                <div style={{flex:1,fontSize:12}}>
                                  <span style={{fontWeight:700}}>{item.tipo}</span>
                                  {item.tipo==="monedas"&&<span style={{color:"#f59e0b",fontWeight:800}}> 🪙{v.cantidad}</span>}
                                  {item.tipo==="titulo"&&<span style={{color:"#8b5cf6"}}> "{v.name}"</span>}
                                  {(item.tipo==="borde"||item.tipo==="skin")&&<span style={{color:"#555"}}> {v.item_id||v.name}</span>}
                                  {item.tipo==="marco"&&<span style={{color:"#555"}}> {v.name}</span>}
                                  {v.expires_days&&<span style={{fontSize:10,color:"#aaa"}}> · {v.expires_days}d</span>}
                                </div>
                                <button onClick={async()=>{
                                  try{ await api.prizeDelItem(item.id); 
                                    api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                                  }catch(e){showToast(e.message||"Error","error");}
                                }} style={{background:"#fee2e2",border:"none",borderRadius:6,
                                  color:"#ef4444",padding:"3px 7px",fontSize:10,fontWeight:700,
                                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>✕</button>
                              </div>
                            );
                          })}
                          {items.length===0&&(
                            <div style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>Sin premios configurados</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {/* ── Tab Manual ──────────────────────────────────── */}
          {premioTab==="manual"&&(
            <>
              <div style={{fontSize:11,color:"#888",marginBottom:12}}>
                Otorgá premios individuales a cualquier alumno.
              </div>
              <div style={{background:"white",borderRadius:14,padding:16,
                boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Alumno:</div>
                <select value={manualUser} onChange={e=>setManualUser(e.target.value)}
                  style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",
                    borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none",
                    fontFamily:"Nunito,sans-serif",marginBottom:12,boxSizing:"border-box"}}>
                  <option value="">— Seleccioná un alumno —</option>
                  {(config||[]).filter(u=>u.rol==="student").map(u=>(
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>

                {/* Premios agregados */}
                {manualPremios.length>0&&(
                  <div style={{marginBottom:12}}>
                    {manualPremios.map((p,i)=>{
                      const icons={monedas:"🪙",titulo:"🏅",borde:"🔲",skin:"🎨",marco:"🖼️",name_color:"✏️"};
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"6px 10px",background:"#f0fdf4",borderRadius:8,marginBottom:4}}>
                          <span>{icons[p.tipo]||"🎁"}</span>
                          <span style={{flex:1,fontSize:12,fontWeight:700}}>
                            {p.tipo}{p.tipo==="monedas"?` 🪙${p.valor.cantidad}`:
                              p.tipo==="titulo"?` "${p.valor.name}"`:
                              ` ${p.valor.name||p.valor.item_id||""}`}
                          </span>
                          <button onClick={()=>setManualPremios(prev=>prev.filter((_,j)=>j!==i))}
                            style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botones para agregar tipo de premio */}
                <div style={{fontWeight:700,fontSize:12,marginBottom:8,color:"#555"}}>+ Agregar premio:</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {[
                    {tipo:"monedas",icon:"🪙",label:"Monedas"},
                    {tipo:"titulo",icon:"🏅",label:"Título"},
                    {tipo:"borde",icon:"🔲",label:"Borde"},
                    {tipo:"skin",icon:"🎨",label:"Skin"},
                    {tipo:"marco",icon:"🖼️",label:"Marco"},
                  ].map(({tipo,icon,label})=>(
                    <button key={tipo} onClick={()=>{
                      setAddingPremio({tipo,isManual:true});
                      setPremioForm({});
                    }}
                      style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:8,
                        padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",
                        color:"#333",fontFamily:"Nunito,sans-serif"}}>
                      {icon} {label}
                    </button>
                  ))}
                </div>

                <button onClick={async()=>{
                  if(!manualUser||!manualPremios.length){
                    showToast("Seleccioná un alumno y al menos un premio","error"); return;
                  }
                  setGranting(true);
                  try{
                    const r = await api.prizeGrantManual(manualUser, manualPremios);
                    showToast(`✅ ${(r.data||r).filter?.(x=>x.ok).length||0} premios entregados`);
                    setManualPremios([]);
                    setManualUser("");
                  }catch(e){showToast(e.message||"Error","error");}
                  finally{setGranting(false);}
                }} disabled={granting||!manualUser||!manualPremios.length}
                  style={{width:"100%",background:granting||!manualUser||!manualPremios.length?"#ccc":"#10b981",
                    border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
                    fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {granting?"Entregando...":"🎁 Entregar premios"}
                </button>
              </div>
            </>
          )}

          {/* ── Tab Historial ───────────────────────────────── */}
          {premioTab==="historial"&&(
            <>
              {prizeHistory.length===0&&(
                <div style={{textAlign:"center",padding:32,color:"#aaa"}}>
                  <div style={{fontSize:32,marginBottom:8}}>📭</div>
                  <div style={{fontWeight:700}}>Sin historial todavía</div>
                </div>
              )}
              {prizeHistory.map((h,i)=>(
                <div key={i} style={{background:"white",borderRadius:12,padding:"10px 14px",
                  marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{h.alumno_nombre}</div>
                      <div style={{fontSize:10,color:"#888"}}>
                        Puesto {h.puesto} · {h.periodo} · {new Date(h.granted_at).toLocaleDateString("es-AR")}
                      </div>
                    </div>
                    <span style={{fontSize:10,color:h.granted_by==="system"?"#10b981":"#f59e0b",
                      fontWeight:700,background:h.granted_by==="system"?"#10b98122":"#f59e0b22",
                      borderRadius:99,padding:"2px 8px"}}>
                      {h.granted_by==="system"?"Auto":"Admin"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      </div>
    </div>
  );
}

export default AdminEconomia;
