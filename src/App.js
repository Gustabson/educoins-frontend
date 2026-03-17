import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Aubank Frontend — Conectado a API REST + WebSockets

// ── SOCKET SINGLETON ──────────────────────────────────────────
let _socket = null;

function connectSocket(token) {
  if (_socket?.connected) return _socket;
  if (_socket) { _socket.disconnect(); _socket = null; }
  _socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
  _socket.on('connect', () => console.log('Socket conectado:', _socket.id));
  _socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
  return _socket;
}

function getSocket() { return _socket; }


// ── CONFIGURACIÓN DE API ──────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const API = `${API_URL}/api/v1`;

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("ec_token");
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw { code: data.error?.code, message: data.error?.message };
  return data.data;
}

const api = {
  login:          (email, password)       => apiFetch("/auth/login",         { method:"POST", body:{email,password} }),
  me:             ()                      => apiFetch("/auth/me"),
  account:        ()                      => apiFetch("/accounts/me"),
  transactions:   (page=1)               => apiFetch(`/accounts/me/transactions?page=${page}&limit=20`),
  missions:       ()                      => apiFetch("/missions"),
  submitMission:  (id)                    => apiFetch(`/missions/${id}/submit`,  { method:"POST" }),
  submissions:    ()                      => apiFetch("/missions/submissions?estado=pendiente"),
  allSubmissions: ()                      => apiFetch("/missions/submissions"),
  approve:        (id)                    => apiFetch(`/missions/submissions/${id}/approve`, { method:"POST" }),
  reject:         (id, reason)            => apiFetch(`/missions/submissions/${id}/reject`,  { method:"POST", body:{reason} }),
  createMission:  (data)                  => apiFetch("/missions",            { method:"POST", body:data }),
  storeItems:     ()                      => apiFetch("/store/items"),
  createItem:     (data)                  => apiFetch("/store/items",         { method:"POST", body:data }),
  purchase:       (item_id)               => apiFetch("/transactions/purchase",{ method:"POST", body:{item_id} }),
  transfer:       (to_user_id, amount)    => apiFetch("/transactions/transfer",{ method:"POST", body:{to_user_id,amount} }),
  ranking:        ()                      => apiFetch("/profile/ranking"),
  equip:          (type, item_id)         => apiFetch("/profile/equip",       { method:"POST", body:{type,item_id} }),
  adminUsers:     ()                      => apiFetch("/admin/users"),
  createUser:     (data)                  => apiFetch("/admin/users",         { method:"POST", body:data }),
  treasury:       ()                      => apiFetch("/admin/treasury"),
  mint:           (amount, description)   => apiFetch("/admin/mint",          { method:"POST", body:{amount,description} }),
  burn:           (amount, reason)        => apiFetch("/admin/burn",          { method:"POST", body:{amount,reason} }),
  setBudget:      (teacher_id, monthly_limit) => apiFetch("/admin/teacher-budget", { method:"POST", body:{teacher_id,monthly_limit} }),
  auditLog:       ()                      => apiFetch("/admin/audit-log"),
  deactivate:     (id)                    => apiFetch(`/admin/users/${id}/deactivate`, { method:"PATCH" }),
  // ── Noticias ──────────────────────────────────────────────
  posts:          (tag)                   => apiFetch(`/posts${tag?`?tag=${tag}`:""}`),
  post:           (id)                    => apiFetch(`/posts/${id}`),
  createPost:     (data)                  => apiFetch("/posts",               { method:"POST", body:data }),
  // ── Votaciones ────────────────────────────────────────────
  polls:          ()                      => apiFetch("/polls"),
  poll:           (id)                    => apiFetch(`/polls/${id}`),
  vote:           (poll_id, option_id)    => apiFetch(`/polls/${poll_id}/vote`,{ method:"POST", body:{option_id} }),
  createPoll:     (data)                  => apiFetch("/polls",               { method:"POST", body:data }),
  // ── Chat ──────────────────────────────────────────────────
  chatGlobalInfo:    ()             => apiFetch("/chat/global/info"),
  chatGlobalMsgs:    ()             => apiFetch("/chat/global/messages"),
  chatClassroomInfo: ()             => apiFetch("/chat/classroom/info"),
  chatClassroomMsgs: ()             => apiFetch("/chat/classroom/messages"),
  chatPersonalMsgs:  (userId)       => apiFetch(`/chat/personal/${userId}/messages`),
  chatFriends:       ()             => apiFetch("/chat/friends"),
  chatSearch:        (q)            => apiFetch(`/chat/users/search?q=${encodeURIComponent(q)}`),
  chatFriendReq:     (addressee_id) => apiFetch("/chat/friends/request", { method:"POST", body:{addressee_id} }),
  chatFriendAccept:  (id)           => apiFetch(`/chat/friends/${id}/accept`, { method:"POST" }),
  chatFriendReject:  (id)           => apiFetch(`/chat/friends/${id}/reject`, { method:"POST" }),
  createReport:   (data)                  => apiFetch("/reports",          { method:"POST", body:data }),
  myReports:      ()                      => apiFetch("/reports/mine"),
  allReports:     (q="")                  => apiFetch(`/reports${q}`),
  updateReport:   (id, data)              => apiFetch(`/reports/${id}/estado`, { method:"PATCH", body:data }),
  reportMessages: (id)                    => apiFetch(`/reports/${id}/messages`),
  sendReportMsg:  (id, texto)             => apiFetch(`/reports/${id}/messages`, { method:"POST", body:{texto} }),
  deletePost:     (id)                    => apiFetch(`/posts/${id}`,          { method:"DELETE" }),
  updatePoll:     (id, data)              => apiFetch(`/polls/${id}`,          { method:"PATCH", body:data }),
  adminClassrooms:()                      => apiFetch("/admin/classrooms"),
  createClassroom:(data)                  => apiFetch("/admin/classrooms",     { method:"POST", body:data }),
  addClassroomMember:(id,data)            => apiFetch(`/admin/classrooms/${id}/members`, { method:"POST", body:data }),
};

// ── GAMIFICACIÓN (local, solo visual) ────────────────────────
const LEVELS = [
  {min:0,    name:"Novato",   color:"#94a3b8", icon:"🌱"},
  {min:100,  name:"Alumno",   color:"#3b82f6", icon:"📚"},
  {min:300,  name:"Dedicado", color:"#10b981", icon:"⚡"},
  {min:600,  name:"Experto",  color:"#f59e0b", icon:"🔥"},
  {min:1000, name:"Élite",    color:"#8b5cf6", icon:"💎"},
  {min:2000, name:"Leyenda",  color:"#ef4444", icon:"👑"},
];
const getLv  = e => { let l=LEVELS[0]; for(const x of LEVELS) if(e>=x.min) l=x; return l; };
const nextLv = e => { for(const x of LEVELS) if(e<x.min) return x; return null; };

const SKINS = [
  {id:"s1",emoji:"🧑‍🎓",name:"Clásico", price:0,   bg:"#6366f1"},
  {id:"s2",emoji:"🥷",  name:"Ninja",   price:150, bg:"#1a1a2e"},
  {id:"s3",emoji:"👨‍🚀", name:"Astro",   price:200, bg:"#0369a1"},
  {id:"s4",emoji:"🧙",  name:"Mago",    price:250, bg:"#52177f"},
  {id:"s5",emoji:"🤖",  name:"Robot",   price:300, bg:"#0f766e"},
  {id:"s6",emoji:"🧔",  name:"Vikingo", price:350, bg:"#92400e"},
  {id:"s7",emoji:"🦸",  name:"Héroe",   price:400, bg:"#1d4ed8"},
  {id:"s8",emoji:"🏴‍☠️", name:"Pirata",  price:500, bg:"#1c1917"},
];
const BORDERS = [
  {id:"b1",name:"Básico",  bs:"3px solid #DC2626", price:0},  // rojo
  {id:"b2",name:"Dorado",  bs:"3px solid #f59e0b", price:100},
  {id:"b3",name:"Verde",   bs:"3px solid #10b981", price:200},
  {id:"b4",name:"Rojo",    bs:"3px solid #ef4444", price:300},
  {id:"b5",name:"Violeta", bs:"3px solid #8b5cf6", price:400},
];
const TITLES = [
  {id:"tl1",name:"Estudiante",    price:0},
  {id:"tl2",name:"🎯 Enfocado",  price:100},
  {id:"tl3",name:"💪 Imparable", price:200},
  {id:"tl4",name:"🌟 Brillante", price:300},
  {id:"tl5",name:"🏆 Campeón",   price:500},
];
const DIFCOL = {"fácil":"#10b981","media":"#f59e0b","difícil":"#ef4444"};

