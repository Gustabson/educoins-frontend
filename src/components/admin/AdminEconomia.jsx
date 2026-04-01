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
  const [loanUser,setLoanUser]  = useState("");
  const [loanFrame,setLoanFrame]= useState("Marco Dorado");
  const [loanNote,setLoanNote]  = useState("");
  const [loanDays,setLoanDays]  = useState("");
  const [granting,setGranting]  = useState(false);
  // Premios section
  const [premioTab,setPremioTab]   = useState("ranking");
  const [prizeSets,setPrizeSets]   = useState([]);
  const [prizeHistory,setPrizeHistory] = useState([]);
  const [schedules,setSchedules]   = useState([]);
  const [manualUser,setManualUser] = useState("");
  const [manualPremios,setManualPremios] = useState([]);
  const [addingPremio,setAddingPremio] = useState(null);
  const [premioForm,setPremioForm] = useState({});
  const [executing,setExecuting]   = useState(null);
  const [editingSchedule,setEditingSchedule] = useState(null);
  const [rankingPeriodo,setRankingPeriodo] = useState("weekly");
  const [addingSet,setAddingSet]   = useState(null); // {periodo}
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
    } else if(sec==="historial"){
      Promise.all([api.rankingPayouts(), api.auditLog()]).then(([rp,al])=>{
        const rpArr=(rp.data||rp||[]).map(x=>({...x,categoria:"premio_ranking"}));
        const alArr=(al.data||al||[]).filter(l=>l.action==="reward"||l.details?.tax||l.details?.banco).map(x=>({...x,categoria:x.details?.tax?"impuesto":x.details?.banco?"banco":"reward"}));
        setPayouts([...rpArr,...alArr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,50));
      }).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="suscripciones"){
      api.chargeAll().then(d=>setItems(d.data?.results||[])).catch(()=>{}).finally(()=>setLoading(false));
    } else if(sec==="premios"){
      Promise.all([api.prizeSets(), api.prizeHistory(), api.adminUsers(), api.prizeSchedules()])
        .then(([ps, ph, us, sc])=>{
          setPrizeSets(ps.data||ps||[]);
          setPrizeHistory(ph.data||ph||[]);
          setConfig(us.data||us||[]);
          setSchedules(sc.data||sc||[]);
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
      {
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
    emojis:"😄 Packs Emoji", efectos:"✨ Efectos",
    suscripciones:"🔄 Suscripciones", historial:"📋 Historial",
    premios:"🏆 Premios y Recompensas", perfil:"👤 Personalización Perfil",
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
            {sec!=="suscripciones"&&sec!=="historial"&&(
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
            {sec!=="suscripciones"&&sec!=="historial"&&(
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

        {/* Modal crear nuevo grupo de puestos */}
      {addingSet&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setAddingSet(null);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>
              + Nuevo grupo de puestos — {addingSet.periodo==="daily"?"Diario":addingSet.periodo==="weekly"?"Semanal":"Mensual"}
            </div>
            <div style={{fontSize:12,color:"#888",marginBottom:14}}>
              Definí el rango de puestos que recibirán este premio.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <label style={{fontSize:12,fontWeight:700,color:"#555",minWidth:80}}>Desde puesto:</label>
                <input type="number" min="1" id="set-desde" defaultValue="1"
                  style={{flex:1,background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:8,
                    padding:"8px 12px",fontSize:13,outline:"none"}}/>
              </div>
              <div style={{fontSize:11,color:"#888"}}>Tipo de rango:</div>
              <div style={{display:"flex",gap:6}}>
                {[
                  {label:"Solo ese puesto",val:"solo"},
                  {label:"Hasta puesto...",val:"rango"},
                  {label:"Todos desde ahí",val:"todos"},
                ].map(opt=>(
                  <button key={opt.val}
                    onClick={()=>setPremioForm(v=>({...v,rangoTipo:opt.val}))}
                    style={{flex:1,background:premioForm.rangoTipo===opt.val?"#10b98122":"#f7f7f7",
                      border:`1.5px solid ${premioForm.rangoTipo===opt.val?"#10b981":"#eee"}`,
                      borderRadius:8,padding:"6px 4px",fontSize:10,fontWeight:700,cursor:"pointer",
                      color:premioForm.rangoTipo===opt.val?"#065f46":"#555",
                      fontFamily:"Nunito,sans-serif"}}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {premioForm.rangoTipo==="rango"&&(
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <label style={{fontSize:12,fontWeight:700,color:"#555",minWidth:80}}>Hasta puesto:</label>
                  <input type="number" min="1" id="set-hasta" defaultValue="3"
                    style={{flex:1,background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:8,
                      padding:"8px 12px",fontSize:13,outline:"none"}}/>
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={async()=>{
                  const desde = parseInt(document.getElementById("set-desde")?.value)||1;
                  const hasta = premioForm.rangoTipo==="solo" ? null
                    : premioForm.rangoTipo==="todos" ? 0
                    : parseInt(document.getElementById("set-hasta")?.value)||desde+1;
                  setGranting(true);
                  try{
                    await api.prizeSetCreate({periodo:addingSet.periodo, puesto:desde, puesto_hasta:hasta});
                    api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                    showToast("Grupo creado ✅");
                    setAddingSet(null); setPremioForm({});
                  }catch(e){showToast(e.message||"Error","error");}
                  finally{setGranting(false);}
                }} disabled={granting}
                  style={{flex:1,background:granting?"#ccc":"#10b981",border:"none",borderRadius:50,
                    color:"white",padding:"12px",fontWeight:800,fontSize:14,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {granting?"Creando...":"✅ Crear grupo"}
                </button>
                <button onClick={()=>{setAddingSet(null);setPremioForm({});}}
                  style={{background:"#f0f0f0",border:"none",borderRadius:50,color:"#555",
                    padding:"12px 18px",fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Modal agregar ítem a prize set */}
      {addingPremio&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setAddingPremio(null);setPremioForm({});}}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",
            fontFamily:"Nunito,sans-serif"}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>
              {addingPremio.isManual?"🎁 Agregar premio":"🎁 Premio — "+
                (addingPremio.puesto_hasta===0?`Puestos ${addingPremio.puesto}° en adelante`:
                 addingPremio.puesto_hasta?`Puestos ${addingPremio.puesto}° al ${addingPremio.puesto_hasta}°`:
                 `Puesto ${addingPremio.puesto}°`)}
            </div>

            {/* PASO 1 — Elegir tipo */}
            <div style={{fontSize:11,fontWeight:700,color:"#888",margin:"12px 0 8px"}}>
              Tipo de premio:
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {[
                {tipo:"monedas",icon:"🪙",label:"Monedas"},
                {tipo:"titulo", icon:"🏅",label:"Título"},
                {tipo:"borde",  icon:"🔲",label:"Borde"},
                {tipo:"skin",   icon:"🎨",label:"Skin"},
                {tipo:"marco",  icon:"🖼️",label:"Marco"},
                {tipo:"name_color",icon:"✏️",label:"Color nombre"},
              ].map(({tipo,icon,label})=>{
                const sel = addingPremio.tipo===tipo;
                return(
                  <button key={tipo}
                    onClick={()=>{
                      setAddingPremio(prev=>({...prev,tipo}));
                      setPremioForm({});
                    }}
                    style={{background:sel?"#10b98122":"#f7f7f7",
                      border:`1.5px solid ${sel?"#10b981":"#eee"}`,
                      borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:800,
                      cursor:"pointer",color:sel?"#065f46":"#333",
                      fontFamily:"Nunito,sans-serif",display:"flex",alignItems:"center",gap:5}}>
                    <span>{icon}</span>{label}
                  </button>
                );
              })}
            </div>

            {addingPremio.tipo&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>

                {/* Duración — aplica a todo menos monedas y skin permanente */}
                {addingPremio.tipo!=="monedas"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Duración:</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {[
                        {label:"1 día",days:1},{label:"3 días",days:3},{label:"1 semana",days:7},
                        {label:"1 mes",days:30},{label:"6 meses",days:180},{label:"1 año",days:365},
                        {label:"Para siempre",days:null}
                      ].map(opt=>{
                        const sel = premioForm.expires_days===opt.days;
                        return(
                          <button key={opt.label} onClick={()=>setPremioForm(v=>({...v,expires_days:opt.days}))}
                            style={{background:sel?"#10b98122":"#f7f7f7",
                              border:`1.5px solid ${sel?"#10b981":"#eee"}`,
                              borderRadius:8,padding:"5px 9px",fontSize:10,fontWeight:700,
                              cursor:"pointer",color:sel?"#065f46":"#555",
                              fontFamily:"Nunito,sans-serif"}}>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monedas */}
                {addingPremio.tipo==="monedas"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Cantidad:</div>
                    <input type="number" value={premioForm.cantidad||""} min="1"
                      onChange={e=>setPremioForm(v=>({...v,cantidad:parseInt(e.target.value)||0}))}
                      placeholder="ej: 100"
                      style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                        padding:"10px 12px",fontSize:18,fontWeight:800,outline:"none",
                        boxSizing:"border-box",fontFamily:"Nunito,sans-serif"}}/>
                  </div>
                )}

                {/* Título */}
                {addingPremio.tipo==="titulo"&&(<>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Nombre del título:</div>
                    <input value={premioForm.name||""} onChange={e=>setPremioForm(v=>({...v,name:e.target.value}))}
                      placeholder="ej: Campeón del Mes 🏆"
                      style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                        padding:"10px 12px",fontSize:14,fontWeight:700,outline:"none",
                        boxSizing:"border-box",fontFamily:"Nunito,sans-serif"}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Emoji:</div>
                      <input value={premioForm.emoji||""} onChange={e=>setPremioForm(v=>({...v,emoji:e.target.value.slice(0,4)}))}
                        placeholder="🏆"
                        style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                          padding:"10px 12px",fontSize:20,outline:"none",
                          boxSizing:"border-box",fontFamily:"Nunito,sans-serif"}}/>
                    </div>
                    <div style={{flex:2}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Rareza:</div>
                      <div style={{display:"flex",gap:4}}>
                        {[{id:"common",label:"Común",col:"#94a3b8"},{id:"rare",label:"Raro",col:"#3b82f6"},
                          {id:"epic",label:"Épico",col:"#8b5cf6"},{id:"legendary",label:"✨ Legendario",col:"#f59e0b"}
                        ].map(r=>(
                          <button key={r.id} onClick={()=>setPremioForm(v=>({...v,rarity:r.id,color:r.col,glow_color:r.col}))}
                            style={{flex:1,background:premioForm.rarity===r.id?r.col+"33":"#f7f7f7",
                              border:`1.5px solid ${premioForm.rarity===r.id?r.col:"#eee"}`,
                              borderRadius:8,padding:"6px 2px",fontSize:9,fontWeight:800,
                              cursor:"pointer",color:r.col,fontFamily:"Nunito,sans-serif"}}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Preview */}
                  {premioForm.name&&(
                    <div style={{background:"#f9f9f9",borderRadius:10,padding:"8px 12px",
                      display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:"#888"}}>Preview:</span>
                      <span style={{background:(premioForm.color||"#94a3b8")+"22",
                        border:`1px solid ${premioForm.color||"#94a3b8"}44`,
                        borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:800,
                        color:premioForm.color||"#94a3b8"}}>
                        {premioForm.emoji||""} {premioForm.name}
                      </span>
                    </div>
                  )}
                </>)}

                {/* Borde */}
                {addingPremio.tipo==="borde"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Elegí el borde:</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {id:"b2",n:"Dorado",  col:"#f59e0b"},
                        {id:"b3",n:"Verde",   col:"#10b981"},
                        {id:"b4",n:"Rojo",    col:"#ef4444"},
                        {id:"b5",n:"Violeta", col:"#8b5cf6"},
                        {id:"b6",n:"Celeste", col:"#06b6d4"},
                        {id:"b7",n:"Rosa",    col:"#ec4899"},
                        {id:"b8",n:"Dorado brillante",col:"#fbbf24"},
                        {id:"b9",n:"Esmeralda",col:"#059669"},
                      ].map(b=>{
                        const sel=(premioForm.items_ids||[]).includes(b.id);
                        return(
                          <button key={b.id} onClick={()=>setPremioForm(v=>{
                            const cur=v.items_ids||[];
                            const next=sel?cur.filter(x=>x!==b.id):[...cur,b.id];
                            return {...v,items_ids:next};
                          })}
                            style={{background:sel?b.col+"33":"#f7f7f7",
                              border:`2.5px solid ${sel?b.col:"#eee"}`,
                              borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,
                              cursor:"pointer",color:b.col,fontFamily:"Nunito,sans-serif",
                              position:"relative"}}>
                            {sel&&<span style={{position:"absolute",top:-4,right:-4,fontSize:10}}>✓</span>}
                            {b.n}
                          </button>
                        );
                      })}
                    <div style={{fontSize:10,color:"#aaa",width:"100%",marginTop:4}}>
                      {(premioForm.items_ids||[]).length===0?"Seleccioná uno o más bordes":
                        `Seleccionados: ${(premioForm.items_ids||[]).length}`}
                    </div>
                    </div>
                  </div>
                )}

                {/* Skin */}
                {addingPremio.tipo==="skin"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Elegí la skin:</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {/* Solo skins exclusivas — no las del perfil base */}
                    {[
                        {id:"s8", n:"Alien",      emoji:"👽",  bg:"#166534"},
                        {id:"s9", n:"Samurai",     emoji:"⚔️",  bg:"#7f1d1d"},
                        {id:"s10",n:"Astronauta",  emoji:"🧑‍🚀", bg:"#1e3a5f"},
                        {id:"s11",n:"Científica",  emoji:"👩‍🔬", bg:"#1e3a5f"},
                        {id:"s12",n:"DJ",          emoji:"🎧",  bg:"#2d1b69"},
                        {id:"s13",n:"Detective",   emoji:"🕵️",  bg:"#1c1c2e"},
                        {id:"s14",n:"Superhéroe",  emoji:"🦸",  bg:"#1a237e"},
                        {id:"s15",n:"Dragón",      emoji:"🐉",  bg:"#4a0e0e"},
                      ].map(s=>{
                        const sel=(premioForm.items_ids||[]).includes(s.id);
                        return(
                          <button key={s.id} onClick={()=>setPremioForm(v=>{
                            const cur=v.items_ids||[];
                            const next=sel?cur.filter(x=>x!==s.id):[...cur,s.id];
                            return {...v,items_ids:next};
                          })}
                            style={{background:sel?s.bg:"#f7f7f7",
                              border:`2px solid ${sel?"transparent":"#eee"}`,
                              borderRadius:10,padding:"8px 10px",fontSize:12,fontWeight:700,
                              cursor:"pointer",color:sel?"white":"#333",
                              fontFamily:"Nunito,sans-serif",display:"flex",alignItems:"center",gap:5,
                              position:"relative"}}>
                            {sel&&<span style={{position:"absolute",top:-4,right:-4,fontSize:10}}>✓</span>}
                            <span style={{fontSize:18}}>{s.emoji}</span>{s.n}
                          </button>
                        );
                      })}
                    <div style={{fontSize:10,color:"#aaa",width:"100%",marginTop:4}}>
                      {(premioForm.items_ids||[]).length===0?"Seleccioná una o más skins":
                        `Seleccionadas: ${(premioForm.items_ids||[]).length}`}
                    </div>
                    </div>
                  </div>
                )}

                {/* Marco - multiple selection */}
                {addingPremio.tipo==="marco"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Elegí los marcos:</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {name:"Marco Dorado", type:"frame",    value:"3px solid #f59e0b", glow:"#f59e0b66", preview:"#f59e0b"},
                        {name:"Marco Épico",  type:"frame",    value:"3px solid #8b5cf6", glow:"#8b5cf666", preview:"#8b5cf6"},
                        {name:"Marco Rojo",   type:"frame",    value:"3px solid #ef4444", glow:"#ef444466", preview:"#ef4444"},
                        {name:"Fuego",        type:"gradient", value:"linear-gradient(135deg,#f97316,#ef4444)", glow:null, preview:"#f97316"},
                        {name:"Aurora",       type:"gradient", value:"linear-gradient(135deg,#a855f7,#ec4899,#f59e0b)", glow:null, preview:"#a855f7"},
                        {name:"Océano",       type:"gradient", value:"linear-gradient(135deg,#0ea5e9,#06b6d4)", glow:null, preview:"#0ea5e9"},
                      ].map(f=>{
                        const sel=(premioForm.items_ids||[]).includes(f.name);
                        return(
                          <button key={f.name} onClick={()=>setPremioForm(v=>{
                            const cur=v.items_ids||[];
                            const frames=v.frames_data||[];
                            const next=sel?cur.filter(x=>x!==f.name):[...cur,f.name];
                            const nextFrames=sel?frames.filter(x=>x.name!==f.name):[...frames,f];
                            return {...v,items_ids:next,frames_data:nextFrames};
                          })}
                            style={{background:sel?f.preview+"22":"#f7f7f7",
                              border:`2px solid ${sel?f.preview:"#eee"}`,
                              borderRadius:10,padding:"7px 12px",fontSize:11,fontWeight:700,
                              cursor:"pointer",color:sel?f.preview:"#333",
                              fontFamily:"Nunito,sans-serif",position:"relative"}}>
                            {sel&&<span style={{position:"absolute",top:-4,right:-4,fontSize:10}}>✓</span>}
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:4}}>
                      {(premioForm.items_ids||[]).length===0?"Seleccioná uno o más marcos":`Seleccionados: ${(premioForm.items_ids||[]).length}`}
                    </div>
                  </div>
                )}

                {/* Color de nombre */}
                {addingPremio.tipo==="name_color"&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>Color del nombre:</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {name:"Dorado",    color:"#f59e0b"},
                        {name:"Violeta",   color:"#8b5cf6"},
                        {name:"Rojo fuego",color:"#ef4444"},
                        {name:"Verde",     color:"#10b981"},
                        {name:"Celeste",   color:"#06b6d4"},
                        {name:"Rosa",      color:"#ec4899"},
                        {name:"Naranja",   color:"#f97316"},
                        {name:"Blanco",    color:"#f8fafc"},
                        {name:"Arcoíris",  color:"#f59e0b", gradient:"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6)"},
                        {name:"Neón verde",color:"#4ade80"},
                        {name:"Neón azul", color:"#38bdf8"},
                        {name:"Coral",     color:"#fb7185"},
                      ].map(c=>{
                        const sel=(premioForm.items_ids||[]).includes(c.name);
                        return(
                          <button key={c.name} onClick={()=>setPremioForm(v=>{
                            const cur=v.items_ids||[];
                            const next=sel?cur.filter(x=>x!==c.name):[...cur,c.name];
                            const colors=(v.colors_data||[]).filter(x=>x.name!==c.name);
                            if(!sel) colors.push({name:c.name,color:c.color,config:{type:c.gradient?"gradient":"solid",value:c.gradient||c.color}});
                            return {...v,items_ids:next,colors_data:colors};
                          })}
                            style={{background:sel?c.color+"22":"#f7f7f7",
                              border:`2px solid ${sel?c.color:"#eee"}`,
                              borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:800,
                              cursor:"pointer",color:c.color,
                              fontFamily:"Nunito,sans-serif",position:"relative",
                              backgroundImage:sel&&c.gradient?c.gradient:undefined}}>
                            {sel&&<span style={{position:"absolute",top:-4,right:-4,fontSize:10}}>✓</span>}
                            {c.name}
                          </button>
                        );
                      })}
                    <div style={{fontSize:10,color:"#aaa",width:"100%",marginTop:4}}>
                      {(premioForm.items_ids||[]).length===0?"Seleccioná uno o más colores":
                        `Seleccionados: ${(premioForm.items_ids||[]).length}`}
                    </div>
                    </div>
                    {premioForm.name&&(
                      <div style={{marginTop:8,background:"#f9f9f9",borderRadius:10,padding:"8px 12px"}}>
                        <span style={{fontSize:12,color:"#888"}}>Preview: </span>
                        <span style={{fontSize:14,fontWeight:800,color:premioForm.color}}>
                          Nombre del alumno
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Nota */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>
                    Nota para el alumno (opcional):
                  </div>
                  <input value={premioForm.note||""} onChange={e=>setPremioForm(v=>({...v,note:e.target.value}))}
                    placeholder="ej: ¡Felicitaciones por tu esfuerzo!"
                    style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:12,outline:"none",
                      boxSizing:"border-box",fontFamily:"Nunito,sans-serif"}}/>
                </div>

                <div style={{display:"flex",gap:8}}>
                  <button onClick={async()=>{
                    const t = addingPremio.tipo;
                    const multiTypes = ["borde","skin","name_color","marco"];
                    if(t==="monedas"&&!premioForm.cantidad) return showToast("Ingresá la cantidad","error");
                    if(t==="titulo"&&!premioForm.name) return showToast("Ingresá el nombre del título","error");
                    if(multiTypes.includes(t)&&!(premioForm.items_ids||[]).length) return showToast("Elegí al menos uno","error");
                    // Duración obligatoria para todo menos monedas
                    if(t!=="monedas"&&premioForm.expires_days===undefined)
                      return showToast("Elegí la duración del premio","error");

                    // Para tipos múltiples, crear un premio por cada item seleccionado
                    let premios = [];
                    if(t==="borde"){
                      const BORDES={b2:{col:"#f59e0b",n:"Dorado"},b3:{col:"#10b981",n:"Verde"},b4:{col:"#ef4444",n:"Rojo"},b5:{col:"#8b5cf6",n:"Violeta"},b6:{col:"#06b6d4",n:"Celeste"},b7:{col:"#ec4899",n:"Rosa"},b8:{col:"#fbbf24",n:"Dorado brillante"},b9:{col:"#059669",n:"Esmeralda"}};
                      premios=(premioForm.items_ids||[]).map(id=>({tipo:"borde",valor:{item_id:id,name:BORDES[id]?.n||id,expires_days:premioForm.expires_days,note:premioForm.note}}));
                    } else if(t==="skin"){
                      premios=(premioForm.items_ids||[]).map(id=>({tipo:"skin",valor:{item_id:id,expires_days:premioForm.expires_days,note:premioForm.note}}));
                    } else if(t==="name_color"){
                      premios=(premioForm.colors_data||[]).map(c=>({tipo:"name_color",valor:{...c,expires_days:premioForm.expires_days,note:premioForm.note}}));
                    } else if(t==="marco"){
                      premios=(premioForm.frames_data||[]).map(f=>({tipo:"marco",valor:{...f,expires_days:premioForm.expires_days,note:premioForm.note}}));
                    } else if(t==="monedas"){
                      premios=[{tipo:"monedas",valor:{cantidad:premioForm.cantidad,motivo:premioForm.note}}];
                    } else {
                      premios=[{tipo:t,valor:{...premioForm}}];
                    }
                    const premio = premios[0]; // para isManual, agregar todos

                    if(addingPremio.isManual){
                      setManualPremios(prev=>[...prev, ...premios]);
                      setAddingPremio(null); setPremioForm({});
                    } else {
                      setGranting(true);
                      try{
                        await Promise.all(premios.map(p=>api.prizeAddItem(addingPremio.setId, p)));
                        showToast(`✅ ${premios.length} premio${premios.length>1?"s":""} agregado${premios.length>1?"s":""}`);
                        api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                        setAddingPremio(null); setPremioForm({});
                      }catch(e){showToast(e.message||"Error","error");}
                      finally{setGranting(false);}
                    }
                  }} disabled={granting}
                    style={{flex:1,background:granting?"#ccc":"#10b981",border:"none",borderRadius:50,
                      color:"white",padding:"13px",fontWeight:800,fontSize:14,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {granting?"Guardando...":addingPremio.isManual?"+ Agregar a la lista":"✅ Guardar premio"}
                  </button>
                  <button onClick={()=>{setAddingPremio(null);setPremioForm({});}}
                    style={{background:"#f0f0f0",border:"none",borderRadius:50,color:"#555",
                      padding:"13px 18px",fontWeight:700,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!addingPremio.tipo&&(
              <div style={{textAlign:"center",padding:"20px 0",color:"#aaa",fontSize:12}}>
                Elegí el tipo de premio arriba para continuar
              </div>
            )}
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
            {[["items","⚙️ Items"],["loans","🎁 Préstamos"]].map(([id,lbl])=>(
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
          {/* Info banner */}
          <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:14,
            padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🏆</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:13,color:"#065f46"}}>Premios y Recompensas</div>
              <div style={{fontSize:11,color:"#047857",marginTop:1}}>
                Configurá premios automáticos por ranking o entregá premios manuales a alumnos.
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:6,marginBottom:14,background:"white",borderRadius:14,
            padding:5,boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
            {[["ranking","🏆 Ranking"],["manual","🎁 Manual"],["historial","📋 Historial"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setPremioTab(id)}
                style={{flex:1,background:premioTab===id?"#10b981":"transparent",
                  border:"none",
                  borderRadius:10,padding:"9px 4px",fontSize:11,fontWeight:800,
                  cursor:"pointer",color:premioTab===id?"white":"#888",
                  fontFamily:"Nunito,sans-serif",transition:"all .15s"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── Tab Ranking ─────────────────────────────────── */}
          {premioTab==="ranking"&&(
            <>
              {/* Selector de período */}
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[["daily","📅 Diario"],["weekly","📆 Semanal"],["monthly","🗓️ Mensual"]].map(([p,lbl])=>{
                  const setsCount = prizeSets.filter(s=>s.periodo===p).length;
                  const sch = schedules.find(s=>s.periodo===p);
                  return(
                    <button key={p} onClick={()=>setRankingPeriodo(p)}
                      style={{flex:1,background:rankingPeriodo===p?"#10b981":"white",
                        border:`1.5px solid ${rankingPeriodo===p?"#10b981":"#eee"}`,
                        borderRadius:12,padding:"10px 4px 8px",fontSize:11,fontWeight:800,
                        cursor:"pointer",color:rankingPeriodo===p?"white":"#555",
                        fontFamily:"Nunito,sans-serif",display:"flex",flexDirection:"column",
                        alignItems:"center",gap:2,transition:"all .15s"}}>
                      {lbl}
                      <span style={{fontSize:9,opacity:.8,fontWeight:700}}>
                        {setsCount} grupo{setsCount!==1?"s":""} · {sch?.activo?"⏰ auto":"Manual"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Schedule del período seleccionado */}
              {(()=>{
                const sch = schedules.find(s=>s.periodo===rankingPeriodo);
                if(!sch) return null;
                const isEditing = editingSchedule===rankingPeriodo;
                return(
                  <div style={{background:"white",borderRadius:14,padding:"12px 14px",
                    marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:12}}>⏰ Ejecución automática</div>
                        <div style={{fontSize:11,color:"#888",marginTop:2}}>
                          {sch.activo
                            ? `Todos los días a las ${sch.hora?.slice(0,5)}${rankingPeriodo==="weekly"?` · Viernes`:rankingPeriodo==="monthly"?` · Día ${sch.dia_mes}`:""}`
                            : "Desactivada"}
                          {sch.ultima_ejecucion&&<span style={{marginLeft:6,color:"#10b981"}}>
                            · Última: {new Date(sch.ultima_ejecucion).toLocaleDateString("es-AR")}
                          </span>}
                        </div>
                      </div>
                      <button onClick={()=>setEditingSchedule(isEditing?null:rankingPeriodo)}
                        style={{background:"#f0f0f0",border:"none",borderRadius:8,
                          padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",
                          fontFamily:"Nunito,sans-serif"}}>
                        {isEditing?"✕":"✏️ Editar"}
                      </button>
                      <button onClick={async()=>{
                        setExecuting(rankingPeriodo);
                        try{
                          const r=await api.prizeExecute(rankingPeriodo);
                          showToast(`✅ ${(r.data||r).ejecutados||0} premios entregados`);
                          api.prizeHistory().then(d=>setPrizeHistory(d.data||d||[])).catch(()=>{});
                          api.prizeSchedules().then(d=>setSchedules(d.data||d||[])).catch(()=>{});
                        }catch(e){showToast(e.message||"Error","error");}
                        finally{setExecuting(null);}
                      }} disabled={executing===rankingPeriodo}
                        style={{background:executing===rankingPeriodo?"#ccc":"#10b981",border:"none",
                          borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",
                          color:"white",fontFamily:"Nunito,sans-serif"}}>
                        {executing===rankingPeriodo?"...":"▶ Ejecutar"}
                      </button>
                    </div>
                    {isEditing&&(
                      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <label style={{fontSize:12,fontWeight:700,color:"#555",minWidth:40}}>Hora:</label>
                          <input type="time" defaultValue={sch.hora?.slice(0,5)||"18:00"}
                            onChange={async e=>{
                              await api.prizeScheduleUpdate(rankingPeriodo,{hora:e.target.value+":00"}).catch(()=>{});
                              api.prizeSchedules().then(d=>setSchedules(d.data||d||[])).catch(()=>{});
                            }}
                            style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:8,
                              padding:"6px 10px",fontSize:13,outline:"none"}}/>
                        </div>
                        {rankingPeriodo==="weekly"&&(
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d,i)=>(
                              <button key={i+1} onClick={async()=>{
                                await api.prizeScheduleUpdate(rankingPeriodo,{dia_semana:i+1}).catch(()=>{});
                                api.prizeSchedules().then(d=>setSchedules(d.data||d||[])).catch(()=>{});
                              }}
                                style={{background:(sch.dia_semana||5)===i+1?"#10b98122":"#f7f7f7",
                                  border:`1.5px solid ${(sch.dia_semana||5)===i+1?"#10b981":"#eee"}`,
                                  borderRadius:8,padding:"5px 8px",fontSize:11,fontWeight:700,
                                  cursor:"pointer",color:(sch.dia_semana||5)===i+1?"#065f46":"#555",
                                  fontFamily:"Nunito,sans-serif"}}>
                                {d}
                              </button>
                            ))}
                          </div>
                        )}
                        {rankingPeriodo==="monthly"&&(
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{fontSize:12,fontWeight:700,color:"#555"}}>Día del mes:</label>
                            <input type="number" min="1" max="28" defaultValue={sch.dia_mes||1}
                              onChange={async e=>{
                                await api.prizeScheduleUpdate(rankingPeriodo,{dia_mes:parseInt(e.target.value)}).catch(()=>{});
                              }}
                              style={{width:60,background:"#f7f7f7",border:"1.5px solid #eee",
                                borderRadius:8,padding:"6px 10px",fontSize:13,outline:"none"}}/>
                          </div>
                        )}
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <label style={{fontSize:12,fontWeight:700,color:"#555"}}>Activo:</label>
                          <button onClick={async()=>{
                            await api.prizeScheduleUpdate(rankingPeriodo,{activo:!sch.activo}).catch(()=>{});
                            api.prizeSchedules().then(d=>setSchedules(d.data||d||[])).catch(()=>{});
                          }} style={{background:sch.activo?"#10b98122":"#fee2e2",
                            border:`1.5px solid ${sch.activo?"#10b981":"#ef4444"}`,
                            borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,
                            cursor:"pointer",color:sch.activo?"#065f46":"#ef4444",
                            fontFamily:"Nunito,sans-serif"}}>
                            {sch.activo?"✅ Activado":"❌ Desactivado"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Prize sets del período seleccionado */}
              {(()=>{
                const sets = prizeSets.filter(s=>s.periodo===rankingPeriodo).sort((a,b)=>a.puesto-b.puesto);
                return(
                  <>
                    {sets.map(set=>{
                      const items = typeof set.items==="string"?JSON.parse(set.items):set.items||[];
                      const pLabel = set.puesto_hasta===null ? `Puesto ${set.puesto}°`
                        : set.puesto_hasta===0 ? `Puestos ${set.puesto}° en adelante`
                        : `Puestos ${set.puesto}° al ${set.puesto_hasta}°`;
                      return(
                        <div key={set.id} style={{background:"white",borderRadius:14,
                          padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:items.length?8:0}}>
                            <div style={{flex:1,fontWeight:800,fontSize:13}}>{pLabel}</div>
                            <button onClick={()=>setAddingPremio({setId:set.id,periodo:rankingPeriodo,puesto:set.puesto,isRanking:true})}
                              style={{background:"#10b98122",border:"none",borderRadius:8,
                                color:"#065f46",padding:"4px 10px",fontSize:11,fontWeight:800,
                                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                              + Premio
                            </button>
                            <button onClick={async()=>{
                              await api.prizeSetDelete(set.id).catch(()=>{});
                              api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                            }} style={{background:"#fee2e2",border:"none",borderRadius:8,
                              color:"#ef4444",padding:"4px 8px",fontSize:11,cursor:"pointer",
                              fontFamily:"Nunito,sans-serif"}}>✕</button>
                          </div>
                          {items.map((item,i)=>{
                            const v=typeof item.valor==="string"?JSON.parse(item.valor):item.valor;
                            return(
                              <div key={item.id||i} style={{display:"flex",alignItems:"center",
                                gap:8,padding:"5px 8px",background:"#f9f9f9",borderRadius:8,marginBottom:4}}>
                                <span>{item.tipo==="monedas"?"🪙":item.tipo==="titulo"?"🏅":item.tipo==="borde"?"🔲":item.tipo==="skin"?"🎨":item.tipo==="marco"?"🖼️":"🎁"}</span>
                                <div style={{flex:1,fontSize:12}}>
                                  <span style={{fontWeight:700}}>{item.tipo}</span>
                                  {item.tipo==="monedas"&&<span style={{color:"#f59e0b",fontWeight:800}}> 🪙{v.cantidad}</span>}
                                  {item.tipo==="titulo"&&<span style={{color:"#8b5cf6"}}> "{v.name}"</span>}
                                  {v.expires_days&&<span style={{fontSize:10,color:"#aaa"}}> · {v.expires_days}d</span>}
                                  {!v.expires_days&&item.tipo!=="monedas"&&<span style={{fontSize:10,color:"#10b981"}}> · Permanente</span>}
                                </div>
                                <button onClick={async()=>{
                                  await api.prizeDelItem(item.id).catch(()=>{});
                                  api.prizeSets().then(d=>setPrizeSets(d.data||d||[])).catch(()=>{});
                                }} style={{background:"#fee2e2",border:"none",borderRadius:6,
                                  color:"#ef4444",padding:"3px 7px",fontSize:10,fontWeight:700,
                                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>✕</button>
                              </div>
                            );
                          })}
                          {items.length===0&&<div style={{fontSize:11,color:"#aaa",fontStyle:"italic"}}>Sin premios configurados</div>}
                        </div>
                      );
                    })}
                    {/* Agregar nuevo grupo de puestos */}
                    <button onClick={()=>setAddingSet({periodo:rankingPeriodo})}
                      style={{width:"100%",background:"#f0fdf4",border:"1.5px dashed #10b981",
                        borderRadius:14,padding:"12px",fontWeight:800,fontSize:12,
                        cursor:"pointer",color:"#065f46",fontFamily:"Nunito,sans-serif"}}>
                      + Agregar grupo de puestos
                    </button>
                  </>
                );
              })()}
            </>
          )}

          {/* ── Tab Manual ──────────────────────────────────── */}
          {premioTab==="manual"&&(
            <>
              <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:12,
                padding:"10px 14px",marginBottom:12,fontSize:11,color:"#92400e",lineHeight:1.5}}>
                🎁 Otorgá premios individuales a cualquier alumno, sin importar su posición en el ranking.
              </div>
              <div style={{background:"white",borderRadius:14,padding:16,
                boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Alumno destinatario:</div>
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
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:12,color:"#888",fontWeight:700}}>
                  Últimas {prizeHistory.length} entregas
                </div>
                <button onClick={()=>{
                  setLoading(true);
                  api.prizeHistory().then(d=>setPrizeHistory(d.data||d||[])).catch(()=>{}).finally(()=>setLoading(false));
                }} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,
                  padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:"#065f46",
                  fontFamily:"Nunito,sans-serif"}}>
                  🔄 Actualizar
                </button>
              </div>
              {prizeHistory.length===0&&(
                <div style={{textAlign:"center",padding:"40px 16px",color:"#aaa",
                  background:"white",borderRadius:16,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:40,marginBottom:10}}>📭</div>
                  <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>Sin historial todavía</div>
                  <div style={{fontSize:12}}>
                    Los premios entregados aparecerán aquí.<br/>
                    Ejecutá un período de ranking para ver resultados.
                  </div>
                </div>
              )}
              {prizeHistory.map((h,i)=>{
                const periodoLabels = {daily:"Diario",weekly:"Semanal",monthly:"Mensual"};
                const premioData = typeof h.premio_data==="string"?JSON.parse(h.premio_data||"{}"):h.premio_data||{};
                const itemCount = Array.isArray(premioData.items)?premioData.items.length:null;
                const recipientes = premioData.count||1;
                return(
                  <div key={h.id||i} style={{background:"white",borderRadius:14,
                    padding:"12px 14px",marginBottom:8,
                    boxShadow:"0 1px 6px rgba(0,0,0,.05)",
                    borderLeft:`4px solid ${h.granted_by==="system"?"#10b981":"#f59e0b"}`}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                        background:h.granted_by==="system"?"#f0fdf4":"#fffbeb",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                        {h.granted_by==="system"?"🤖":"👤"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {h.alumno_nombre||"Alumno"}
                        </div>
                        <div style={{fontSize:11,color:"#888",marginTop:2,lineHeight:1.4}}>
                          <span style={{background:"#f1f5f9",borderRadius:99,padding:"1px 7px",
                            fontWeight:700,color:"#475569"}}>
                            #{h.puesto}° lugar
                          </span>
                          {" · "}
                          <span style={{fontWeight:600}}>
                            {periodoLabels[h.periodo]||h.periodo}
                          </span>
                          {itemCount&&<span style={{color:"#10b981",fontWeight:700}}> · {itemCount} premio{itemCount>1?"s":""}</span>}
                          {recipientes>1&&<span style={{color:"#3b82f6"}}> · {recipientes} receptores</span>}
                        </div>
                        <div style={{fontSize:10,color:"#bbb",marginTop:3}}>
                          {new Date(h.granted_at).toLocaleString("es-AR",{
                            day:"numeric",month:"short",year:"numeric",
                            hour:"2-digit",minute:"2-digit"
                          })}
                        </div>
                      </div>
                      <span style={{fontSize:10,fontWeight:800,flexShrink:0,
                        color:h.granted_by==="system"?"#10b981":"#f59e0b",
                        background:h.granted_by==="system"?"#f0fdf4":"#fffbeb",
                        borderRadius:99,padding:"3px 9px",border:`1px solid ${h.granted_by==="system"?"#bbf7d0":"#fde68a"}`}}>
                        {h.granted_by==="system"?"Auto":"Manual"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      </div>
    </div>
  );
}

export default AdminEconomia;
