import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";




function AdminVotaciones({showToast, onBack}){
  const [polls,setPolls]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [opciones,setOpciones]=useState(["",""]);
  const [durUnidad,setDurUnidad]=useState("horas");
  const [durValor,setDurValor]=useState("24");
  const [weighted,setWeighted]=useState(false);
  const [scope,setScope]=useState("global");
  const [classroomId,setClassroomId]=useState("");
  const [classrooms,setClassrooms]=useState([]);
  const [saving,setSaving]=useState(false);
  const [now,setNow]=useState(()=>new Date());
  const [pendingPolls,setPendingPolls]=useState([]);
  const [reviewNote,setReviewNote]=useState({});
  const [reviewing,setReviewing]=useState(null);

  const DUR_MAX={minutos:1440,horas:480,dias:20};
  const DUR_LABEL={minutos:"minutos",horas:"horas",dias:"dias"};
  const JERARQUIA_COLOR={admin:"#00c1fc",teacher:"#8b5cf6"};

  const load=()=>{
    api.polls()
      .then(d=>setPolls(Array.isArray(d)?d:d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{
    load();
    api.pendingPolls().then(d=>setPendingPolls(Array.isArray(d)?d:[])).catch(()=>{});
    // Preview en vivo
    const id=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(id);
  },[]);
  useEffect(()=>{
    if(scope==="aula"&&classrooms.length===0)
      api.adminClassrooms().then(d=>setClassrooms(Array.isArray(d)?d:[])).catch(()=>{});
  },[scope]);

  const calcFinISO=()=>{
    // Siempre usa new Date() al momento exacto de hacer click en Crear
    const val=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const d=new Date();
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(durUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    return d.toISOString();
  };

  const previewFin=(()=>{
    // Usa `now` (actualizado cada 30s) para que el preview no se desactualice
    const val=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const d=new Date(now.getTime());
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(durUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    return d.toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  })();

  const reviewPoll=async(pollId, action)=>{
    const note=reviewNote[pollId]||"";
    setReviewing(pollId+action);
    try{
      await api.reviewPoll(pollId, action, note||undefined);
      showToast(action==="approve"?"Propuesta aprobada ✅":"Propuesta rechazada");
      setPendingPolls(ps=>ps.filter(p=>p.id!==pollId));
      if(action==="approve") load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setReviewing(null);}
  };

  const crear=async()=>{
    if(!titulo.trim()){showToast("Escribi un titulo","error");return;}
    const ops=opciones.filter(o=>o.trim());
    if(ops.length<2){showToast("Necesitas al menos 2 opciones","error");return;}
    const val=parseInt(durValor)||0;
    if(val<1){showToast("La duracion debe ser mayor a 0","error");return;}
    if(scope==="aula"&&!classroomId){showToast("Seleccioná un aula","error");return;}
    setSaving(true);
    try{
      await api.createPoll({
        titulo:titulo.trim(), opciones:ops, fin:calcFinISO(),
        weighted, scope, classroom_id: scope==="aula"?classroomId:null,
      });
      showToast(weighted?"Propuesta DAO creada 🏛️":"Votacion creada");
      setForm(false);setTitulo("");setOpciones(["",""]);setDurValor("24");setDurUnidad("horas");
      setWeighted(false);setScope("global");setClassroomId("");
      load();
    }catch(e){showToast(e.message||"Error al crear","error");}
    finally{setSaving(false);}
  };

  const toggleActiva=async(poll)=>{
    try{
      await api.updatePoll(poll.id,{activa:!poll.activa});
      showToast(poll.activa?"Votacion cerrada":"Votacion reabierta");
      load();
    }catch(e){showToast(e.message||"Error","error");}
  };

  const sorted=[...polls].sort((a,b)=>{
    const rank={admin:0,teacher:1};
    const ra=rank[a.creador_rol]??2;
    const rb=rank[b.creador_rol]??2;
    return ra!==rb?ra-rb:new Date(b.created_at)-new Date(a.created_at);
  });

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20}}>Votaciones</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {/* ── Propuestas pendientes de revisión ───────────────── */}
        {pendingPolls.length>0&&(
          <div style={{background:"white",borderRadius:20,padding:14,marginBottom:14,
            border:"1.5px solid #f59e0b44",boxShadow:"0 2px 10px #f59e0b22"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#b45309",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>⏳</span> {pendingPolls.length} propuesta{pendingPolls.length!==1?"s":""} pendiente{pendingPolls.length!==1?"s":""}
            </div>
            {pendingPolls.map(p=>{
              const isReviewing=reviewing&&reviewing.startsWith(p.id);
              return(
                <div key={p.id} style={{borderTop:"1px solid #f0f0f0",paddingTop:10,marginBottom:10}}>
                  <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:10,background:p.creador_rol==="student"?"#6366f118":"#f59e0b18",
                      borderRadius:99,padding:"2px 8px",fontWeight:800,
                      color:p.creador_rol==="student"?"#6366f1":"#b45309"}}>
                      {p.creador_rol==="student"?"🧑‍🎓":"👨‍👩‍👧"} {p.creador_nombre}
                    </span>
                    {p.weighted&&<span style={{fontSize:10,background:"#f59e0b18",borderRadius:99,
                      padding:"2px 8px",fontWeight:800,color:"#b45309"}}>🏛️ DAO</span>}
                    <span style={{fontSize:10,color:"#aaa",marginLeft:"auto"}}>
                      {new Date(p.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:4}}>{p.titulo}</div>
                  {p.contexto&&(
                    <div style={{fontSize:12,color:"#666",marginBottom:6,lineHeight:1.5,
                      background:"#f7f7f7",borderRadius:10,padding:"8px 10px"}}>{p.contexto}</div>
                  )}
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                    {(p.opciones||[]).map((op,i)=>(
                      <span key={i} style={{background:"#f0f0f0",borderRadius:8,padding:"3px 8px",fontSize:11,color:"#555"}}>
                        {op.texto}
                      </span>
                    ))}
                  </div>
                  <input value={reviewNote[p.id]||""} onChange={e=>setReviewNote(n=>({...n,[p.id]:e.target.value}))}
                    placeholder="Nota (opcional: motivo de rechazo o condición de aprobación)..."
                    style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:10,
                      padding:"7px 10px",fontSize:11,outline:"none",fontFamily:"Nunito,sans-serif",marginBottom:6}}/>
                  <div style={{display:"flex",gap:6}}>
                    <button disabled={!!isReviewing}
                      onClick={()=>reviewPoll(p.id,"approve")}
                      style={{flex:1,background:"#dcfce7",border:"none",borderRadius:10,color:"#059669",
                        padding:"9px",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {reviewing===p.id+"approve"?"...":"✅ Aprobar"}
                    </button>
                    <button disabled={!!isReviewing}
                      onClick={()=>reviewPoll(p.id,"reject")}
                      style={{flex:1,background:"#fee2e2",border:"none",borderRadius:10,color:"#ef4444",
                        padding:"9px",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {reviewing===p.id+"reject"?"...":"❌ Rechazar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Nueva votacion</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Pregunta..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Opciones</div>
            {opciones.map((op,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={op} onChange={e=>{const n=[...opciones];n[i]=e.target.value;setOpciones(n);}}
                  placeholder={"Opcion "+(i+1)}
                  style={{flex:1,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"8px 12px",
                    fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                {opciones.length>2&&(
                  <button onClick={()=>setOpciones(o=>o.filter((_,j)=>j!==i))}
                    style={{background:"#fee2e2",border:"none",borderRadius:8,color:"#ef4444",width:32,cursor:"pointer",fontWeight:800}}>x</button>
                )}
              </div>
            ))}
            {opciones.length<8&&(
              <button onClick={()=>setOpciones(o=>[...o,""])}
                style={{width:"100%",background:"#f0f0f0",border:"none",borderRadius:12,
                  padding:"8px",fontSize:12,fontWeight:800,color:"#666",cursor:"pointer",
                  marginBottom:10,fontFamily:"Nunito,sans-serif"}}>+ Agregar opcion</button>
            )}
            {/* Scope */}
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Alcance</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {[["global","🌐 Global"],["aula","🏫 Aula"]].map(([v,l])=>(
                <button key={v} onClick={()=>setScope(v)}
                  style={{flex:1,background:scope===v?"#00c1fc":"#f0f0f0",color:scope===v?"white":"#555",
                    border:"none",borderRadius:10,padding:"9px 6px",fontWeight:800,fontSize:12,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
              ))}
            </div>
            {scope==="aula"&&(
              <select value={classroomId} onChange={e=>setClassroomId(e.target.value)}
                style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #e8e8e8",borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",marginBottom:10}}>
                <option value="">-- Seleccioná un aula --</option>
                {classrooms.map(c=>(
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}

            {/* DAO Weighted */}
            <button onClick={()=>setWeighted(w=>!w)}
              style={{width:"100%",background:weighted?"#f59e0b18":"#f7f7f7",
                border:`1.5px solid ${weighted?"#f59e0b":"#e8e8e8"}`,borderRadius:12,
                padding:"10px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",marginBottom:10,display:"flex",alignItems:"center",gap:8,
                color:weighted?"#b45309":"#666",textAlign:"left"}}>
              <span style={{fontSize:16}}>🏛️</span>
              <div style={{flex:1}}>
                <div>DAO: Poder de voto por monedas {weighted?"✓ Activado":""}</div>
                {weighted&&<div style={{fontSize:10,fontWeight:600,opacity:.7}}>El peso de cada voto = balance del votante</div>}
              </div>
              <div style={{width:22,height:22,borderRadius:"50%",
                background:weighted?"#f59e0b":"#ddd",display:"flex",alignItems:"center",justifyContent:"center",
                color:"white",fontSize:12,flexShrink:0}}>{weighted?"✓":"○"}</div>
            </button>

            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Duracion (max 20 dias)</div>
            <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" value={durValor}
                onChange={e=>{const v=Math.min(Math.max(1,parseInt(e.target.value)||1),DUR_MAX[durUnidad]);setDurValor(String(v));}}
                min="1" max={DUR_MAX[durUnidad]}
                style={{width:70,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 12px",
                  fontSize:16,fontWeight:800,outline:"none",fontFamily:"Nunito,sans-serif",textAlign:"center",color:"#00c1fc"}}/>
              <div style={{display:"flex",gap:6,flex:1}}>
                {["minutos","horas","dias"].map(u=>(
                  <button key={u} onClick={()=>{setDurUnidad(u);setDurValor(v=>String(Math.min(parseInt(v)||1,DUR_MAX[u])));}}
                    style={{flex:1,background:durUnidad===u?"#00c1fc":"#f0f0f0",color:durUnidad===u?"white":"#555",
                      border:"none",borderRadius:10,padding:"8px 4px",fontWeight:800,fontSize:11,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>{DUR_LABEL[u]}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center"}}>
              Cierra el {previewFin}
            </div>
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear votacion"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {sorted.map(v=>{
          const esAdmin=v.creador_rol==="admin";
          const esTeacher=v.creador_rol==="teacher";
          const jerarCol=JERARQUIA_COLOR[v.creador_rol]||"#94a3b8";
          return(
            <div key={v.id} style={{background:"white",borderRadius:16,padding:"14px",marginBottom:8,
              boxShadow:esAdmin?"0 2px 12px rgba(0,193,252,.2)":esTeacher?"0 2px 12px rgba(139,92,246,.15)":"0 1px 8px rgba(0,0,0,.06)",
              border:"1.5px solid "+(esAdmin||esTeacher?jerarCol+"44":"#f0f0f0")}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                    {(esAdmin||esTeacher)&&(
                      <div style={{display:"inline-flex",alignItems:"center",gap:4,
                        background:jerarCol+"18",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:jerarCol}}>
                          {esAdmin?"ADMIN":"DOCENTE"}
                        </span>
                      </div>
                    )}
                    {v.weighted&&(
                      <div style={{display:"inline-flex",alignItems:"center",gap:3,
                        background:"#f59e0b18",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#b45309"}}>🏛️ DAO</span>
                      </div>
                    )}
                    {v.scope==="aula"&&(
                      <div style={{display:"inline-flex",alignItems:"center",gap:3,
                        background:"#6366f118",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#6366f1"}}>🏫 Aula</span>
                      </div>
                    )}
                  </div>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{v.titulo}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                    por {v.creador_nombre}
                    {v.fin&&(" - Cierra "+new Date(v.fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}
                  </div>
                </div>
                <span style={{background:v.activa?"#10b98122":"#94a3b822",
                  color:v.activa?"#10b981":"#94a3b8",borderRadius:99,padding:"3px 9px",
                  fontSize:10,fontWeight:800,flexShrink:0}}>{v.activa?"Activa":"Cerrada"}</span>
              </div>
              {v.opciones?.map(op=>{
                const contPct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const pesoPct=v.weighted&&v.total_peso>0?Math.round(parseFloat(op.peso_total||0)/v.total_peso*100):0;
                const pct=v.weighted?pesoPct:contPct;
                const barCol=v.weighted?"#f59e0b":jerarCol;
                return(
                  <div key={op.id} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:"#555",marginBottom:2}}>
                      <span>{op.texto}</span>
                      <span style={{textAlign:"right"}}>
                        {v.weighted
                          ? <>{pct}% <span style={{fontSize:10,color:"#f59e0b"}}>({parseFloat(op.peso_total||0).toFixed(0)} mon)</span></>
                          : <>{op.votos} votos ({pct}%)</>
                        }
                      </span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:99,height:6}}>
                      <div style={{width:pct+"%",height:"100%",borderRadius:99,background:barCol,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{fontSize:11,color:"#aaa"}}>
                  {v.total_votos} voto{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&` · ${parseFloat(v.total_peso).toFixed(0)} monedas`}
                </span>
                <button onClick={()=>toggleActiva(v)} style={{background:v.activa?"#fee2e2":"#dcfce7",border:"none",
                  borderRadius:99,color:v.activa?"#ef4444":"#10b981",padding:"5px 14px",
                  fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {v.activa?"Cerrar":"Reabrir"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ════════════════════════════════════════════════════════════
// ADMIN — REPORTES
// ════════════════════════════════════════════════════════════

export default AdminVotaciones;
