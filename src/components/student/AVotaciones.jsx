import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


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


  const loadPolls = (s) => {
    setLoading(true);
    const scope = s||sec;
    const cid   = scope==="aula"&&classInfo?.id ? classInfo.id : null;
    api.polls(scope, cid)
      .then(d=>setPolls(Array.isArray(d)?d:d.data||[]))
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo().then(d=>{ const ci=d.data||d; setCInfo(ci); }).catch(()=>{});
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
  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="Votaciones" onBack={onBack}/>

      {/* Tabs Global / Aula */}
      <div style={{display:"flex",background:cardBg,
        borderBottom:`1px solid ${inputBg}`}}>
        {[["global","🌐 Global"],["aula","🏫 Aula"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",
              fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:sec===id?accent:sub,
              borderBottom:`2.5px solid ${sec===id?accent:"transparent"}`,
              transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}
        {!loading&&polls.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🗳️</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin votaciones {sec==="aula"?"en tu aula":"globales"}</div>
          </div>
        )}
        {polls.map(v=>{
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

              {/* Footer: info + reacciones + comentarios */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,
                paddingTop:10,borderTop:`1px solid ${inputBg}`}}>
                <span style={{fontSize:10,color:sub,flex:1}}>
                  {v.total_votos} voto{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&` · ${parseFloat(v.total_peso).toFixed(0)} monedas`}
                  {v.fin&&` · Cierra ${new Date(v.fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── REPORTES ──────────────────────────────────────────────────

export default AVotaciones;