// ── ESTILOS GLOBALES ──────────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body,#root{margin:0;padding:0;background:#F0F0F0;font-family:'Nunito',sans-serif;}
input,select,button,textarea{font-family:'Nunito',sans-serif;}
input::placeholder{color:#bbb;}
::-webkit-scrollbar{display:none;}
@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
`;

// ── COMPONENTES BASE ──────────────────────────────────────────
function Av({user,sz}){
  const s=sz||48;
  const sk=SKINS.find(x=>x.id===(user?.skin||"s1"))||SKINS[0];
  const br=BORDERS.find(x=>x.id===(user?.border||"b1"))||BORDERS[0];
  return(
    <div style={{width:s,height:s,borderRadius:"50%",background:sk.bg,border:br.bs,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*.46,flexShrink:0,
      boxShadow:`0 2px 10px ${sk.bg}55`}}>{sk.emoji}</div>
  );
}

function Pill({text,col}){
  const c=col||"#00c1fc";
  return <span style={{background:c+"1a",color:c,border:`1px solid ${c}33`,
    borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>{text}</span>;
}

function PBtn({label,onClick,disabled,color,full,sm,style}){
  const bg=disabled?"#e0e0e0":color||"#00c1fc";
  return(
    <button onClick={onClick} disabled={disabled}
      style={{background:bg,border:"none",borderRadius:sm?12:50,
        color:disabled?"#aaa":"white",padding:sm?"8px 16px":"13px 28px",
        fontWeight:800,fontSize:sm?12:15,cursor:disabled?"not-allowed":"pointer",
        width:full?"100%":"auto",boxShadow:disabled?"none":`0 4px 16px ${bg}44`,
        letterSpacing:"-.2px",transition:"transform .1s",...style}}
      onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform="scale(.97)"}}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
    >{label}</button>
  );
}

function OBtn({label,onClick,color}){
  const c=color||"#00c1fc";
  return(
    <button onClick={onClick} style={{background:"white",border:`1.5px solid ${c}`,
      borderRadius:50,color:c,padding:"8px 18px",fontWeight:800,fontSize:12,
      cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.06)",whiteSpace:"nowrap"}}>{label}</button>
  );
}

function Inp({val,set,ph,type,icon}){
  return(
    <div style={{position:"relative"}}>
      {icon&&<span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",
        fontSize:15,pointerEvents:"none"}}>{icon}</span>}
      <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={type||"text"}
        style={{background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
          color:"#1a1a1a",padding:icon?"12px 14px 12px 38px":"12px 16px",
          fontSize:14,outline:"none",width:"100%",fontWeight:600}}/>
    </div>
  );
}

function WCard({children,style,onClick}){
  return(
    <div onClick={onClick} style={{background:"white",borderRadius:20,padding:16,
      boxShadow:"0 1px 8px rgba(0,0,0,.06)",...style}}>{children}</div>
  );
}

function Sheet({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:400,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"white",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
        maxHeight:"90vh",overflowY:"auto",animation:"slideUp .25s ease"}}>
        <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"12px auto 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px 8px"}}>
          <span style={{fontWeight:900,fontSize:17,color:"#1a1a1a"}}>{title}</span>
          <button onClick={onClose} style={{background:"#f0f0f0",border:"none",borderRadius:50,
            color:"#666",width:30,height:30,cursor:"pointer",fontSize:18,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"8px 20px 44px"}}>{children}</div>
      </div>
    </div>
  );
}

function OHdr({title,sub,onBack,extra}){
  return(
    <div style={{background:"#00c1fc",position:"relative",overflow:"hidden",paddingBottom:48,color:"white"}}>
      <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
        background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
      <div style={{padding:"52px 20px 0",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.2)",border:"none",
              borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>}
            <div>
              {sub&&<div style={{fontSize:11,opacity:.75,fontWeight:700,letterSpacing:".08em",marginBottom:3}}>{sub}</div>}
              <div style={{fontWeight:900,fontSize:22,letterSpacing:"-.5px"}}>{title}</div>
            </div>
          </div>
        </div>
        {extra}
      </div>
    </div>
  );
}

// Header para pantallas de alumno — soporta dark mode
function OHdrA({title,sub,extra,dark=false,onBack=null}){
  const bg=dark?"#52177f":"#00c1fc";
  // En white mode el celeste es claro, texto necesita sombra para contrastar
  const titleStyle={
    fontWeight:900,letterSpacing:"-.5px",
    color:"white",
    textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.45)",
  };
  return(
    <div style={{background:bg,position:"sticky",top:0,zIndex:50,overflow:"hidden",paddingBottom:28,color:"white",transition:"background .3s"}}>
      <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
        background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
      <div style={{padding:"22px 20px 0",position:"relative"}}>
        {onBack ? (
          <div style={{display:"flex",alignItems:"center",position:"relative",minHeight:32}}>
            <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",
              borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,
              textShadow:dark?"none":"0 1px 3px rgba(0,60,100,.4)"}}>←</button>
            <div style={{position:"absolute",left:0,right:0,textAlign:"center",
              pointerEvents:"none",...titleStyle,fontSize:20}}>
              {title}
            </div>
          </div>
        ) : (
          <div style={{...titleStyle,fontSize:22}}>{title}</div>
        )}
        {extra}
      </div>
    </div>
  );
}

function CircBtn({icon,label,onClick}){
  return(
    <div onClick={onClick} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
      <div style={{width:54,height:54,borderRadius:"50%",
        background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
        boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>
        {icon}
      </div>
      <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)"}}>{label}</span>
    </div>
  );
}

function Toast({msg,type}){
  if(!msg) return null;
  const bg=type==="error"?"#ef4444":type==="warn"?"#f59e0b":"#10b981";
  return(
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
      background:bg,color:"white",borderRadius:14,padding:"12px 20px",fontWeight:800,
      fontSize:14,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.2)",animation:"slideUp .2s ease",
      maxWidth:340,textAlign:"center"}}>{msg}</div>
  );
}

function useToast(){
  const [toast,setToast]=useState(null);
  const show=(msg,type="ok")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  };
  return [toast,show];
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  const [me,setMe]=useState(null);
  const [balance,setBalance]=useState(0);
  const [loading,setLoading]=useState(true);
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [logging,setLogging]=useState(false);

  useEffect(()=>{
    const token=localStorage.getItem("ec_token");
    if(!token){setLoading(false);return;}
    Promise.all([api.me(), api.account()])
      .then(([user,acc])=>{setMe(user);setBalance(acc.balance);})
      .catch(()=>localStorage.removeItem("ec_token"))
      .finally(()=>setLoading(false));
  },[]);

  const login=async()=>{
    if(!email||!pass){setErr("Completá email y contraseña");return;}
    setLogging(true);setErr("");
    try{
      const {token,user}=await api.login(email,pass);
      localStorage.setItem("ec_token",token);
      const acc=await api.account().catch(()=>({balance:0}));
      setMe(user);setBalance(acc.balance);
    }catch(e){
      setErr(e.message||"Email o contraseña incorrectos");
    }finally{setLogging(false);}
  };

  const logout=()=>{
    localStorage.removeItem("ec_token");
    setMe(null);setBalance(0);setEmail("");setPass("");
  };

  const refreshBalance=async()=>{
    try{const acc=await api.account();setBalance(acc.balance);}catch{}
  };

  if(loading) return(
    <div style={{minHeight:"100vh",background:"#00c1fc",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"Nunito,sans-serif"}}>
      <style>{GS}</style>
      <div style={{textAlign:"center",color:"white"}}>
        <div style={{fontSize:56,animation:"blink 1s infinite"}}>🏦</div>
        <div style={{fontWeight:900,fontSize:22,marginTop:8}}>EduCoins</div>
        <div style={{fontSize:13,opacity:.7,marginTop:4}}>Cargando...</div>
      </div>
    </div>
  );

  if(!me) return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
      fontFamily:"Nunito,sans-serif",background:"#00c1fc"}}>
      <style>{GS}</style>
      <div style={{padding:"60px 28px 40px",color:"white",position:"relative",overflow:"hidden",textAlign:"center"}}>
        <div style={{position:"absolute",width:240,height:240,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-60,pointerEvents:"none"}}/>
        <div style={{fontSize:48,marginBottom:6}}>🏦</div>
        <div style={{fontWeight:900,fontSize:30,letterSpacing:"-1px",lineHeight:1}}>Aubank</div>
        <div style={{fontSize:14,opacity:.8,marginTop:4,fontWeight:600}}>Juega, aprende y gana</div>
      </div>
      <div style={{flex:1,background:"white",borderRadius:"28px 28px 0 0",padding:"28px 24px 40px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontWeight:900,fontSize:22,color:"#1a1a1a",textAlign:"center"}}>Iniciá sesión</div>
          <Inp val={email} set={setEmail} ph="Email" type="email" icon="✉️"/>
          <Inp val={pass}  set={setPass}  ph="Contraseña" type="password" icon="🔒"/>
          {err&&<div style={{color:"#ef4444",fontSize:13,fontWeight:700,textAlign:"center"}}>{err}</div>}
          <PBtn label={logging?"Ingresando...":"Ingresar"} onClick={login} full disabled={logging}/>
        </div>
        <div style={{marginTop:24,textAlign:"center",fontSize:12,color:"#aaa",fontWeight:600}}>
          Las cuentas son creadas por el administrador del sistema.
        </div>
      </div>
    </div>
  );

  // Renderizar según rol
  if(me.rol==="student") return <Alumno me={me} balance={balance} refreshBalance={refreshBalance} logout={logout} setMe={setMe}/>;
  if(me.rol==="teacher") return <Maestra me={me} logout={logout}/>;
  if(me.rol==="admin")   return <Admin   me={me} logout={logout}/>;
  return <div>Rol desconocido</div>;
}

// ════════════════════════════════════════════════════════════
// VISTA ALUMNO
// ════════════════════════════════════════════════════════════
function Alumno({me,balance,refreshBalance,logout,setMe}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();
  const [camOpen,setCamOpen]=useState(false);
  const [dark,setDark]=useState(false);

  // Paleta según modo
  const navBg    = dark?"#1e1b2e":"white";
  const navBord  = dark?"#2d2a45":"#EFEFEF";
  const navActiv = dark?"#52177f":"#00c1fc";
  const navInact = dark?"#555":"#777777";
  const navPill  = dark?"#2d2a45":"#FFF0F0";
  const camBg    = dark?"#52177f":"#00c1fc";
  const camBord  = dark?"#1e1b2e":"#F0F0F0";
  const pageBg   = dark?"#12101e":"#F0F0F0";

  const hideNav = ["chat","noticias","votaciones","reportes"].includes(tab);

  return(
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:pageBg,
      display:"flex",flexDirection:"column",fontFamily:"Nunito,sans-serif",
      transition:"background .3s",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      {/* Contenido scrolleable — el header de cada pantalla queda fijo dentro */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:hideNav?0:90,
        animation:"fadeIn .18s ease"}}>
        {tab==="home"       && <AHome       me={me} balance={balance} onNav={setTab} dark={dark} setDark={setDark}/>}
        {tab==="misiones"   && <AMisiones   me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance} dark={dark}/>}
        {tab==="tienda"     && <ATienda     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance} dark={dark}/>}
        {tab==="enviar"     && <AEnviar     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance} dark={dark}/>}
        {tab==="movimientos"&& <AMovimientos dark={dark}/>}
        {tab==="perfil"     && <APerfil     me={me} balance={balance} logout={logout} showToast={showToast} setMe={setMe} dark={dark}/>}
        {tab==="ranking"    && <ARanking    dark={dark}/>}
        {tab==="opciones"   && <AOpciones   me={me} logout={logout} dark={dark}/>}
        {tab==="chat"       && <AChat       me={me} dark={dark} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="noticias"   && <ANoticias   me={me} dark={dark} onBack={()=>setTab("home")}/>}
        {tab==="votaciones" && <AVotaciones me={me} dark={dark} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="reportes"   && <AReportes   me={me} dark={dark} showToast={showToast} onBack={()=>setTab("home")}/>}
      </div>

      {/* Cámara QR sheet */}
      {camOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:400,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setCamOpen(false);}}>
          <div style={{background:dark?"#1e1b2e":"white",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
            padding:"20px 24px 44px",animation:"slideUp .25s ease"}}>
            <div style={{width:36,height:4,background:dark?"#555":"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:64,marginBottom:12}}>📷</div>
              <div style={{fontWeight:900,fontSize:18,color:dark?"#e0e0e0":"#1a1a1a",marginBottom:6}}>Escáner QR</div>
              <div style={{fontSize:13,color:"#555",marginBottom:24}}>Apuntá la cámara a un código QR</div>
              <div style={{width:180,height:180,margin:"0 auto",borderRadius:20,
                border:`3px solid ${camBg}`,display:"flex",alignItems:"center",
                justifyContent:"center",background:dark?"#2d2a45":"#FFF0F0",fontSize:56}}>🔍</div>
              <div style={{marginTop:16,fontSize:12,color:"#bbb"}}>Disponible en versión móvil</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav — oculto en accesos directos */}
      {!hideNav&&(
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,zIndex:100}}>
        {/* Botón cámara flotante — bien abajo, más grande */}
        <div style={{position:"absolute",top:-20,left:"50%",transform:"translateX(-50%)",zIndex:101}}>
          <button onClick={()=>setCamOpen(true)} style={{
            width:68,height:68,borderRadius:"50%",background:camBg,
            border:`4px solid ${camBord}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:28,cursor:"pointer",
            boxShadow:dark?"0 4px 20px rgba(82,23,127,.6)":"0 4px 20px rgba(0,193,252,.5)",
            outline:"none",transition:"background .3s"}}>
            📷
          </button>
        </div>
        <div style={{background:navBg,borderTop:`1px solid ${navBord}`,
          padding:"6px 4px 14px",display:"flex",justifyContent:"space-around",
          boxShadow:"0 -2px 16px rgba(0,0,0,.12)",transition:"background .3s"}}>
          {[
            {id:"home",       icon:"🏠", label:"Inicio"},
            {id:"tienda",     icon:"🛒", label:"Tienda"},
            {id:"_cam",       isCam:true},
            {id:"movimientos",icon:"📊", label:"Movimientos"},
            {id:"opciones",   icon:"☰",  label:"Opciones"},
          ].map(item=>{
            if(item.isCam) return <div key="_cam" style={{width:68,flexShrink:0}}/>;
            const on=tab===item.id;
            return(
              <button key={item.id} onClick={()=>setTab(item.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
                background:"none",border:"none",cursor:"pointer",
                color:on?navActiv:navInact,fontFamily:"Nunito,sans-serif",padding:"3px 6px",
                transition:"color .3s"}}>
                <div style={{width:36,height:30,borderRadius:10,
                  background:on?navPill:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s"}}>
                  <span style={{fontSize:19}}>{item.icon}</span>
                </div>
                <span style={{fontSize:9,fontWeight:800}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function AOpciones({me,logout,dark=false}){
  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";
  const sub=dark?"#888":"#555";
  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="☰ Opciones" dark={dark}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {[
          ["🔔","Notificaciones","Próximamente","#f59e0b"],
          ["❓","Ayuda","¿Cómo funciona Aubank?","#3b82f6"],
          ["⚙️","Configuración","Ajustes de la cuenta","#94a3b8"],
        ].map(([ic,lb,ds,col])=>(
          <div key={lb} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
            cursor:"pointer",marginBottom:8,background:cardBg,borderRadius:20,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",transition:"background .3s"}}>
            <div style={{width:46,height:46,borderRadius:14,background:col+"22",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ic}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:txt,transition:"color .3s"}}>{lb}</div>
              <div style={{fontSize:12,color:sub,marginTop:1,transition:"color .3s"}}>{ds}</div>
            </div>
            <span style={{color:dark?"#555":"#ddd",fontSize:18}}>›</span>
          </div>
        ))}
        <div style={{marginTop:8}}>
          <button onClick={logout} style={{width:"100%",background:cardBg,
            border:`1.5px solid ${dark?"#2d2a45":"#E8E8E8"}`,borderRadius:50,color:dark?"#aaa":"#888",
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"all .3s"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function AHome({me,balance,onNav,dark,setDark}){
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;

  const headerBg = dark?"#52177f":"#00c1fc";   // violeta oscuro en dark
  const cardBg   = dark?"#1e1b2e":"white";
  const txt      = dark?"#e0e0e0":"#1a1a1a";
  const sub      = dark?"#888":"#555";
  const arrow    = dark?"#555":"#ddd";

  return(
    <div style={{minHeight:"100vh",transition:"background .3s"}}>
      <div style={{background:headerBg,position:"sticky",top:0,zIndex:50,overflow:"hidden",paddingBottom:20,color:"white",transition:"background .3s",
        textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.4)"}}>  {/* contraste en celeste */}
        <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-80,right:-70,pointerEvents:"none"}}/>
        <div style={{padding:"22px 20px 0",position:"relative"}}>

          {/* Fila superior: avatar+nombre izq, switch der */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button onClick={()=>onNav("perfil")} style={{display:"flex",alignItems:"center",gap:10,
              background:"none",border:"none",cursor:"pointer",padding:0,color:"white"}}>
              <Av user={me} sz={44}/>
              <div style={{fontWeight:900,fontSize:17,lineHeight:1.1}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
            </button>
            <button onClick={()=>setDark(d=>!d)} style={{
              display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.18)",
              border:"1.5px solid rgba(255,255,255,.3)",borderRadius:50,padding:"6px 12px",
              cursor:"pointer",color:"white",fontSize:12,fontWeight:800,fontFamily:"Nunito,sans-serif"}}>
              {dark?"☀️ White":"🌙 Dark"}
            </button>
          </div>

          {/* Caja de ahorro */}
          <div style={{background:"rgba(255,255,255,.18)",borderRadius:22,padding:"16px 20px 14px",
            border:"1.5px solid rgba(255,255,255,.25)",marginBottom:18}}>
            <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:".1em",marginBottom:4}}>CAJA DE AHORRO</div>
            <div style={{fontWeight:900,fontSize:38,letterSpacing:"-1.5px",lineHeight:1}}>
              🪙 {balance.toLocaleString("es-AR")}
            </div>
            <div style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,opacity:.8,fontWeight:700,marginBottom:4}}>
                <span>{lv.icon} {lv.name}</span>
                {next?<span>→ {next.icon} {next.name} en {next.min-(me.total_earned||0)} XP</span>
                     :<span>👑 Nivel máximo</span>}
              </div>
              <div style={{background:"rgba(0,0,0,.2)",borderRadius:99,height:6}}>
                <div style={{width:prog+"%",height:"100%",background:"white",borderRadius:99,transition:"width .8s ease"}}/>
              </div>
            </div>
          </div>

          {/* 5 botones acción */}
          <div style={{display:"flex",justifyContent:"space-around",paddingBottom:4}}>
            <CircBtn icon="💸" label="Enviar"   onClick={()=>onNav("enviar")}/>
            <CircBtn icon="⬇️" label="Ingresar" onClick={()=>onNav("movimientos")}/>
            <CircBtn icon="💰" label="Cobrar"   onClick={()=>onNav("movimientos")}/>
            <CircBtn icon="⚡" label="Misiones" onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"  onClick={()=>onNav("ranking")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div style={{padding:"14px 14px 8px",background:dark?"#12101e":"#F5F5F5",minHeight:"60vh",transition:"background .3s"}}>
        <div style={{fontWeight:900,color:txt,fontSize:15,marginBottom:10,transition:"color .3s"}}>Accesos rápidos</div>
        {[
          ["💬","Chat",      "Personal · Aula · Global",  "#3b82f6","chat"],
          ["📰","Noticias",  "Novedades de la escuela",   "#10b981","noticias"],
          ["🗳️","Votaciones","Participá en encuestas",    "#8b5cf6","votaciones"],
          ["🚩","Reportes",  "Enviá un reporte",          "#f59e0b","reportes"],
        ].map(([ic,lb,sb,col,dest])=>(
          <div key={lb} onClick={()=>onNav(dest)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",
              marginBottom:8,background:dark?"rgb(69,50,125)":"rgba(35,255,255,0.3)",borderRadius:20,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              transition:"background .3s"}}>
            <div style={{width:46,height:46,borderRadius:14,background:col+"22",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ic}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:txt,transition:"color .3s"}}>{lb}</div>
              <div style={{fontSize:12,color:sub,marginTop:1,transition:"color .3s"}}>{sb}</div>
            </div>
            <span style={{color:arrow,fontSize:18,transition:"color .3s"}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AMisiones({me,balance,showToast,refreshBalance,dark=false}){
  const [missions,setMissions]=useState([]);
  const [mySubmissions,setMySubmissions]=useState([]);
  const [loading,setLoading]=useState(true);
  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";

  useEffect(()=>{
    Promise.all([api.missions(), api.allSubmissions().catch(()=>[])])
      .then(([ms, subs])=>{
        setMissions(ms);
        setMySubmissions(subs.filter?.(s=>s.student_id===me.id)||[]);
      })
      .finally(()=>setLoading(false));
  },[]);

  const submit=async(missionId)=>{
    try{
      await api.submitMission(missionId);
      showToast("¡Misión entregada! Esperá la aprobación 📬");
      const subs=await api.allSubmissions().catch(()=>[]);
      setMySubmissions(subs.filter?.(s=>s.student_id===me.id)||[]);
    }catch(e){
      showToast(e.message||"Error al entregar","error");
    }
  };

  const getSubState=(missionId)=>mySubmissions.find(s=>s.mission_id===missionId);

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando misiones...</div>;

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Misiones ⚡" dark={dark}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center"}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin misiones disponibles</div>
          </div>
        )}
        {missions.map(m=>{
          const sub=getSubState(m.id);
          const estado=sub?.estado;
          return(
            <div key={m.id} style={{marginBottom:10,background:cardBg,borderRadius:20,padding:16,
              borderLeft:`4px solid ${DIFCOL[m.dificultad]||"#ddd"}`,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",transition:"background .3s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
                    {estado&&<Pill text={estado==="aprobada"?"✅ Aprobada":estado==="rechazada"?"❌ Rechazada":"⏳ Pendiente"}
                      col={estado==="aprobada"?"#10b981":estado==="rechazada"?"#ef4444":"#f59e0b"}/>}
                  </div>
                  <div style={{fontWeight:800,fontSize:15,color:txt}}>{m.titulo}</div>
                  {m.descripcion&&<div style={{fontSize:12,color:dark?"#888":"#888",marginTop:2}}>{m.descripcion}</div>}
                  <div style={{marginTop:8,fontWeight:800,color:dark?"#c084fc":"#00c1fc",fontSize:14}}>🪙 {m.recompensa}</div>
                </div>
                {!estado&&(
                  <PBtn label="Entregar" sm onClick={()=>submit(m.id)} color={dark?"#52177f":"#10b981"}/>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ATienda({me,balance,showToast,refreshBalance,dark=false}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(null);
  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";
  const subTxt=dark?"#888":"#666";

  useEffect(()=>{
    api.storeItems().then(setItems).finally(()=>setLoading(false));
  },[]);

  const buy=async(item)=>{
    if(balance<item.precio){showToast("No tenés saldo suficiente 😔","error");return;}
    setBuying(item.id);
    try{
      await api.purchase(item.id);
      showToast(`¡Compraste "${item.nombre}"! 🎉`);
      await refreshBalance();
      const updated=await api.storeItems();
      setItems(updated);
    }catch(e){
      showToast(e.message||"Error al comprar","error");
    }finally{setBuying(null);}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando tienda...</div>;

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Tienda 🛒" dark={dark}
        extra={<div style={{marginTop:10,fontSize:13,opacity:.9,fontWeight:700}}>
          Tu saldo: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {items.map(item=>{
            const canBuy=balance>=item.precio;
            const sinStock=item.stock===0;
            return(
              <div key={item.id} style={{padding:"14px 12px",opacity:sinStock?.5:1,background:cardBg,
                borderRadius:20,boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                transition:"background .3s"}}>
                <div style={{fontSize:36,marginBottom:8}}>{item.icon||"🎁"}</div>
                <div style={{fontWeight:800,fontSize:13,color:txt,lineHeight:1.2}}>{item.nombre}</div>
                <div style={{fontSize:11,color:subTxt,margin:"4px 0 10px",minHeight:26}}>{item.descripcion}</div>
                <div style={{fontWeight:900,color:dark?"#c084fc":"#00c1fc",fontSize:13,marginBottom:8}}>🪙 {item.precio}</div>
                {item.stock!==-1&&<div style={{fontSize:10,color:dark?"#555":"#ccc",fontWeight:700,marginBottom:6}}>Stock: {item.stock}</div>}
                <PBtn label={sinStock?"Sin stock":buying===item.id?"...":"Comprar"} sm full
                  disabled={!canBuy||sinStock||buying===item.id}
                  onClick={()=>buy(item)} color={dark?"#52177f":"#00c1fc"}/>
              </div>
            );
          })}
        </div>
        {items.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Tienda vacía</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AEnviar({me,balance,showToast,refreshBalance,dark=false}){
  const [friends,setFriends]   = useState([]);
  const [search,setSearch]     = useState("");
  const [results,setResults]   = useState([]);
  const [searching,setSearching]= useState(false);
  const [selected,setSelected] = useState(null);
  const [amount,setAmount]     = useState("");
  const [sending,setSending]   = useState(false);
  const [tab,setTab]           = useState("amigos"); // "amigos" | "buscar" | "manual"
  const [manualId,setManualId] = useState("");
  const debounceRef            = useRef(null);

  const cardBg = dark?"#1e1b2e":"white";
  const txt    = dark?"#e0e0e0":"#1a1a1a";
  const sub    = dark?"#888":"#555";
  const accent = dark?"#c084fc":"#00c1fc";
  const inputBg= dark?"#2d2a45":"#F7F7F7";
  const inputBd= dark?"#3d3a55":"#E8E8E8";

  useEffect(()=>{
    api.chatFriends()
      .then(d=>{
        const all = d.data||d||[];
        setFriends(all.filter(f=>f.estado==='accepted'));
      }).catch(()=>{});
  },[]);

  // Búsqueda con debounce
  useEffect(()=>{
    if(tab!=="buscar") return;
    clearTimeout(debounceRef.current);
    if(search.trim().length<2){setResults([]);return;}
    debounceRef.current = setTimeout(async()=>{
      setSearching(true);
      try{
        const d = await api.chatSearch(search.trim());
        setResults(d.data||d||[]);
      }catch(e){}
      finally{setSearching(false);}
    }, 400);
  },[search,tab]);

  const selectUser = (u) => {
    setSelected({id: u.user_id||u.id, nombre: u.nombre, skin: u.skin, border: u.border});
    setAmount("");
  };

  const send = async() => {
    let toId = selected?.id;
    if(tab==="manual"){
      toId = manualId.trim();
      if(!toId){showToast("Ingresá un ID válido","error");return;}
    }
    const amt = parseInt(amount);
    if(!toId||!amt||amt<=0){showToast("Completá destinatario y monto","error");return;}
    if(amt>balance){showToast("Saldo insuficiente","error");return;}
    setSending(true);
    try{
      await api.transfer(toId, amt);
      showToast(`¡Enviaste 🪙${amt.toLocaleString("es-AR")}! 🎉`);
      await refreshBalance();
      setSelected(null);setAmount("");setManualId("");
    }catch(e){
      showToast(e.message||"Error al transferir","error");
    }finally{setSending(false);}
  };

  const TABS=[["amigos","👥 Amigos"],["buscar","🔍 Buscar"],["manual","✏️ Manual"]];

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Enviar 💸" dark={dark}
        extra={<div style={{marginTop:6,fontSize:13,opacity:.9,fontWeight:700}}>
          Saldo disponible: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>{setTab(id);setSelected(null);setSearch("");setResults([]);}}
            style={{flex:1,padding:"11px 4px",background:"none",border:"none",
              fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:tab===id?accent:sub,
              borderBottom:`2.5px solid ${tab===id?accent:"transparent"}`,
              transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* TAB AMIGOS */}
        {tab==="amigos"&&(
          <div>
            {friends.length===0&&(
              <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
                <div style={{fontSize:36,marginBottom:8}}>👥</div>
                <div style={{fontWeight:800,color:txt,marginBottom:4}}>Sin amigos agregados</div>
                <div style={{fontSize:12,color:sub}}>Andá a Chat → buscá compañeros para agregarlos</div>
              </div>
            )}
            {friends.map(f=>(
              <div key={f.friendship_id} onClick={()=>selectUser(f)}
                style={{background:selected?.id===f.user_id?dark?"rgb(69,50,125)":"rgba(35,255,255,0.3)":cardBg,
                  borderRadius:16,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12,
                  border:`1.5px solid ${selected?.id===f.user_id?accent:"transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s"}}>
                <Av user={f} sz={42}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{f.nombre}</div>
                  <div style={{fontSize:11,color:sub,marginTop:1}}>
                    {f.rol==="teacher"?"👩‍🏫 Docente":"👨‍🎓 Alumno"}
                  </div>
                </div>
                {selected?.id===f.user_id&&(
                  <span style={{color:accent,fontSize:20}}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB BUSCAR */}
        {tab==="buscar"&&(
          <div>
            <div style={{background:cardBg,borderRadius:16,padding:"10px 14px",marginBottom:10,
              display:"flex",alignItems:"center",gap:8,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <span style={{fontSize:16}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                style={{flex:1,background:"none",border:"none",outline:"none",
                  fontSize:14,color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
              {searching&&<span style={{fontSize:12,color:sub}}>...</span>}
            </div>
            {results.map(u=>(
              <div key={u.id} onClick={()=>selectUser(u)}
                style={{background:selected?.id===u.id?dark?"rgb(69,50,125)":"rgba(35,255,255,0.3)":cardBg,
                  borderRadius:16,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12,
                  border:`1.5px solid ${selected?.id===u.id?accent:"transparent"}`,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                  transition:"all .15s"}}>
                <Av user={u} sz={42}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{u.nombre}</div>
                  <div style={{fontSize:11,color:sub}}>
                    {u.friendship_estado==="accepted"?"✓ Ya son amigos":
                     u.friendship_estado==="pending"?"⏳ Solicitud pendiente":
                     u.rol==="teacher"?"👩‍🏫 Docente":"👨‍🎓 Alumno"}
                  </div>
                </div>
                {selected?.id===u.id&&<span style={{color:accent,fontSize:20}}>✓</span>}
              </div>
            ))}
            {search.length>=2&&results.length===0&&!searching&&(
              <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>Sin resultados para "{search}"</div>
            )}
          </div>
        )}

        {/* TAB MANUAL */}
        {tab==="manual"&&(
          <div style={{background:cardBg,borderRadius:20,padding:16,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,color:txt,marginBottom:4}}>ID del destinatario</div>
            <div style={{fontSize:11,color:sub,marginBottom:10}}>
              Pedile a tu compañero su ID desde la pantalla "Ingresar"
            </div>
            <input value={manualId} onChange={e=>setManualId(e.target.value)}
              placeholder="Pegá el ID aquí..."
              style={{width:"100%",boxSizing:"border-box",background:inputBg,
                border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"11px 14px",
                fontSize:13,outline:"none",color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600,
                marginBottom:0}}/>
          </div>
        )}

        {/* Monto + confirmar — aparece cuando hay destinatario seleccionado o manual */}
        {(selected||(tab==="manual"&&manualId.trim()))&&(
          <div style={{background:cardBg,borderRadius:20,padding:16,marginTop:10,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            {selected&&(
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,
                padding:"10px 12px",background:dark?"rgba(255,255,255,.05)":"#f7f7f7",borderRadius:12}}>
                <Av user={selected} sz={36}/>
                <div>
                  <div style={{fontSize:11,color:sub,fontWeight:700}}>Enviando a</div>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{selected.nombre}</div>
                </div>
              </div>
            )}
            <div style={{fontWeight:800,color:txt,marginBottom:8}}>¿Cuántas monedas?</div>
            <div style={{background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:14,
              display:"flex",alignItems:"center",padding:"4px 14px",marginBottom:12}}>
              <span style={{fontSize:20,marginRight:8}}>🪙</span>
              <input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/,""))}
                placeholder="0" type="number" min="1"
                style={{flex:1,background:"none",border:"none",outline:"none",fontSize:22,
                  fontWeight:900,color:accent,fontFamily:"Nunito,sans-serif"}}/>
            </div>
            {/* Atajos de monto */}
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[10,50,100,500].map(n=>(
                <button key={n} onClick={()=>setAmount(String(n))}
                  style={{flex:1,background:amount===String(n)?accent:"transparent",
                    color:amount===String(n)?"white":accent,
                    border:`1.5px solid ${accent}`,borderRadius:99,
                    padding:"5px",fontSize:12,fontWeight:800,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={sending||!amount||parseInt(amount)<=0}
              style={{width:"100%",background:sending?"#ccc":accent,border:"none",
                borderRadius:50,color:"white",padding:"13px",fontWeight:900,fontSize:15,
                cursor:sending?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif",
                boxShadow:sending?"none":`0 4px 16px ${accent}55`}}>
              {sending?"Enviando...":"Confirmar envío 💸"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AMovimientos({dark=false}){
  const [txs,setTxs]       = useState([]);
  const [loading,setLoading]= useState(true);
  const [search,setSearch]  = useState("");
  const cardBg = dark?"#1e1b2e":"white";
  const txt    = dark?"#e0e0e0":"#1a1a1a";
  const sub    = dark?"#888":"#666";
  const accent = dark?"#c084fc":"#00c1fc";

  useEffect(()=>{ api.transactions().then(setTxs).finally(()=>setLoading(false)); },[]);

  const TX_META = {
    reward:    { icon:"⚡", label:"Misión completada",   color:"#10b981" },
    transfer:  { icon:"💸", label:"Transferencia",        color:"#3b82f6" },
    purchase:  { icon:"🛒", label:"Compra en tienda",     color:"#f59e0b" },
    mint:      { icon:"🏦", label:"Acreditación",         color:"#10b981" },
    burn:      { icon:"🔥", label:"Débito",               color:"#ef4444" },
    adjustment:{ icon:"⚙️", label:"Ajuste",               color:"#8b5cf6" },
  };

  // Filtrar por búsqueda
  const filtered = txs.filter(t =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por fecha — solo fechas con movimientos
  const grupos = {};
  filtered.forEach(t => {
    const fecha = new Date(t.created_at).toLocaleDateString("es-AR",{
      weekday:"long", day:"numeric", month:"long"
    });
    const fechaKey = new Date(t.created_at).toDateString();
    if (!grupos[fechaKey]) grupos[fechaKey] = { label: fecha, items: [] };
    grupos[fechaKey].items.push(t);
  });

  if(loading) return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:sub}}>
        <div style={{fontSize:32,marginBottom:8}}>⏳</div>
        <div style={{fontWeight:700}}>Cargando movimientos...</div>
      </div>
    </div>
  );

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Movimientos 📊" dark={dark}/>

      {/* Buscador sticky */}
      <div style={{position:"sticky",top:0,zIndex:40,background:dark?"#12101e":"#F0F0F0",
        padding:"10px 14px 6px"}}>
        <div style={{background:cardBg,borderRadius:14,padding:"9px 14px",
          display:"flex",alignItems:"center",gap:8,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <span style={{fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar movimiento..."
            style={{flex:1,background:"none",border:"none",outline:"none",
              fontSize:13,color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",
            color:sub,cursor:"pointer",fontSize:16,padding:0}}>✕</button>}
        </div>
      </div>

      <div style={{padding:"4px 14px 16px"}}>
        {filtered.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",marginTop:8}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>
              {search?"Sin resultados":"Sin movimientos aún"}
            </div>
          </div>
        )}

        {Object.entries(grupos).map(([key,grupo])=>(
          <div key={key}>
            {/* Separador de fecha */}
            <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 8px"}}>
              <div style={{flex:1,height:1,background:dark?"#2d2a45":"#e8e8e8"}}/>
              <span style={{fontSize:11,fontWeight:800,color:sub,textTransform:"capitalize",
                whiteSpace:"nowrap"}}>
                {grupo.label}
              </span>
              <div style={{flex:1,height:1,background:dark?"#2d2a45":"#e8e8e8"}}/>
            </div>

            {/* Movimientos del día en una card */}
            <div style={{background:cardBg,borderRadius:20,overflow:"hidden",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              {grupo.items.map((t,i)=>{
                const meta = TX_META[t.type] || { icon:"•", label:t.type, color:"#94a3b8" };
                const isPos = t.amount > 0;
                return(
                  <div key={t.id||i} style={{
                    display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                    borderBottom:i<grupo.items.length-1?`1px solid ${dark?"#2d2a45":"#f0f0f0"}`:"none"}}>
                    {/* Icono */}
                    <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,
                      background:isPos?dark?"#052e16":"#f0fdf4":dark?"#2d0a0a":"#fef2f2",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>
                      {meta.icon}
                    </div>
                    {/* Descripción */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:txt,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.description||meta.label}
                      </div>
                      <div style={{fontSize:11,color:sub,marginTop:1}}>
                        {new Date(t.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                      </div>
                    </div>
                    {/* Monto */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:900,fontSize:15,
                        color:isPos?"#10b981":"#ef4444"}}>
                        {isPos?"+":""}{t.amount.toLocaleString("es-AR")} 🪙
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ARanking({dark=false}){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";

  useEffect(()=>{
    api.ranking().then(setUsers).finally(()=>setLoading(false));
  },[]);

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando ranking...</div>;

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Ranking 🏆" dark={dark}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {users.map((u,i)=>{
          const lv=getLv(u.total_earned||0);
          const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
          return(
            <div key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
              background:cardBg,borderRadius:20,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",transition:"background .3s"}}>
              <div style={{width:28,textAlign:"center",fontWeight:900,fontSize:16,color:txt,flexShrink:0}}>
                {medal||`#${i+1}`}
              </div>
              <Av user={u} sz={42}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:txt}}>{u.nombre}</div>
                <Pill text={lv.icon+" "+lv.name} col={lv.color}/>
              </div>
              <div style={{fontWeight:900,color:dark?"#c084fc":"#00c1fc",fontSize:14}}>🪙 {(u.total_earned||0).toLocaleString("es-AR")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function APerfil({me,balance,logout,showToast,setMe,dark=false}){
  const uS=me.unlocked_skins||["s1"];
  const uB=me.unlocked_borders||["b1"];
  const uT=me.unlocked_titles||["tl1"];
  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";
  const accent=dark?"#c084fc":"#00c1fc";

  const equip=async(type,item_id)=>{
    try{
      await api.equip(type,item_id);
      const updated=await api.me();
      setMe(updated);
      showToast("¡Equipado! ✨");
    }catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Mi Perfil 👤" dark={dark}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",marginBottom:12,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <Av user={me} sz={72}/>
          </div>
          <div style={{fontWeight:900,fontSize:20,color:txt}}>{me.nombre}</div>
          <div style={{fontSize:13,color:dark?"#888":"#666",marginBottom:8}}>{me.email}</div>
          <div style={{fontWeight:800,color:accent,fontSize:16}}>🪙 {balance.toLocaleString("es-AR")}</div>
        </div>

        <div style={{fontWeight:800,color:txt,marginBottom:8,marginTop:4}}>🎨 Skins</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {SKINS.map(s=>{
            const owned=uS.includes(s.id);
            const equipped=me.skin===s.id;
            return(
              <div key={s.id} onClick={()=>{if(owned)equip("skin",s.id);}}
                style={{background:equipped?s.bg:cardBg,border:`2px solid ${equipped?"#FFB800":owned?dark?"#2d2a45":"#E8E8E8":dark?"#1e1b2e":"#F0F0F0"}`,
                  borderRadius:16,padding:"12px 6px",textAlign:"center",cursor:owned?"pointer":"default",
                  opacity:!owned?.4:1,transition:"all .2s",position:"relative"}}>
                {equipped&&<div style={{position:"absolute",top:4,right:5,fontSize:10}}>✅</div>}
                <div style={{fontSize:28,marginBottom:4}}>{s.emoji}</div>
                <div style={{fontSize:10,fontWeight:800,color:equipped?"white":txt}}>{s.name}</div>
                {!owned&&<div style={{fontSize:9,color:accent,fontWeight:800,marginTop:2}}>🪙{s.price}</div>}
              </div>
            );
          })}
        </div>

        <div style={{fontWeight:800,color:txt,marginBottom:8}}>📛 Títulos</div>
        {TITLES.map(t=>{
          const owned=uT.includes(t.id);
          const equipped=me.title===t.id;
          return(
            <div key={t.id} onClick={()=>{if(owned)equip("title",t.id);}}
              style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"14px 16px",borderRadius:20,cursor:owned?"pointer":"default",
                background:equipped?dark?"#2d1a4e":cardBg:cardBg,
                border:`1.5px solid ${equipped?accent:dark?"#2d2a45":"#E8E8E8"}`,
                opacity:!owned?.4:1,boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:txt}}>{t.name}</div>
                {!owned&&t.price>0&&<div style={{fontSize:12,color:accent,fontWeight:800}}>🪙{t.price}</div>}
                {owned&&<div style={{fontSize:12,color:equipped?accent:"#10b981",fontWeight:800}}>
                  {equipped?"✅ Activo":"Tocar para activar"}
                </div>}
              </div>
              {equipped&&<span style={{fontSize:20}}>✅</span>}
            </div>
          );
        })}

        <div style={{marginTop:16}}>
          <button onClick={logout} style={{width:"100%",background:cardBg,
            border:`1.5px solid ${dark?"#2d2a45":"#E8E8E8"}`,borderRadius:50,color:dark?"#aaa":"#888",
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"all .3s"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// NUEVAS SECCIONES — Chat, Noticias, Votaciones, Reportes
// ════════════════════════════════════════════════════════════

// ── CHAT ──────────────────────────────────────────────────────
const CHAT_SECTIONS = ["Personal","Aula","Global"];

function useChatSocket(token, onMessage, onTyping) {
  const socketRef  = useRef(null);
  const onMsgRef   = useRef(onMessage);
  const onTypRef   = useRef(onTyping);

  // Mantener las refs actualizadas sin re-subscribir
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypRef.current = onTyping;  }, [onTyping]);

  useEffect(() => {
    const s = connectSocket(token);
    socketRef.current = s;

    const handleMsg    = (m) => onMsgRef.current(m);
    const handleTyping = (d) => onTypRef.current(d);

    s.on('new_message',  handleMsg);
    s.on('user_typing',  handleTyping);

    // Unirse a rooms cuando el socket esté listo
    if (s.connected) {
      s.emit('join_global');
      s.emit('join_classroom');
    } else {
      s.once('connect', () => {
        s.emit('join_global');
        s.emit('join_classroom');
      });
    }

    return () => {
      s.off('new_message',  handleMsg);
      s.off('user_typing',  handleTyping);
    };
  }, [token]); // solo se ejecuta una vez por token

  return socketRef;
}

function AChat({me, dark, showToast, onBack}){
  const [sec, setSec]           = useState(0);
  const [friend, setFriend]     = useState(null);  // {id, nombre, skin, border, friendship_id}
  const [friends, setFriends]   = useState([]);
  const [pendientes, setPend]   = useState([]);
  const [classInfo, setClass]   = useState(null);
  const [globalMsgs, setGlobal] = useState([]);
  const globalConvIdRef = useRef(null);
  const classConvIdRef  = useRef(null); // ref para aula
  const personalConvIdRef = useRef(null); // ref para chat personal
  const [classMsgs,  setClass_] = useState([]);
  const [personMsgs, setPerson] = useState([]);
  const [convId, setConvId]     = useState(null);
  const [msg, setMsg]           = useState("");
  const [typing, setTyping]     = useState(null);
  const [search, setSearch]     = useState("");
  const [results, setResults]   = useState([]);
  const [addOpen, setAddOpen]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef               = useRef(null);
  const typingTimer             = useRef(null);
  const token                   = localStorage.getItem("ec_token");

  const cardBg   = dark?"#1e1b2e":"white";
  const txt      = dark?"#e0e0e0":"#1a1a1a";
  const sub      = dark?"#888":"#555";
  const bg       = dark?"#12101e":"#F5F5F5";
  const accent   = dark?"#c084fc":"#00c1fc";
  const inputBg  = dark?"#2d2a45":"#F7F7F7";
  const inputBord= dark?"#3d3a55":"#E8E8E8";

  // WebSocket — onMessage SIN dependencias, solo usa refs
  const onMessage = useCallback((m) => {
    if (!m?.conversation_id) return;
    if (globalConvIdRef.current === m.conversation_id) {
      setGlobal(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    } else if (classConvIdRef.current === m.conversation_id) {
      setClass_(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    } else if (personalConvIdRef.current === m.conversation_id) {
      setPerson(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    }
  }, []); // sin dependencias — nunca se re-registra

  const onTyping = useCallback(({nombre, conversation_id}) => {
    setTyping(nombre);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(null), 2000);
  }, []);

  const socketRef = useChatSocket(token, onMessage, onTyping);

  // Cargar datos iniciales
  useEffect(() => {
    Promise.all([
      api.chatFriends().catch(()=>({data:[]})),
      api.chatClassroomInfo().catch(()=>({data:null})),
      api.chatGlobalMsgs().catch(()=>({data:[]})),
    ]).then(([fr, cl, gl]) => {
      const all = fr.data || fr || [];
      setFriends(all.filter(f=>f.estado==='accepted'));
      setPend(all.filter(f=>f.estado==='pending' && !f.soy_requester));
      setClass(cl.data || cl);
      if ((cl.data||cl)?.conversation_id) classConvIdRef.current = (cl.data||cl).conversation_id;
      const gMsgs = (gl.data || gl || []);
      setGlobal(gMsgs);
      setLoading(false);
    });
    // Obtener el conversation_id del global por separado (funciona aunque no haya mensajes)
    api.chatGlobalInfo().then(d => {
      const cid = d.conversation_id || d.data?.conversation_id;
      if (cid) globalConvIdRef.current = cid;
    }).catch(()=>{});
  }, []);

  // Cargar mensajes del aula cuando se selecciona esa tab
  useEffect(() => {
    if (sec === 1 && classInfo && classMsgs.length === 0) {
      api.chatClassroomMsgs().then(d => {
        setClass_((d.data||d||[]).map(m=>({...m,conversation_id:classInfo.conversation_id})));
        const s = getSocket();
        if (s) s.emit('join_classroom');
      }).catch(()=>{});
    }
  }, [sec, classInfo]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [globalMsgs, classMsgs, personMsgs, sec, friend]);

  // Abrir chat personal con un amigo
  const openFriend = async (f) => {
    setFriend(f);
    setPerson([]);
    setConvId(null);
    try {
      const d = await api.chatPersonalMsgs(f.user_id);
      const data = d.data || d;
      // El backend devuelve { messages: [...], conversation_id: "..." }
      const msgs = data.messages || (Array.isArray(data) ? data : []);
      const cid  = data.conversation_id || msgs[0]?.conversation_id || null;
      setPerson(msgs);
      setConvId(cid);
      if (cid) {
        personalConvIdRef.current = cid;
        const s = getSocket();
        if (s) s.emit('join_personal', cid);
      }
    } catch(e) {
      showToast("Error al cargar el chat","error");
      console.error("openFriend error:", e);
    }
  };

  const sendMsg = () => {
    const s = getSocket();
    const textoClean = msg.trim();
    if (!textoClean) return;

    let type, conversation_id;
    if (friend) {
      type = 'personal';
      conversation_id = convId;
    } else if (sec === 1) {
      type = 'classroom';
      conversation_id = classInfo?.conversation_id;
    } else {
      type = 'global';
      conversation_id = globalConvIdRef.current ||
        globalMsgs.find(m => m.conversation_id)?.conversation_id;
    }

    if (!conversation_id) {
      showToast("No se pudo obtener la conversacion","error");
      return;
    }

    if (s) {
      s.emit('send_message', { conversation_id, texto: textoClean, type });
    }
    setMsg("");
  };

  const emitTyping = () => {
    const s = getSocket();
    if (!s) return;
    let type = friend ? 'personal' : sec===1 ? 'classroom' : 'global';
    let cid  = friend ? convId : sec===1 ? classInfo?.conversation_id : null;
    s.emit('typing', { conversation_id: cid, type });
  };

  // Buscar usuarios para agregar
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api.chatSearch(search).then(d=>setResults(d.data||d||[])).catch(()=>[]);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const sendFriendReq = async (userId) => {
    try {
      await api.chatFriendReq(userId);
      showToast("Solicitud enviada 📨");
      setResults(prev => prev.map(u => u.id===userId ? {...u, friendship_estado:'pending'} : u));
    } catch(e) {
      showToast(e.message||"Error al enviar solicitud","error");
    }
  };

  const acceptFriend = async (friendshipId) => {
    try {
      await api.chatFriendAccept(friendshipId);
      showToast("Amistad aceptada! 🎉");
      // Recargar lista con pequeño delay para que el backend procese
      setTimeout(async () => {
        const updated = await api.chatFriends();
        const all = updated.data || updated || [];
        setFriends(all.filter(f=>f.estado==='accepted'));
        setPend(all.filter(f=>f.estado==='pending'&&!f.soy_requester));
      }, 500);
    } catch(e) {
      // Si ya fue aceptada (ej: doble click), refrescar silenciosamente
      if (e.message?.includes('NOT_FOUND') || e.message?.includes('404')) {
        const updated = await api.chatFriends().catch(()=>({data:[]}));
        const all = updated.data || updated || [];
        setFriends(all.filter(f=>f.estado==='accepted'));
        setPend(all.filter(f=>f.estado==='pending'&&!f.soy_requester));
      } else {
        showToast(e.message||"Error al aceptar","error");
      }
    }
  };

  const rejectFriend = async (friendshipId) => {
    try {
      await api.chatFriendReject(friendshipId);
      setPend(prev => prev.filter(f=>f.friendship_id!==friendshipId));
      showToast("Solicitud rechazada");
    } catch(e) {
      showToast(e.message||"Error","error");
    }
  };

  // ── Render chat individual ────────────────────────────────────
  if (friend) return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:dark?"#52177f":"#00c1fc",padding:"22px 16px 16px",color:"white",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={()=>{setFriend(null);setPerson([]);setConvId(null);personalConvIdRef.current=null;}}
          style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <Av user={friend} sz={36}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:15}}>{friend.nombre}</div>
          {typing&&<div style={{fontSize:11,opacity:.8}}>escribiendo...</div>}
        </div>
      </div>
      <div style={{flex:1,padding:"12px 14px 80px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {personMsgs.length===0&&(
          <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>
            Empeza la conversacion 💬
          </div>
        )}
        {personMsgs.map((m,i)=>{
          const isMe = m.sender_id===me.id;
          return(
            <div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",gap:8,alignItems:"flex-end"}}>
              {!isMe&&<Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre||""}} sz={28}/>}
              <div style={{maxWidth:"72%"}}>
                {!isMe&&<div style={{fontSize:10,color:sub,marginBottom:2,marginLeft:4}}>{m.sender_nombre}</div>}
                <div style={{padding:"9px 13px",
                  borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:isMe?accent:cardBg,color:isMe?"white":txt,
                  fontSize:13,fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                  {m.texto}
                  <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
                    {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,padding:"10px 14px 20px",display:"flex",gap:8,
        background:cardBg,borderTop:`1px solid ${dark?"#2d2a45":"#eee"}`,
        boxSizing:"border-box",zIndex:50}}>
        <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
          onKeyDown={e=>e.key==="Enter"&&sendMsg()}
          placeholder="Escribi un mensaje..."
          style={{flex:1,background:inputBg,border:`1.5px solid ${inputBord}`,borderRadius:50,
            padding:"10px 16px",fontSize:13,outline:"none",color:txt,
            fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
        <button onClick={sendMsg} style={{width:42,height:42,borderRadius:"50%",background:accent,
          border:"none",color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
      </div>
    </div>
  );

  // ── Render mensajes de sala (Aula o Global) ───────────────────
  const renderMessages = (msgs, type) => (
    <div style={{display:"flex",flexDirection:"column",
      height:"calc(100vh - 180px)", // altura fija, no crece
      position:"relative"}}>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px 80px",
        display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&(
          <div style={{textAlign:"center",color:sub,fontSize:13,marginTop:40}}>
            Sin mensajes aun. Sea el primero! 🎉
          </div>
        )}
        {msgs.map((m,i)=>{
          const isMe = m.sender_id===me.id;
          return(
            <div key={m.id||i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",
              gap:8,alignItems:"flex-end"}}>
              {!isMe&&<Av user={{skin:m.skin,border:m.border,nombre:m.sender_nombre||""}} sz={28}/>}
              <div style={{maxWidth:"75%"}}>
                {!isMe&&(
                  <div style={{fontSize:10,color:m.sender_rol==='teacher'?accent:sub,
                    marginBottom:2,marginLeft:4,fontWeight:m.sender_rol==='teacher'?800:600}}>
                    {m.sender_nombre}{m.sender_rol==='teacher'?' 👩‍🏫':''}
                  </div>
                )}
                <div style={{padding:"9px 13px",
                  borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:isMe?accent:cardBg,color:isMe?"white":txt,
                  fontSize:13,fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,.1)"}}>
                  {m.texto}
                  <div style={{fontSize:9,opacity:.6,marginTop:2,textAlign:"right"}}>
                    {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {typing&&<div style={{fontSize:11,color:sub,paddingLeft:8}}>💬 {typing} esta escribiendo...</div>}
        <div ref={bottomRef}/>
      </div>
      {/* Input fijo al fondo */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,
        padding:"10px 14px 16px",display:"flex",gap:8,
        background:cardBg,borderTop:`1px solid ${dark?"#2d2a45":"#eee"}`}}>
        <input value={msg} onChange={e=>{setMsg(e.target.value);emitTyping();}}
          onKeyDown={e=>e.key==="Enter"&&sendMsg()}
          placeholder="Escribi un mensaje..."
          style={{flex:1,background:inputBg,border:`1.5px solid ${inputBord}`,borderRadius:50,
            padding:"10px 16px",fontSize:13,outline:"none",color:txt,
            fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
        <button onClick={sendMsg} style={{width:42,height:42,borderRadius:"50%",background:accent,
          border:"none",color:"white",fontSize:18,cursor:"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
      </div>
    </div>
  );

  // ── Render principal ──────────────────────────────────────────
  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="💬 Chat" dark={dark} onBack={onBack}/>

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,
        borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`}}>
        {CHAT_SECTIONS.map((s,i)=>(
          <button key={s} onClick={()=>setSec(i)} style={{flex:1,padding:"11px 0",fontWeight:800,
            fontSize:13,background:"none",border:"none",cursor:"pointer",
            fontFamily:"Nunito,sans-serif",color:sec===i?accent:sub,
            borderBottom:`2.5px solid ${sec===i?accent:"transparent"}`,transition:"all .2s"}}>
            {s}
            {i===0&&pendientes.length>0&&(
              <span style={{background:"#ef4444",color:"white",borderRadius:99,
                fontSize:9,fontWeight:900,padding:"1px 5px",marginLeft:4}}>
                {pendientes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PERSONAL */}
      {sec===0&&(
        <div style={{padding:"10px 14px"}}>
          {/* Solicitudes pendientes */}
          {pendientes.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:800,color:txt,fontSize:12,marginBottom:6}}>
                Solicitudes pendientes
              </div>
              {pendientes.map(f=>(
                <div key={f.friendship_id} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"10px 14px",background:cardBg,borderRadius:16,marginBottom:6,
                  boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
                  <Av user={f} sz={36}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:13,color:txt}}>{f.nombre}</div>
                    <div style={{fontSize:11,color:sub}}>quiere ser tu amigo</div>
                  </div>
                  <button onClick={()=>acceptFriend(f.friendship_id)}
                    style={{background:"#10b981",border:"none",borderRadius:99,color:"white",
                      padding:"5px 12px",fontWeight:800,fontSize:11,cursor:"pointer",marginRight:4}}>✓</button>
                  <button onClick={()=>rejectFriend(f.friendship_id)}
                    style={{background:"#ef4444",border:"none",borderRadius:99,color:"white",
                      padding:"5px 12px",fontWeight:800,fontSize:11,cursor:"pointer"}}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Lista de amigos */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:800,color:txt,fontSize:13}}>
              Mis contactos ({friends.length})
            </div>
            <button onClick={()=>setAddOpen(true)} style={{background:accent,border:"none",
              borderRadius:99,color:"white",padding:"5px 13px",fontWeight:800,fontSize:11,cursor:"pointer"}}>
              + Agregar
            </button>
          </div>

          {loading&&<div style={{textAlign:"center",color:"#aaa",padding:20}}>Cargando...</div>}
          {!loading&&friends.length===0&&(
            <div style={{textAlign:"center",color:sub,padding:24,fontSize:13}}>
              Sin amigos todavia. Agrega a tus companeros! 👋
            </div>
          )}
          {friends.map(f=>(
            <div key={f.friendship_id} onClick={()=>openFriend(f)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
                background:cardBg,borderRadius:16,marginBottom:8,
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <Av user={f} sz={42}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:txt}}>{f.nombre}</div>
                <div style={{fontSize:11,color:sub}}>Toca para chatear</div>
              </div>
              <span style={{color:dark?"#555":"#ddd",fontSize:16}}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* AULA */}
      {sec===1&&(
        <div>
          {!classInfo?(
            <div style={{padding:32,textAlign:"center",color:sub,fontSize:13}}>
              No estas asignado a ningun aula aun
            </div>
          ):(
            <>
              <div style={{padding:"8px 14px 0",display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontWeight:800,color:txt,fontSize:13}}>{classInfo.nombre}</div>
                <span style={{background:dark?"#2d2a45":"#f0f0f0",color:sub,borderRadius:99,
                  padding:"2px 9px",fontSize:10,fontWeight:700}}>
                  {classInfo.total_miembros} miembros
                </span>
              </div>
              {renderMessages(classMsgs, 'classroom')}
            </>
          )}
        </div>
      )}

      {/* GLOBAL */}
      {sec===2&&(
        <div>
          <div style={{padding:"8px 14px 0"}}>
            <div style={{fontSize:11,color:sub}}>Toda la escuela puede leer y escribir</div>
          </div>
          {renderMessages(globalMsgs, 'global')}
        </div>
      )}

      {/* Sheet agregar amigo */}
      {addOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:400,
          display:"flex",alignItems:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget){setAddOpen(false);setSearch("");setResults([]);}}}>
          <div style={{background:cardBg,borderRadius:"24px 24px 0 0",width:"100%",
            padding:"20px 20px 40px",animation:"slideUp .25s ease"}}>
            <div style={{width:36,height:4,background:dark?"#555":"#ddd",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontWeight:900,fontSize:16,color:txt,marginBottom:12}}>Agregar amigo</div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              style={{width:"100%",boxSizing:"border-box",background:inputBg,
                border:`1.5px solid ${inputBord}`,borderRadius:14,padding:"11px 14px",
                fontSize:13,outline:"none",color:txt,fontFamily:"Nunito,sans-serif",marginBottom:10}}/>
            {results.map(u=>(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                borderBottom:`1px solid ${dark?"#2d2a45":"#f5f5f5"}`}}>
                <Av user={u} sz={36}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:txt}}>{u.nombre}</div>
                  <div style={{fontSize:11,color:sub}}>{u.rol}</div>
                </div>
                {!u.friendship_estado?(
                  <button onClick={()=>sendFriendReq(u.id)}
                    style={{background:accent,border:"none",borderRadius:99,color:"white",
                      padding:"5px 13px",fontWeight:800,fontSize:11,cursor:"pointer"}}>
                    Agregar
                  </button>
                ):(
                  <span style={{fontSize:11,color:sub,fontWeight:700}}>
                    {u.friendship_estado==='accepted'?"Amigos ✓":"Pendiente ⏳"}
                  </span>
                )}
              </div>
            ))}
            {search.length>=2&&results.length===0&&(
              <div style={{textAlign:"center",color:sub,fontSize:13,padding:12}}>
                No encontramos a nadie con ese nombre
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NOTICIAS ──────────────────────────────────────────────────
const TAG_COLORS = {
  General:"#64748b", Académico:"#3b82f6", Deportes:"#10b981",
  Evento:"#f59e0b",  Aviso:"#8b5cf6"
};
const TAG_LIST = ["Todos","General","Académico","Deportes","Evento","Aviso"];

function ANoticias({me,dark,onBack}){
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState(null);
  const [tagFilt,setTagFilt]=useState("Todos");

  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";
  const sub=dark?"#888":"#555";
  const bg=dark?"#12101e":"#F5F5F5";

  useEffect(()=>{
    setLoading(true);
    api.posts(tagFilt==="Todos"?null:tagFilt)
      .then(d=>setPosts(d.posts||[]))
      .catch(()=>setPosts([]))
      .finally(()=>setLoading(false));
  },[tagFilt]);

  if(sel) return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <div style={{background:dark?"#52177f":"#00c1fc",padding:"22px 16px 20px",color:"white",
        display:"flex",alignItems:"flex-start",gap:12}}>
        <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,.2)",border:"none",
          borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>←</button>
        <div>
          <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"3px 10px",
            fontSize:11,fontWeight:800}}>{sel.tag}</span>
          <div style={{fontWeight:900,fontSize:19,marginTop:6,lineHeight:1.2}}>{sel.titulo}</div>
          <div style={{fontSize:11,opacity:.8,marginTop:4}}>
            {sel.autor_nombre} · {new Date(sel.created_at).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>
      <div style={{padding:"20px 16px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:"20px 18px",
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <p style={{color:txt,fontSize:14,lineHeight:1.8,margin:0,fontWeight:600}}>{sel.cuerpo}</p>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="📰 Noticias" dark={dark} onBack={onBack}/>
      {/* Filtro de tags */}
      <div style={{display:"flex",gap:6,padding:"10px 14px 0",overflowX:"auto"}}>
        {TAG_LIST.map(t=>(
          <button key={t} onClick={()=>setTagFilt(t)} style={{
            background:tagFilt===t?dark?"#52177f":"#00c1fc":"transparent",
            border:`1.5px solid ${tagFilt===t?dark?"#52177f":"#00c1fc":dark?"#3d3a55":"#ddd"}`,
            color:tagFilt===t?"white":dark?"#aaa":"#666",
            borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
            whiteSpace:"nowrap",fontFamily:"Nunito,sans-serif",transition:"all .2s"}}>
            {t}
          </button>
        ))}
      </div>
      <div style={{padding:"10px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#aaa"}}>Cargando noticias...</div>}
        {!loading&&posts.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>📰</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin noticias por ahora</div>
          </div>
        )}
        {posts.map(n=>{
          const col=TAG_COLORS[n.tag]||"#64748b";
          return(
            <div key={n.id} onClick={()=>setSel(n)}
              style={{background:cardBg,borderRadius:20,marginBottom:10,overflow:"hidden",
                cursor:"pointer",boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{height:5,background:col}}/>
              <div style={{padding:"13px 16px"}}>
                <span style={{background:col+"22",color:col,borderRadius:99,padding:"2px 9px",
                  fontSize:10,fontWeight:800}}>{n.tag}</span>
                <div style={{fontWeight:800,fontSize:14,color:txt,marginTop:5,lineHeight:1.2}}>{n.titulo}</div>
                <div style={{fontSize:12,color:sub,marginTop:4,lineHeight:1.4}}>
                  {n.cuerpo.substring(0,80)}{n.cuerpo.length>80?"...":""}
                </div>
                <div style={{fontSize:10,color:dark?"#555":"#bbb",marginTop:6}}>
                  {n.autor_nombre} · {new Date(n.created_at).toLocaleDateString("es-AR")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VOTACIONES ────────────────────────────────────────────────
function AVotaciones({me,dark,showToast,onBack}){
  const [polls,setPolls]=useState([]);
  const [loading,setLoading]=useState(true);
  const [voting,setVoting]=useState(null); // poll_id en progreso

  const cardBg=dark?"#1e1b2e":"white";
  const txt=dark?"#e0e0e0":"#1a1a1a";
  const sub=dark?"#888":"#555";
  const bg=dark?"#12101e":"#F5F5F5";
  const accent=dark?"#c084fc":"#00c1fc";

  const loadPolls=()=>{
    setLoading(true);
    api.polls()
      .then(setPolls)
      .catch(()=>setPolls([]))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ loadPolls(); },[]);

  const votar=async(pollId, optionId)=>{
    setVoting(pollId);
    try{
      const updated=await api.vote(pollId, optionId);
      setPolls(ps=>ps.map(p=>p.id===pollId?updated:p));
      showToast("¡Voto registrado! 🗳️");
    }catch(e){
      if(e.code==="ALREADY_VOTED") showToast("Ya votaste en esta encuesta","warn");
      else if(e.code==="POLL_CLOSED") showToast("Esta votación está cerrada","warn");
      else showToast(e.message||"Error al votar","error");
    }finally{setVoting(null);}
  };

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🗳️ Votaciones" dark={dark} onBack={onBack}/>
      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#aaa"}}>Cargando votaciones...</div>}
        {!loading&&polls.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🗳️</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin votaciones activas</div>
          </div>
        )}
        {polls.map(v=>{
          const yaVote=!!v.mi_voto;
          const mostrar=yaVote||!v.activa;
          const isVoting=voting===v.id;
          return(
            <div key={v.id} style={{background:cardBg,borderRadius:20,padding:"16px",marginBottom:12,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:12}}>
                <div style={{fontWeight:800,fontSize:14,color:txt,flex:1,lineHeight:1.3}}>{v.titulo}</div>
                <span style={{
                  background:v.activa?"#10b98122":"#94a3b822",
                  color:v.activa?"#10b981":"#94a3b8",
                  borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:800,flexShrink:0}}>
                  {v.activa?"Activa":"Cerrada"}
                </span>
              </div>
              {v.opciones.map(op=>{
                const pct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const esMiVoto=v.mi_voto===op.id;
                const esGanador=!v.activa&&op.votos===Math.max(...v.opciones.map(o=>o.votos));
                return(
                  <div key={op.id}
                    onClick={()=>v.activa&&!yaVote&&!isVoting&&votar(v.id,op.id)}
                    style={{marginBottom:8,cursor:v.activa&&!yaVote&&!isVoting?"pointer":"default",
                      opacity:isVoting?.6:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:esMiVoto?800:600,
                        color:esMiVoto?accent:txt}}>
                        {esGanador?"🏆 ":""}{op.texto}
                        {esMiVoto&&<span style={{fontSize:10,marginLeft:4,opacity:.7}}>✓ Tu voto</span>}
                      </span>
                      {mostrar&&<span style={{fontSize:11,fontWeight:700,color:sub}}>{pct}%</span>}
                    </div>
                    <div style={{background:dark?"#2d2a45":"#f0f0f0",borderRadius:99,height:7,overflow:"hidden"}}>
                      <div style={{
                        width:mostrar?pct+"%":"0%",height:"100%",borderRadius:99,
                        background:esMiVoto?accent:"#3b82f6",transition:"width .6s ease"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{fontSize:10,color:sub,marginTop:8,display:"flex",justifyContent:"space-between"}}>
                <span>{v.total_votos} {v.total_votos===1?"voto":"votos"}</span>
                {v.fin&&<span>Cierra {new Date(v.fin).toLocaleDateString("es-AR")}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── REPORTES ──────────────────────────────────────────────────
const REPORTE_TIPOS = [
  {id:"bullying",   label:"Bullying",      icon:"😰", col:"#ef4444"},
  {id:"accidente",  label:"Accidente",     icon:"🚑", col:"#f59e0b"},
  {id:"perdido",    label:"Obj. perdido",  icon:"🔍", col:"#3b82f6"},
  {id:"sugerencia", label:"Sugerencia",    icon:"💡", col:"#10b981"},
  {id:"otro",       label:"Otro",          icon:"📋", col:"#8b5cf6"},
];
const ESTADO_LABEL={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const ESTADO_COLOR={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};

function AReportes({me,dark,showToast,onBack}){
  const [vista,setVista]       = useState("lista"); // "lista" | "nuevo" | "chat"
  const [reporteSel,setRepSel] = useState(null);
  const [tipo,setTipo]         = useState(null);
  const [desc,setDesc]         = useState("");
  const [anon,setAnon]         = useState(false);
  const [enviados,setEnviados] = useState([]);
  const [msgs,setMsgs]         = useState([]);
  const [newMsg,setNewMsg]     = useState("");
  const [loading,setLoading]   = useState(true);
  const [enviando,setEnviando] = useState(false);
  const [sending,setSending]   = useState(false);
  const bottomRef              = useRef(null);

  const cardBg  = dark?"#1e1b2e":"white";
  const txt     = dark?"#e0e0e0":"#1a1a1a";
  const sub     = dark?"#888":"#555";
  const bg      = dark?"#12101e":"#F5F5F5";
  const accent  = dark?"#c084fc":"#00c1fc";
  const inputBg = dark?"#2d2a45":"#F7F7F7";
  const inputBd = dark?"#3d3a55":"#E8E8E8";

  const loadList = () => {
    api.myReports()
      .then(d=>setEnviados(d.data||d||[]))
      .catch(()=>setEnviados([]))
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ loadList(); },[]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  const openChat = async(r) => {
    setRepSel(r);
    setMsgs([]);
    setVista("chat");
    try{
      const d = await api.reportMessages(r.id);
      setMsgs(d.data||d||[]);
    }catch(e){ showToast("Error al cargar mensajes","error"); }
  };

  const enviar = async() => {
    if(!tipo){showToast("Elegí un tipo","error");return;}
    if(!desc.trim()||desc.length<10){showToast("Descripción muy corta (mín. 10 caracteres)","error");return;}
    setEnviando(true);
    try{
      await api.createReport({tipo:tipo.id, descripcion:desc.trim(), anonimo:anon});
      showToast("Reporte enviado ✅");
      setTipo(null);setDesc("");setAnon(false);
      setVista("lista");
      if(!anon) loadList();
    }catch(e){ showToast(e.message||"Error","error"); }
    finally{ setEnviando(false); }
  };

  const sendMsg = async() => {
    if(!newMsg.trim()) return;
    setSending(true);
    try{
      const d = await api.sendReportMsg(reporteSel.id, newMsg.trim());
      const nuevoMsg = d.data || d;
      setMsgs(prev=>[...prev, nuevoMsg]);
      setNewMsg("");
      // Refrescar el reporte para tener el estado actualizado
      const lista = await api.myReports().catch(()=>({data:[]}));
      const todos = lista.data || lista || [];
      setEnviados(todos);
      const actualizado = todos.find(r=>r.id===reporteSel.id);
      if(actualizado) setRepSel(actualizado);
    }catch(e){ showToast("Error al enviar","error"); }
    finally{ setSending(false); }
  };

  // ── Vista: correo de un reporte ──────────────────────────
  if(vista==="chat"&&reporteSel){
    const tipoInfo = REPORTE_TIPOS.find(t=>t.id===reporteSel.tipo)||REPORTE_TIPOS[4];
    const estCol   = ESTADO_COLOR[reporteSel.estado]||"#94a3b8";
    const abierto  = reporteSel.estado!=="resuelto"&&reporteSel.estado!=="descartado";
    return(
      <div style={{background:dark?"#12101e":"#eef2f7",minHeight:"100vh"}}>
        {/* Header */}
        <div style={{background:accent,position:"sticky",top:0,zIndex:50,
          padding:"16px 16px 20px",color:"white",
          textShadow:dark?"none":"0 1px 4px rgba(0,60,100,.4)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setVista("lista");loadList();}}
              style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
                color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:15}}>Caso #{reporteSel.id?.slice(0,8).toUpperCase()}</div>
              <div style={{fontSize:11,opacity:.85}}>{tipoInfo.icon} {tipoInfo.label}</div>
            </div>
            <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,
              padding:"3px 10px",fontSize:10,fontWeight:800}}>
              {ESTADO_LABEL[reporteSel.estado]}
            </span>
          </div>
        </div>

        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>

          {/* Mensaje inicial — como un correo */}
          <div style={{background:cardBg,borderRadius:16,overflow:"hidden",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)"}}>
            {/* Cabecera del correo */}
            <div style={{background:dark?"#2d2a45":"#f8f9fa",padding:"12px 16px",
              borderBottom:`1px solid ${dark?"#3d3a55":"#e8e8e8"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {tipoInfo.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:txt}}>Tú</div>
                  <div style={{fontSize:10,color:sub}}>Para: Administración escolar</div>
                </div>
                <div style={{fontSize:10,color:sub,textAlign:"right"}}>
                  {new Date(reporteSel.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                  <br/>{new Date(reporteSel.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:sub}}>
                Asunto: <span style={{color:tipoInfo.col}}>[{tipoInfo.label.toUpperCase()}]</span> Reporte #{reporteSel.id?.slice(0,8).toUpperCase()}
              </div>
            </div>
            {/* Cuerpo */}
            <div style={{padding:"14px 16px",fontSize:13,color:txt,lineHeight:1.7}}>
              {reporteSel.descripcion}
            </div>
          </div>

          {/* Respuestas — estilo hilo de correo */}
          {msgs.length===0&&(
            <div style={{background:cardBg,borderRadius:16,padding:"20px 16px",textAlign:"center",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:24,marginBottom:6}}>📬</div>
              <div style={{fontSize:13,fontWeight:700,color:txt}}>Esperando respuesta</div>
              <div style={{fontSize:11,color:sub,marginTop:3}}>La administración revisará tu reporte pronto</div>
            </div>
          )}

          {msgs.map((m,i)=>{
            const esAdmin = m.sender_rol==="admin";
            return(
              <div key={m.id||i} style={{background:cardBg,borderRadius:16,overflow:"hidden",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)",
                borderLeft:esAdmin?`4px solid ${accent}`:`4px solid ${dark?"#3d3a55":"#e0e0e0"}`}}>
                {/* Cabecera del mensaje */}
                <div style={{background:dark?"#2d2a45":"#f8f9fa",padding:"10px 16px",
                  borderBottom:`1px solid ${dark?"#3d3a55":"#e8e8e8"}`,
                  display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                    background:esAdmin?accent+"22":dark?"#3d3a55":"#e8e8e8",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                    {esAdmin?"👨‍💼":"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:12,color:esAdmin?accent:txt}}>
                      {esAdmin?"Administración escolar":m.sender_nombre}
                    </div>
                    <div style={{fontSize:10,color:sub}}>
                      {new Date(m.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"})}
                      {" a las "}
                      {new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  {i===msgs.length-1&&<span style={{fontSize:10,color:sub}}>Último</span>}
                </div>
                {/* Cuerpo */}
                <div style={{padding:"12px 16px",fontSize:13,color:txt,lineHeight:1.7}}>
                  {m.texto}
                </div>
              </div>
            );
          })}

          {/* Responder */}
          {abierto?(
            <div style={{background:cardBg,borderRadius:16,overflow:"hidden",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)"}}>
              <div style={{background:dark?"#2d2a45":"#f8f9fa",padding:"10px 16px",
                borderBottom:`1px solid ${dark?"#3d3a55":"#e8e8e8"}`,
                fontSize:11,fontWeight:800,color:sub}}>
                ↩ RESPONDER
              </div>
              <div style={{padding:"12px 16px"}}>
                <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta..."
                  rows={3} style={{width:"100%",boxSizing:"border-box",
                    background:inputBg,border:`1.5px solid ${inputBd}`,borderRadius:12,
                    padding:"10px 14px",fontSize:13,outline:"none",resize:"none",
                    color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:10}}/>
                <button onClick={sendMsg} disabled={sending||!newMsg.trim()}
                  style={{width:"100%",background:sending?"#ccc":accent,border:"none",
                    borderRadius:50,color:"white",padding:"11px",fontWeight:800,fontSize:13,
                    cursor:sending?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {sending?"Enviando...":"Enviar respuesta ↩"}
                </button>
              </div>
            </div>
          ):(
            <div style={{background:cardBg,borderRadius:16,padding:"16px",textAlign:"center",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                padding:"5px 14px",fontSize:12,fontWeight:800}}>
                Caso {ESTADO_LABEL[reporteSel.estado]} — cerrado
              </span>
            </div>
          )}

          <div style={{height:20}}/>
        </div>
      </div>
    );
  }

  // ── Vista: formulario nuevo reporte ──────────────────────
  if(vista==="nuevo") return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🚩 Nuevo Reporte" dark={dark} onBack={()=>setVista("lista")}/>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:16,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>

          <div style={{fontWeight:800,color:txt,marginBottom:10,fontSize:13}}>¿Qué querés reportar?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {REPORTE_TIPOS.map(t=>(
              <div key={t.id} onClick={()=>setTipo(t)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:14,
                  cursor:"pointer",transition:"all .2s",
                  background:tipo?.id===t.id?t.col+"22":dark?"#2d2a45":"#f9f9f9",
                  border:`1.5px solid ${tipo?.id===t.id?t.col:dark?"#3d3a55":"#e8e8e8"}`}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <span style={{fontSize:12,fontWeight:800,color:tipo?.id===t.id?t.col:txt}}>{t.label}</span>
              </div>
            ))}
          </div>

          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Describí lo que pasó con el mayor detalle posible..."
            rows={5} style={{width:"100%",boxSizing:"border-box",background:inputBg,
              border:`1.5px solid ${inputBd}`,borderRadius:14,padding:"11px 14px",fontSize:13,
              outline:"none",color:txt,fontFamily:"Nunito,sans-serif",resize:"none",fontWeight:600,marginBottom:10}}/>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"}}
            onClick={()=>setAnon(a=>!a)}>
            <div style={{width:22,height:22,borderRadius:6,transition:"all .2s",
              border:`2px solid ${anon?"#3b82f6":dark?"#3d3a55":"#ddd"}`,
              background:anon?"#3b82f6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {anon&&<span style={{color:"white",fontSize:12,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:txt}}>Enviar de forma anónima</span>
            <span style={{fontSize:11,color:sub}}>(sin respuesta)</span>
          </div>

          <button onClick={enviar} disabled={enviando}
            style={{width:"100%",background:enviando?"#ccc":accent,border:"none",borderRadius:50,
              color:"white",padding:"13px",fontWeight:800,fontSize:14,
              cursor:enviando?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif",
              boxShadow:enviando?"none":`0 4px 16px ${accent}44`}}>
            {enviando?"Enviando...":"Enviar reporte 🚩"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Vista: lista de reportes ──────────────────────────────
  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🚩 Reportes" dark={dark} onBack={onBack}/>
      <div style={{padding:"12px 14px"}}>
        <button onClick={()=>setVista("nuevo")}
          style={{width:"100%",background:accent,border:"none",borderRadius:16,
            color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
            fontFamily:"Nunito,sans-serif",marginBottom:14,
            boxShadow:`0 4px 16px ${accent}44`}}>
          + Nuevo reporte
        </button>

        <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:8}}>Mis reportes</div>
        {loading&&<div style={{textAlign:"center",color:sub,padding:20}}>Cargando...</div>}
        {!loading&&enviados.length===0&&(
          <div style={{background:cardBg,borderRadius:16,padding:24,textAlign:"center",
            color:sub,fontSize:13,boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            No tenés reportes enviados aún
          </div>
        )}
        {enviados.map((r,i)=>{
          const t = REPORTE_TIPOS.find(x=>x.id===r.tipo)||REPORTE_TIPOS[4];
          const estCol = ESTADO_COLOR[r.estado]||"#94a3b8";
          return(
            <div key={i} onClick={()=>!r.anonimo&&openChat(r)}
              style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginBottom:8,
                cursor:r.anonimo?"default":"pointer",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                border:`1.5px solid ${dark?"transparent":"#f0f0f0"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:12,background:t.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {t.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:13,color:txt}}>{t.label}</div>
                  <div style={{fontSize:11,color:sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {r.descripcion}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                    padding:"3px 8px",fontSize:10,fontWeight:800,display:"block",marginBottom:4}}>
                    {ESTADO_LABEL[r.estado]||r.estado}
                  </span>
                  {!r.anonimo&&<span style={{fontSize:10,color:accent}}>Ver chat →</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISTA MAESTRA
// ════════════════════════════════════════════════════════════
function Maestra({me,logout}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{paddingBottom:90}}>
        {tab==="home"     && <MHome     me={me} onNav={setTab}/>}
        {tab==="misiones" && <MMisiones me={me} showToast={showToast}/>}
        {tab==="aprobar"  && <MAprobar  me={me} showToast={showToast}/>}
        {tab==="perfil"   && <MPerfilSimple me={me} logout={logout}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,background:"white",borderTop:"1px solid #EFEFEF",
        padding:"6px 4px 20px",display:"flex",justifyContent:"space-around",
        boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
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
              <div style={{width:36,height:30,borderRadius:10,background:on?"#FFF0F0":"transparent",
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
  const [budget,setBudget]=useState(null);
  const [pending,setPending]=useState([]);

  useEffect(()=>{
    api.submissions().then(setPending).catch(()=>{});
  },[]);

  return(
    <div>
      <div style={{background:"#00c1fc",color:"white",padding:"52px 20px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,.25)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👩‍🏫</div>
          <div>
            <div style={{fontSize:11,opacity:.8,fontWeight:700}}>DOCENTE</div>
            <div style={{fontWeight:900,fontSize:18}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
          </div>
        </div>
        {pending.length>0&&(
          <div style={{background:"rgba(255,255,255,.2)",borderRadius:16,padding:"14px 16px"}}>
            <div style={{fontWeight:800,fontSize:14}}>📬 {pending.length} entrega{pending.length!==1?"s":""} pendiente{pending.length!==1?"s":""}</div>
            <div style={{fontSize:12,opacity:.85,marginTop:4}}>Necesitan tu aprobación</div>
          </div>
        )}
      </div>
      <div style={{padding:"20px 14px"}}>
        {[
          {icon:"⚡",title:"Crear misión",sub:"Nuevas actividades para alumnos",dest:"misiones",col:"#f59e0b"},
          {icon:"📬",title:"Aprobar entregas",sub:`${pending.length} pendientes`,dest:"aprobar",col:"#10b981"},
        ].map(item=>(
          <WCard key={item.dest} onClick={()=>onNav(item.dest)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"16px",cursor:"pointer",marginBottom:10}}>
            <div style={{width:50,height:50,borderRadius:14,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{item.title}</div>
              <div style={{fontSize:12,color:"#555"}}>{item.sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </WCard>
        ))}
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
  const [dif,setDif]=useState("fácil");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.missions().then(setMissions).finally(()=>setLoading(false));
  },[]);

  const crear=async()=>{
    if(!titulo.trim()||!rec){showToast("Completá título y recompensa","error");return;}
    try{
      const m=await api.createMission({titulo:titulo.trim(),descripcion:desc.trim(),recompensa:parseInt(rec),dificultad:dif});
      setMissions(prev=>[m,...prev]);
      setTitulo("");setDesc("");setRec("");setForm(false);
      showToast("¡Misión creada! ⚡");
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Misiones ⚡" sub="EDUCOINS"
        extra={<button onClick={()=>setForm(true)}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nueva misión
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.map(m=>(
          <WCard key={m.id} style={{marginBottom:10,borderLeft:`4px solid ${DIFCOL[m.dificultad]||"#ddd"}`}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
            </div>
            <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{m.titulo}</div>
            {m.descripcion&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{m.descripcion}</div>}
            <div style={{marginTop:8,fontWeight:800,color:"#00c1fc"}}>🪙 {m.recompensa}</div>
          </WCard>
        ))}
      </div>
      {form&&(
        <Sheet title="⚡ Nueva misión" onClose={()=>setForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={titulo} set={setTitulo} ph="Título" icon="⚡"/>
            <Inp val={desc}   set={setDesc}   ph="Descripción (opcional)" icon="📝"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp val={rec} set={setRec} ph="🪙 Recompensa" type="number"/>
              <select value={dif} onChange={e=>setDif(e.target.value)}
                style={{background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
                  color:"#1a1a1a",padding:"12px 14px",fontSize:14,outline:"none",fontWeight:700}}>
                <option value="fácil">😊 Fácil</option>
                <option value="media">😤 Media</option>
                <option value="difícil">🔥 Difícil</option>
              </select>
            </div>
            <PBtn label="Crear misión ✨" onClick={crear} full/>
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
  const [rejectSheet,setRejectSheet]=useState(null);
  const [reason,setReason]=useState("");

  useEffect(()=>{
    api.submissions().then(setSubs).finally(()=>setLoading(false));
  },[]);

  const approve=async(id)=>{
    setProcessing(id);
    try{
      await api.approve(id);
      setSubs(prev=>prev.filter(s=>s.id!==id));
      showToast("¡Misión aprobada y monedas acreditadas! ✅");
    }catch(e){
      showToast(e.message||"Error al aprobar","error");
    }finally{setProcessing(null);}
  };

  const reject=async()=>{
    if(!reason.trim()){showToast("Escribí un motivo","error");return;}
    setProcessing(rejectSheet);
    try{
      await api.reject(rejectSheet,reason);
      setSubs(prev=>prev.filter(s=>s.id!==rejectSheet));
      setRejectSheet(null);setReason("");
      showToast("Entrega rechazada");
    }catch(e){
      showToast(e.message||"Error","error");
    }finally{setProcessing(null);}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Aprobar entregas 📬" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {subs.length===0&&(
          <WCard style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a",marginTop:8}}>Todo al día</div>
            <div style={{color:"#aaa",fontSize:13,marginTop:4}}>Sin entregas pendientes</div>
          </WCard>
        )}
        {subs.map(s=>(
          <WCard key={s.id} style={{marginBottom:12,borderTop:"3px solid #f59e0b"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"#f59e0b18",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🧑‍🎓</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:"#1a1a1a"}}>{s.alumno_nombre}</div>
                <div style={{fontSize:12,color:"#00c1fc",fontWeight:700}}>{s.titulo}</div>
              </div>
              <span style={{fontWeight:900,color:"#00c1fc",fontSize:15}}>🪙 {s.recompensa}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <PBtn label={processing===s.id?"...":"✅ Aprobar"} onClick={()=>approve(s.id)}
                disabled={processing===s.id} full color="#10b981" style={{flex:1}}/>
              <PBtn label="❌ Rechazar" onClick={()=>{setRejectSheet(s.id);setReason("");}}
                full color="#ef4444" style={{flex:1}}/>
            </div>
          </WCard>
        ))}
      </div>
      {rejectSheet&&(
        <Sheet title="❌ Rechazar entrega" onClose={()=>setRejectSheet(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={reason} set={setReason} ph="Motivo del rechazo..." icon="📝"/>
            <PBtn label="Confirmar rechazo" onClick={reject} full color="#ef4444"/>
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
function Admin({me,logout}){
  const [tab,setTab]=useState("home");
  const [toast,showToast]=useToast();
  const navTabs=["home","usuarios","tesoro","tienda","audit","config"];
  const hideNav=!navTabs.includes(tab);

  return(
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:hideNav?0:90,animation:"fadeIn .18s ease"}}>
        {tab==="home"      && <AdminHome    me={me} onNav={setTab} showToast={showToast}/>}
        {tab==="usuarios"  && <AdminUsuarios showToast={showToast}/>}
        {tab==="tesoro"    && <AdminTesoro  me={me} showToast={showToast}/>}
        {tab==="tienda"    && <AdminTienda  showToast={showToast}/>}
        {tab==="audit"     && <AdminAudit/>}
        {tab==="config"    && <AdminConfig  me={me} logout={logout}/>}
        {tab==="noticias"  && <AdminNoticias  showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="votaciones"&& <AdminVotaciones showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="reportes"  && <AdminReportes  showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="aulas"     && <AdminAulas     showToast={showToast} onBack={()=>setTab("home")}/>}
      </div>
      {!hideNav&&(
      <div style={{position:"sticky",bottom:0,width:"100%",background:"white",
        borderTop:"1px solid #EFEFEF",padding:"6px 4px 20px",display:"flex",
        justifyContent:"space-around",boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
        {[
          {id:"home",    icon:"🏠",label:"Inicio"},
          {id:"usuarios",icon:"👥",label:"Usuarios"},
          {id:"tesoro",  icon:"🏦",label:"Tesoro"},
          {id:"tienda",  icon:"🛒",label:"Tienda"},
          {id:"audit",   icon:"📋",label:"Audit"},
          {id:"config",  icon:"⚙️", label:"Config"},
        ].map(item=>{
          const on=tab===item.id;
          return(
            <button key={item.id} onClick={()=>setTab(item.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
              background:"none",border:"none",cursor:"pointer",color:on?"#00c1fc":"#777777",
              fontFamily:"Nunito,sans-serif",padding:"3px 2px"}}>
              <div style={{width:36,height:30,borderRadius:10,background:on?"#e0f7fe":"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:19}}>{item.icon}</span>
              </div>
              <span style={{fontSize:9,fontWeight:800}}>{item.label}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

function AdminHome({me,onNav,showToast}){
  const [treasury,setTreasury]=useState(null);
  const [users,setUsers]=useState([]);

  useEffect(()=>{
    api.treasury().then(setTreasury).catch(()=>{});
    api.adminUsers().then(setUsers).catch(()=>{});
  },[]);

  const students=users.filter(u=>u.rol==="student"&&u.activo).length;
  const teachers=users.filter(u=>u.rol==="teacher"&&u.activo).length;

  return(
    <div>
      <div style={{background:"#00c1fc",color:"white",padding:"52px 20px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>Panel Admin ⚙️</div>
        <div style={{fontSize:13,opacity:.8}}>Hola, {me.nombre}</div>
      </div>
      <div style={{padding:"20px 14px",marginTop:-24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <WCard style={{textAlign:"center"}}>
            <div style={{fontSize:28}}>🏦</div>
            <div style={{fontWeight:900,fontSize:20,color:"#00c1fc"}}>
              {treasury?treasury.balance.toLocaleString("es-AR"):"..."}
            </div>
            <div style={{fontSize:11,color:"#aaa",fontWeight:700}}>Tesorería</div>
          </WCard>
          <WCard style={{textAlign:"center"}}>
            <div style={{fontSize:28}}>👥</div>
            <div style={{fontWeight:900,fontSize:20,color:"#1a1a1a"}}>{students}</div>
            <div style={{fontSize:11,color:"#aaa",fontWeight:700}}>Alumnos activos</div>
          </WCard>
        </div>
        {[
          {icon:"👥",title:"Usuarios",         sub:`${students} alumnos · ${teachers} docentes`,dest:"usuarios",  col:"#3b82f6"},
          {icon:"🏦",title:"Tesorería",         sub:"Mint y burn de monedas",                    dest:"tesoro",    col:"#f59e0b"},
          {icon:"🛒",title:"Tienda",            sub:"Administrar ítems",                          dest:"tienda",    col:"#10b981"},
          {icon:"📰",title:"Noticias",          sub:"Crear y moderar publicaciones",              dest:"noticias",  col:"#00c1fc"},
          {icon:"🗳️",title:"Votaciones",        sub:"Crear encuestas y ver resultados",           dest:"votaciones",col:"#8b5cf6"},
          {icon:"🚩",title:"Reportes",          sub:"Gestionar reportes de alumnos",              dest:"reportes",  col:"#ef4444"},
          {icon:"🏫",title:"Aulas",             sub:"Crear aulas y asignar miembros",             dest:"aulas",     col:"#f59e0b"},
          {icon:"📋",title:"Audit Log",         sub:"Historial de todas las acciones",            dest:"audit",     col:"#64748b"},
        ].map(item=>(
          <WCard key={item.dest} onClick={()=>onNav(item.dest)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"16px",cursor:"pointer",marginBottom:10}}>
            <div style={{width:50,height:50,borderRadius:14,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{item.title}</div>
              <div style={{fontSize:12,color:"#555"}}>{item.sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

function AdminUsuarios({showToast}){
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [rol,setRol]=useState("student");
  const [budget,setBudget]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.adminUsers().then(setUsers).finally(()=>setLoading(false));
  },[]);

  const crear=async()=>{
    if(!nombre.trim()||!email.trim()||!pass.trim()){showToast("Completá todos los campos","error");return;}
    try{
      const u=await api.createUser({nombre:nombre.trim(),email:email.trim(),password:pass,rol});
      if(rol==="teacher"&&budget){
        await api.setBudget(u.id,parseInt(budget)).catch(()=>{});
      }
      setUsers(prev=>[...prev,{...u,activo:true}]);
      setNombre("");setEmail("");setPass("");setBudget("");setForm(false);
      showToast(`Usuario ${u.nombre} creado ✅`);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const deactivate=async(id)=>{
    try{
      await api.deactivate(id);
      setUsers(prev=>prev.map(u=>u.id===id?{...u,activo:false}:u));
      showToast("Usuario desactivado");
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Usuarios 👥" sub="ADMIN"
        extra={<button onClick={()=>setForm(true)}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nuevo usuario
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {users.map(u=>(
          <WCard key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:u.activo?1:.5}}>
            <div style={{width:44,height:44,borderRadius:"50%",
              background:u.rol==="admin"?"#ef444418":u.rol==="teacher"?"#f59e0b18":"#6366f118",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              {u.rol==="admin"?"⚙️":u.rol==="teacher"?"👩‍🏫":"🧑‍🎓"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{u.nombre}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{u.email}</div>
              <Pill text={u.rol} col={u.rol==="admin"?"#ef4444":u.rol==="teacher"?"#f59e0b":"#6366f1"}/>
            </div>
            {u.activo&&u.rol!=="admin"&&(
              <OBtn label="Desactivar" onClick={()=>deactivate(u.id)} color="#ef4444"/>
            )}
          </WCard>
        ))}
      </div>
      {form&&(
        <Sheet title="+ Nuevo usuario" onClose={()=>setForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={nombre} set={setNombre} ph="Nombre completo" icon="👤"/>
            <Inp val={email}  set={setEmail}  ph="Email" type="email" icon="📧"/>
            <Inp val={pass}   set={setPass}   ph="Contraseña" type="password" icon="🔒"/>
            <select value={rol} onChange={e=>setRol(e.target.value)}
              style={{background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
                color:"#1a1a1a",padding:"12px 14px",fontSize:14,outline:"none",fontWeight:700}}>
              <option value="student">🧑‍🎓 Alumno</option>
              <option value="teacher">👩‍🏫 Docente</option>
            </select>
            {rol==="teacher"&&(
              <Inp val={budget} set={setBudget} ph="Presupuesto mensual (monedas)" type="number" icon="🪙"/>
            )}
            <PBtn label="Crear usuario" onClick={crear} full color="#10b981"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function AdminTesoro({me,showToast}){
  const [balance,setBalance]=useState(null);
  const [mintAmount,setMintAmount]=useState("");
  const [mintDesc,setMintDesc]=useState("");
  const [burnAmount,setBurnAmount]=useState("");
  const [burnReason,setBurnReason]=useState("");
  const [mintSheet,setMintSheet]=useState(false);
  const [burnSheet,setBurnSheet]=useState(false);

  const refresh=()=>api.treasury().then(t=>setBalance(t.balance)).catch(()=>{});
  useEffect(()=>{refresh();},[]);

  const doMint=async()=>{
    if(!mintAmount||!mintDesc){showToast("Completá monto y descripción","error");return;}
    try{
      await api.mint(parseInt(mintAmount),mintDesc);
      showToast(`🪙 ${mintAmount} monedas acreditadas a la Tesorería`);
      refresh();setMintAmount("");setMintDesc("");setMintSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const doBurn=async()=>{
    if(!burnAmount||!burnReason){showToast("Completá monto y motivo","error");return;}
    try{
      await api.burn(parseInt(burnAmount),burnReason);
      showToast(`🔥 ${burnAmount} monedas eliminadas de la Tesorería`);
      refresh();setBurnAmount("");setBurnReason("");setBurnSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div>
      <OHdr title="Tesorería 🏦" sub="ADMIN"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <WCard style={{textAlign:"center",padding:28,marginBottom:16}}>
          <div style={{fontSize:13,color:"#aaa",fontWeight:700,letterSpacing:".1em",marginBottom:8}}>BALANCE ACTUAL</div>
          <div style={{fontWeight:900,fontSize:42,color:"#00c1fc",letterSpacing:"-2px"}}>
            🪙 {balance!==null?balance.toLocaleString("es-AR"):"..."}
          </div>
          <div style={{fontSize:12,color:"#aaa",marginTop:8}}>Calculado desde el ledger en tiempo real</div>
        </WCard>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <PBtn label="+ Mint 🪙" onClick={()=>setMintSheet(true)} full color="#10b981"/>
          <PBtn label="Burn 🔥" onClick={()=>setBurnSheet(true)} full color="#ef4444"/>
        </div>
        <WCard>
          <div style={{fontSize:12,color:"#888",fontWeight:700,lineHeight:1.6}}>
            <div><span style={{color:"#10b981"}}>● Mint</span> — Crea monedas nuevas y las acredita a la Tesorería</div>
            <div style={{marginTop:6}}><span style={{color:"#ef4444"}}>● Burn</span> — Destruye monedas de la Tesorería permanentemente</div>
          </div>
        </WCard>
      </div>
      {mintSheet&&(
        <Sheet title="🪙 Mint — Crear monedas" onClose={()=>setMintSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={mintAmount} set={setMintAmount} ph="Cantidad de monedas" type="number" icon="🪙"/>
            <Inp val={mintDesc}   set={setMintDesc}   ph="Descripción" icon="📝"/>
            <PBtn label="Confirmar mint" onClick={doMint} full color="#10b981"/>
          </div>
        </Sheet>
      )}
      {burnSheet&&(
        <Sheet title="🔥 Burn — Destruir monedas" onClose={()=>setBurnSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={burnAmount} set={setBurnAmount} ph="Cantidad a destruir" type="number" icon="🔥"/>
            <Inp val={burnReason} set={setBurnReason} ph="Motivo obligatorio" icon="📝"/>
            <PBtn label="Confirmar burn" onClick={doBurn} full color="#ef4444"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function AdminTienda({showToast}){
  const [items,setItems]=useState([]);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [desc,setDesc]=useState("");
  const [precio,setPrecio]=useState("");
  const [stock,setStock]=useState("");
  const [icon,setIcon]=useState("🎁");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.storeItems().then(setItems).finally(()=>setLoading(false));
  },[]);

  const crear=async()=>{
    if(!nombre.trim()||!precio){showToast("Nombre y precio son requeridos","error");return;}
    try{
      const item=await api.createItem({
        nombre:nombre.trim(),descripcion:desc.trim(),
        precio:parseInt(precio),stock:stock?parseInt(stock):-1,icon
      });
      setItems(prev=>[...prev,item]);
      setNombre("");setDesc("");setPrecio("");setStock("");setIcon("🎁");setForm(false);
      showToast("Ítem agregado a la tienda ✅");
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Tienda 🛒" sub="ADMIN"
        extra={<button onClick={()=>setForm(true)}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nuevo ítem
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {items.map(item=>(
            <WCard key={item.id} style={{padding:"14px 12px"}}>
              <div style={{fontSize:36,marginBottom:8}}>{item.icon||"🎁"}</div>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",lineHeight:1.2}}>{item.nombre}</div>
              <div style={{fontSize:11,color:"#aaa",margin:"4px 0 10px",minHeight:26}}>{item.descripcion}</div>
              <div style={{fontWeight:900,color:"#00c1fc",fontSize:13}}>🪙 {item.precio}</div>
              <div style={{fontSize:10,color:"#ccc",marginTop:4,fontWeight:700}}>
                Stock: {item.stock===-1?"∞":item.stock}
              </div>
            </WCard>
          ))}
        </div>
        {items.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Tienda vacía</div>
          </WCard>
        )}
      </div>
      {form&&(
        <Sheet title="🛒 Nuevo ítem" onClose={()=>setForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:10}}>
              <input value={icon} onChange={e=>setIcon(e.target.value)}
                style={{width:56,background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
                  color:"#1a1a1a",padding:"10px",fontSize:22,textAlign:"center",outline:"none"}}/>
              <div style={{flex:1}}><Inp val={nombre} set={setNombre} ph="Nombre"/></div>
            </div>
            <Inp val={desc}   set={setDesc}   ph="Descripción (opcional)"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp val={precio} set={setPrecio} ph="🪙 Precio" type="number"/>
              <Inp val={stock}  set={setStock}  ph="Stock (-1=∞)" type="number"/>
            </div>
            <PBtn label="Agregar ítem" onClick={crear} full color="#10b981"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function AdminAudit(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.auditLog().then(setLogs).finally(()=>setLoading(false));
  },[]);

  const actionColor=(action)=>({
    mint:"#10b981",burn:"#ef4444",reward:"#f59e0b",
    transfer:"#3b82f6",purchase:"#8b5cf6",adjustment:"#f59e0b"
  }[action]||"#94a3b8");

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando audit log...</div>;

  return(
    <div>
      <OHdr title="Audit Log 📋" sub="ADMIN"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {logs.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>📋</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Sin registros aún</div>
          </WCard>
        )}
        {logs.map((log,i)=>(
          <WCard key={i} style={{marginBottom:8,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Pill text={log.action} col={actionColor(log.action)}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{log.actor_nombre||"Sistema"}</div>
                <div style={{fontSize:11,color:"#bbb"}}>{new Date(log.created_at).toLocaleString("es-AR")}</div>
              </div>
            </div>
            {log.details&&Object.keys(log.details).length>0&&(
              <div style={{marginTop:8,fontSize:11,color:"#888",background:"#f9f9f9",
                borderRadius:8,padding:"6px 10px",fontFamily:"monospace"}}>
                {JSON.stringify(log.details,null,0)}
              </div>
            )}
          </WCard>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — NOTICIAS
// ════════════════════════════════════════════════════════════
function AdminNoticias({showToast, onBack}){
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [cuerpo,setCuerpo]=useState("");
  const [tag,setTag]=useState("General");
  const [saving,setSaving]=useState(false);
  const TAGS=["General","Académico","Deportes","Evento","Aviso"];
  const TAG_COL={General:"#64748b",Académico:"#3b82f6",Deportes:"#10b981",Evento:"#f59e0b",Aviso:"#8b5cf6"};

  const load=()=>{ api.posts().then(d=>setPosts(d.posts||d||[])).catch(()=>[]).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const crear=async()=>{
    if(!titulo.trim()||!cuerpo.trim()){showToast("Completá título y cuerpo","error");return;}
    setSaving(true);
    try{
      await api.createPost({titulo:titulo.trim(),cuerpo:cuerpo.trim(),tag});
      showToast("Noticia publicada ✅");
      setForm(false);setTitulo("");setCuerpo("");setTag("General");
      load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const desactivar=async(id)=>{
    if(!window.confirm("¿Desactivar esta noticia?")) return;
    try{ await api.deletePost(id); showToast("Noticia desactivada"); load(); }
    catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>📰 Noticias</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"✕ Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Nueva noticia</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <textarea value={cuerpo} onChange={e=>setCuerpo(e.target.value)} placeholder="Contenido..."
              rows={4} style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {TAGS.map(t=>(
                <button key={t} onClick={()=>setTag(t)} style={{
                  border:`1.5px solid ${tag===t?TAG_COL[t]:"#e8e8e8"}`,
                  background:tag===t?TAG_COL[t]+"22":"transparent",
                  color:tag===t?TAG_COL[t]:"#666",borderRadius:99,padding:"4px 12px",
                  fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{t}</button>
              ))}
            </div>
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Publicando...":"Publicar noticia"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {posts.map(p=>{
          const col=TAG_COL[p.tag]||"#64748b";
          return(
            <div key={p.id} style={{background:"white",borderRadius:16,marginBottom:8,overflow:"hidden",
              boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{height:4,background:col}}/>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <span style={{background:col+"22",color:col,borderRadius:99,padding:"2px 8px",
                    fontSize:10,fontWeight:800}}>{p.tag}</span>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginTop:4}}>{p.titulo}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:2}}>
                    {p.autor_nombre} · {new Date(p.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <button onClick={()=>desactivar(p.id)} style={{background:"#fee2e2",border:"none",
                  borderRadius:8,color:"#ef4444",padding:"6px 10px",fontSize:11,fontWeight:800,
                  cursor:"pointer",flexShrink:0}}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — VOTACIONES
// ════════════════════════════════════════════════════════════
function AdminVotaciones({showToast, onBack}){
  const [polls,setPolls]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [opciones,setOpciones]=useState(["",""]);
  const [finTipo,setFinTipo]=useState("fecha"); // "fecha" | "horas" | "nunca"
  const [finFecha,setFinFecha]=useState("");
  const [finHoras,setFinHoras]=useState("24");
  const [saving,setSaving]=useState(false);

  const load=()=>{ 
    api.polls()
      .then(d=>setPolls(Array.isArray(d)?d:d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false)); 
  };
  useEffect(()=>{ load(); },[]);

  const crear=async()=>{
    if(!titulo.trim()){showToast("Escribí un título","error");return;}
    const ops=opciones.filter(o=>o.trim());
    if(ops.length<2){showToast("Necesitás al menos 2 opciones","error");return;}
    setSaving(true);
    try{
      let finISO = null;
      if(finTipo==="fecha" && finFecha) {
        // Crear fecha al final del día en hora local, no UTC
        const [y,m,d] = finFecha.split("-").map(Number);
        const fecha = new Date(y, m-1, d, 23, 59, 59);
        finISO = fecha.toISOString();
      } else if(finTipo==="horas" && finHoras) {
        const d = new Date();
        d.setHours(d.getHours() + parseInt(finHoras));
        finISO = d.toISOString();
      }
      await api.createPoll({titulo:titulo.trim(), opciones:ops, fin:finISO});
      showToast("Votación creada ✅");
      setForm(false);setTitulo("");setOpciones(["",""]);setFinFecha("");setFinHoras("24");setFinTipo("fecha");
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

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🗳️ Votaciones</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"✕ Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Nueva votación</div>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Pregunta..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Opciones</div>
            {opciones.map((op,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={op} onChange={e=>{const n=[...opciones];n[i]=e.target.value;setOpciones(n);}}
                  placeholder={`Opción ${i+1}`}
                  style={{flex:1,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"8px 12px",
                    fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                {opciones.length>2&&(
                  <button onClick={()=>setOpciones(o=>o.filter((_,j)=>j!==i))}
                    style={{background:"#fee2e2",border:"none",borderRadius:8,color:"#ef4444",
                      width:32,cursor:"pointer",fontWeight:800}}>✕</button>
                )}
              </div>
            ))}
            {opciones.length<8&&(
              <button onClick={()=>setOpciones(o=>[...o,""])}
                style={{width:"100%",background:"#f0f0f0",border:"none",borderRadius:12,
                  padding:"8px",fontSize:12,fontWeight:800,color:"#666",cursor:"pointer",
                  marginBottom:8,fontFamily:"Nunito,sans-serif"}}>+ Agregar opción</button>
            )}
            <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Vencimiento de la votación</div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              {[["fecha","📅 Por fecha"],["horas","⏱ Por horas"],["nunca","♾ Sin límite"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFinTipo(v)} style={{
                  flex:1,background:finTipo===v?"#00c1fc":"#f0f0f0",
                  color:finTipo===v?"white":"#555",border:"none",borderRadius:10,
                  padding:"7px 4px",fontWeight:800,fontSize:11,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>{l}</button>
              ))}
            </div>
            {finTipo==="fecha"&&(
              <input type="date" value={finFecha} onChange={e=>setFinFecha(e.target.value)}
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                  padding:"10px 14px",fontSize:13,marginBottom:10,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            )}
            {finTipo==="horas"&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <input type="number" value={finHoras} onChange={e=>setFinHoras(e.target.value)}
                  min="1" max="720"
                  style={{flex:1,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 14px",
                    fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                <span style={{fontSize:13,color:"#666",fontWeight:700}}>horas desde ahora</span>
              </div>
            )}
            {finTipo==="nunca"&&(
              <div style={{fontSize:12,color:"#aaa",marginBottom:10,textAlign:"center"}}>
                La votación no tiene fecha de cierre automático
              </div>
            )}
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear votación"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {polls.map(v=>(
          <div key={v.id} style={{background:"white",borderRadius:16,padding:"14px",marginBottom:8,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
              <div style={{flex:1,fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{v.titulo}</div>
              <span style={{background:v.activa?"#10b98122":"#94a3b822",
                color:v.activa?"#10b981":"#94a3b8",borderRadius:99,padding:"3px 9px",
                fontSize:10,fontWeight:800,flexShrink:0}}>{v.activa?"Activa":"Cerrada"}</span>
            </div>
            {v.opciones?.map(op=>{
              const pct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
              return(
                <div key={op.id} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,
                    fontWeight:600,color:"#555",marginBottom:2}}>
                    <span>{op.texto}</span>
                    <span>{op.votos} votos ({pct}%)</span>
                  </div>
                  <div style={{background:"#f0f0f0",borderRadius:99,height:6}}>
                    <div style={{width:pct+"%",height:"100%",borderRadius:99,background:"#00c1fc",transition:"width .4s"}}/>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
              <span style={{fontSize:11,color:"#aaa"}}>{v.total_votos} votos totales</span>
              <button onClick={()=>toggleActiva(v)} style={{
                background:v.activa?"#fee2e2":"#dcfce7",border:"none",borderRadius:99,
                color:v.activa?"#ef4444":"#10b981",padding:"5px 14px",
                fontSize:11,fontWeight:800,cursor:"pointer"}}>
                {v.activa?"Cerrar":"Reabrir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — REPORTES
// ════════════════════════════════════════════════════════════
const ESTADO_COL={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};
const ESTADO_LABEL2={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const TIPO_ICON={bullying:"😰",accidente:"🚑",perdido:"🔍",sugerencia:"💡",otro:"📋"};

function AdminReportes({showToast, onBack}){
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filtro,setFiltro]=useState("recibido");
  const [sel,setSel]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [newMsg,setNewMsg]=useState("");
  const [resolucion,setResolucion]=useState("");
  const [saving,setSaving]=useState(false);
  const bottomRef=useRef(null);

  const ESTADOS=["recibido","en_revision","resuelto","descartado"];

  const load=()=>{
    api.allReports(`?estado=${filtro}`)
      .then(d=>setReports(d.reports||d.data?.reports||[]))
      .catch(()=>[])
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ setLoading(true); load(); },[filtro]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const openSel = async(r) => {
    setSel(r); setMsgs([]); setResolucion("");
    try{
      const d = await api.reportMessages(r.id);
      setMsgs(d.data||d||[]);
    }catch(e){}
  };

  const cambiarEstado=async(id,estado)=>{
    setSaving(true);
    try{
      await api.updateReport(id,{estado,resolucion:resolucion.trim()||null});
      showToast("Reporte actualizado ✅");
      setSel(prev=>({...prev,estado}));
      setResolucion("");load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const sendMsg=async()=>{
    if(!newMsg.trim()) return;
    setSaving(true);
    try{
      const d = await api.sendReportMsg(sel.id, newMsg.trim());
      const nuevoMsg = d.data||d;
      setMsgs(prev=>[...prev, nuevoMsg]);
      setNewMsg("");
      if(sel.estado==='recibido') setSel(prev=>({...prev,estado:'en_revision'}));
      load();
    }catch(e){showToast("Error al enviar","error");}
    finally{setSaving(false);}
  };

  if(sel){
    const tipoInfo = REPORTE_TIPOS.find(t=>t.id===sel.tipo)||{icon:"📋",label:sel.tipo,col:"#64748b"};
    const abierto  = sel.estado!=="resuelto"&&sel.estado!=="descartado";
    return(
      <div style={{minHeight:"100vh",background:"#eef2f7"}}>
        <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
          position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>{setSel(null);load();}} style={{background:"rgba(0,0,0,.15)",border:"none",
              borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:15}}>Caso #{sel.id?.slice(0,8).toUpperCase()}</div>
              <div style={{fontSize:11,opacity:.85}}>{tipoInfo.icon} {tipoInfo.label} · {sel.reporter_nombre||"Anónimo"}</div>
            </div>
            <span style={{background:"rgba(255,255,255,.2)",borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:800}}>
              {ESTADO_LABEL2[sel.estado]}
            </span>
          </div>
        </div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ESTADOS.map(e=>(
              <button key={e} onClick={()=>cambiarEstado(sel.id,e)} disabled={saving||sel.estado===e}
                style={{background:sel.estado===e?ESTADO_COL[e]:"white",color:sel.estado===e?"white":"#555",
                  border:`1.5px solid ${sel.estado===e?ESTADO_COL[e]:"#e8e8e8"}`,borderRadius:99,
                  padding:"5px 13px",fontSize:11,fontWeight:800,cursor:sel.estado===e?"default":"pointer",
                  fontFamily:"Nunito,sans-serif"}}>{ESTADO_LABEL2[e]}</button>
            ))}
          </div>
          <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
            <div style={{background:"#f8f9fa",padding:"12px 16px",borderBottom:"1px solid #e8e8e8"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{sel.reporter_nombre||"Anónimo"}</div>
                  <div style={{fontSize:10,color:"#777"}}>Para: Administración</div>
                </div>
                <div style={{fontSize:10,color:"#aaa",textAlign:"right"}}>
                  {new Date(sel.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                  <br/>{new Date(sel.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"#777"}}>
                Asunto: <span style={{color:tipoInfo.col}}>[{tipoInfo.label.toUpperCase()}]</span> #{sel.id?.slice(0,8).toUpperCase()}
              </div>
            </div>
            <div style={{padding:"14px 16px",fontSize:13,color:"#333",lineHeight:1.7}}>{sel.descripcion}</div>
          </div>
          {msgs.length===0&&(
            <div style={{background:"white",borderRadius:16,padding:"20px",textAlign:"center",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:11,color:"#aaa"}}>Sin mensajes — respondé abajo para iniciar el diálogo</div>
            </div>
          )}
          {msgs.map((m,i)=>{
            const esAdmin = m.sender_rol==="admin";
            return(
              <div key={m.id||i} style={{background:"white",borderRadius:16,overflow:"hidden",
                boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:`4px solid ${esAdmin?"#00c1fc":"#e0e0e0"}`}}>
                <div style={{background:"#f8f9fa",padding:"10px 16px",borderBottom:"1px solid #e8e8e8",
                  display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                    background:esAdmin?"#00c1fc22":"#e8e8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
                    {esAdmin?"👨‍💼":"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:12,color:esAdmin?"#00c1fc":"#1a1a1a"}}>
                      {esAdmin?"Administración":m.sender_nombre}
                    </div>
                    <div style={{fontSize:10,color:"#aaa"}}>
                      {new Date(m.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
                      {" · "}{new Date(m.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                </div>
                <div style={{padding:"12px 16px",fontSize:13,color:"#333",lineHeight:1.7}}>{m.texto}</div>
              </div>
            );
          })}
          {abierto&&(
            <div style={{background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.08)"}}>
              <div style={{background:"#f8f9fa",padding:"10px 16px",borderBottom:"1px solid #e8e8e8",
                fontSize:11,fontWeight:800,color:"#777"}}>↩ RESPONDER COMO ADMINISTRACIÓN</div>
              <div style={{padding:"12px 16px"}}>
                <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta oficial..."
                  rows={3} style={{width:"100%",boxSizing:"border-box",background:"#f7f7f7",
                    border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 14px",fontSize:13,
                    outline:"none",resize:"none",color:"#1a1a1a",fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:10}}/>
                <button onClick={sendMsg} disabled={saving||!newMsg.trim()}
                  style={{width:"100%",background:saving?"#ccc":"#00c1fc",border:"none",borderRadius:50,
                    color:"white",padding:"11px",fontWeight:800,fontSize:13,
                    cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {saving?"Enviando...":"Enviar respuesta oficial ↩"}
                </button>
              </div>
            </div>
          )}
          <div style={{height:16}}/>
        </div>
      </div>
    );
  }  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🚩 Reportes</div>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
          {ESTADOS.map(e=>(
            <button key={e} onClick={()=>setFiltro(e)} style={{
              background:filtro===e?ESTADO_COL[e]:"white",color:filtro===e?"white":"#555",
              border:`1.5px solid ${filtro===e?ESTADO_COL[e]:"#e8e8e8"}`,borderRadius:99,
              padding:"5px 13px",fontSize:11,fontWeight:800,cursor:"pointer",
              whiteSpace:"nowrap",fontFamily:"Nunito,sans-serif"}}>
              {ESTADO_LABEL2[e]}
            </button>
          ))}
        </div>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {!loading&&reports.length===0&&(
          <div style={{textAlign:"center",color:"#aaa",padding:32,background:"white",borderRadius:16}}>
            Sin reportes en este estado
          </div>
        )}
        {reports.map(r=>(
          <div key={r.id} onClick={()=>openSel(r)} style={{background:"white",borderRadius:16,
            padding:"12px 14px",marginBottom:8,cursor:"pointer",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:24,flexShrink:0}}>{TIPO_ICON[r.tipo]||"📋"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",textTransform:"capitalize"}}>{r.tipo}</div>
              <div style={{fontSize:11,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {r.descripcion}
              </div>
              <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                {r.reporter_nombre||"Anónimo"} · {new Date(r.created_at).toLocaleDateString("es-AR")}
              </div>
            </div>
            <span style={{background:ESTADO_COL[r.estado]+"22",color:ESTADO_COL[r.estado],
              borderRadius:99,padding:"3px 9px",fontSize:10,fontWeight:800,flexShrink:0}}>
              {ESTADO_LABEL2[r.estado]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — AULAS
// ════════════════════════════════════════════════════════════
function AdminAulas({showToast, onBack}){
  const [aulas,setAulas]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [desc,setDesc]=useState("");
  const [saving,setSaving]=useState(false);
  const [selAula,setSelAula]=useState(null);
  const [addUser,setAddUser]=useState("");
  const [addRol,setAddRol]=useState("student");

  const load=()=>{
    Promise.all([api.adminClassrooms(),api.adminUsers()])
      .then(([cl,us])=>{
        setAulas(Array.isArray(cl)?cl:cl.data||[]);
        setUsers(Array.isArray(us)?us:us.data||us||[]);
      }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const crear=async()=>{
    if(!nombre.trim()){showToast("Escribí el nombre del aula","error");return;}
    setSaving(true);
    try{
      await api.createClassroom({nombre:nombre.trim(),descripcion:desc.trim()||null});
      showToast("Aula creada ✅");setForm(false);setNombre("");setDesc("");load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const agregarMiembro=async()=>{
    if(!addUser){showToast("Seleccioná un usuario","error");return;}
    try{
      await api.addClassroomMember(selAula.id,{user_id:addUser,rol:addRol});
      showToast("Miembro agregado ✅");
      setAddUser("");
      // Refrescar el aula seleccionada
      const updated=await api.adminClassrooms();
      const aulsArr=Array.isArray(updated)?updated:updated.data||[];
      setAulas(aulsArr);
      setSelAula(aulsArr.find(a=>a.id===selAula.id)||selAula);
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(selAula) return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSelAula(null)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🏫 {selAula.nombre}</div>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
          boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Agregar miembro</div>
          <select value={addUser} onChange={e=>setAddUser(e.target.value)}
            style={{width:"100%",border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 14px",
              fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif",background:"white"}}>
            <option value="">Seleccionar usuario...</option>
            {users.filter(u=>u.activo).map(u=>(
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
            ))}
          </select>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["student","teacher"].map(r=>(
              <button key={r} onClick={()=>setAddRol(r)} style={{
                flex:1,background:addRol===r?"#00c1fc":"#f0f0f0",
                color:addRol===r?"white":"#555",border:"none",borderRadius:12,
                padding:"9px",fontWeight:800,fontSize:12,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
                {r==="student"?"👨‍🎓 Alumno":"👩‍🏫 Docente"}
              </button>
            ))}
          </div>
          <button onClick={agregarMiembro} style={{width:"100%",background:"#00c1fc",border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Agregar al aula
          </button>
        </div>
        <div style={{fontWeight:800,color:"#1a1a1a",fontSize:13,marginBottom:8}}>
          Miembros ({selAula.miembros?.length||selAula.total_miembros||0})
        </div>
        {(selAula.miembros||[]).map(m=>(
          <div key={m.user_id} style={{background:"white",borderRadius:14,padding:"11px 14px",
            marginBottom:6,display:"flex",alignItems:"center",gap:10,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <Av user={{nombre:m.nombre,skin:"s1",border:"b1"}} sz={34}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{m.nombre}</div>
            </div>
            <span style={{background:m.rol==="teacher"?"#00c1fc22":"#10b98122",
              color:m.rol==="teacher"?"#00c1fc":"#10b981",borderRadius:99,
              padding:"3px 9px",fontSize:10,fontWeight:800}}>
              {m.rol==="teacher"?"Docente":"Alumno"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🏫 Aulas</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"✕ Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del aula (ej: 3° B)..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descripción (opcional)..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:10,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear aula"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {aulas.map(a=>(
          <div key={a.id} onClick={()=>setSelAula(a)} style={{background:"white",borderRadius:16,
            padding:"14px 16px",marginBottom:8,cursor:"pointer",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:"#00c1fc22",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏫</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{a.nombre}</div>
              <div style={{fontSize:11,color:"#555",marginTop:2}}>
                {a.total_miembros||a.miembros?.length||0} miembros
                {a.descripcion&&` · ${a.descripcion}`}
              </div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </div>
        ))}
        {!loading&&aulas.length===0&&(
          <div style={{textAlign:"center",color:"#aaa",padding:32,background:"white",borderRadius:16}}>
            No hay aulas creadas aún
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — CONFIGURACIÓN
// ════════════════════════════════════════════════════════════
function AdminConfig({me, logout}){
  const ROL_LABEL={admin:"Administrador",teacher:"Docente",student:"Alumno"};
  const infoItems=[
    {icon:"👤", label:"Nombre",     value:me.nombre},
    {icon:"📧", label:"Correo",     value:me.email},
    {icon:"🔑", label:"Rol",        value:ROL_LABEL[me.rol]||me.rol},
    {icon:"🆔", label:"ID de cuenta",value:me.id?.slice(0,8)+"..."},
    {icon:"🌐", label:"Versión",    value:"Aubank v1.0"},
    {icon:"🏫", label:"Sistema",    value:"EduCoins — Economía Escolar"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      {/* Header */}
      <div style={{background:"#00c1fc",position:"sticky",top:0,zIndex:50,
        padding:"22px 20px 40px",color:"white",overflow:"hidden",
        textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-40,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22}}>⚙️ Configuración</div>
        <div style={{fontSize:13,opacity:.85,marginTop:2}}>Panel de administrador</div>
      </div>

      <div style={{padding:"0 14px 24px",marginTop:-20}}>
        {/* Card avatar + nombre */}
        <div style={{background:"white",borderRadius:20,padding:"20px 16px",
          marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)",textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#00c1fc22",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:36,margin:"0 auto 10px"}}>👨‍💼</div>
          <div style={{fontWeight:900,fontSize:18,color:"#1a1a1a"}}>{me.nombre}</div>
          <div style={{fontSize:12,color:"#777",marginTop:2}}>{me.email}</div>
          <div style={{display:"inline-block",marginTop:8,background:"#00c1fc22",
            color:"#00c1fc",borderRadius:99,padding:"4px 14px",fontSize:11,fontWeight:800}}>
            {ROL_LABEL[me.rol]}
          </div>
        </div>

        {/* Info del sistema */}
        <div style={{background:"white",borderRadius:20,overflow:"hidden",
          boxShadow:"0 1px 8px rgba(0,0,0,.06)",marginBottom:12}}>
          {infoItems.map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,
              padding:"13px 16px",borderBottom:i<infoItems.length-1?"1px solid #f0f0f0":"none"}}>
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#aaa",fontWeight:700}}>{item.label}</div>
                <div style={{fontSize:13,color:"#1a1a1a",fontWeight:700,marginTop:1}}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Links útiles */}
        <div style={{background:"white",borderRadius:20,overflow:"hidden",
          boxShadow:"0 1px 8px rgba(0,0,0,.06)",marginBottom:20}}>
          {[
            {icon:"🔒", label:"Cambiar contraseña", sub:"Próximamente"},
            {icon:"📊", label:"Exportar datos",      sub:"Próximamente"},
            {icon:"🛡️", label:"Permisos del sistema",sub:"Próximamente"},
          ].map((item,i,arr)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,
              padding:"13px 16px",borderBottom:i<arr.length-1?"1px solid #f0f0f0":"none",
              opacity:.5}}>
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:"#1a1a1a",fontWeight:700}}>{item.label}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{item.sub}</div>
              </div>
              <span style={{color:"#ddd",fontSize:16}}>›</span>
            </div>
          ))}
        </div>

        {/* Cerrar sesión */}
        <button onClick={logout} style={{width:"100%",background:"#fee2e2",border:"none",
          borderRadius:16,color:"#ef4444",padding:"14px",fontWeight:900,fontSize:15,
          cursor:"pointer",fontFamily:"Nunito,sans-serif",
          boxShadow:"0 2px 8px rgba(239,68,68,.2)"}}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}
