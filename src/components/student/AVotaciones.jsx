import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


const DUR_MAX={minutos:1440,horas:480,dias:20};

const PROP_HELPER=`📝 CÓMO ESCRIBIR UNA BUENA PROPUESTA DAO

✅ TÍTULO (pregunta clara y directa)
  "¿Debería la escuela organizar una feria de ciencias?"
  Evitá: "Propuesta 1" o "Idea nueva"

✅ DESCRIPCIÓN DEL PROBLEMA
  Explicá qué querés resolver y el impacto esperado.
  Ej: "Varios estudiantes quieren mostrar sus proyectos. Una feria anual motivaría la creatividad."

✅ OPCIONES DE VOTO — explicá qué significa cada una
  • "Sí — aprobar y organizar la feria este año"
  • "No — no organizar por ahora"
  • "Abstención — necesito más información"

💡 CONSEJOS
  • Sé específico sobre quién implementaría la decisión
  • Mencioná si hay costos o recursos involucrados
  • 2-3 opciones es lo ideal`;

const LEGAL_INFO=`⚖️ QUÉ PUEDE DECIDIRSE EN UNA ESCUELA

✅ PUEDE SER PROPUESTO Y VOTADO:
  • Organización de eventos y actividades extracurriculares
    (Ley 26.206 Art. 11 — participación estudiantil)
  • Normas de convivencia y reglamento interno
    (Ley 26.892 — Convivencia Escolar, Art. 3)
  • Uso de espacios comunes y recreación
  • Propuestas de mejora de infraestructura (no vinculantes)
  • Actividades del Centro de Estudiantes
    (Ley 26.877 — Centros de Estudiantes)

❌ NO PUEDE SER DECIDIDO POR VOTO:
  • Contenidos curriculares
    (Res. CFE 24/07 — jurisdicción nacional/provincial)
  • Designación o remoción de docentes
    (Ley 10.579 — Estatuto Docente)
  • Modificación de horarios o calendario
    (Resolución ministerial de cada jurisdicción)
  • Sanciones disciplinarias a alumnos
    (Ley 26.892 — Régimen de convivencia)

⚠️ IMPORTANTE
  Las resoluciones DAO de esta app son CONSULTIVAS.
  La decisión final siempre queda en la dirección.`;

