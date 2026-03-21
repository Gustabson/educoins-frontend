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
        {tab==="home"     && <MHome     me={me} onNav={setTab}/>}
        {tab==="misiones" && <MMisiones me={me} showToast={showToast}/>}
        {tab==="aprobar"  && <MAprobar  me={me} showToast={showToast}/>}
        {tab==="perfil"   && <MPerfilSimple me={me} logout={logout}/>}
      </div>
      <div style={{position:"sticky",bottom:0,width:"100%",background:"white",
        borderTop:"1px solid #EFEFEF",padding:"6px 4px 20px",display:"flex",
        justifyContent:"space-around",boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
        {[
          {id:"home",    icon:"🏠",label:"Inicio"},
          {id:"misiones",icon:"⚡",label:"Misiones"},
          {id:"aprobar", icon:"📬",label:"Entregas"},
          {id:"perfil",  icon:"👤",label:"Perfil"},
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
                <Av user={s} sz={34}/>
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
              <Av user={{nombre:s.alumno_nombre,skin:s.skin,border:s.border}} sz={40}/>
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
// VISTA ADMIN
// ════════════════════════════════════════════════════════════

export default Maestra;
