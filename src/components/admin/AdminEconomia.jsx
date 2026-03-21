import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";


function AdminEconomia({showToast, onBack}){
  const [sec,setSec] = useState(null); // null=home, o nombre de sección

  const SECCIONES = [
    {id:"colores",    icon:"🖊️", title:"Colores de Nombre",  sub:"Precios y suscripciones", col:"#8b5cf6"},
    {id:"temas",      icon:"🎨", title:"Temas de App",        sub:"Paletas y suscripciones", col:"#ec4899"},
    {id:"modos",      icon:"🖥️", title:"Modos de Pantalla",  sub:"AMOLED, Sepia, Custom...", col:"#6366f1"},
    {id:"emojis",     icon:"😄", title:"Packs de Emojis",     sub:"Precios de packs",        col:"#f59e0b"},
    {id:"efectos",    icon:"✨", title:"Efectos y Animaciones",sub:"Títulos y nombre",        col:"#3b82f6"},
    {id:"ranking",    icon:"🏆", title:"Premios del Ranking", sub:"Diario, semanal, mensual", col:"#10b981"},
    {id:"checkin",    icon:"🔥", title:"Check-in Diario",     sub:"Recompensas por racha",    col:"#ef4444"},
    {id:"suscripciones",icon:"🔄",title:"Suscripciones",      sub:"Ver cobros pendientes",    col:"#0ea5e9"},
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
  const [editing,setEditing]= useState(null);
  const [editVal,setEditVal]= useState({});
  const [saving,setSaving]  = useState(false);
  const [closingSec,setClosing]= useState(null);
  const [closeMotivo,setCloseMotivo]=useState("");
  const [periodoClose,setPClose]=useState("weekly");
  const [scopeClose,setSClose]=useState("global");

  const SEC_TIPO = {
    colores: "name_color", temas: "theme", modos: "screen_mode", emojis: "emoji_pack",
    efectos: ["title_effect","name_effect","avatar_frame"],
  };
  const PERIODO_PER_SEC = ["colores","temas"];

  useEffect(()=>{
    if(["colores","temas","modos","emojis","efectos"].includes(sec)){
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
      // Ver suscripciones activas
      api.chargeAll().then(d=>setItems(d.data?.results||[])).catch(()=>{}).finally(()=>setLoading(false));
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
        await api.customAdminUpdate(editing.id, editVal);
        setItems(prev=>prev.map(i=>i.id===editing.id?{...i,...editVal}:i));
      }
      showToast("Guardado");
      setEditing(null);
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
    colores:"🖊️ Colores de Nombre", temas:"🎨 Temas", modos:"🖥️ Modos de Pantalla",
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
            padding:"20px 20px 44px"}}>
            <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>
              Editar: {editing.nombre||editing.descripcion||editing.item_key||""}
            </div>

            {/* Precio */}
            {(["colores","temas","emojis","efectos"].includes(sec)||sec==="ranking")&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#666",marginBottom:6}}>
                  {sec==="ranking"?"Premio 🪙":"Precio 🪙"}
                </div>
                <input type="number" min="0"
                  value={editVal.precio??editing.precio??editVal.premio??editing.premio??0}
                  onChange={e=>setEditVal(v=>({...v,
                    [sec==="ranking"?"premio":"precio"]:parseInt(e.target.value)||0}))}
                  style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                    borderRadius:12,padding:"11px 14px",fontSize:22,fontWeight:900,outline:"none",
                    color:"#10b981",textAlign:"center",fontFamily:"Nunito,sans-serif"}}/>
              </div>
            )}

            {/* Duración de suscripción — UN solo período a elegir */}
            {PERIODO_PER_SEC.includes(sec)&&editing.es_suscripcion&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#666",marginBottom:6}}>Duración de la suscripción</div>
                <div style={{display:"flex",gap:6}}>
                  {[["weekly","📅 Semanal"],["monthly","🗓️ Mensual"],["annual","📆 Anual"]].map(([v,l])=>{
                    const sel=(editVal.periodo_default??editing.periodo_default??"monthly")===v;
                    return(
                      <button key={v} onClick={()=>setEditVal(ev=>({...ev,periodo_default:v}))}
                        style={{flex:1,background:sel?"#8b5cf6":"#f0f0f0",color:sel?"white":"#555",
                          border:`2px solid ${sel?"#8b5cf6":"transparent"}`,borderRadius:12,
                          padding:"10px 4px",fontWeight:800,fontSize:11,cursor:"pointer",
                          fontFamily:"Nunito,sans-serif",lineHeight:1.4,textAlign:"center"}}>
                        {l}
                      </button>
                    );
                  })}
                </div>
                <div style={{fontSize:10,color:"#aaa",marginTop:6,textAlign:"center"}}>
                  El alumno se suscribe a este período y se renueva automáticamente
                </div>
              </div>
            )}

            {/* Activo */}
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[true,false].map(v=>(
                <button key={String(v)} onClick={()=>setEditVal(ev=>({...ev,activo:v}))}
                  style={{flex:1,background:(editVal.activo??editing.activo??true)===v
                    ?(v?"#10b981":"#ef4444"):"#f0f0f0",
                    color:(editVal.activo??editing.activo??true)===v?"white":"#555",
                    border:"none",borderRadius:12,padding:"10px",fontWeight:800,fontSize:13,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {v?"Activo":"Inactivo"}
                </button>
              ))}
            </div>
            <button onClick={guardar} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":"#10b981",border:"none",borderRadius:50,
                color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {saving?"Guardando...":"Guardar"}
            </button>
          </div>
        </div>
      )}

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}

        {/* Items de personalización */}
        {["colores","temas","modos","emojis","efectos"].includes(sec)&&!loading&&items.map(item=>(
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
                  <span style={{fontSize:11,fontWeight:800,color:"#10b981"}}>
                    {item.precio===0?"Gratis":`🪙${item.precio}`}
                  </span>
                  {item.es_suscripcion&&item.precio>0&&(
                    <span style={{background:"#8b5cf622",color:"#8b5cf6",borderRadius:99,
                      padding:"2px 7px",fontSize:9,fontWeight:800}}>
                      🔄 {item.periodo_default==="weekly"?"Semanal":item.periodo_default==="annual"?"Anual":"Mensual"}
                    </span>
                  )}
                  {item.es_suscripcion&&item.precio===0&&(
                    <span style={{background:"#10b98122",color:"#10b981",borderRadius:99,
                      padding:"2px 7px",fontSize:9,fontWeight:800}}>Gratis</span>
                  )}
                  {!item.activo&&<span style={{fontSize:9,color:"#aaa",fontWeight:700}}>Inactivo</span>}
                </div>
              </div>
              <button onClick={()=>{setEditing(item);setEditVal({});}}
                style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 12px",
                  fontSize:11,fontWeight:800,cursor:"pointer",color:"#555",fontFamily:"Nunito,sans-serif"}}>
                Editar
              </button>
            </div>
          </div>
        ))}

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
      </div>
    </div>
  );
}

export default AdminEconomia;
