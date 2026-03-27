import { useState, useEffect, useRef } from "react";
import { DIFCOL, GS, TIPO_ICON } from "../../constants";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, Inp, OHdr, OHdrA, PBtn, Pill, Sheet, Toast, WCard, displayName, useToast } from "../shared/index";


function Maestra({me,logout}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();

  return(
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:90,animation:"fadeIn .18s ease"}}>
        {tab==="home"       && <MHome       me={me} onNav={setTab}/>}
        {tab==="misiones"   && <MMisiones   me={me} showToast={showToast}/>}
        {tab==="aprobar"    && <MAprobar    me={me} showToast={showToast}/>}
        {tab==="votaciones" && <MVotaciones me={me} showToast={showToast}/>}
        {tab==="perfil"     && <MPerfilSimple me={me} logout={logout}/>}
      </div>
      <div style={{position:"sticky",bottom:0,width:"100%",background:"white",
        borderTop:"1px solid #EFEFEF",padding:"6px 4px 20px",display:"flex",
        justifyContent:"space-around",boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
        {[
          {id:"home",       icon:"🏠",label:"Inicio"},
          {id:"misiones",   icon:"⚡",label:"Misiones"},
          {id:"aprobar",    icon:"📬",label:"Entregas"},
          {id:"votaciones", icon:"🗳️",label:"Votar"},
          {id:"perfil",     icon:"👤",label:"Perfil"},
        ].map(item=>{
          const on=tab===item.id;
          return(
            <button key={item.id} onClick={()=>setTab(item.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
              background:"none",border:"none",cursor:"pointer",color:on?"#00c1fc":"#777777",
              fontFamily:"Nunito,sans-serif",padding:"3px 6px"}}>
              <div style={{width:36,height:30,borderRadius:10,background:on?"#e0f7fe":"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:19}}>{item.icon}</span>
              </div>
              <span style={{fontSize:9,fontWeight:800}}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MHome({me,onNav}){
  const [pending,setPending]=useState([]);
  const [students,setStudents]=useState([]);
  const [showStudents,setShowStudents]=useState(false);
  const [rewardSel,setRewardSel]=useState(null);
  const [rewardAmt,setRewardAmt]=useState("");
  const [rewardDesc,setRewardDesc]=useState("");
  const [rewarding,setRewarding]=useState(false);
  const [toast,showToast]=useToast();

  useEffect(()=>{
    api.submissions("pendiente").then(d=>setPending(d.data||d||[])).catch(()=>{});
    api.classroomStudents().then(d=>setStudents(d.data||d||[])).catch(()=>{});
  },[]);

  const premiar=async()=>{
    if(!rewardSel||!rewardAmt||parseInt(rewardAmt)<=0){showToast("Completá los campos","error");return;}
    setRewarding(true);
    try{
      await api.rewardDirect({student_id:rewardSel.id,amount:parseInt(rewardAmt),descripcion:rewardDesc||null});
      showToast(`Premiaste a ${rewardSel.nombre} con 🪙${rewardAmt}`);
      setRewardSel(null);setRewardAmt("");setRewardDesc("");
      api.classroomStudents().then(d=>setStudents(d.data||d||[])).catch(()=>{});
    }catch(e){showToast(e.message||"Error","error");}
    finally{setRewarding(false);}
  };

  return(
    <div>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{background:"#00c1fc",color:"white",padding:"52px 20px 28px",
        position:"sticky",top:0,zIndex:50,overflow:"hidden",textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,.25)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👩‍🏫</div>
          <div>
            <div style={{fontSize:11,opacity:.8,fontWeight:700}}>DOCENTE</div>
            <div style={{fontWeight:900,fontSize:18}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
          </div>
        </div>
        {/* Stats rápidas */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {v:pending.length,l:"Pendientes",c:"#f59e0b"},
            {v:students.length,l:"Alumnos",c:"#10b981"},
            {v:students.reduce((s,u)=>s+(u.misiones_completadas||0),0),l:"Completadas",c:"#8b5cf6"},
          ].map(s=>(
            <div key={s.l} style={{background:"rgba(255,255,255,.18)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:20}}>{s.v}</div>
              <div style={{fontSize:10,opacity:.8,fontWeight:700}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 14px"}}>
        {[
          {icon:"⚡",title:"Crear misión",   sub:"Nuevas actividades",         dest:"misiones",col:"#f59e0b"},
          {icon:"📬",title:"Aprobar entregas",sub:`${pending.length} pendientes`,dest:"aprobar", col:"#10b981"},
          {icon:"👨‍🎓",title:"Ver alumnos",   sub:`${students.length} en tu aula`,dest:null,    col:"#3b82f6",
           action:()=>setShowStudents(s=>!s)},
        ].map(item=>(
          <WCard key={item.title} onClick={item.action||(()=>onNav(item.dest))}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",marginBottom:10}}>
            <div style={{width:46,height:46,borderRadius:13,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{item.title}</div>
              <div style={{fontSize:12,color:"#555"}}>{item.sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>{item.dest===null?(showStudents?"▲":"▼"):"›"}</span>
          </WCard>
        ))}

        {/* Panel de alumnos expandible */}
        {showStudents&&(
          <div style={{background:"white",borderRadius:20,overflow:"hidden",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)",marginBottom:10}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>Alumnos del aula</div>
              <div style={{fontSize:11,color:"#aaa"}}>Toca para premiar</div>
            </div>
            {students.map((s,i)=>(
              <div key={s.id} onClick={()=>setRewardSel(rewardSel?.id===s.id?null:s)}
                style={{padding:"11px 16px",borderBottom:i<students.length-1?"1px solid #f5f5f5":"none",
                  cursor:"pointer",background:rewardSel?.id===s.id?"#f0f9ff":"white",
                  display:"flex",alignItems:"center",gap:10,transition:"background .15s"}}>
                <Av user={s} sz={34} avatarBg={s?.avatar_bg||null}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{s.nombre}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>
                    🪙{s.balance} · {s.misiones_completadas||0} misiones · 🔥{s.racha_actual||0}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:12,color:"#00c1fc"}}>🪙{s.balance}</div>
                </div>
              </div>
            ))}
            {students.length===0&&(
              <div style={{padding:20,textAlign:"center",color:"#aaa",fontSize:13}}>
                No hay alumnos en tu aula todavia
              </div>
            )}

            {/* Panel de premio directo */}
            {rewardSel&&(
              <div style={{padding:"14px 16px",background:"#f0f9ff",borderTop:"1px solid #e0f7fe"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>
                  Premiar a {rewardSel.nombre}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input type="number" value={rewardAmt} onChange={e=>setRewardAmt(e.target.value)}
                    placeholder="Monedas" min="1"
                    style={{flex:1,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"9px 12px",
                      fontSize:14,fontWeight:800,outline:"none",color:"#00c1fc",fontFamily:"Nunito,sans-serif"}}/>
                  <div style={{display:"flex",gap:4}}>
                    {[5,10,25,50].map(n=>(
                      <button key={n} onClick={()=>setRewardAmt(String(n))}
                        style={{background:rewardAmt===String(n)?"#00c1fc":"#f0f0f0",
                          color:rewardAmt===String(n)?"white":"#555",border:"none",borderRadius:8,
                          padding:"6px 8px",fontSize:11,fontWeight:800,cursor:"pointer",
                          fontFamily:"Nunito,sans-serif"}}>{n}</button>
                    ))}
                  </div>
                </div>
                <input value={rewardDesc} onChange={e=>setRewardDesc(e.target.value)}
                  placeholder="Motivo (opcional)..."
                  style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                    padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",marginBottom:8}}/>
                <button onClick={premiar} disabled={rewarding}
                  style={{width:"100%",background:rewarding?"#ccc":"#00c1fc",border:"none",
                    borderRadius:50,color:"white",padding:"11px",fontWeight:800,fontSize:13,
                    cursor:rewarding?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {rewarding?"Enviando...":"Enviar premio 🪙"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MMisiones({me,showToast}){
  const [missions,setMissions]=useState([]);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [desc,setDesc]=useState("");
  const [rec,setRec]=useState("");
  const [dif,setDif]=useState("facil");
  const [tipo,setTipo]=useState("normal");
  const [fechaFin,setFechaFin]=useState("");
  const [durVal,setDurVal]=useState("24");
  const [durUnidad,setDurUnidad]=useState("horas");
  const [maxSub,setMaxSub]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ api.teacherMissions().then(d=>setMissions(d.data||d||[])).finally(()=>setLoading(false)); },[]);

  const calcFin=()=>{
    if(tipo!=="limitada"||!durVal) return null;
    const d=new Date();
    const v=parseInt(durVal)||1;
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+v);
    else if(durUnidad==="horas") d.setHours(d.getHours()+v);
    else d.setDate(d.getDate()+v);
    return d.toISOString();
  };

  const crear=async()=>{
    if(!titulo.trim()||!rec){showToast("Completa titulo y recompensa","error");return;}
    try{
      const d=await api.createMission({
        titulo:titulo.trim(),descripcion:desc.trim(),recompensa:parseInt(rec),dificultad:dif,
        tipo,fecha_fin:calcFin(),
        max_submissions:tipo==="grupal"&&maxSub?parseInt(maxSub):null,
      });
      setMissions(prev=>[d.data||d,...prev]);
      setTitulo("");setDesc("");setRec("");setForm(false);
      showToast("Mision creada!");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const TIPO_COL={normal:"#3b82f6",limitada:"#ef4444",grupal:"#10b981",encadenada:"#8b5cf6"};
  const TIPO_ICON={normal:"📋",limitada:"⏱",grupal:"👥",encadenada:"🔗"};

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Misiones" sub="EDUCOINS"
        extra={<button onClick={()=>setForm(true)}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nueva
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.map(m=>(
          <WCard key={m.id} style={{marginBottom:10,borderLeft:`4px solid ${TIPO_COL[m.tipo||"normal"]||"#ddd"}`}}>
            <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
              <span style={{background:TIPO_COL[m.tipo||"normal"]+"22",color:TIPO_COL[m.tipo||"normal"],
                borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>
                {TIPO_ICON[m.tipo||"normal"]} {m.tipo||"normal"}
              </span>
              {m.fecha_fin&&(
                <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>
                  Hasta {new Date(m.fecha_fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </span>
              )}
            </div>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{m.titulo}</div>
            {m.descripcion&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{m.descripcion}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
              <div style={{fontWeight:800,color:"#00c1fc"}}>🪙 {m.recompensa}</div>
              <div style={{fontSize:11,color:"#aaa"}}>
                {m.pendientes||0} pendientes · {m.aprobadas||0} aprobadas
              </div>
            </div>
          </WCard>
        ))}
      </div>
      {form&&(
        <Sheet title="Nueva mision" onClose={()=>setForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Inp val={titulo} set={setTitulo} ph="Titulo" icon="⚡"/>
            <Inp val={desc}   set={setDesc}   ph="Descripcion (opcional)" icon="📝"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp val={rec} set={setRec} ph="Recompensa" type="number" icon="🪙"/>
              <select value={dif} onChange={e=>setDif(e.target.value)}
                style={{background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
                  color:"#1a1a1a",padding:"12px 14px",fontSize:13,outline:"none",fontWeight:700}}>
                <option value="facil">Facil</option>
                <option value="media">Media</option>
                <option value="dificil">Dificil</option>
              </select>
            </div>
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:2}}>Tipo de mision</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[["normal","📋 Normal"],["limitada","⏱ Tiempo"],["grupal","👥 Grupal"],["encadenada","🔗 Serie"]].map(([v,l])=>(
                <button key={v} onClick={()=>setTipo(v)}
                  style={{background:tipo===v?TIPO_COL[v]:"#f0f0f0",color:tipo===v?"white":"#555",
                    border:"none",borderRadius:10,padding:"9px 6px",fontWeight:800,fontSize:11,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
              ))}
            </div>
            {tipo==="limitada"&&(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="number" value={durVal} min="1"
                  onChange={e=>setDurVal(e.target.value)}
                  style={{width:60,border:"1.5px solid #e8e8e8",borderRadius:10,padding:"9px 10px",
                    fontSize:14,fontWeight:800,outline:"none",color:"#ef4444",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
                <select value={durUnidad} onChange={e=>setDurUnidad(e.target.value)}
                  style={{flex:1,background:"#f7f7f7",border:"1.5px solid #e8e8e8",borderRadius:10,
                    padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}>
                  <option value="minutos">minutos</option>
                  <option value="horas">horas</option>
                  <option value="dias">dias</option>
                </select>
              </div>
            )}
            {tipo==="grupal"&&(
              <Inp val={maxSub} set={setMaxSub} ph="Max. participantes (dejar vacio = ilimitado)" type="number" icon="👥"/>
            )}
            <PBtn label="Crear mision" onClick={crear} full/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function MAprobar({me,showToast}){
  const [subs,setSubs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [processing,setProcessing]=useState(null);
  const [feedbackSheet,setFeedbackSheet]=useState(null); // {id, action: 'approve'|'reject'}
  const [feedback,setFeedback]=useState("");

  useEffect(()=>{ api.submissions("pendiente").then(d=>setSubs(d.data||d||[])).finally(()=>setLoading(false)); },[]);

  const procesar=async()=>{
    if(!feedbackSheet) return;
    if(feedbackSheet.action==="reject"&&!feedback.trim()){showToast("Escribi el motivo","error");return;}
    setProcessing(feedbackSheet.id);
    try{
      if(feedbackSheet.action==="approve"){
        await api.approve(feedbackSheet.id,{feedback:feedback.trim()||null});
        showToast("Mision aprobada y monedas acreditadas!");
      } else {
        await api.reject(feedbackSheet.id,{feedback:feedback.trim(),reason:feedback.trim()});
        showToast("Entrega rechazada");
      }
      setSubs(prev=>prev.filter(s=>s.id!==feedbackSheet.id));
      setFeedbackSheet(null);setFeedback("");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setProcessing(null);}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Aprobar entregas" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {subs.length===0&&(
          <WCard style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a",marginTop:8}}>Todo al dia</div>
            <div style={{color:"#aaa",fontSize:13,marginTop:4}}>Sin entregas pendientes</div>
          </WCard>
        )}
        {subs.map(s=>(
          <WCard key={s.id} style={{marginBottom:12,borderTop:`3px solid ${DIFCOL[s.dificultad]||"#f59e0b"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <Av user={{nombre:s.alumno_nombre,skin:s.skin,border:s.border,avatar_bg:s.avatar_bg||null,foto_url:s.foto_url||null}} sz={40} avatarBg={s.avatar_bg||null}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:"#1a1a1a"}}>{s.alumno_nombre}</div>
                <div style={{fontSize:12,color:"#00c1fc",fontWeight:700}}>{s.titulo}</div>
                {s.tipo&&s.tipo!=="normal"&&(
                  <span style={{fontSize:10,color:"#8b5cf6",fontWeight:800}}>{s.tipo}</span>
                )}
              </div>
              <span style={{fontWeight:900,color:"#00c1fc",fontSize:15}}>🪙 {s.recompensa}</span>
            </div>
            {s.feedback&&(
              <div style={{background:"#f7f7f7",borderRadius:10,padding:"8px 12px",fontSize:12,
                color:"#555",marginBottom:10,fontStyle:"italic"}}>
                "{s.feedback}"
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setFeedbackSheet({id:s.id,action:"approve"});setFeedback("");}}
                disabled={processing===s.id}
                style={{flex:1,background:"#10b981",border:"none",borderRadius:50,color:"white",
                  padding:"11px",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                Aprobar
              </button>
              <button onClick={()=>{setFeedbackSheet({id:s.id,action:"reject"});setFeedback("");}}
                disabled={processing===s.id}
                style={{flex:1,background:"#ef4444",border:"none",borderRadius:50,color:"white",
                  padding:"11px",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                Rechazar
              </button>
            </div>
          </WCard>
        ))}
      </div>
      {feedbackSheet&&(
        <Sheet title={feedbackSheet.action==="approve"?"Aprobar con feedback":"Rechazar entrega"}
          onClose={()=>setFeedbackSheet(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <textarea value={feedback} onChange={e=>setFeedback(e.target.value)}
              placeholder={feedbackSheet.action==="approve"
                ?"Comentario para el alumno (opcional)..."
                :"Motivo del rechazo (requerido)..."}
              rows={3} style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
                borderRadius:14,padding:"11px 14px",fontSize:13,outline:"none",resize:"none",
                fontFamily:"Nunito,sans-serif"}}/>
            <PBtn
              label={feedbackSheet.action==="approve"?"Confirmar aprobacion":"Confirmar rechazo"}
              onClick={procesar} full
              color={feedbackSheet.action==="approve"?"#10b981":"#ef4444"}/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function MPerfilSimple({me,logout}){
  return(
    <div>
      <OHdr title="Mi Perfil" sub="DOCENTE"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <WCard style={{textAlign:"center",padding:28,marginBottom:12}}>
          <div style={{fontSize:48,marginBottom:8}}>👩‍🏫</div>
          <div style={{fontWeight:900,fontSize:20,color:"#1a1a1a"}}>{me.nombre}</div>
          <div style={{fontSize:13,color:"#aaa"}}>{me.email}</div>
        </WCard>
        <button onClick={logout} style={{width:"100%",background:"white",
          border:"1.5px solid #E8E8E8",borderRadius:50,color:"#888",
          padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TEACHER — VOTACIONES
// ════════════════════════════════════════════════════════════

function MVotaciones({me, showToast}){
  const [polls,setPolls]       = useState([]);
  const [loading,setLoading]   = useState(true);
  const [classroom,setClassroom]= useState(null);
  const [form,setForm]         = useState(false);
  const [titulo,setTitulo]     = useState("");
  const [opciones,setOpciones] = useState(["",""]);
  const [durValor,setDurValor] = useState("24");
  const [durUnidad,setDurUnidad]= useState("horas");
  const [weighted,setWeighted] = useState(false);
  const [saving,setSaving]     = useState(false);
  const [now,setNow]           = useState(()=>new Date());

  const DUR_MAX={minutos:1440,horas:480,dias:20};
  const JERARQUIA_COLOR={admin:"#00c1fc",teacher:"#8b5cf6"};

  useEffect(()=>{
    api.chatClassroomInfo()
      .then(d=>{ setClassroom(d); loadPolls(d?.id); })
      .catch(()=>setLoading(false));
    const id=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(id);
  },[]);

  const loadPolls=(cid)=>{
    if(!cid){ setLoading(false); return; }
    api.polls("aula", cid)
      .then(d=>setPolls(Array.isArray(d)?d:[]))
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  const calcFinISO=()=>{
    const val=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const d=new Date();
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(durUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    return d.toISOString();
  };

  const crear=async()=>{
    if(!titulo.trim()){showToast("Escribi un titulo","error");return;}
    const ops=opciones.filter(o=>o.trim());
    if(ops.length<2){showToast("Necesitas al menos 2 opciones","error");return;}
    if(!classroom?.id){showToast("No tenés aula asignada","error");return;}
    setSaving(true);
    try{
      await api.createPoll({
        titulo:titulo.trim(), opciones:ops, fin:calcFinISO(),
        weighted, scope:"aula", classroom_id:classroom.id,
      });
      showToast(weighted?"Propuesta DAO creada 🏛️":"Votacion creada");
      setForm(false);setTitulo("");setOpciones(["",""]);setDurValor("24");setDurUnidad("horas");setWeighted(false);
      loadPolls(classroom.id);
    }catch(e){showToast(e.message||"Error al crear","error");}
    finally{setSaving(false);}
  };

  const toggleActiva=async(poll)=>{
    try{
      await api.updatePoll(poll.id,{activa:!poll.activa});
      showToast(poll.activa?"Votacion cerrada":"Votacion reabierta");
      loadPolls(classroom?.id);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const previewFin=(()=>{
    // Usa `now` actualizado cada 30s para que no se desactualice con el formulario abierto
    const val=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const d=new Date(now.getTime());
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+val);
    else if(durUnidad==="horas") d.setHours(d.getHours()+val);
    else d.setDate(d.getDate()+val);
    return d.toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  })();

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontWeight:900,fontSize:18}}>Votaciones del Aula</div>
          {classroom&&(
            <button onClick={()=>setForm(f=>!f)}
              style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:99,
                color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
              {form?"Cerrar":"+ Nueva"}
            </button>
          )}
        </div>
        {classroom&&<div style={{fontSize:11,opacity:.75,marginTop:4}}>🏫 {classroom.nombre}</div>}
      </div>

      <div style={{padding:"12px 14px"}}>
        {!classroom&&!loading&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:32}}>🏫</div>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginTop:8}}>Sin aula asignada</div>
            <div style={{color:"#aaa",fontSize:12,marginTop:4}}>Pedile al admin que te asigne a un aula</div>
          </WCard>
        )}

        {/* Formulario de creación */}
        {form&&classroom&&(
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
            {/* DAO toggle */}
            <button onClick={()=>setWeighted(w=>!w)}
              style={{width:"100%",background:weighted?"#f59e0b18":"#f7f7f7",
                border:`1.5px solid ${weighted?"#f59e0b":"#e8e8e8"}`,borderRadius:12,
                padding:"10px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",marginBottom:10,display:"flex",alignItems:"center",gap:8,
                color:weighted?"#b45309":"#666",textAlign:"left"}}>
              <span style={{fontSize:16}}>🏛️</span>
              <div style={{flex:1}}>DAO: Poder = Monedas {weighted?"✓":""}</div>
              <div style={{width:20,height:20,borderRadius:"50%",
                background:weighted?"#f59e0b":"#ddd",color:"white",fontSize:11,
                display:"flex",alignItems:"center",justifyContent:"center"}}>{weighted?"✓":"○"}</div>
            </button>
            {/* Duración */}
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Duracion</div>
            <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" value={durValor}
                onChange={e=>{const v=Math.min(Math.max(1,parseInt(e.target.value)||1),DUR_MAX[durUnidad]);setDurValor(String(v));}}
                min="1" max={DUR_MAX[durUnidad]}
                style={{width:70,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 12px",
                  fontSize:16,fontWeight:800,outline:"none",textAlign:"center",color:"#00c1fc",fontFamily:"Nunito,sans-serif"}}/>
              <div style={{display:"flex",gap:6,flex:1}}>
                {["minutos","horas","dias"].map(u=>(
                  <button key={u} onClick={()=>{setDurUnidad(u);setDurValor(v=>String(Math.min(parseInt(v)||1,DUR_MAX[u])));}}
                    style={{flex:1,background:durUnidad===u?"#00c1fc":"#f0f0f0",color:durUnidad===u?"white":"#555",
                      border:"none",borderRadius:10,padding:"8px 4px",fontWeight:800,fontSize:10,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>{u}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center"}}>Cierra el {previewFin}</div>
            <button onClick={crear} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":"#00c1fc",border:"none",borderRadius:50,
                color:"white",padding:"12px",fontWeight:800,fontSize:14,cursor:saving?"not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear votacion"}
            </button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {!loading&&classroom&&polls.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:32}}>🗳️</div>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginTop:8}}>Sin votaciones en tu aula</div>
          </WCard>
        )}

        {polls.map(v=>{
          const esTeacher=v.creador_rol==="teacher";
          const jerarCol=JERARQUIA_COLOR[v.creador_rol]||"#94a3b8";
          return(
            <div key={v.id} style={{background:"white",borderRadius:16,padding:"14px",marginBottom:8,
              boxShadow:`0 2px 12px ${jerarCol}22`,
              border:`1.5px solid ${jerarCol}44`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:4,
                      background:jerarCol+"18",borderRadius:99,padding:"2px 8px"}}>
                      <span style={{fontSize:9,fontWeight:800,color:jerarCol}}>
                        {v.creador_rol==="admin"?"ADMIN":"DOCENTE"} · {v.creador_nombre}
                      </span>
                    </div>
                    {v.weighted&&(
                      <div style={{display:"inline-flex",alignItems:"center",background:"#f59e0b18",
                        borderRadius:99,padding:"2px 8px"}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#b45309"}}>🏛️ DAO</span>
                      </div>
                    )}
                  </div>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{v.titulo}</div>
                  {v.fin&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                    Cierra {new Date(v.fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </div>}
                </div>
                <span style={{background:v.activa?"#10b98122":"#94a3b822",
                  color:v.activa?"#10b981":"#94a3b8",borderRadius:99,padding:"3px 9px",
                  fontSize:10,fontWeight:800,flexShrink:0}}>{v.activa?"Activa":"Cerrada"}</span>
              </div>
              {v.opciones?.map(op=>{
                const pesoPct=v.weighted&&v.total_peso>0?Math.round(parseFloat(op.peso_total||0)/v.total_peso*100):0;
                const contPct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const pct=v.weighted?pesoPct:contPct;
                return(
                  <div key={op.id} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:"#555",marginBottom:2}}>
                      <span>{op.texto}</span>
                      <span>
                        {v.weighted
                          ? <>{pct}% <span style={{fontSize:10,color:"#f59e0b"}}>({parseFloat(op.peso_total||0).toFixed(0)}🪙)</span></>
                          : `${op.votos} (${pct}%)`}
                      </span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:99,height:6}}>
                      <div style={{width:pct+"%",height:"100%",borderRadius:99,
                        background:v.weighted?"#f59e0b":jerarCol,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{fontSize:11,color:"#aaa"}}>
                  {v.total_votos} voto{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&` · ${parseFloat(v.total_peso).toFixed(0)}🪙`}
                </span>
                {v.creador_rol===me.rol&&(
                  <button onClick={()=>toggleActiva(v)}
                    style={{background:v.activa?"#fee2e2":"#dcfce7",border:"none",
                      borderRadius:99,color:v.activa?"#ef4444":"#10b981",padding:"5px 14px",
                      fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {v.activa?"Cerrar":"Reabrir"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISTA ADMIN
// ════════════════════════════════════════════════════════════

export default Maestra;
