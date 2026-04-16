import { useState, useEffect, useRef } from "react";
import { DIFCOL, GS, TIPO_ICON, ADMIN_THEME } from "../../constants";
import { api, getSocket } from "../../api";
import { ThemeCtx, useTheme } from "../../ThemeContext";
import { Av, Inp, OHdr, OHdrA, PBtn, Pill, Sheet, Toast, WCard, displayName, useToast } from "../shared/index";
import DiwyHub           from "../diwy/DiwyHub";
import TeacherAsistencias from "./TeacherAsistencias";
import TeacherReportes    from "./TeacherReportes";
import TeacherCorreo      from "./TeacherCorreo";


function Maestra({me,logout}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();
  const showNav = !["diwy","asistencias","reportes","correo","cooperacion"].includes(tab);

  return(
    <ThemeCtx.Provider value={ADMIN_THEME}>
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:showNav?90:0,animation:"fadeIn .18s ease"}}>
        {tab==="home"        && <MHome          me={me} onNav={setTab}/>}
        {tab==="misiones"    && <MMisiones      me={me} showToast={showToast}/>}
        {tab==="aprobar"     && <MAprobar       me={me} showToast={showToast}/>}
        {tab==="votaciones"  && <MVotaciones    me={me} showToast={showToast}/>}
        {tab==="diwy"        && <DiwyHub        me={me} onBack={()=>setTab("home")}/>}
        {tab==="asistencias" && <TeacherAsistencias onBack={()=>setTab("home")} showToast={showToast}/>}
        {tab==="reportes"    && <TeacherReportes    me={me} onBack={()=>setTab("home")}/>}
        {tab==="correo"      && <TeacherCorreo      me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="cooperacion" && <MCooperacion       me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="perfil"      && <MPerfilSimple  me={me} logout={logout}/>}
      </div>
      <div style={{position:"sticky",bottom:0,width:"100%",background:"white",
        borderTop:"1px solid #EFEFEF",padding:"6px 4px 20px",display:"flex",
        justifyContent:"space-around",boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
        {[
          {id:"home",       icon:"🏠", label:"Inicio"},
          {id:"misiones",   icon:"⚡", label:"Misiones"},
          {id:"aprobar",    icon:"📬", label:"Entregas"},
          {id:"votaciones", icon:"🗳️", label:"Votar"},
          {id:"perfil",     icon:"👤", label:"Perfil"},
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
    </ThemeCtx.Provider>
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
  const [diwyPending,setDiwyPending]=useState(0);
  const [correoUnread,setCorreoUnread]=useState(0);

  useEffect(()=>{
    api.submissions("pendiente").then(d=>setPending(d.data||d||[])).catch(()=>{});
    api.classroomStudents().then(d=>setStudents(d.data||d||[])).catch(()=>{});
    api.diwyTeacherMessages().then(d=>{
      const arr=Array.isArray(d)?d:[];
      setDiwyPending(arr.filter(m=>m.estado==="pending").length);
    }).catch(()=>{});
    // Load parent inbox unread count
    api.diwyTeacherParentInbox()
      .then(d=>{ const arr=Array.isArray(d)?d:[]; setCorreoUnread(arr.reduce((s,t)=>s+(t.unread||0),0)); })
      .catch(()=>{});
    // Socket: increment badges on new messages
    const socket=getSocket();
    if(socket){
      const onDiwy=()=>setDiwyPending(p=>p+1);
      const onCorreo=()=>setCorreoUnread(p=>p+1);
      socket.on("diwy_message",onDiwy);
      socket.on("parent_direct_message",onCorreo);
      return ()=>{ socket.off("diwy_message",onDiwy); socket.off("parent_direct_message",onCorreo); };
    }
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
          {icon:"⚡",title:"Crear misión",    sub:"Nuevas actividades",                dest:"misiones",   col:"#f59e0b"},
          {icon:"📬",title:"Aprobar entregas",sub:`${pending.length} pendientes`,     dest:"aprobar",    col:"#10b981"},
          {icon:"📋",title:"Asistencias",    sub:"Registrá y consultá asistencia",    dest:"asistencias",col:"#3b82f6"},
          {icon:"🤝",title:"Cooperación",     sub:"Ranking y evaluación entre pares",  dest:"cooperacion",col:"#8b5cf6"},
          {icon:"📝",title:"Reportes",       sub:"Observaciones semanales por alumno",dest:"reportes",   col:"#6366f1"},
          {icon:"✉️",title:"Correo",          sub:correoUnread>0?`${correoUnread} mensaje${correoUnread>1?"s":""} de padres`:"Mensajes formales de padres",dest:"correo",col:"#0ea5e9",badge:correoUnread},
          {icon:"🐾",title:"Diwy",           sub:diwyPending>0?`${diwyPending} mensaje${diwyPending>1?"s":""} de padres!`:"Mensajes y clase del día",dest:"diwy",col:"#7c3aed",badge:diwyPending},
          {icon:"👨‍🎓",title:"Ver alumnos",   sub:`${students.length} en tu aula`,    dest:null,         col:"#00c1fc",
           action:()=>setShowStudents(s=>!s)},
        ].map(item=>(
          <WCard key={item.title} onClick={item.action||(()=>onNav(item.dest))}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",marginBottom:10}}>
            <div style={{width:46,height:46,borderRadius:13,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
              position:"relative"}}>
              {item.icon}
              {item.badge>0&&<span style={{position:"absolute",top:-4,right:-4,
                background:"#ef4444",color:"white",borderRadius:99,fontSize:9,
                fontWeight:900,minWidth:16,height:16,display:"flex",alignItems:"center",
                justifyContent:"center",padding:"0 3px"}}>{item.badge}</span>}
            </div>
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

function compressMisionImg(file, maxWidth=600, quality=0.75) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        c.width = Math.round(img.width * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// helpers
function toLocalDatetimeValue(iso){ if(!iso) return ""; const d=new Date(iso); const pad=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function MMisiones({me,showToast}){
  const {primary,isDark,txt,sub,cardBg,pageBg,navBord,inputBg}=useTheme();
  const [missions,setMissions]=useState([]);
  const [form,setForm]=useState(false);          // 'new' | mission_obj | false
  const [titulo,setTitulo]=useState("");
  const [desc,setDesc]=useState("");
  const [rec,setRec]=useState("");
  const [dif,setDif]=useState("facil");
  const [tipo,setTipo]=useState("normal");
  const [durVal,setDurVal]=useState("24");
  const [durUnidad,setDurUnidad]=useState("horas");
  const [maxSub,setMaxSub]=useState("");
  const [imgUrl,setImgUrl]=useState("");
  const [imgLoading,setImgLoading]=useState(false);
  const [misionIcon,setMisionIcon]=useState("⚡");
  const [autoApprove,setAutoApprove]=useState(false);
  const [activarMasTarde,setActivarMasTarde]=useState(false);
  const [fechaInicio,setFechaInicio]=useState("");
  const [grupoMin,setGrupoMin]=useState("2");
  const [grupoMax,setGrupoMax]=useState("2");
  const [peerEval,setPeerEval]=useState(true);
  const fileRef=useRef(null);
  const [loading,setLoading]=useState(true);
  const [deleting,setDeleting]=useState(null);

  const reload=()=>api.teacherMissions().then(d=>setMissions(d.data||d||[])).catch(()=>{});
  useEffect(()=>{ reload().finally(()=>setLoading(false)); },[]);

  const resetForm=()=>{
    setTitulo("");setDesc("");setRec("");setDif("facil");setTipo("normal");
    setDurVal("24");setDurUnidad("horas");setMaxSub("");setImgUrl("");
    setMisionIcon("⚡");setAutoApprove(false);setActivarMasTarde(false);setFechaInicio("");
    setGrupoMin("2");setGrupoMax("2");setPeerEval(true);
  };

  const openEdit=(m)=>{
    setTitulo(m.titulo||"");setDesc(m.descripcion||"");setRec(String(m.recompensa||""));
    setDif(m.dificultad||"facil");setTipo(m.tipo||"normal");
    setMaxSub(m.max_submissions?String(m.max_submissions):"");
    setImgUrl(m.imagen_url||"");setMisionIcon(m.icon||"⚡");
    setAutoApprove(!!m.auto_approve);
    if(m.fecha_inicio){ setActivarMasTarde(true); setFechaInicio(toLocalDatetimeValue(m.fecha_inicio)); }
    else { setActivarMasTarde(false); setFechaInicio(""); }
    setGrupoMin(String(m.grupo_min_size||2));setGrupoMax(String(m.grupo_max_size||2));
    setPeerEval(m.requires_peer_eval!==false);
    setForm(m);
  };

  const calcFin=()=>{
    if(tipo!=="limitada"||!durVal) return null;
    const d=new Date();const v=parseInt(durVal)||1;
    if(durUnidad==="minutos") d.setMinutes(d.getMinutes()+v);
    else if(durUnidad==="horas") d.setHours(d.getHours()+v);
    else d.setDate(d.getDate()+v);
    return d.toISOString();
  };

  const guardar=async()=>{
    if(!titulo.trim()||!rec){showToast("Completa titulo y recompensa","error");return;}
    const payload={
      titulo:titulo.trim(),descripcion:desc.trim(),recompensa:parseInt(rec),dificultad:dif,
      tipo, max_submissions:(tipo==="grupal"||tipo==="rol")&&maxSub?parseInt(maxSub):tipo==="rol"?1:null,
      imagen_url:imgUrl||null, icon:misionIcon||"⚡",
      auto_approve:autoApprove||tipo==="rapida",
      fecha_inicio: activarMasTarde&&fechaInicio ? new Date(fechaInicio).toISOString() : null,
      grupo_min_size: tipo==="grupal" ? parseInt(grupoMin)||2 : 2,
      grupo_max_size: tipo==="grupal" ? parseInt(grupoMax)||2 : 2,
      requires_peer_eval: tipo==="grupal" ? peerEval : false,
    };
    const isEdit=form&&typeof form==="object"&&form.id;
    if(!isEdit) payload.fecha_fin=calcFin();
    try{
      if(isEdit){
        const d=await api.updateMission(form.id,payload);
        setMissions(prev=>prev.map(m=>m.id===form.id?{...m,...(d.data||d)}:m));
        showToast("Misión actualizada");
      } else {
        const d=await api.createMission(payload);
        setMissions(prev=>[d.data||d,...prev]);
        showToast("Misión creada!");
      }
      resetForm();setForm(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const eliminar=async(m,e)=>{
    e.stopPropagation();
    if(!window.confirm(`¿Eliminar "${m.titulo}"?`)) return;
    setDeleting(m.id);
    try{
      await api.deleteMission(m.id);
      setMissions(prev=>prev.filter(x=>x.id!==m.id));
      showToast("Misión eliminada");
    }catch(ex){showToast(ex.message||"Error","error");}
    finally{setDeleting(null);}
  };

  const premiarTodos=async(m,e)=>{
    e.stopPropagation();
    try{
      const r=await api.missionRewardAll(m.id);
      showToast(`✅ Premiaste a ${r.count||r.data?.count||0} alumno(s)`);
      reload();
    }catch(e2){showToast(e2.message||"Error","error");}
  };

  const TIPO_COL={normal:"#3b82f6",limitada:"#ef4444",grupal:"#10b981",encadenada:"#8b5cf6",rol:"#ec4899",rapida:"#10b981"};
  const TIPO_ICON_MAP={normal:"📋",limitada:"⏱",grupal:"👥",encadenada:"🔗",rol:"👑",rapida:"⚡"};
  const isEdit=form&&typeof form==="object"&&form.id;

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Misiones" sub="EDUCOINS"
        extra={<button onClick={()=>{resetForm();setForm("new");}}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nueva
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:sub,fontWeight:700}}>Sin misiones. Creá la primera ⚡</div>}
        {missions.map(m=>{
          const pendiente=m.fecha_inicio&&new Date(m.fecha_inicio)>new Date();
          return(
            <WCard key={m.id} style={{marginBottom:10,borderLeft:`4px solid ${TIPO_COL[m.tipo||"normal"]||"#ddd"}`,opacity:!m.activa?0.55:1}}>
              <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center",flexWrap:"wrap"}}>
                <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
                <span style={{background:TIPO_COL[m.tipo||"normal"]+"22",color:TIPO_COL[m.tipo||"normal"],borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>
                  {TIPO_ICON_MAP[m.tipo||"normal"]} {m.tipo||"normal"}
                </span>
                {m.auto_approve&&<span style={{background:"#10b98118",color:"#10b981",borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>⚡ auto</span>}
                {m.tipo==="grupal"&&<span style={{background:"#8b5cf618",color:"#8b5cf6",borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>{m.grupo_min_size||2}-{m.grupo_max_size||2} miembros{m.requires_peer_eval?" · 🤝":""}</span>}
                {pendiente&&<span style={{background:"#f59e0b18",color:"#f59e0b",borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>
                  🕐 Activa {new Date(m.fecha_inicio).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </span>}
                {m.fecha_fin&&!pendiente&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>
                  Hasta {new Date(m.fecha_fin).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </span>}
              </div>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{m.icon||"⚡"} {m.titulo}</div>
                  {m.descripcion&&<div style={{fontSize:12,color:sub,marginTop:2}}>{m.descripcion}</div>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>openEdit(m)} style={{background:primary+"18",color:primary,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>✏️</button>
                  <button onClick={(e)=>eliminar(m,e)} disabled={deleting===m.id} style={{background:"#ef444418",color:"#ef4444",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>🗑️</button>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,flexWrap:"wrap",gap:6}}>
                <div style={{fontWeight:800,color:primary}}>🪙 {m.recompensa}</div>
                <div style={{fontSize:11,color:sub}}>{m.pendientes||0} pendientes · {m.aprobadas||0} aprobadas</div>
                {(m.pendientes||0)>0&&(
                  <button onClick={(e)=>premiarTodos(m,e)} style={{background:"#10b98118",color:"#10b981",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    ✅ Premiar todos ({m.pendientes})
                  </button>
                )}
              </div>
            </WCard>
          );
        })}
      </div>
      {form&&(
        <Sheet title={isEdit?"Editar misión":"Nueva misión"} onClose={()=>{setForm(false);resetForm();}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Inp val={titulo} set={setTitulo} ph="Título" icon="⚡"/>
            <Inp val={desc}   set={setDesc}   ph="Descripción (opcional)" icon="📝"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp val={rec} set={setRec} ph="Recompensa" type="number" icon="🪙"/>
              <select value={dif} onChange={e=>setDif(e.target.value)}
                style={{background:inputBg,border:`1.5px solid ${navBord}`,borderRadius:14,color:txt,padding:"12px 14px",fontSize:13,outline:"none",fontWeight:700}}>
                <option value="facil">Fácil</option><option value="media">Media</option><option value="dificil">Difícil</option>
              </select>
            </div>

            {/* Tipo */}
            {!isEdit&&(<>
              <div style={{fontWeight:700,fontSize:12,color:sub}}>Tipo de misión</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {[["normal","📋 Normal"],["limitada","⏱ Tiempo"],["grupal","👥 Grupal"],["rol","👑 Rol"],["rapida","⚡ Rápida"]].map(([v,l])=>(
                  <button key={v} onClick={()=>{setTipo(v);setAutoApprove(v==="rapida");}}
                    style={{background:tipo===v?TIPO_COL[v]:inputBg,color:tipo===v?"white":sub,border:"none",borderRadius:10,padding:"9px 6px",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
                ))}
              </div>
            </>)}

            {/* Duración para limitada */}
            {tipo==="limitada"&&!isEdit&&(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="number" value={durVal} min="1" onChange={e=>setDurVal(e.target.value)}
                  style={{width:60,border:`1.5px solid ${navBord}`,borderRadius:10,padding:"9px 10px",fontSize:14,fontWeight:800,outline:"none",color:"#ef4444",textAlign:"center",fontFamily:"Nunito,sans-serif",background:inputBg}}/>
                <select value={durUnidad} onChange={e=>setDurUnidad(e.target.value)}
                  style={{flex:1,background:inputBg,border:`1.5px solid ${navBord}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",color:txt}}>
                  <option value="minutos">minutos</option><option value="horas">horas</option><option value="dias">días</option>
                </select>
              </div>
            )}

            {/* Cupos */}
            {(tipo==="grupal"||tipo==="rol")&&(
              <Inp val={maxSub} set={setMaxSub} ph={tipo==="rol"?"Cupos (por defecto 1)":"Máx. participantes (vacío=ilimitado)"} type="number" icon={tipo==="rol"?"👑":"👥"}/>
            )}

            {/* Grupal config: tamaño del grupo + peer eval */}
            {tipo==="grupal"&&(<>
              <div style={{fontWeight:700,fontSize:12,color:sub}}>Tamaño del grupo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:sub,marginBottom:2}}>Mínimo</div>
                  <input type="number" min="2" max="10" value={grupoMin} onChange={e=>setGrupoMin(e.target.value)}
                    style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${navBord}`,borderRadius:10,padding:"9px 12px",fontSize:14,fontWeight:800,outline:"none",color:txt,background:inputBg,fontFamily:"Nunito,sans-serif"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:sub,marginBottom:2}}>Máximo</div>
                  <input type="number" min="2" max="10" value={grupoMax} onChange={e=>setGrupoMax(e.target.value)}
                    style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${navBord}`,borderRadius:10,padding:"9px 12px",fontSize:14,fontWeight:800,outline:"none",color:txt,background:inputBg,fontFamily:"Nunito,sans-serif"}}/>
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"4px 0"}}>
                <input type="checkbox" checked={peerEval} onChange={e=>setPeerEval(e.target.checked)} style={{accentColor:"#8b5cf6",width:18,height:18}}/>
                <span style={{fontSize:13,fontWeight:700,color:sub}}>🤝 Evaluación entre pares al completar</span>
              </label>
            </>)}

            {/* Auto-approve toggle (si no es rapida) */}
            {tipo!=="rapida"&&(
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 0"}}>
                <input type="checkbox" checked={autoApprove} onChange={e=>setAutoApprove(e.target.checked)} style={{accentColor:"#10b981",width:18,height:18}}/>
                <span style={{fontSize:13,fontWeight:700,color:sub}}>⚡ Aprobación automática al entregar</span>
              </label>
            )}

            {/* Activar más tarde */}
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"4px 0"}}>
              <input type="checkbox" checked={activarMasTarde} onChange={e=>setActivarMasTarde(e.target.checked)} style={{accentColor:primary,width:18,height:18}}/>
              <span style={{fontSize:13,fontWeight:700,color:sub}}>🕐 Programar activación</span>
            </label>
            {activarMasTarde&&(
              <input type="datetime-local" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}
                style={{border:`1.5px solid ${navBord}`,borderRadius:12,padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",fontWeight:700,color:txt,background:inputBg}}/>
            )}

            {/* Icon */}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={misionIcon} onChange={e=>setMisionIcon(e.target.value)} maxLength={4}
                placeholder="⚡" style={{width:56,border:`1.5px solid ${navBord}`,borderRadius:12,padding:"10px",fontSize:22,textAlign:"center",outline:"none",fontFamily:"Nunito,sans-serif",background:inputBg,color:txt}}/>
              <span style={{fontSize:12,color:sub,fontWeight:700}}>Emoji / ícono</span>
            </div>

            {/* Image upload */}
            <input ref={fileRef} type="file" accept="image/*" onChange={async e=>{
              const f=e.target.files?.[0]; if(!f) return;
              setImgLoading(true);
              try{ setImgUrl(await compressMisionImg(f)); }
              catch{ showToast("Error al procesar imagen","error"); }
              finally{ setImgLoading(false); }
            }} style={{display:"none"}}/>
            {imgUrl?(
              <div style={{position:"relative",borderRadius:12,overflow:"hidden",height:100}}>
                <img src={imgUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <button onClick={()=>setImgUrl("")} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",color:"white",width:26,height:26,cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            ):(
              <button onClick={()=>fileRef.current?.click()} disabled={imgLoading}
                style={{width:"100%",padding:"10px",background:inputBg,color:sub,border:`1.5px dashed ${navBord}`,borderRadius:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800}}>
                {imgLoading?"Procesando...":"📷 Agregar imagen (opcional)"}
              </button>
            )}
            <PBtn label={isEdit?"Guardar cambios":"Crear misión"} onClick={guardar} full/>
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

// ═════════════════════════════════════════════════════════════════
// MCooperacion — teacher cooperation dashboard
// ═════════════════════════════════════════════════════════════════
function MCooperacion({me,showToast,onBack}){
  const {primary,isDark,txt,sub,cardBg,pageBg,navBord,inputBg}=useTheme();
  const [tab,setTab]=useState("ranking");   // ranking | student | triangulation
  const [ranking,setRanking]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);  // student detail
  const [studentData,setStudentData]=useState(null);
  const [triangulation,setTriangulation]=useState([]);
  const [triLoading,setTriLoading]=useState(false);
  // Teacher observation form
  const [obsStudent,setObsStudent]=useState(null);
  const [obsRating,setObsRating]=useState(0);
  const [obsNote,setObsNote]=useState("");
  const [obsSending,setObsSending]=useState(false);

  useEffect(()=>{
    api.peerDashboard().then(r=>setRanking(r.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const openStudent=async(s)=>{
    setSelected(s);setStudentData(null);
    try{
      const r=await api.peerStudent(s.id);
      setStudentData(r.data);
    }catch(e){showToast("Error cargando perfil","error");}
  };

  const loadTriangulation=async()=>{
    setTriLoading(true);
    try{ const r=await api.peerTriangulation(); setTriangulation(r.data||[]); }
    catch(e){showToast("Error","error");}
    finally{setTriLoading(false);}
  };

  const submitObs=async()=>{
    if(!obsStudent||!obsRating){showToast("Elegí una calificación","error");return;}
    setObsSending(true);
    try{
      await api.peerTeacherObs({student_id:obsStudent.id,rating:obsRating,note:obsNote||null});
      showToast("Observación guardada ✅");
      setObsStudent(null);setObsRating(0);setObsNote("");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setObsSending(false);}
  };

  const TREND_ICON={improving:"📈",declining:"📉",stable:"➡️"};
  const TREND_COL ={improving:"#10b981",declining:"#ef4444",stable:sub};

  return(
    <div style={{background:pageBg,minHeight:"100%",fontFamily:"Nunito,sans-serif"}}>
      <OHdrA title="🤝 Cooperación" onBack={onBack}/>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,padding:"10px 14px",background:cardBg,borderBottom:`1px solid ${navBord}`}}>
        {[["ranking","📊 Ranking"],["triangulation","🔍 Triangulación"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setTab(id);if(id==="triangulation")loadTriangulation();}}
            style={{flex:1,padding:"8px 12px",borderRadius:12,border:"none",cursor:"pointer",
              fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:800,
              background:tab===id?primary:"transparent",color:tab===id?"white":sub}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px 100px"}}>
        {/* ── RANKING TAB ── */}
        {tab==="ranking"&&(<>
          {loading&&<div style={{textAlign:"center",padding:40,color:sub,fontWeight:700}}>Cargando...</div>}
          {!loading&&ranking.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:sub}}>
              <div style={{fontSize:40,marginBottom:8}}>🤝</div>
              <div style={{fontWeight:800,fontSize:14}}>Sin evaluaciones aún</div>
              <div style={{fontSize:12,marginTop:4}}>Creá misiones grupales con evaluación entre pares para ver datos</div>
            </div>
          )}
          {ranking.map((s,i)=>(
            <WCard key={s.id} onClick={()=>openStudent(s)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer",marginBottom:8}}>
              <div style={{fontWeight:900,fontSize:16,color:i<3?primary:sub,width:28,textAlign:"center"}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
              </div>
              <Av user={s} sz={38} avatarBg={s.avatar_bg}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:txt}}>{s.nombre}</div>
                <div style={{fontSize:10,color:sub,marginTop:1}}>
                  {s.total_evals} evaluaciones · {TREND_ICON[s.trend]} {s.trend==="improving"?"Mejorando":s.trend==="declining"?"Bajando":"Estable"}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:900,fontSize:18,color:primary}}>
                  {s.avg_rating ? parseFloat(s.avg_rating).toFixed(1) : "—"}
                </div>
                <div style={{fontSize:9,color:sub,fontWeight:700}}>/ 5.0</div>
              </div>
            </WCard>
          ))}

          {/* Teacher observation button */}
          {ranking.length>0&&!obsStudent&&(
            <div style={{marginTop:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:sub,fontWeight:700,marginBottom:6}}>
                Registrá tu propia observación de cooperación
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {ranking.slice(0,10).map(s=>(
                  <button key={s.id} onClick={()=>setObsStudent(s)}
                    style={{display:"flex",alignItems:"center",gap:4,background:cardBg,
                      border:`1px solid ${navBord}`,borderRadius:99,padding:"5px 12px 5px 5px",
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    <Av user={s} sz={20}/>
                    <span style={{fontSize:11,fontWeight:700,color:txt}}>{s.nombre?.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teacher observation form */}
          {obsStudent&&(
            <WCard style={{marginTop:12,padding:16}}>
              <div style={{fontWeight:900,fontSize:14,color:txt,marginBottom:8}}>
                Observación: {obsStudent.nombre}
              </div>
              <div style={{display:"flex",gap:4,marginBottom:8,justifyContent:"center"}}>
                {[1,2,3,4,5].map(star=>(
                  <button key={star} onClick={()=>setObsRating(star)}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:28,padding:2,
                      filter:obsRating>=star?"none":"grayscale(1) opacity(.3)",
                      transform:obsRating===star?"scale(1.2)":"scale(1)",transition:"all .15s"}}>
                    ⭐
                  </button>
                ))}
              </div>
              <textarea value={obsNote} onChange={e=>setObsNote(e.target.value)}
                placeholder="Nota sobre cooperación (opcional)..."
                rows={2} style={{width:"100%",boxSizing:"border-box",background:inputBg,
                  border:`1px solid ${navBord}`,borderRadius:12,padding:"8px 12px",
                  fontFamily:"Nunito,sans-serif",fontSize:12,fontWeight:700,color:txt,
                  resize:"none",outline:"none",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setObsStudent(null);setObsRating(0);setObsNote("");}}
                  style={{flex:1,padding:10,background:inputBg,color:sub,border:"none",borderRadius:12,
                    fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,cursor:"pointer"}}>
                  Cancelar
                </button>
                <button onClick={submitObs} disabled={obsSending||!obsRating}
                  style={{flex:1,padding:10,background:obsRating?primary:inputBg,
                    color:obsRating?"white":sub,border:"none",borderRadius:12,
                    fontFamily:"Nunito,sans-serif",fontSize:13,fontWeight:800,cursor:"pointer",
                    opacity:obsSending?.5:1}}>
                  {obsSending?"Guardando...":"Guardar"}
                </button>
              </div>
            </WCard>
          )}
        </>)}

        {/* ── TRIANGULATION TAB ── */}
        {tab==="triangulation"&&(<>
          {triLoading&&<div style={{textAlign:"center",padding:40,color:sub,fontWeight:700}}>Cargando...</div>}
          {!triLoading&&triangulation.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:sub}}>
              <div style={{fontSize:40,marginBottom:8}}>🔍</div>
              <div style={{fontWeight:800,fontSize:14}}>Sin datos de triangulación</div>
              <div style={{fontSize:12,marginTop:4}}>Se necesitan evaluaciones de pares + observaciones docentes</div>
            </div>
          )}
          {triangulation.map(s=>{
            const peerAvg=parseFloat(s.peer_avg)||0;
            const teacherAvg=parseFloat(s.teacher_avg)||0;
            const diff=parseFloat(s.discrepancy)||0;
            const isHigh=diff>1;
            return(
              <WCard key={s.id} style={{marginBottom:8,borderLeft:isHigh?`4px solid #ef4444`:`4px solid ${navBord}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Av user={s} sz={36} avatarBg={s.avatar_bg}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:13,color:txt}}>{s.nombre}</div>
                    <div style={{fontSize:10,color:sub,marginTop:2}}>
                      {s.peer_count} eval. pares · {s.teacher_count} obs. docente
                    </div>
                  </div>
                  {isHigh&&<span style={{background:"#ef444418",color:"#ef4444",borderRadius:99,
                    padding:"3px 10px",fontSize:10,fontWeight:900}}>⚠️ Discrepancia</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
                  <div style={{textAlign:"center",background:inputBg,borderRadius:10,padding:"8px 4px"}}>
                    <div style={{fontWeight:900,fontSize:16,color:"#8b5cf6"}}>{peerAvg.toFixed(1)}</div>
                    <div style={{fontSize:9,color:sub,fontWeight:700}}>Pares</div>
                  </div>
                  <div style={{textAlign:"center",background:inputBg,borderRadius:10,padding:"8px 4px"}}>
                    <div style={{fontWeight:900,fontSize:16,color:primary}}>{teacherAvg.toFixed(1)}</div>
                    <div style={{fontSize:9,color:sub,fontWeight:700}}>Docente</div>
                  </div>
                  <div style={{textAlign:"center",background:isHigh?"#ef444418":inputBg,borderRadius:10,padding:"8px 4px"}}>
                    <div style={{fontWeight:900,fontSize:16,color:isHigh?"#ef4444":sub}}>{diff.toFixed(1)}</div>
                    <div style={{fontSize:9,color:sub,fontWeight:700}}>Diferencia</div>
                  </div>
                </div>
              </WCard>
            );
          })}
        </>)}
      </div>

      {/* ── Student Detail Sheet ── */}
      {selected&&(
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div onClick={()=>setSelected(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
          <div style={{position:"relative",background:cardBg,borderRadius:"28px 28px 0 0",
            maxHeight:"85vh",display:"flex",flexDirection:"column",
            boxShadow:"0 -8px 40px rgba(0,0,0,.25)",animation:"slideUp .25s ease"}}>
            <div style={{width:40,height:4,background:navBord,borderRadius:99,margin:"12px auto 0",flexShrink:0}}/>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px 40px"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <Av user={selected} sz={48} avatarBg={selected.avatar_bg}/>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color:txt}}>{selected.nombre}</div>
                  <div style={{fontSize:12,color:sub}}>
                    Promedio: <b style={{color:primary}}>{selected.avg_rating ? parseFloat(selected.avg_rating).toFixed(1) : "—"}</b> / 5.0
                    · {selected.total_evals} evaluaciones
                  </div>
                </div>
              </div>

              {!studentData&&<div style={{textAlign:"center",padding:30,color:sub,fontWeight:700}}>Cargando...</div>}

              {studentData&&(<>
                {/* Stats */}
                {studentData.stats&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                    <div style={{textAlign:"center",background:inputBg,borderRadius:12,padding:"10px 4px"}}>
                      <div style={{fontWeight:900,fontSize:18,color:primary}}>{studentData.stats.avg_rating||"—"}</div>
                      <div style={{fontSize:9,color:sub,fontWeight:700}}>Promedio</div>
                    </div>
                    <div style={{textAlign:"center",background:inputBg,borderRadius:12,padding:"10px 4px"}}>
                      <div style={{fontWeight:900,fontSize:18,color:"#10b981"}}>{studentData.stats.max_rating||"—"}</div>
                      <div style={{fontSize:9,color:sub,fontWeight:700}}>Máximo</div>
                    </div>
                    <div style={{textAlign:"center",background:inputBg,borderRadius:12,padding:"10px 4px"}}>
                      <div style={{fontWeight:900,fontSize:18,color:"#ef4444"}}>{studentData.stats.min_rating||"—"}</div>
                      <div style={{fontSize:9,color:sub,fontWeight:700}}>Mínimo</div>
                    </div>
                  </div>
                )}

                {/* Recent evaluations (anonymized) */}
                {studentData.evaluations?.length>0&&(<>
                  <div style={{fontWeight:800,fontSize:13,color:txt,marginBottom:8}}>Evaluaciones recibidas</div>
                  {studentData.evaluations.slice(0,10).map((ev,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",
                      borderBottom:i<Math.min(studentData.evaluations.length,10)-1?`1px solid ${navBord}`:"none"}}>
                      <div style={{fontWeight:900,fontSize:16,color:primary,width:28,flexShrink:0,textAlign:"center"}}>
                        {"⭐".repeat(ev.rating)}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:txt}}>{ev.mision_titulo}</div>
                        {ev.comment&&<div style={{fontSize:11,color:sub,marginTop:2,fontStyle:"italic"}}>"{ev.comment}"</div>}
                        <div style={{fontSize:9,color:sub,marginTop:2}}>
                          {new Date(ev.submitted_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                        </div>
                      </div>
                    </div>
                  ))}
                </>)}

                {/* Teacher observations */}
                {studentData.observations?.length>0&&(<>
                  <div style={{fontWeight:800,fontSize:13,color:txt,marginTop:16,marginBottom:8}}>Observaciones docentes</div>
                  {studentData.observations.map((obs,i)=>(
                    <div key={i} style={{background:inputBg,borderRadius:12,padding:"10px 12px",marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:700,color:txt}}>{"⭐".repeat(obs.rating)} — {obs.teacher_name}</span>
                        <span style={{fontSize:9,color:sub}}>{new Date(obs.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}</span>
                      </div>
                      {obs.note&&<div style={{fontSize:11,color:sub,marginTop:4}}>{obs.note}</div>}
                      {obs.mision_titulo&&<div style={{fontSize:10,color:sub,marginTop:2}}>📋 {obs.mision_titulo}</div>}
                    </div>
                  ))}
                </>)}

                {/* Groups history */}
                {studentData.groups?.length>0&&(<>
                  <div style={{fontWeight:800,fontSize:13,color:txt,marginTop:16,marginBottom:8}}>Historial de grupos</div>
                  {studentData.groups.map((g,i)=>(
                    <div key={g.id||i} style={{background:inputBg,borderRadius:12,padding:"10px 12px",marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:12,color:txt}}>{g.mision_titulo}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                        {g.members?.map((mem,j)=>(
                          <span key={j} style={{fontSize:10,color:sub,background:cardBg,
                            borderRadius:99,padding:"2px 8px",fontWeight:700}}>
                            {mem.nombre?.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                      <div style={{fontSize:9,color:sub,marginTop:4}}>
                        Estado: {g.status==="approved"?"✅ Aprobado":g.status==="submitted"?"⏳ Entregado":g.status}
                      </div>
                    </div>
                  ))}
                </>)}
              </>)}
            </div>
          </div>
        </div>
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

// Paleta docente (sin tema dinámico)
const MC = {
  bg:"#F0F0F0", card:"white", accent:"#00c1fc",
  txt:"#1a1a1a", sub:"#666666", muted:"#aaaaaa",
  bd:"#e8e8e8", bd2:"#f0f0f0",
};

function MVotaciones({me, showToast}){
  const [polls,setPolls]        = useState([]);
  const [loading,setLoading]    = useState(true);
  const [classroom,setClassroom]= useState(null);
  const [form,setForm]          = useState(false);
  const [titulo,setTitulo]      = useState("");
  const [opciones,setOpciones]  = useState(["",""]);
  const [durValor,setDurValor]  = useState("24");
  const [durUnidad,setDurUnidad]= useState("horas");
  const [weighted,setWeighted]  = useState(true);
  const [saving,setSaving]      = useState(false);
  const [now,setNow]            = useState(()=>new Date());
  const classroomRef            = useRef(null);

  const DUR_MAX={minutos:1440,horas:480,dias:20};
  const JERARQUIA_COLOR={admin:MC.accent,teacher:"#8b5cf6"};

  const loadPolls=(cid)=>{
    if(!cid){ setLoading(false); return; }
    api.polls("aula", cid)
      .then(d=>setPolls(Array.isArray(d)?d:[]))
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo()
      .then(d=>{ setClassroom(d); classroomRef.current=d; loadPolls(d?.id); })
      .catch(()=>setLoading(false));
    const id=setInterval(()=>setNow(new Date()),30000);
    return ()=>clearInterval(id);
  },[]);

  // ── Socket tiempo real ──────────────────────────────────
  useEffect(()=>{
    let socket;
    try{ socket=getSocket(); } catch(e){ return; }
    if(!socket) return;
    const handler=({ poll_id, action })=>{
      const cid=classroomRef.current?.id;
      if(!cid) return;
      if(action==='created'){
        loadPolls(cid);
      } else if(action==='vote'){
        api.pollById(poll_id)
          .then(u=>{ if(u) setPolls(ps=>ps.map(p=>p.id===poll_id?u:p)); })
          .catch(()=>{});
      }
    };
    socket.on('poll_update', handler);
    return ()=>socket.off('poll_update', handler);
  },[]);

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
    <div style={{minHeight:"100vh",background:MC.bg}}>
      <div style={{background:MC.accent,color:"white",padding:"22px 16px 28px",
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
            <div style={{fontWeight:800,fontSize:14,color:MC.txt,marginTop:8}}>Sin aula asignada</div>
            <div style={{color:MC.muted,fontSize:12,marginTop:4}}>Pedile al admin que te asigne a un aula</div>
          </WCard>
        )}

        {form&&classroom&&(
          <div style={{background:MC.card,borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:MC.txt,marginBottom:10}}>Nueva votación</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Pregunta..."
              style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${MC.bd}`,borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{fontWeight:700,fontSize:12,color:MC.sub,marginBottom:6}}>Opciones</div>
            {opciones.map((op,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={op} onChange={e=>{const n=[...opciones];n[i]=e.target.value;setOpciones(n);}}
                  placeholder={"Opción "+(i+1)}
                  style={{flex:1,border:`1.5px solid ${MC.bd}`,borderRadius:12,padding:"8px 12px",
                    fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                {opciones.length>2&&(
                  <button onClick={()=>setOpciones(o=>o.filter((_,j)=>j!==i))}
                    style={{background:"#fee2e2",border:"none",borderRadius:8,color:"#ef4444",width:32,cursor:"pointer",fontWeight:800}}>✕</button>
                )}
              </div>
            ))}
            {opciones.length<8&&(
              <button onClick={()=>setOpciones(o=>[...o,""])}
                style={{width:"100%",background:MC.bd2,border:"none",borderRadius:12,
                  padding:"8px",fontSize:12,fontWeight:800,color:MC.sub,cursor:"pointer",
                  marginBottom:10,fontFamily:"Nunito,sans-serif"}}>+ Agregar opción</button>
            )}
            <button onClick={()=>setWeighted(w=>!w)}
              style={{width:"100%",background:weighted?"#f59e0b18":"#f7f7f7",
                border:`1.5px solid ${weighted?"#f59e0b":MC.bd}`,borderRadius:12,
                padding:"10px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"Nunito,sans-serif",marginBottom:10,display:"flex",alignItems:"center",gap:8,
                color:weighted?"#b45309":MC.sub,textAlign:"left"}}>
              <span style={{fontSize:16}}>🏛️</span>
              <div style={{flex:1}}>DAO: Poder = Monedas {weighted?"✓":""}</div>
              <div style={{width:20,height:20,borderRadius:"50%",
                background:weighted?"#f59e0b":"#ddd",color:"white",fontSize:11,
                display:"flex",alignItems:"center",justifyContent:"center"}}>{weighted?"✓":"○"}</div>
            </button>
            <div style={{fontWeight:700,fontSize:12,color:MC.sub,marginBottom:6}}>Duración</div>
            <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
              <input type="number" value={durValor}
                onChange={e=>{const v=Math.min(Math.max(1,parseInt(e.target.value)||1),DUR_MAX[durUnidad]);setDurValor(String(v));}}
                min="1" max={DUR_MAX[durUnidad]}
                style={{width:70,border:`1.5px solid ${MC.bd}`,borderRadius:12,padding:"10px 12px",
                  fontSize:16,fontWeight:800,outline:"none",textAlign:"center",
                  color:MC.accent,fontFamily:"Nunito,sans-serif"}}/>
              <div style={{display:"flex",gap:6,flex:1}}>
                {["minutos","horas","dias"].map(u=>(
                  <button key={u} onClick={()=>{setDurUnidad(u);setDurValor(v=>String(Math.min(parseInt(v)||1,DUR_MAX[u])));}}
                    style={{flex:1,background:durUnidad===u?MC.accent:MC.bd2,
                      color:durUnidad===u?"white":MC.sub,
                      border:"none",borderRadius:10,padding:"8px 4px",fontWeight:800,fontSize:10,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{u}</button>
                ))}
              </div>
            </div>
            <div style={{fontSize:11,color:MC.muted,marginBottom:12,textAlign:"center"}}>Cierra el {previewFin}</div>
            <button onClick={crear} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":MC.accent,border:"none",borderRadius:50,
                color:"white",padding:"12px",fontWeight:800,fontSize:14,
                cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear votación"}
            </button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",color:MC.muted,padding:32}}>Cargando...</div>}
        {!loading&&classroom&&polls.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:32}}>🗳️</div>
            <div style={{fontWeight:800,fontSize:14,color:MC.txt,marginTop:8}}>Sin votaciones en tu aula</div>
          </WCard>
        )}

        {polls.map(v=>{
          const jerarCol=JERARQUIA_COLOR[v.creador_rol]||"#94a3b8";
          return(
            <div key={v.id} style={{background:MC.card,borderRadius:16,padding:"14px",marginBottom:8,
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
                  <div style={{fontWeight:800,fontSize:13,color:MC.txt}}>{v.titulo}</div>
                  {v.fin&&<div style={{fontSize:10,color:MC.muted,marginTop:2}}>
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
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:MC.sub,marginBottom:2}}>
                      <span>{op.texto}</span>
                      <span>
                        {v.weighted
                          ?<>{pct}% <span style={{fontSize:10,color:"#f59e0b"}}>({parseFloat(op.peso_total||0).toFixed(0)}🪙)</span></>
                          :`${op.votos} (${pct}%)`}
                      </span>
                    </div>
                    <div style={{background:MC.bd2,borderRadius:99,height:6}}>
                      <div style={{width:pct+"%",height:"100%",borderRadius:99,
                        background:v.weighted?"#f59e0b":jerarCol,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}

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
                  <div style={{background:MC.bd2,borderRadius:99,height:5}}>
                    <div style={{width:`${Math.min(v.quorum.pct,100)}%`,height:"100%",borderRadius:99,
                      background:v.quorum.met?"#10b981":"#f59e0b",transition:"width .4s"}}/>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{fontSize:11,color:MC.muted}}>
                  {v.total_votos} voto{v.total_votos!==1?"s":""}
                  {v.weighted&&v.total_peso>0&&` · ${parseFloat(v.total_peso).toFixed(0)}🪙`}
                </span>
                {(v.creador_id===me.id||me.rol==="admin")&&(
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
