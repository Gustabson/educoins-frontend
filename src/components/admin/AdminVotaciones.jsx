import { useState, useEffect } from "react";
import { api, getSocket } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";

// Paleta admin (sin tema dinámico — admin siempre en modo claro)
const C = {
  bg:     "#F0F0F0",
  card:   "white",
  accent: "#00c1fc",
  txt:    "#1a1a1a",
  sub:    "#666666",
  muted:  "#aaaaaa",
  bd:     "#e8e8e8",
  bd2:    "#f0f0f0",
};

function AdminVotaciones({showToast, onBack}){
  const [subSec,setSubSec]         = useState("activas"); // activas|cerradas|aprobadas
  const [searchQ,setSearchQ]       = useState("");
  const [polls,setPolls]           = useState([]);
  const [loading,setLoading]       = useState(true);
  const [form,setForm]             = useState(false);
  const [titulo,setTitulo]         = useState("");
  const [opciones,setOpciones]     = useState(["",""]);
  const [durUnidad,setDurUnidad]   = useState("horas");
  const [durValor,setDurValor]     = useState("24");
  const [inicioValor,setInicioValor] = useState("1");
  const [inicioUnidad,setInicioUnidad] = useState("dias");
  const [scope,setScope]           = useState("global");
  const [classroomId,setClassroomId]=useState("");
  const [classrooms,setClassrooms] = useState([]);
  const [saving,setSaving]         = useState(false);
  const [now,setNow]               = useState(()=>new Date());
  const [quorumCfg,setQuorumCfg]   = useState({aula:{threshold:50,mode:"people"},global:{threshold:50,mode:"coins"}});
  const [quorumOpen,setQuorumOpen] = useState(false);
  const [savingQ,setSavingQ]       = useState(null);

  const DUR_MAX   = {minutos:1440,horas:480,dias:20};
  const DUR_LABEL = {minutos:"minutos",horas:"horas",dias:"dias"};
  const JERARQUIA_COLOR = {admin:C.accent,teacher:"#8b5cf6"};

  const subSecRef = { current: "activas" };

  const load=(ss)=>{
    const s = ss ?? subSecRef.current;
    setLoading(true);
    const statusMap = {activas:undefined, cerradas:"closed", aprobadas:"approved"};
    api.polls(null, null, statusMap[s])
      .then(d=>setPolls(Array.isArray(d)?d:[]))
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ subSecRef.current = subSec; load(subSec); },[subSec]);

  useEffect(()=>{
    api.quorumSettings().then(d=>{
      if(Array.isArray(d)) setQuorumCfg(Object.fromEntries(d.map(r=>[r.scope,{threshold:parseFloat(r.threshold),mode:r.mode}])));
    }).catch(()=>{});
    const id=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    if(scope==="aula"&&classrooms.length===0)
      api.adminClassrooms().then(d=>setClassrooms(Array.isArray(d)?d:[])).catch(()=>{});
  },[scope]);

  // ── Socket tiempo real ────────────────────────────────────
  useEffect(()=>{
    let socket;
    try{ socket=getSocket(); } catch(e){ return; }
    if(!socket) return;
    const handler=({ poll_id, action })=>{
      if(action==='created'){
        if(subSecRef.current==='activas') load('activas');
      } else if(action==='approved'){
        setPolls(ps=>ps.filter(p=>p.id!==poll_id));
        if(subSecRef.current==='aprobadas') load('aprobadas');
      } else if(action==='vote'){
        api.pollById(poll_id)
          .then(u=>{ if(u) setPolls(ps=>ps.map(p=>p.id===poll_id?u:p)); })
          .catch(()=>{});
      }
    };
    socket.on('poll_update', handler);
    return ()=>socket.off('poll_update', handler);
  },[]);

  const calcInicioFin=()=>{
    const delay=Math.max(scope==="global"?1:0, parseInt(inicioValor)||0);
    const durVal=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const inicioD=new Date();
    if(delay>0){
      if(inicioUnidad==="minutos") inicioD.setMinutes(inicioD.getMinutes()+delay);
      else if(inicioUnidad==="horas") inicioD.setHours(inicioD.getHours()+delay);
      else inicioD.setDate(inicioD.getDate()+delay);
    }
    const finD=new Date(inicioD.getTime());
    if(durUnidad==="minutos") finD.setMinutes(finD.getMinutes()+durVal);
    else if(durUnidad==="horas") finD.setHours(finD.getHours()+durVal);
    else finD.setDate(finD.getDate()+durVal);
    return { inicio: delay>0?inicioD.toISOString():null, fin: finD.toISOString() };
  };

  const previewFin=(()=>{
    const {fin} = calcInicioFin();
    return new Date(fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  })();
  const previewInicio=(()=>{
    const delay=Math.max(scope==="global"?1:0, parseInt(inicioValor)||0);
    if(delay===0) return "Inmediatamente";
    const {inicio} = calcInicioFin();
    return new Date(inicio).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  })();

  const saveQuorum=async(sc)=>{
    setSavingQ(sc);
    try{
      const d=quorumCfg[sc];
      const rows=await api.updateQuorum(sc,{threshold:d.threshold,mode:d.mode});
      if(Array.isArray(rows)) setQuorumCfg(Object.fromEntries(rows.map(r=>[r.scope,{threshold:parseFloat(r.threshold),mode:r.mode}])));
      showToast(`Quórum ${sc} guardado ✅`);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingQ(null);}
  };

  const crear=async()=>{
    if(!titulo.trim()){showToast("Escribí un título","error");return;}
    const ops=opciones.filter(o=>o.trim());
    if(ops.length<2){showToast("Necesitás al menos 2 opciones","error");return;}
    const val=parseInt(durValor)||0;
    if(val<1){showToast("La duración debe ser mayor a 0","error");return;}
    if(scope==="aula"&&!classroomId){showToast("Seleccioná un aula","error");return;}
    setSaving(true);
    try{
      await api.createPoll({
        titulo:titulo.trim(), opciones:ops,
        delay_valor: parseInt(inicioValor)||0, delay_unidad: inicioUnidad,
        dur_valor: parseInt(durValor)||1, dur_unidad: durUnidad,
        scope, classroom_id: scope==="aula"?classroomId:null,
      });
      showToast("Votación creada 🏛️");
      setForm(false);setTitulo("");setOpciones(["",""]);setDurValor("24");setDurUnidad("horas");
      setInicioValor("1");setInicioUnidad("dias");setScope("global");setClassroomId("");
      load();
    }catch(e){showToast(e.message||"Error al crear","error");}
    finally{setSaving(false);}
  };

  const toggleActiva=async(poll)=>{
    try{
      await api.updatePoll(poll.id,{activa:!poll.activa});
      showToast(poll.activa?"Votación cerrada":"Votación reabierta");
      load();
    }catch(e){showToast(e.message||"Error","error");}
  };

  const borrarPoll=async(poll)=>{
    if(!window.confirm(`¿Eliminar "${poll.titulo}"?`)) return;
    try{
      await api.deletePoll(poll.id);
      setPolls(ps=>ps.filter(p=>p.id!==poll.id));
      showToast("Votación eliminada");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const aprobarPoll=async(poll)=>{
    try{
      await api.approvePoll(poll.id);
      setPolls(ps=>ps.filter(p=>p.id!==poll.id));
      showToast("Propuesta aprobada oficialmente ✅");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const displayed=[...polls]
    .filter(v=>{
      if(!searchQ.trim()) return true;
      const q=searchQ.trim().toLowerCase();
      if(q.startsWith('#')) return String(v.poll_number)===q.slice(1);
      return v.titulo.toLowerCase().includes(q);
    })
    .sort((a,b)=>{
      const rank={admin:0,teacher:1};
      const ra=rank[a.creador_rol]??2, rb=rank[b.creador_rol]??2;
      return ra!==rb?ra-rb:new Date(b.created_at)-new Date(a.created_at);
    });

  const sorted=[...polls].sort((a,b)=>{
    const rank={admin:0,teacher:1};
    const ra=rank[a.creador_rol]??2, rb=rank[b.creador_rol]??2;
    return ra!==rb?ra-rb:new Date(b.created_at)-new Date(a.created_at);
  });

  return(
    <div style={{minHeight:"100vh",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.accent,color:"white",padding:"22px 16px 28px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
              <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20}}>Votaciones</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>

      {/* Sub-tabs + Buscador */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.bd}`,padding:"8px 14px",
        position:"sticky",top:70,zIndex:40}}>
        <div style={{display:"flex",gap:5,marginBottom:8}}>
          {[["activas","⚡ Activas"],["cerradas","🔒 Cerradas"],["aprobadas","✅ Aprobadas"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setSubSec(id);setSearchQ("");}}
              style={{flex:1,padding:"7px 4px",background:subSec===id?C.accent:C.bd2,
                border:`1.5px solid ${subSec===id?C.accent:C.bd}`,
                color:subSec===id?"white":C.sub,borderRadius:99,
                fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                transition:"all .2s"}}>
              {label}
            </button>
          ))}
        </div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
            fontSize:14,pointerEvents:"none"}}>🔍</span>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
            placeholder='Buscar por nombre o "#123"...'
            style={{width:"100%",boxSizing:"border-box",background:"#f7f7f7",
              border:`1.5px solid ${C.bd}`,borderRadius:99,
              padding:"7px 12px 7px 32px",fontSize:12,outline:"none",
              color:C.txt,fontFamily:"Nunito,sans-serif"}}/>
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* ── Formulario nueva votación ─────────────────────── */}
        {form&&(
          <div style={{background:C.card,borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:C.txt,marginBottom:10}}>Nueva votación</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Pregunta..."
              style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${C.bd}`,borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:6}}>Opciones</div>
            {opciones.map((op,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={op} onChange={e=>{const n=[...opciones];n[i]=e.target.value;setOpciones(n);}}
                  placeholder={"Opción "+(i+1)}
                  style={{flex:1,border:`1.5px solid ${C.bd}`,borderRadius:12,padding:"8px 12px",
                    fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                {opciones.length>2&&(
                  <button onClick={()=>setOpciones(o=>o.filter((_,j)=>j!==i))}
                    style={{background:"#fee2e2",border:"none",borderRadius:8,color:"#ef4444",width:32,cursor:"pointer",fontWeight:800}}>✕</button>
                )}
              </div>
            ))}
            {opciones.length<8&&(
              <button onClick={()=>setOpciones(o=>[...o,""])}
                style={{width:"100%",background:C.bd2,border:"none",borderRadius:12,
                  padding:"8px",fontSize:12,fontWeight:800,color:C.sub,cursor:"pointer",
                  marginBottom:10,fontFamily:"Nunito,sans-serif"}}>+ Agregar opción</button>
            )}

            {/* Alcance */}
            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:6}}>Alcance</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {[["global","🌐 Global"],["aula","🏫 Aula"]].map(([v,l])=>(
                <button key={v} onClick={()=>setScope(v)}
                  style={{flex:1,background:scope===v?C.accent:C.bd2,color:scope===v?"white":C.sub,
                    border:"none",borderRadius:10,padding:"9px 6px",fontWeight:800,fontSize:12,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
              ))}
            </div>
            {scope==="aula"&&(
              <select value={classroomId} onChange={e=>setClassroomId(e.target.value)}
                style={{width:"100%",background:"#f7f7f7",border:`1.5px solid ${C.bd}`,borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",marginBottom:10}}>
                <option value="">-- Seleccioná un aula --</option>
                {classrooms.map(c=>(
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}

            {/* ¿Cuándo empieza? */}
            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:6}}>
              🕐 ¿Cuándo empieza? {scope==="global"&&<span style={{color:C.muted,fontWeight:600}}>(mín. 1 día)</span>}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" value={inicioValor}
                onChange={e=>{
                  const min=scope==="global"&&inicioUnidad==="dias"?1:scope==="global"?1:0;
                  const v=Math.max(min,parseInt(e.target.value)||0);
                  setInicioValor(String(v));
                }}
                min={scope==="global"?1:0}
                style={{width:70,border:`1.5px solid ${C.bd}`,borderRadius:12,padding:"10px 12px",
                  fontSize:16,fontWeight:800,outline:"none",fontFamily:"Nunito,sans-serif",
                  textAlign:"center",color:C.accent}}/>
              <div style={{display:"flex",gap:6,flex:1}}>
                {(scope==="aula"?["minutos","horas","dias"]:["dias"]).map(u=>(
                  <button key={u}
                    onClick={()=>{
                      setInicioUnidad(u);
                      if(scope==="global") setInicioValor(v=>String(Math.max(1,parseInt(v)||1)));
                    }}
                    style={{flex:1,background:inicioUnidad===u?C.accent:C.bd2,color:inicioUnidad===u?"white":C.sub,
                      border:"none",borderRadius:10,padding:"8px 4px",fontWeight:800,fontSize:11,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>{u}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10,textAlign:"center"}}>
              Inicio: {previewInicio}
            </div>

            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:6}}>Duración (máx. 20 días)</div>
            <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" value={durValor}
                onChange={e=>{const v=Math.min(Math.max(1,parseInt(e.target.value)||1),DUR_MAX[durUnidad]);setDurValor(String(v));}}
                min="1" max={DUR_MAX[durUnidad]}
                style={{width:70,border:`1.5px solid ${C.bd}`,borderRadius:12,padding:"10px 12px",
                  fontSize:16,fontWeight:800,outline:"none",fontFamily:"Nunito,sans-serif",
                  textAlign:"center",color:C.accent}}/>
              <div style={{display:"flex",gap:6,flex:1}}>
                {["minutos","horas","dias"].map(u=>(
                  <button key={u}
                    onClick={()=>{setDurUnidad(u);setDurValor(v=>String(Math.min(parseInt(v)||1,DUR_MAX[u])));}}
                    style={{flex:1,background:durUnidad===u?C.accent:C.bd2,color:durUnidad===u?"white":C.sub,
                      border:"none",borderRadius:10,padding:"8px 4px",fontWeight:800,fontSize:11,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>{DUR_LABEL[u]}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12,textAlign:"center"}}>
              Cierra el {previewFin}
            </div>
            <button onClick={crear} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":C.accent,border:"none",borderRadius:50,
                color:"white",padding:"12px",fontWeight:800,fontSize:14,
                cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear votación"}
            </button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",color:C.muted,padding:32}}>Cargando...</div>}

        {/* ── Lista de polls ────────────────────────────────── */}
        {!loading&&displayed.length===0&&(
          <div style={{background:C.card,borderRadius:16,padding:32,textAlign:"center",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:36}}>{subSec==="aprobadas"?"✅":subSec==="cerradas"?"🔒":"🗳️"}</div>
            <div style={{fontWeight:800,color:C.txt,marginTop:8}}>
              {searchQ?"Sin resultados":
               subSec==="activas"?"No hay votaciones activas":
               subSec==="cerradas"?"No hay votaciones cerradas pendientes de aprobación":
               "No hay propuestas aprobadas aún"}
            </div>
          </div>
        )}
        {displayed.map(v=>{
          const esAdmin  =v.creador_rol==="admin";
          const esTeacher=v.creador_rol==="teacher";
          const jerarCol =JERARQUIA_COLOR[v.creador_rol]||"#94a3b8";
          return(
            <div key={v.id} style={{background:C.card,borderRadius:16,padding:"14px",marginBottom:8,
              boxShadow:esAdmin?`0 2px 12px ${C.accent}33`:esTeacher?"0 2px 12px rgba(139,92,246,.15)":"0 1px 8px rgba(0,0,0,.06)",
              border:`1.5px solid ${esAdmin||esTeacher?jerarCol+"44":C.bd2}`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                    <div style={{display:"inline-flex",alignItems:"center",
                      background:C.bd2,borderRadius:99,padding:"2px 8px"}}>
                      <span style={{fontSize:9,fontWeight:800,color:C.muted}}>#{v.poll_number}</span>
                    </div>
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
                        background:C.accent+"18",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:C.accent}}>🏛️ DAO</span>
                      </div>
                    )}
                    {v.scope==="aula"&&(
                      <div style={{display:"inline-flex",alignItems:"center",gap:3,
                        background:"#6366f118",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#6366f1"}}>🏫 Aula</span>
                      </div>
                    )}
                    {v.status==="approved"&&(
                      <div style={{display:"inline-flex",alignItems:"center",gap:3,
                        background:"#10b98118",borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#10b981"}}>
                          ✅ Aprobada {v.approved_at?new Date(v.approved_at).toLocaleDateString("es-AR"):""}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{fontWeight:800,fontSize:13,color:C.txt}}>{v.titulo}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                    por {v.creador_nombre}
                    {v.fin&&(" · Cierra "+new Date(v.fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}
                  </div>
                </div>
                <span style={{background:v.status==="approved"?"#10b98122":v.activa?"#10b98122":"#94a3b822",
                  color:v.status==="approved"?"#10b981":v.activa?"#10b981":"#94a3b8",borderRadius:99,padding:"3px 9px",
                  fontSize:10,fontWeight:800,flexShrink:0}}>
                  {v.status==="approved"?"Aprobada":v.activa?"Activa":"Cerrada"}
                </span>
              </div>

              {v.opciones?.map(op=>{
                const contPct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const pesoPct=v.weighted&&v.total_peso>0?Math.round(parseFloat(op.peso_total||0)/v.total_peso*100):0;
                const pct   =v.weighted?pesoPct:contPct;
                const barCol=v.weighted?C.accent:jerarCol;
                return(
                  <div key={op.id} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:C.sub,marginBottom:2}}>
                      <span>{op.texto}</span>
                      <span style={{textAlign:"right"}}>
                        {v.weighted
                          ?<>{pct}% <span style={{fontSize:10,color:C.accent}}>({parseFloat(op.peso_total||0).toFixed(0)} mon)</span></>
                          :<>{op.votos} votos ({pct}%)</>}
                      </span>
                    </div>
                    <div style={{background:C.bd2,borderRadius:99,height:6}}>
                      <div style={{width:pct+"%",height:"100%",borderRadius:99,background:barCol,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}

              {/* Quórum */}
              {v.quorum&&(
                <div style={{background:v.quorum.met?"#10b98108":"#f59e0b08",borderRadius:10,
                  padding:"6px 10px",marginTop:6,
                  border:`1px solid ${v.quorum.met?"#10b98133":"#f59e0b33"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,fontWeight:700,marginBottom:3,
                    color:v.quorum.met?"#10b981":"#f59e0b"}}>
                    <span>{v.quorum.met?"✅ Quórum":"⏳ Quórum"}</span>
                    <span>{v.quorum.pct}%</span>
                  </div>
                  <div style={{background:C.bd2,borderRadius:99,height:5}}>
                    <div style={{width:`${Math.min(v.quorum.pct,100)}%`,height:"100%",borderRadius:99,
                      background:v.quorum.met?"#10b981":"#f59e0b",transition:"width .4s"}}/>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,gap:6}}>
                <span style={{fontSize:11,color:C.muted,flex:1}}>
                  {v.total_votos} voto{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&` · ${parseFloat(v.total_peso).toFixed(0)} mon`}
                  {v.snapshot_total_coins>0&&(
                    <span style={{marginLeft:6,fontSize:9}}>
                      (snap: {parseFloat(v.snapshot_total_coins).toFixed(0)}🪙 · {v.snapshot_total_voters}👥)
                    </span>
                  )}
                </span>
                {v.status!=="approved"&&(
                  <>
                    <button onClick={()=>toggleActiva(v)}
                      style={{background:v.activa?"#fee2e2":"#dcfce7",border:"none",
                        borderRadius:99,color:v.activa?"#ef4444":"#10b981",padding:"5px 14px",
                        fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {v.activa?"Cerrar":"Reabrir"}
                    </button>
                    {!v.activa&&v.fin&&new Date(v.fin)<new Date()&&(
                      <button onClick={()=>aprobarPoll(v)}
                        style={{background:"#10b98118",border:"1px solid #10b98144",borderRadius:99,
                          color:"#10b981",padding:"5px 14px",fontSize:11,fontWeight:800,
                          cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        ✅ Aprobar
                      </button>
                    )}
                  </>
                )}
                <button onClick={()=>borrarPoll(v)}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,
                    padding:"4px 6px",borderRadius:8}}>🗑️</button>
              </div>
            </div>
          );
        })}

        {/* ── Configuración de Quórum ──────────────────────── */}
        <div style={{background:C.card,borderRadius:20,padding:"14px 16px",marginTop:4,
          border:"1.5px solid #6366f133",boxShadow:"0 1px 8px rgba(99,102,241,.08)"}}>
          <button onClick={()=>setQuorumOpen(q=>!q)}
            style={{width:"100%",background:"none",border:"none",cursor:"pointer",
              display:"flex",alignItems:"center",gap:8,padding:0,fontFamily:"Nunito,sans-serif"}}>
            <span style={{fontWeight:800,fontSize:13,color:"#6366f1",flex:1,textAlign:"left"}}>⚙️ Configuración de quórum</span>
            <span style={{color:C.muted,fontSize:12}}>{quorumOpen?"▲":"▼"}</span>
          </button>
          {quorumOpen&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
                El quórum define la participación mínima para que una votación sea válida.
              </div>
              {[["aula","🏫 Aula — excluye docentes"],["global","🌐 Global"]].map(([sc,label])=>{
                const cfg=quorumCfg[sc]||{threshold:50,mode:"people"};
                return(
                  <div key={sc} style={{background:"#f7f7f7",borderRadius:14,padding:"12px 14px",marginBottom:10}}>
                    <div style={{fontWeight:800,fontSize:13,color:C.txt,marginBottom:10}}>{label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <input type="range" min="1" max="100" value={cfg.threshold}
                        onChange={e=>setQuorumCfg(q=>({...q,[sc]:{...cfg,threshold:Number(e.target.value)}}))}
                        style={{flex:1,accentColor:"#6366f1"}}/>
                      <div style={{background:"#6366f1",borderRadius:8,padding:"4px 10px",
                        fontWeight:900,fontSize:16,color:"white",minWidth:50,textAlign:"center"}}>
                        {cfg.threshold}%
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      {[["people","👤 Personas"],["coins","🪙 Monedas"]].map(([m,ml])=>(
                        <button key={m} onClick={()=>setQuorumCfg(q=>({...q,[sc]:{...cfg,mode:m}}))}
                          style={{flex:1,background:cfg.mode===m?"#6366f1":"#ececec",
                            color:cfg.mode===m?"white":C.sub,border:"none",borderRadius:10,
                            padding:"9px",fontWeight:800,fontSize:11,cursor:"pointer",
                            fontFamily:"Nunito,sans-serif"}}>{ml}</button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.muted,marginBottom:8}}>
                      {cfg.mode==="people"
                        ?sc==="aula"
                          ?`Al menos el ${cfg.threshold}% de los alumnos del aula deben votar`
                          :`Al menos el ${cfg.threshold}% de alumnos+padres deben votar`
                        :sc==="aula"
                          ?`Al menos el ${cfg.threshold}% de las monedas del aula deben participar`
                          :`Al menos el ${cfg.threshold}% de las monedas en circulación deben participar`}
                    </div>
                    <button onClick={()=>saveQuorum(sc)} disabled={savingQ===sc}
                      style={{width:"100%",background:savingQ===sc?"#ccc":"#6366f1",
                        border:"none",borderRadius:50,color:"white",padding:"10px",
                        fontWeight:800,fontSize:12,cursor:savingQ===sc?"not-allowed":"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {savingQ===sc?"Guardando...":"Guardar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminVotaciones;