function AVotaciones({me,showToast,onBack}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd} = useTheme();
  const [sec,setSec]         = useState("global"); // "global"|"aula"
  const [polls,setPolls]     = useState([]);
  const [loading,setLoading] = useState(true);
  const [voting,setVoting]   = useState(null);
  const [seleccion,setSel]   = useState({});
  const [selPoll,setSelPoll] = useState(null);  // poll abierta para comentarios
  const [comments,setComments]= useState([]);
  const [newCmt,setNewCmt]   = useState("");
  const [replyTo,setReplyTo] = useState(null);  // {id, nombre}
  const [replies,setReplies] = useState({});    // {comment_id: [...]}
  const [classInfo,setCInfo] = useState(null);
  const [savingCmt,setSavingCmt]=useState(false);
  // Propuesta DAO
  const [propModal,setPropModal]   = useState(false);
  const [propTitulo,setPropTitulo] = useState("");
  const [propContexto,setPropContexto]=useState("");
  const [propOpciones,setPropOpciones]=useState(["",""]);
  const [propDurValor,setPropDurValor]=useState("24");
  const [propDurUnidad,setPropDurUnidad]=useState("horas");
  const [propWeighted,setPropWeighted]=useState(true); // DAO por defecto
  const [propScope,setPropScope]   = useState("global"); // "global"|"aula"
  const [propSaving,setPropSaving] = useState(false);
  const [propHelper,setPropHelper] = useState(false);
  const [propLegal,setPropLegal]   = useState(false);
  // Tiempo en vivo para preview de fecha
  const [now,setNow]=useState(()=>new Date());
  // Lista de votantes
  const [voterPoll,setVoterPoll]=useState(null);
  const [voters,setVoters]=useState([]);
  const [loadingVoters,setLoadingVoters]=useState(false);
  // Ref para capturar sec en el handler de socket
  const secRef=useRef(sec);
  const classInfoRef=useRef(classInfo);


  const loadPolls = (s, ci) => {
    setLoading(true);
    const scope = s ?? sec;
    const info  = ci ?? classInfo;
    const cid   = scope==="aula" && info?.id ? info.id : null;
    api.polls(scope, cid)
      .then(d=>setPolls(Array.isArray(d)?d:d.data||[]))
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo().then(d=>{ const ci=d.data||d; setCInfo(ci); }).catch(()=>{});
    const id=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(id);
  },[]);

  // Mantener refs actualizados
  useEffect(()=>{ secRef.current=sec; },[sec]);
  useEffect(()=>{ classInfoRef.current=classInfo; },[classInfo]);

  // Real-time: actualizar polls, votos y comentarios
  useEffect(()=>{
    let socket;
    try{ socket=getSocket(); } catch(e){ return; }
    if(!socket) return;
    const handler=({ poll_id, action })=>{
      if(action==='created'){
        loadPolls(secRef.current, classInfoRef.current);
      } else if(action==='vote'){
        api.pollById(poll_id)
          .then(updated=>{ if(updated) setPolls(ps=>ps.map(p=>p.id===poll_id?updated:p)); })
          .catch(()=>{});
      } else if(action==='comment'){
        // Si estamos mirando esa poll, recargar comentarios
        setSelPoll(prev=>{
          if(prev?.id===poll_id){
            api.pollComments(poll_id).then(d=>setComments(Array.isArray(d)?d:[])).catch(()=>{});
          }
          return prev;
        });
      }
    };
    socket.on('poll_update', handler);
    return ()=>socket.off('poll_update', handler);
  },[]);

  useEffect(()=>{ loadPolls(); },[sec, classInfo]);

  const confirmarVoto=async(pollId)=>{
    const optionId=seleccion[pollId];
    if(!optionId) return;
    setVoting(pollId);
    try{
      const updated=await api.vote(pollId,optionId);
      const data=updated.data||updated;
      setPolls(ps=>ps.map(p=>p.id===pollId?data:p));
      setSel(s=>({...s,[pollId]:null}));
      showToast("Voto registrado!");
    }catch(e){
      showToast(e.message||"Error al votar","error");
    }finally{setVoting(null);}
  };

  const reaccionar=async(pollId, tipo)=>{
    try{
      const d=await api.reactPoll(pollId,tipo);
      const data=d.data||d;
      setPolls(ps=>ps.map(p=>p.id===pollId?data:p));
    }catch(e){}
  };

  const abrirComentarios=async(poll)=>{
    setSelPoll(poll);setComments([]);setNewCmt("");setReplyTo(null);
    try{
      const d=await api.pollComments(poll.id);
      setComments(d.data||d||[]);
    }catch(e){}
  };

  const enviarCmt=async()=>{
    if(!newCmt.trim()||!selPoll) return;
    setSavingCmt(true);
    try{
      const d=await api.createComment(selPoll.id,{texto:newCmt.trim(),parent_id:replyTo?.id||null});
      const nuevo=d.data||d;
      if(replyTo){
        setReplies(r=>({...r,[replyTo.id]:[...(r[replyTo.id]||[]),nuevo]}));
      } else {
        setComments(c=>[...c,nuevo]);
      }
      setNewCmt("");setReplyTo(null);
    }catch(e){showToast("Error al comentar","error");}
    finally{setSavingCmt(false);}
  };

  const reaccionarCmt=async(pollId,cmtId,tipo)=>{
    try{
      const d=await api.reactComment(pollId,cmtId,tipo);
      const data=d.data||d;
      setComments(cs=>cs.map(c=>c.id===cmtId?{...c,...data}:c));
      setReplies(r=>{
        const updated={...r};
        Object.keys(updated).forEach(k=>{
          updated[k]=updated[k].map(c=>c.id===cmtId?{...c,...data}:c);
        });
        return updated;
      });
    }catch(e){}
  };

  const cargarReplies=async(pollId,cmtId)=>{
    if(replies[cmtId]) { setReplies(r=>({...r,[cmtId]:undefined})); return; }
    try{
      const d=await api.commentReplies(pollId,cmtId);
      setReplies(r=>({...r,[cmtId]:d.data||d||[]}));
    }catch(e){}
  };

  const borrarCmt=async(cmtId)=>{
    if(!selPoll) return;
    try{
      await api.deleteComment(selPoll.id,cmtId);
      setComments(cs=>cs.filter(c=>c.id!==cmtId));
    }catch(e){}
  };

  const proponer=async()=>{
    if(!propTitulo.trim()||propTitulo.trim().length<5){showToast("El título necesita al menos 5 caracteres","error");return;}
    const isStaff=["admin","teacher"].includes(me.rol);
    if(!isStaff&&(!propContexto.trim()||propContexto.trim().length<20)){
      showToast("La descripción necesita al menos 20 caracteres","error");return;
    }
    const ops=propOpciones.filter(o=>o.trim());
    if(ops.length<2){showToast("Necesitás al menos 2 opciones","error");return;}
    const val=Math.min(parseInt(propDurValor)||24,DUR_MAX[propDurUnidad]);
    const d=new Date();
    if(propDurUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(propDurUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    setPropSaving(true);
    try{
      await api.createPoll({
        titulo:propTitulo.trim(), contexto:propContexto.trim()||undefined,
        opciones:ops, fin:d.toISOString(), weighted:propWeighted,
        scope:propScope, classroom_id:propScope==="aula"?classInfo?.id:null,
      });
      showToast(isStaff?"Votación creada ✅":"¡Propuesta enviada! Esperando aprobación ⏳");
      setPropModal(false);
      setPropTitulo("");setPropContexto("");setPropOpciones(["",""]);setPropWeighted(true);setPropScope("global");
      loadPolls(sec);
    }catch(e){showToast(e.message||"Error al enviar","error");}
    finally{setPropSaving(false);}
  };

  const retirarPropuesta=async(id)=>{
    try{
      await api.deletePoll(id);
      setPolls(ps=>ps.filter(p=>p.id!==id));
      showToast("Propuesta retirada");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const verVotantes=async(pollId)=>{
    if(voterPoll===pollId){ setVoterPoll(null); return; }
    setVoterPoll(pollId); setVoters([]); setLoadingVoters(true);
    try{ const d=await api.pollVoters(pollId); setVoters(Array.isArray(d)?d:[]); }
    catch(e){}
    finally{ setLoadingVoters(false); }
  };

  // Preview de fecha en vivo (usa `now` que se actualiza cada 30s)
  const previewPropFin=(()=>{
    const val=Math.min(parseInt(propDurValor)||1,DUR_MAX[propDurUnidad]);
    const d=new Date(now.getTime());
    if(propDurUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(propDurUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    return d.toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  })();

  // ── Vista comentarios ─────────────────────────────────────
  if(selPoll) return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,
        padding:"16px 16px 20px",color:"white",
        textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSelPoll(null)}
            style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
              color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,fontWeight:900,fontSize:15,lineHeight:1.2}}>{selPoll.titulo}</div>
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Comentarios */}
        {comments.length===0&&(
          <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>
            Sin comentarios aun. Se el primero!
          </div>
        )}
        {comments.map(c=>(
          <div key={c.id} style={{marginBottom:10}}>
            <div style={{background:cardBg,borderRadius:16,padding:"12px 14px",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Av user={c} sz={28} avatarBg={c?.avatar_bg||null}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:12,color:txt}}>{c.nombre}</div>
                  <div style={{fontSize:10,color:sub}}>
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                {(c.user_id===me.id||me.rol==="admin")&&(
                  <button onClick={()=>borrarCmt(c.id)}
                    style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:13}}>🗑️</button>
                )}
              </div>
              <div style={{fontSize:13,color:txt,lineHeight:1.5,marginBottom:8}}>{c.texto}</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>reaccionarCmt(selPoll.id,c.id,"like")}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
                    color:c.mi_reaccion==="like"?"#10b981":sub,fontWeight:c.mi_reaccion==="like"?800:400,
                    fontSize:12,fontFamily:"Nunito,sans-serif"}}>
                  👍 {c.likes||0}
                </button>
                <button onClick={()=>reaccionarCmt(selPoll.id,c.id,"dislike")}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
                    color:c.mi_reaccion==="dislike"?"#ef4444":sub,fontWeight:c.mi_reaccion==="dislike"?800:400,
                    fontSize:12,fontFamily:"Nunito,sans-serif"}}>
                  👎 {c.dislikes||0}
                </button>
                <button onClick={()=>setReplyTo(replyTo?.id===c.id?null:{id:c.id,nombre:c.nombre})}
                  style={{background:"none",border:"none",cursor:"pointer",color:accent,
                    fontSize:12,fontWeight:700,fontFamily:"Nunito,sans-serif"}}>
                  Responder
                </button>
                {c.respuestas>0&&(
                  <button onClick={()=>cargarReplies(selPoll.id,c.id)}
                    style={{background:"none",border:"none",cursor:"pointer",color:sub,
                      fontSize:11,fontFamily:"Nunito,sans-serif"}}>
                    {replies[c.id]?"Ocultar":"Ver"} {c.respuestas} respuesta{c.respuestas!==1?"s":""}
                  </button>
                )}
              </div>
            </div>

            {/* Respuestas */}
            {replies[c.id]&&(
              <div style={{paddingLeft:20,marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
                {replies[c.id].map(r=>(
                  <div key={r.id} style={{background:cardBg,borderRadius:14,padding:"10px 12px",
                    boxShadow:dark?"0 1px 6px rgba(0,0,0,.3)":"0 1px 6px rgba(0,0,0,.04)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <Av user={r} sz={22} avatarBg={r?.avatar_bg||null}/>
                      <span style={{fontWeight:800,fontSize:11,color:txt}}>{r.nombre}</span>
                      <span style={{fontSize:10,color:sub}}>
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:txt,lineHeight:1.5}}>{r.texto}</div>
                    <div style={{display:"flex",gap:10,marginTop:6}}>
                      <button onClick={()=>reaccionarCmt(selPoll.id,r.id,"like")}
                        style={{background:"none",border:"none",cursor:"pointer",
                          color:r.mi_reaccion==="like"?"#10b981":sub,fontSize:11,
                          fontFamily:"Nunito,sans-serif"}}>
                        👍 {r.likes||0}
                      </button>
                      <button onClick={()=>reaccionarCmt(selPoll.id,r.id,"dislike")}
                        style={{background:"none",border:"none",cursor:"pointer",
                          color:r.mi_reaccion==="dislike"?"#ef4444":sub,fontSize:11,
                          fontFamily:"Nunito,sans-serif"}}>
                        👎 {r.dislikes||0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Input nuevo comentario */}
        <div style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginTop:8,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          {replyTo&&(
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,
              background:accent+"18",borderRadius:8,padding:"6px 10px"}}>
              <span style={{fontSize:11,color:accent,fontWeight:700}}>
                Respondiendo a {replyTo.nombre}
              </span>
              <button onClick={()=>setReplyTo(null)}
                style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:12,marginLeft:"auto"}}>✕</button>
            </div>
          )}
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <Av user={me} sz={28} avatarBg={me?.avatar_bg||null}/>
            <textarea value={newCmt} onChange={e=>setNewCmt(e.target.value)}
              placeholder={replyTo?`Responder a ${replyTo.nombre}...`:"Escribi un comentario..."}
              rows={2} style={{flex:1,background:inputBg,border:`1.5px solid ${inputBd}`,
                borderRadius:12,padding:"8px 12px",fontSize:13,outline:"none",resize:"none",
                color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
            <button onClick={enviarCmt} disabled={savingCmt||!newCmt.trim()}
              style={{width:38,height:38,borderRadius:"50%",background:accent,border:"none",
                color:"white",fontSize:16,cursor:"pointer",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Vista lista de votaciones ─────────────────────────────
  const activePolls=polls.filter(p=>p.status==="active");
  const myProposals=polls.filter(p=>p.status!=="active"&&p.creador_id===me.id);

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      {/* Header con botón Proponer */}
      <div style={{background:accent,color:"white",padding:"16px 16px 0",
        position:"sticky",top:0,zIndex:50,
        textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          {onBack&&(
            <button onClick={onBack}
              style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
                color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          )}
          <div style={{flex:1,fontWeight:900,fontSize:17}}>Votaciones</div>
          <button onClick={()=>{setPropModal(true);setPropScope(sec);}}
            style={{background:"rgba(255,255,255,.2)",border:"1.5px solid rgba(255,255,255,.4)",
              borderRadius:99,color:"white",padding:"7px 14px",
              fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              display:"flex",alignItems:"center",gap:5}}>
            🏛️ Proponer
          </button>
        </div>
        {/* Tabs Global / Aula */}
        <div style={{display:"flex",gap:2}}>
          {[["global","🌐 Global"],["aula","🏫 Aula"]].map(([id,label])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{flex:1,padding:"10px 4px",background:"none",border:"none",
                fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                color:sec===id?"white":"rgba(255,255,255,.6)",
                borderBottom:`2.5px solid ${sec===id?"white":"transparent"}`,
                transition:"all .2s"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Mis propuestas pendientes/rechazadas */}
        {myProposals.map(v=>{
          const isPending=v.status==="pending";
          return(
            <div key={v.id} style={{background:cardBg,borderRadius:16,padding:"14px",marginBottom:10,
              border:`1.5px solid ${isPending?"#f59e0b44":"#ef444444"}`,
              boxShadow:isPending?"0 2px 10px #f59e0b22":"0 2px 10px #ef444422"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                <div style={{background:isPending?"#f59e0b18":"#ef444418",borderRadius:10,
                  padding:"4px 10px",fontSize:10,fontWeight:800,
                  color:isPending?"#b45309":"#ef4444",flexShrink:0}}>
                  {isPending?"⏳ Pendiente de aprobación":"❌ Rechazada"}
                </div>
                <div style={{flex:1}}/>
                <button onClick={()=>retirarPropuesta(v.id)}
                  style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:12}}>🗑️</button>
              </div>
              <div style={{fontWeight:800,fontSize:14,color:txt,marginBottom:4}}>{v.titulo}</div>
              {v.contexto&&<div style={{fontSize:12,color:sub,marginBottom:6,lineHeight:1.5}}>{v.contexto}</div>}
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                {v.opciones?.map((op,i)=>(
                  <span key={i} style={{background:inputBg,borderRadius:8,padding:"3px 8px",fontSize:11,color:sub}}>
                    {op.texto}
                  </span>
                ))}
              </div>
              {v.review_note&&(
                <div style={{background:"#ef444418",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#ef4444"}}>
                  <strong>Motivo:</strong> {v.review_note}
                </div>
              )}
            </div>
          );
        })}

        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}
        {!loading&&activePolls.length===0&&myProposals.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🗳️</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin votaciones {sec==="aula"?"en tu aula":"globales"}</div>
            <div style={{fontSize:12,color:sub,marginTop:4}}>
              ¡Sé el primero en proponer algo con el botón "🏛️ Proponer"!
            </div>
          </div>
        )}
        {activePolls.map(v=>{
          const yaVote    = !!v.mi_voto;
          const mostrar   = yaVote||!v.activa;
          const isVoting  = voting===v.id;
          const opSel     = seleccion[v.id];
          const esAdmin   = v.creador_rol==="admin";
          const esTeacher = v.creador_rol==="teacher";
          const jerarCol  = esAdmin?accent:esTeacher?"#8b5cf6":"#94a3b8";
          const sinPoder  = v.weighted && !yaVote && (v.mi_poder??0) < 1;

          return(
            <div key={v.id} style={{background:cardBg,borderRadius:20,padding:"16px",marginBottom:12,
              boxShadow:esAdmin?`0 2px 14px ${accent}33`:esTeacher?"0 2px 14px #8b5cf633":v.weighted?"0 2px 14px #f59e0b33":"0 1px 8px rgba(0,0,0,.06)",
              border:`1.5px solid ${v.weighted?"#f59e0b44":esAdmin||esTeacher?jerarCol+"44":inputBg}`,
              transition:"all .2s"}}>

              {/* Badges: jerarquía + DAO */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                {(esAdmin||esTeacher)&&(
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,
                    background:jerarCol+"18",borderRadius:99,padding:"2px 8px"}}>
                    <span style={{fontSize:9,fontWeight:800,color:jerarCol}}>
                      {esAdmin?"⭐ Admin":"👩‍🏫 Docente"} · {v.creador_nombre}
                    </span>
                  </div>
                )}
                {v.weighted&&(
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,
                    background:"#f59e0b18",borderRadius:99,padding:"2px 8px"}}>
                    <span style={{fontSize:9,fontWeight:800,color:"#f59e0b"}}>
                      🏛️ DAO · Poder = Monedas
                    </span>
                  </div>
                )}
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:12}}>
                <div style={{fontWeight:800,fontSize:14,color:txt,flex:1,lineHeight:1.3}}>{v.titulo}</div>
                <span style={{background:v.activa?"#10b98122":"#94a3b822",
                  color:v.activa?"#10b981":"#94a3b8",
                  borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:800,flexShrink:0}}>
                  {v.activa?"Activa":"Cerrada"}
                </span>
              </div>

              {/* Poder de voto DAO (antes de votar) */}
              {v.weighted&&v.activa&&!yaVote&&(
                <div style={{background:sinPoder?"#ef444418":"#f59e0b18",borderRadius:12,
                  padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>🏛️</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:sinPoder?"#ef4444":"#f59e0b"}}>
                      Tu poder de voto: {v.mi_poder??0} monedas
                    </div>
                    {sinPoder&&(
                      <div style={{fontSize:10,color:"#ef4444",marginTop:2}}>
                        Necesitás al menos 1 moneda para participar en esta propuesta DAO
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monedas usadas al votar */}
              {v.weighted&&yaVote&&v.mi_peso!=null&&(
                <div style={{background:"#f59e0b18",borderRadius:12,padding:"6px 12px",
                  marginBottom:10,fontSize:11,fontWeight:700,color:"#f59e0b",display:"flex",alignItems:"center",gap:6}}>
                  🏛️ Votaste con {v.mi_peso} monedas de poder
                </div>
              )}

              {/* Opciones */}
              {v.opciones.map(op=>{
                const pesoPct  = v.weighted&&v.total_peso>0?Math.round(parseFloat(op.peso_total)/v.total_peso*100):0;
                const contPct  = v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const pct      = mostrar?(v.weighted?pesoPct:contPct):0;
                const esMiVoto = v.mi_voto===op.id;
                const esSel    = opSel===op.id;
                const esGanador= !v.activa&&(v.weighted
                  ? parseFloat(op.peso_total)===Math.max(...v.opciones.map(o=>parseFloat(o.peso_total)))
                  : op.votos===Math.max(...v.opciones.map(o=>o.votos)));
                return(
                  <div key={op.id}
                    onClick={()=>v.activa&&!yaVote&&!isVoting&&!sinPoder&&setSel(s=>({...s,[v.id]:op.id}))}
                    style={{marginBottom:8,cursor:v.activa&&!yaVote&&!sinPoder?"pointer":"default",
                      borderRadius:12,padding:"8px 10px",transition:"all .15s",
                      background:esSel?accent+"22":esMiVoto?accent+"11":"transparent",
                      border:`1.5px solid ${esSel?accent:esMiVoto?accent+"66":"transparent"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mostrar?4:0}}>
                      <span style={{fontSize:13,fontWeight:esMiVoto||esSel?800:600,
                        color:esMiVoto?accent:esSel?accent:txt,flex:1}}>
                        {esGanador?"🏆 ":""}{esSel?"→ ":""}{op.texto}
                        {esMiVoto&&<span style={{fontSize:10,marginLeft:6,opacity:.7}}>✓ Tu voto</span>}
                      </span>
                      {mostrar&&(
                        <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:sub}}>{pct}%</span>
                          {v.weighted&&(
                            <span style={{fontSize:9,color:sub,display:"block",opacity:.7}}>
                              {parseFloat(op.peso_total).toFixed(0)} mon · {op.votos} voto{op.votos!==1?"s":""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {mostrar&&(
                      <div style={{background:inputBg,borderRadius:99,height:6,overflow:"hidden"}}>
                        <div style={{width:pct+"%",height:"100%",borderRadius:99,
                          background:esMiVoto?accent:v.weighted?"#f59e0b":"#3b82f6",transition:"width .6s ease"}}/>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Confirmar voto */}
              {v.activa&&!yaVote&&opSel&&!sinPoder&&(
                <button onClick={()=>confirmarVoto(v.id)} disabled={isVoting}
                  style={{width:"100%",marginTop:8,background:isVoting?"#ccc":accent,
                    border:"none",borderRadius:50,color:"white",padding:"11px",
                    fontWeight:800,fontSize:13,cursor:isVoting?"not-allowed":"pointer",
                    fontFamily:"Nunito,sans-serif",boxShadow:`0 4px 14px ${accent}44`}}>
                  {isVoting?"Registrando...":"Confirmar voto"}
                  {v.weighted&&!isVoting&&<span style={{fontSize:11,opacity:.8}}> · {v.mi_poder??0} monedas</span>}
                </button>
              )}
              {v.activa&&!yaVote&&!opSel&&!sinPoder&&(
                <div style={{marginTop:6,fontSize:11,color:sub,textAlign:"center"}}>
                  Toca una opcion para seleccionar
                </div>
              )}

              {/* Quórum */}
              {v.quorum&&(
                <div style={{background:v.quorum.met?"#10b98108":"#f59e0b08",borderRadius:10,
                  padding:"8px 10px",marginTop:8,
                  border:`1px solid ${v.quorum.met?"#10b98133":"#f59e0b33"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,fontWeight:700,marginBottom:4,
                    color:v.quorum.met?"#10b981":"#f59e0b"}}>
                    <span>{v.quorum.met?"✅ Quórum alcanzado":"⏳ Quórum pendiente"}</span>
                    <span>{v.quorum.pct}%</span>
                  </div>
                  <div style={{background:inputBg,borderRadius:99,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(v.quorum.pct,100)}%`,height:"100%",borderRadius:99,
                      background:v.quorum.met?"#10b981":"#f59e0b",transition:"width .6s ease"}}/>
                  </div>
                  <div style={{fontSize:9,color:sub,marginTop:3}}>
                    {v.quorum.mode==="coins"
                      ?`${parseFloat(v.quorum.current).toFixed(0)} / ${parseFloat(v.quorum.required).toFixed(0)}🪙 necesarias (${v.quorum.threshold}%)`
                      :`${v.quorum.current} / ${Math.ceil(v.quorum.required)} persona${Math.ceil(v.quorum.required)!==1?"s":""} necesarias (${v.quorum.threshold}%)`}
                  </div>
                </div>
              )}

              {/* Footer: info + reacciones + comentarios */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,
                paddingTop:10,borderTop:`1px solid ${inputBg}`,flexWrap:"wrap"}}>
                {/* Votantes */}
                <button onClick={()=>verVotantes(v.id)}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,
                    color:voterPoll===v.id?accent:sub,fontWeight:voterPoll===v.id?800:400,
                    fontSize:11,fontFamily:"Nunito,sans-serif",padding:0}}>
                  👥 {v.total_votos} votante{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&<span style={{fontSize:9,marginLeft:2}}>· {parseFloat(v.total_peso).toFixed(0)}🪙</span>}
                </button>
                <span style={{fontSize:10,color:sub,flex:1,textAlign:"right"}}>
                  {v.fin&&`Cierra ${new Date(v.fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}`}
                </span>
                {/* Like/Dislike */}
                <button onClick={()=>reaccionar(v.id,"like")}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,
                    color:v.mi_reaccion==="like"?"#10b981":sub,fontWeight:v.mi_reaccion==="like"?800:400,
                    fontSize:13,fontFamily:"Nunito,sans-serif"}}>
                  👍 {v.reactions?.like||0}
                </button>
                <button onClick={()=>reaccionar(v.id,"dislike")}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,
                    color:v.mi_reaccion==="dislike"?"#ef4444":sub,fontWeight:v.mi_reaccion==="dislike"?800:400,
                    fontSize:13,fontFamily:"Nunito,sans-serif"}}>
                  👎 {v.reactions?.dislike||0}
                </button>
                {/* Comentarios */}
                <button onClick={()=>abrirComentarios(v)}
                  style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,
                    color:sub,fontSize:13,fontFamily:"Nunito,sans-serif"}}>
                  💬 {v.total_comentarios||0}
                </button>
              </div>

              {/* Lista de votantes expandible */}
              {voterPoll===v.id&&(
                <div style={{borderTop:`1px solid ${inputBg}`,marginTop:8,paddingTop:8,
                  maxHeight:220,overflowY:"auto"}}>
                  {loadingVoters&&<div style={{textAlign:"center",color:sub,fontSize:12,padding:8}}>Cargando...</div>}
                  {!loadingVoters&&voters.length===0&&(
                    <div style={{textAlign:"center",color:sub,fontSize:11,padding:8}}>Sin votos aún</div>
                  )}
                  {!loadingVoters&&voters.map(voter=>(
                    <div key={voter.id} style={{display:"flex",gap:8,alignItems:"center",
                      padding:"5px 0",borderBottom:`1px solid ${inputBg}`}}>
                      <Av user={voter} sz={26}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:12,color:txt,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {voter.nombre}
                        </div>
                        <div style={{fontSize:10,color:sub}}>{voter.opcion_texto}</div>
                      </div>
                      {v.weighted&&(
                        <div style={{fontSize:11,fontWeight:800,color:"#f59e0b",flexShrink:0}}>
                          🪙{parseFloat(voter.peso).toFixed(0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal Proponer DAO ─────────────────────────────── */}
      {propModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setPropModal(false);setPropHelper(false);setPropLegal(false);}}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:300,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"22px 22px 0 0",
            width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",
            boxShadow:"0 -4px 32px rgba(0,0,0,.18)"}}>
            <div style={{padding:"16px 18px 0"}}>
              {/* Drag handle */}
              <div style={{width:40,height:4,background:inputBg,borderRadius:99,margin:"0 auto 14px"}}/>
              <div style={{fontWeight:900,fontSize:17,color:txt,marginBottom:4}}>🏛️ Proponer votación DAO</div>
              <div style={{fontSize:12,color:sub,marginBottom:14}}>
                {["admin","teacher"].includes(me.rol)
                  ?"Se publicará de inmediato."
                  :"El equipo administrativo la revisará antes de publicarla."}
              </div>

              {/* Botones ayuda */}
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <button onClick={()=>{setPropHelper(h=>!h);setPropLegal(false);}}
                  style={{flex:1,background:propHelper?accent+"18":inputBg,
                    border:`1.5px solid ${propHelper?accent:inputBd}`,borderRadius:12,
                    padding:"8px",fontSize:11,fontWeight:800,cursor:"pointer",
                    color:propHelper?accent:sub,fontFamily:"Nunito,sans-serif"}}>
                  📝 Cómo escribirla {propHelper?"▲":"▼"}
                </button>
                <button onClick={()=>{setPropLegal(l=>!l);setPropHelper(false);}}
                  style={{flex:1,background:propLegal?"#6366f118":inputBg,
                    border:`1.5px solid ${propLegal?"#6366f1":inputBd}`,borderRadius:12,
                    padding:"8px",fontSize:11,fontWeight:800,cursor:"pointer",
                    color:propLegal?"#6366f1":sub,fontFamily:"Nunito,sans-serif"}}>
                  ⚖️ Reglas legales {propLegal?"▲":"▼"}
                </button>
              </div>

              {/* Helper content */}
              {propHelper&&(
                <div style={{background:accent+"0D",border:`1px solid ${accent}33`,borderRadius:14,
                  padding:"12px 14px",marginBottom:12,fontSize:11,color:txt,
                  whiteSpace:"pre-wrap",lineHeight:1.7,fontFamily:"monospace"}}>
                  {PROP_HELPER}
                </div>
              )}
              {propLegal&&(
                <div style={{background:"#6366f10D",border:"1px solid #6366f133",borderRadius:14,
                  padding:"12px 14px",marginBottom:12,fontSize:11,color:txt,
                  whiteSpace:"pre-wrap",lineHeight:1.7,fontFamily:"monospace"}}>
                  {LEGAL_INFO}
                </div>
              )}

              {/* TÍTULO */}
              <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:4}}>
                Título / Pregunta <span style={{color:"#ef4444"}}>*</span>
              </div>
              <input value={propTitulo} onChange={e=>setPropTitulo(e.target.value)}
                placeholder="¿Debería la escuela organizar una feria de ciencias?"
                maxLength={200}
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${inputBd}`,
                  borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",color:txt,
                  background:inputBg,fontFamily:"Nunito,sans-serif",marginBottom:10}}/>

              {/* CONTEXTO / PROBLEMA */}
              <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:4}}>
                Descripción del problema {!["admin","teacher"].includes(me.rol)&&<span style={{color:"#ef4444"}}>*</span>}
              </div>
              <textarea value={propContexto} onChange={e=>setPropContexto(e.target.value)}
                placeholder="¿Por qué es importante? ¿Qué problema resuelve? ¿Cuál sería el impacto? (mín. 20 caracteres)"
                rows={3} maxLength={1000}
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${inputBd}`,
                  borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",resize:"none",
                  color:txt,background:inputBg,fontFamily:"Nunito,sans-serif",marginBottom:10}}/>

              {/* OPCIONES */}
              <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:6}}>
                Opciones de voto <span style={{color:"#ef4444"}}>*</span>
                <span style={{fontWeight:400,opacity:.7}}> — explicá qué significa cada opción</span>
              </div>
              {propOpciones.map((op,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={op} onChange={e=>{const n=[...propOpciones];n[i]=e.target.value;setPropOpciones(n);}}
                    placeholder={i===0?"Sí — aprobar la propuesta":i===1?"No — rechazar por ahora":"Opción "+(i+1)+"..."}
                    style={{flex:1,border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"9px 12px",
                      fontSize:12,outline:"none",color:txt,background:inputBg,fontFamily:"Nunito,sans-serif"}}/>
                  {propOpciones.length>2&&(
                    <button onClick={()=>setPropOpciones(o=>o.filter((_,j)=>j!==i))}
                      style={{background:"#fee2e2",border:"none",borderRadius:8,color:"#ef4444",
                        width:32,cursor:"pointer",fontWeight:800}}>x</button>
                  )}
                </div>
              ))}
              {propOpciones.length<6&&(
                <button onClick={()=>setPropOpciones(o=>[...o,""])}
                  style={{width:"100%",background:inputBg,border:`1px dashed ${inputBd}`,borderRadius:12,
                    padding:"8px",fontSize:11,fontWeight:800,color:sub,cursor:"pointer",
                    marginBottom:10,fontFamily:"Nunito,sans-serif"}}>+ Agregar opción</button>
              )}

              {/* ALCANCE */}
              <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:6}}>Alcance</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {[["global","🌐 Global"],["aula","🏫 Mi aula"]].map(([v,l])=>(
                  <button key={v}
                    disabled={v==="aula"&&!classInfo?.id}
                    onClick={()=>setPropScope(v)}
                    style={{flex:1,background:propScope===v?accent:inputBg,
                      color:propScope===v?"white":sub,border:`1.5px solid ${propScope===v?accent:inputBd}`,
                      borderRadius:10,padding:"9px 6px",fontWeight:800,fontSize:12,
                      cursor:v==="aula"&&!classInfo?.id?"not-allowed":"pointer",
                      opacity:v==="aula"&&!classInfo?.id?0.5:1,
                      fontFamily:"Nunito,sans-serif"}}>{l}</button>
                ))}
              </div>
              {propScope==="aula"&&classInfo&&(
                <div style={{background:accent+"12",borderRadius:10,padding:"6px 12px",
                  marginBottom:10,fontSize:11,color:accent,fontWeight:700}}>
                  🏫 {classInfo.nombre}
                </div>
              )}

              {/* DAO weighted */}
              <button onClick={()=>setPropWeighted(w=>!w)}
                style={{width:"100%",background:propWeighted?"#f59e0b18":inputBg,
                  border:`1.5px solid ${propWeighted?"#f59e0b":inputBd}`,borderRadius:12,
                  padding:"10px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif",marginBottom:10,display:"flex",
                  alignItems:"center",gap:8,color:propWeighted?"#b45309":sub,textAlign:"left"}}>
                <span style={{fontSize:16}}>🏛️</span>
                <div style={{flex:1}}>Voto ponderado por monedas {propWeighted?"(activado ✓)":""}</div>
                <div style={{width:20,height:20,borderRadius:"50%",
                  background:propWeighted?"#f59e0b":"#ddd",color:"white",fontSize:11,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>{propWeighted?"✓":"○"}</div>
              </button>

              {/* DURACIÓN */}
              <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:6}}>Duración de la votación</div>
              <div style={{display:"flex",gap:8,marginBottom:4,alignItems:"center"}}>
                <input type="number" value={propDurValor}
                  onChange={e=>setPropDurValor(String(Math.min(Math.max(1,parseInt(e.target.value)||1),DUR_MAX[propDurUnidad])))}
                  min="1" max={DUR_MAX[propDurUnidad]}
                  style={{width:70,border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"10px 12px",
                    fontSize:16,fontWeight:800,outline:"none",textAlign:"center",
                    color:accent,fontFamily:"Nunito,sans-serif",background:inputBg}}/>
                <div style={{display:"flex",gap:6,flex:1}}>
                  {["minutos","horas","dias"].map(u=>(
                    <button key={u} onClick={()=>{setPropDurUnidad(u);setPropDurValor(v=>String(Math.min(parseInt(v)||1,DUR_MAX[u])));}}
                      style={{flex:1,background:propDurUnidad===u?accent:inputBg,
                        color:propDurUnidad===u?"white":sub,border:"none",borderRadius:10,
                        padding:"8px 4px",fontWeight:800,fontSize:10,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>{u}</button>
                  ))}
                </div>
              </div>
              <div style={{fontSize:11,color:sub,marginBottom:16,textAlign:"center"}}>
                Cierra aprox. el {previewPropFin}
              </div>
            </div>

            <div style={{padding:"0 18px 34px",display:"flex",gap:8}}>
              <button onClick={()=>{setPropModal(false);setPropHelper(false);setPropLegal(false);}}
                style={{flex:1,background:inputBg,border:"none",borderRadius:50,
                  color:sub,padding:"13px",fontWeight:800,fontSize:13,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>Cancelar</button>
              <button onClick={proponer} disabled={propSaving}
                style={{flex:2,background:propSaving?"#ccc":accent,border:"none",borderRadius:50,
                  color:"white",padding:"13px",fontWeight:800,fontSize:13,
                  cursor:propSaving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif",
                  boxShadow:`0 4px 14px ${accent}44`}}>
                {propSaving?"Enviando...":["admin","teacher"].includes(me.rol)?"Publicar votación":"Enviar propuesta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── REPORTES ──────────────────────────────────────────────────

export default AVotaciones;
