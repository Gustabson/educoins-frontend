import React, { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react';
import { io } from 'socket.io-client';

// Aubank Frontend — Conectado a API REST + WebSockets

// ── PWA Service Worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// ── THEME CONTEXT — disponible en TODOS los componentes ───────
// Estructura: { primary, secondary, darkBg, cardBg, isDark }
const THEMES_DEFAULT = {
  primary:   '#00c1fc',
  secondary: '#52177f',
  darkBg:    '#12101e',
  cardBg:    '#1e1b2e',
  isDark:    false,
};
const ThemeCtx = createContext(THEMES_DEFAULT);
function useTheme(){ return useContext(ThemeCtx); }

// Preset de temas duales para elegir
const DUAL_THEMES = [
  { id:'oceano',   name:'Océano',        primary:'#00c1fc', secondary:'#0369a1', dark:false, icon:'🌊' },
  { id:'noche',    name:'Noche Violeta', primary:'#7c3aed', secondary:'#c084fc', dark:true,  icon:'🌌' },
  { id:'bosque',   name:'Bosque',        primary:'#10b981', secondary:'#065f46', dark:true,  icon:'🌿' },
  { id:'fuego',    name:'Fuego',         primary:'#f97316', secondary:'#dc2626', dark:false, icon:'🔥' },
  { id:'rosa',     name:'Rosa',          primary:'#ec4899', secondary:'#9d174d', dark:false, icon:'🌸' },
  { id:'dorado',   name:'Dorado',        primary:'#f59e0b', secondary:'#78350f', dark:true,  icon:'✨' },
  { id:'neonverde',name:'Neon Verde',    primary:'#22c55e', secondary:'#14532d', dark:true,  icon:'💚' },
  { id:'aurora',   name:'Aurora',        primary:'#a855f7', secondary:'#06b6d4', dark:false, icon:'🌈' },
];

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
  approve:        (id,data={})            => apiFetch(`/missions/submissions/${id}/approve`, { method:"POST", body:data }),
  reject:         (id, data)              => apiFetch(`/missions/submissions/${id}/reject`,  { method:"POST", body:typeof data==="string"?{reason:data}:data }),
  createMission:  (data)                  => apiFetch("/missions",            { method:"POST", body:data }),
  storeItems:     ()                      => apiFetch("/store/items"),
  createItem:     (data)                  => apiFetch("/store/items",         { method:"POST", body:data }),
  purchase:       (item_id)               => apiFetch("/transactions/purchase",{ method:"POST", body:{item_id} }),
  transfer:       (to_user_id, amount)    => apiFetch("/transactions/transfer",{ method:"POST", body:{to_user_id,amount} }),
  ranking:        ()                      => apiFetch("/ranking/live?periodo=weekly&scope=global"),
  rankingLive:    (p,s,cid)               => apiFetch(`/ranking/live?periodo=${p}&scope=${s}${cid?`&classroom_id=${cid}`:""}`),
  rankingConfig:  ()                      => apiFetch("/ranking/config"),
  rankingConfigUpdate:(id,d)              => apiFetch(`/ranking/config/${id}`, { method:"PATCH", body:d }),
  rankingConfigCreate:(d)                 => apiFetch("/ranking/config",       { method:"POST",  body:d }),
  rankingClose:   (d)                     => apiFetch("/ranking/close",        { method:"POST",  body:d }),
  rankingPayouts: ()                      => apiFetch("/ranking/payouts"),
  rankingRevert:  (id,motivo)             => apiFetch(`/ranking/payouts/${id}/revert`, { method:"POST", body:{motivo} }),
  subscribe:      (item_id,periodo)       => apiFetch("/subscriptions/subscribe", { method:"POST", body:{item_id,periodo} }),
  mySubscriptions:()                      => apiFetch("/subscriptions/me"),
  cancelSub:      (id)                    => apiFetch(`/subscriptions/${id}`,  { method:"DELETE" }),
  chargeAll:      ()                      => apiFetch("/subscriptions/charge-all", { method:"POST" }),
  equip:          (type, item_id)         => apiFetch("/profile/equip",       { method:"POST", body:{type,item_id} }),
  adminUsers:     ()                      => apiFetch("/admin/users"),
  createUser:     (data)                  => apiFetch("/admin/users",         { method:"POST", body:data }),
  treasury:       ()                      => apiFetch("/admin/treasury"),
  mint:           (amount, description)   => apiFetch("/admin/mint",          { method:"POST", body:{amount,description} }),
  burn:           (amount, reason)        => apiFetch("/admin/burn",          { method:"POST", body:{amount,reason} }),
  setBudget:      (teacher_id, monthly_limit) => apiFetch("/admin/teacher-budget", { method:"POST", body:{teacher_id,monthly_limit} }),
  auditLog:       ()                      => apiFetch("/admin/audit-log"),
  adminRanking:   (cid)                   => apiFetch(`/admin/ranking${cid?`?classroom_id=${cid}`:""}`),
  bankTransfer:   (data)                  => apiFetch("/admin/bank-transfer", { method:"POST", body:data }),
  bankRevert:     (data)                  => apiFetch("/admin/bank-revert",   { method:"POST", body:data }),
  applyTax:       (data)                  => apiFetch("/admin/tax",           { method:"POST", body:data }),
  updateItem:     (id,data)               => apiFetch(`/store/items/${id}`,   { method:"PATCH", body:data }),
  deleteItem:     (id)                    => apiFetch(`/store/items/${id}`,   { method:"DELETE" }),
  deactivate:     (id)                    => apiFetch(`/admin/users/${id}/deactivate`, { method:"PATCH" }),
  // ── Noticias ──────────────────────────────────────────────
  posts:          (tag)                   => apiFetch(`/posts${tag?`?tag=${tag}`:""}`),
  post:           (id)                    => apiFetch(`/posts/${id}`),
  createPost:     (data)                  => apiFetch("/posts",               { method:"POST", body:data }),
  // ── Votaciones ────────────────────────────────────────────
  polls:          (scope,cid)             => apiFetch(`/polls${scope?'?scope='+scope+(cid?'&classroom_id='+cid:''):(cid?'?classroom_id='+cid:'')}`),
  poll:           (id)                    => apiFetch(`/polls/${id}`),
  vote:           (poll_id, option_id)    => apiFetch(`/polls/${poll_id}/vote`,{ method:"POST", body:{option_id} }),
  createPoll:     (data)                  => apiFetch("/polls",               { method:"POST", body:data }),
  reactPoll:      (id, tipo)              => apiFetch(`/polls/${id}/react`,    { method:"POST", body:{tipo} }),
  pollComments:   (id)                    => apiFetch(`/polls/${id}/comments`),
  createComment:  (id, data)              => apiFetch(`/polls/${id}/comments`, { method:"POST", body:data }),
  commentReplies: (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}/replies`),
  reactComment:   (pid, cid, tipo)        => apiFetch(`/polls/${pid}/comments/${cid}/react`, { method:"POST", body:{tipo} }),
  deleteComment:  (pid, cid)              => apiFetch(`/polls/${pid}/comments/${cid}`, { method:"DELETE" }),
  // ── Personalización ───────────────────────────────────────
  customShop:     (tipo)     => apiFetch(`/custom/shop${tipo?`?tipo=${tipo}`:""}`),
  customMe:       ()         => apiFetch("/custom/me"),
  customUser:     (id)       => apiFetch(`/custom/user/${id}`),
  customBuy:      (item_id)  => apiFetch("/custom/buy",    { method:"POST", body:{item_id} }),
  customEquip:    (tipo,item_id) => apiFetch("/custom/equip",{ method:"POST", body:{tipo,item_id} }),
  customGift:     (data)     => apiFetch("/custom/gift",   { method:"POST", body:data }),
  customGifts:    ()         => apiFetch("/custom/gifts"),
  customGiftRead: (id)       => apiFetch(`/custom/gifts/${id}/read`, { method:"PATCH" }),
  customAdminItems:  ()      => apiFetch("/custom/admin/items"),
  customAdminCreate: (data)  => apiFetch("/custom/admin/items",       { method:"POST",  body:data }),
  customAdminUpdate: (id,d)  => apiFetch(`/custom/admin/items/${id}`, { method:"PATCH", body:d }),
  setApodo:       (apodo)    => apiFetch("/profile/apodo",            { method:"PATCH", body:{apodo} }),
  setFoto:        (foto_url) => apiFetch("/profile/foto",             { method:"PATCH", body:{foto_url} }),
  setTituloCustom:(titulo)   => apiFetch("/profile/titulo-custom",    { method:"PATCH", body:{titulo} }),
  publicProfile:  (id)       => apiFetch(`/profile/user/${id}`),
  blockUser:      (user_id)  => apiFetch("/profile/block",            { method:"POST", body:{user_id} }),
  unblockUser:    (id)       => apiFetch(`/profile/block/${id}`,      { method:"DELETE" }),
  blockedUsers:   ()         => apiFetch("/profile/blocked"),
  adminEconomy:   ()         => apiFetch("/admin/economy"),
  adminEconomyUpdate:(id,d)  => apiFetch(`/admin/economy/${id}`,      { method:"PATCH", body:d }),
  // ── Check-in ──────────────────────────────────────────────
  checkin:        ()         => apiFetch("/checkin",          { method:"POST" }),
  checkinMe:      ()         => apiFetch("/checkin/me"),
  checkinConfig:  ()         => apiFetch("/checkin/config"),
  checkinConfigUpdate:(d)    => apiFetch("/checkin/config",   { method:"PATCH", body:d }),
  // ── Notificaciones ────────────────────────────────────────
  myNotifs:       ()         => apiFetch("/notifications"),
  notifReadAll:   ()         => apiFetch("/notifications/read",{ method:"PATCH" }),
  notifRead:      (id)       => apiFetch(`/notifications/${id}/read`,{ method:"PATCH" }),
  // ── Misiones avanzadas ────────────────────────────────────
  teacherMissions:()         => apiFetch("/missions/teacher"),
  classroomStudents:()       => apiFetch("/missions/classroom-students"),
  rewardDirect:   (d)        => apiFetch("/missions/reward-direct",{ method:"POST", body:d }),
  updateMission:  (id,d)     => apiFetch(`/missions/${id}`,   { method:"PATCH", body:d }),
  allSubmissions: (estado)   => apiFetch(`/missions/submissions${estado?`?estado=${estado}`:""}`),
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
// ── Helper: nombre visible (apodo si tiene, nombre si no) ────
function displayName(user){ return user?.apodo||user?.nombre||""; }

// ── Hook: animación de contador ───────────────────────────────
function useCountUp(target, duration=600){
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef  = useRef(null);

  useEffect(()=>{
    const from = prevRef.current;
    const to   = target;
    if(from === to){ setDisplay(to); return; }
    prevRef.current = to;

    const diff  = to - from;
    const steps = Math.min(Math.abs(diff), 40); // max 40 pasos
    const step  = diff / steps;
    let current = from;
    let count   = 0;
    const interval = Math.max(8, duration / steps);

    if(rafRef.current) clearInterval(rafRef.current);
    rafRef.current = setInterval(()=>{
      count++;
      current += step;
      if(count >= steps){
        setDisplay(to);
        clearInterval(rafRef.current);
      } else {
        setDisplay(Math.round(current));
      }
    }, interval);

    return () => clearInterval(rafRef.current);
  }, [target, duration]);

  return display;
}

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
@keyframes balUp{0%{color:#10b981;transform:scale(1.18)}60%{color:#10b981;transform:scale(1.06)}100%{color:inherit;transform:scale(1)}}
@keyframes balDown{0%{color:#ef4444;transform:scale(.92)}60%{color:#ef4444;transform:scale(.96)}100%{color:inherit;transform:scale(1)}}
`;

// ── COMPONENTES BASE ──────────────────────────────────────────
function Av({user,sz}){
  const s=sz||48;
  const sk=SKINS.find(x=>x.id===(user?.skin||"s1"))||SKINS[0];
  const br=BORDERS.find(x=>x.id===(user?.border||"b1"))||BORDERS[0];
  // Si tiene foto personalizada, mostrarla
  if(user?.foto_url) return(
    <div style={{width:s,height:s,borderRadius:"50%",border:br.bs,overflow:"hidden",
      flexShrink:0,boxShadow:`0 2px 10px rgba(0,0,0,.2)`}}>
      <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
    </div>
  );
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
function OHdrA({title,extra,onBack=null}){
  const {primary,isDark,txt,cardBg} = useTheme();
  return(
    <div style={{background:primary,position:"sticky",top:0,zIndex:50,overflow:"hidden",
      paddingBottom:28,color:"white",transition:"background .3s"}}>
      <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
        background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
      <div style={{padding:"22px 20px 0",position:"relative"}}>
        {onBack ? (
          <div style={{display:"flex",alignItems:"center",position:"relative",minHeight:32}}>
            <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",
              borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1}}>←</button>
            <div style={{position:"absolute",left:0,right:0,textAlign:"center",pointerEvents:"none",
              fontWeight:900,letterSpacing:"-.5px",color:"white",fontSize:20}}>
              {title}
            </div>
          </div>
        ) : (
          <div style={{fontWeight:900,letterSpacing:"-.5px",color:"white",fontSize:22}}>{title}</div>
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
  const [notifs,setNotifs]=useState([]);
  const [badges,setBadges]=useState({chat:0,notifs:0});

  // ── Tema dual ────────────────────────────────────────────────
  const savedThemeId = localStorage.getItem("ec_theme")||"oceano";
  const savedDark    = localStorage.getItem("ec_dark")==="true";
  const [themeId,setThemeId]     = useState(savedThemeId);
  const [isDark,setIsDark]       = useState(savedDark);
  const [dbThemePrimary,setDbThemePrimary] = useState(null); // color primario del tema equipado en DB

  // Prioridad: color de DB > DUAL_THEMES locales
  const baseTheme = DUAL_THEMES.find(t=>t.id===themeId)||DUAL_THEMES[0];
  const primary   = dbThemePrimary || baseTheme.primary;
  const secondary = baseTheme.secondary;

  const theme = {
    primary,
    secondary,
    isDark,
    darkBg:   isDark?"#0d0d1a":"#F0F0F0",
    cardBg:   isDark?"#1a1828":"white",
    navBg:    isDark?"#1a1828":"white",
    navBord:  isDark?"#2a2740":"#EFEFEF",
    navActiv: primary,
    navInact: isDark?"#666":"#777777",
    navPill:  isDark?"#2a2740":"#f0f9ff",
    pageBg:   isDark?"#0d0d1a":"#F0F0F0",
    txt:      isDark?"#e8e8f0":"#1a1a1a",
    sub:      isDark?"#888":"#555",
    inputBg:  isDark?"#2a2740":"#F7F7F7",
    inputBd:  isDark?"#3a3758":"#E8E8E8",
  };

  const setTheme=(id, directPrimary)=>{
    setThemeId(id||"oceano");
    if(directPrimary) setDbThemePrimary(directPrimary);
    else setDbThemePrimary(null);
    localStorage.setItem("ec_theme", id||"oceano");
  };
  const toggleDark=(d)=>{
    setIsDark(d);
    localStorage.setItem("ec_dark",d?"true":"false");
  };

  // ── Personalización del server ───────────────────────────────
  const [customActive,setCustomActive]=useState(null);
  useEffect(()=>{
    api.customMe().then(d=>{
      const data=d.data||d;
      setCustomActive(data?.active||null);
      // Aplicar tema equipado en la DB
      if(data?.active?.theme_config){
        const tc = typeof data.active.theme_config==="string"
          ? JSON.parse(data.active.theme_config)
          : data.active.theme_config;
        if(tc?.primary){
          // Usar el color primario directo de la DB
          setDbThemePrimary(tc.primary);
          // Intentar sincronizar con DUAL_THEMES si coincide
          const match = DUAL_THEMES.find(t=>t.primary===tc.primary);
          if(match) setThemeId(match.id);
        }
      }
    }).catch(()=>{});
  },[]);

  const nameColorConfig = customActive?.name_color_config
    ? (typeof customActive.name_color_config==="string"
        ? JSON.parse(customActive.name_color_config)
        : customActive.name_color_config)
    : null;

  // ── Balance animado ──────────────────────────────────────────
  const displayBalance = useCountUp(balance, 500);
  const [balDir,setBalDir] = useState(null); // 'up'|'down'|null
  const prevBal = useRef(balance);
  useEffect(()=>{
    if(balance===prevBal.current) return;
    setBalDir(balance>prevBal.current?"up":"down");
    prevBal.current=balance;
    const t=setTimeout(()=>setBalDir(null),1600);
    return()=>clearTimeout(t);
  },[balance]);

  const hideNav = ["chat","noticias","votaciones","reportes","notificaciones"].includes(tab);

  // ── Socket notificaciones ────────────────────────────────────
  useEffect(()=>{
    const token=localStorage.getItem("ec_token");
    if(!token) return;
    const s=connectSocket(token);
    const onNotif=(n)=>{
      setNotifs(prev=>[{...n,id:Date.now(),leida:false},...prev.slice(0,19)]);
      if(n.type==="chat_personal") setBadges(b=>({...b,chat:b.chat+1}));
      else setBadges(b=>({...b,notifs:b.notifs+1}));
      const msg=n.type==="reward"?`Recibiste 🪙${n.amount} — ${n.description||""}`
        :n.type==="transfer"?`Te enviaron 🪙${n.amount}`
        :n.type==="chat_personal"?`Nuevo mensaje de ${n.from}`
        :n.type==="mission_approved"?`Mision aprobada! +🪙${n.amount}`
        :n.type==="checkin"?`Check-in dia ${n.racha}! +🪙${n.recompensa}`
        :n.type==="gift"?`Regalo de ${n.from}! 🎁`
        :n.type==="tax"?`Impuesto: -🪙${n.amount} — ${n.motivo||""}`
        :"Nueva notificacion";
      showToast(msg);
      if(["reward","transfer","checkin","gift"].includes(n.type)) refreshBalance();
    };
    s.on('notification',onNotif);
    return()=>s.off('notification',onNotif);
  },[]);

  const navTo=(dest)=>{
    setTab(dest);
    if(dest==="chat") setBadges(b=>({...b,chat:0}));
    if(dest==="notificaciones"||dest==="opciones") setBadges(b=>({...b,notifs:0}));
  };

  return(
    <ThemeCtx.Provider value={theme}>
    <div style={{maxWidth:480,margin:"0 auto",height:"100vh",background:theme.pageBg,
      display:"flex",flexDirection:"column",fontFamily:"Nunito,sans-serif",
      transition:"background .3s",overflow:"hidden"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:hideNav?0:90,animation:"fadeIn .18s ease"}}>
        {tab==="home"       && <AHome       me={me} balance={balance} displayBalance={displayBalance} balDir={balDir} onNav={navTo} badges={badges} nameColorConfig={nameColorConfig}/>}
        {tab==="misiones"   && <AMisiones   me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="tienda"     && <ATienda     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="enviar"     && <AEnviar     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="movimientos"&& <AMovimientos/>}
        {tab==="ingresar"   && <AIngresar   me={me} onBack={()=>setTab("home")}/>}
        {tab==="perfil"     && <APerfil     me={me} balance={balance} logout={logout} showToast={showToast} setMe={setMe}/>}
        {tab==="ranking"    && <ARanking    nameColorConfig={nameColorConfig}/>}
        {tab==="opciones"   && <AOpciones   me={me} logout={logout} notifs={notifs}/>}
        {tab==="notificaciones"&&<ANotificaciones me={me} onBack={()=>navTo("home")} notifs={notifs} setNotifs={setNotifs}/>}
        {tab==="personalizar"&&<ATiendaCustom me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance} onBack={()=>navTo("home")} onCustomChange={setCustomActive} onThemeChange={(id,directPrimary)=>{ if(id) setThemeId(id); if(directPrimary!==undefined) setDbThemePrimary(directPrimary); }} onDarkChange={toggleDark} currentThemeId={themeId} isDark={isDark}/>}
        {tab==="chat"       && <AChat       me={me} showToast={showToast} onBack={()=>navTo("home")} nameColorConfig={nameColorConfig}/>}
        {tab==="noticias"   && <ANoticias   me={me} onBack={()=>navTo("home")}/>}
        {tab==="votaciones" && <AVotaciones me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
        {tab==="reportes"   && <AReportes   me={me} showToast={showToast} onBack={()=>navTo("home")}/>}
      </div>

      {/* Modal QR Scanner */}
      {camOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:400,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setCamOpen(false);}}>
          <div style={{background:theme.cardBg,borderRadius:"24px 24px 0 0",
            width:"100%",maxWidth:480,padding:"20px 24px 44px",animation:"slideUp .25s ease"}}>
            <div style={{width:36,height:4,background:theme.isDark?"#555":"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontWeight:900,fontSize:18,color:theme.txt,marginBottom:4,textAlign:"center"}}>Escanear QR</div>
            <div style={{fontSize:12,color:theme.sub,textAlign:"center",marginBottom:16}}>
              Apuntá la cámara al QR de tu compañero
            </div>
            <label style={{display:"block",cursor:"pointer"}}>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}}
                onChange={()=>{ setCamOpen(false); showToast("Funcion disponible en la app movil"); }}/>
              <div style={{width:200,height:200,margin:"0 auto 16px",borderRadius:20,
                border:`3px solid ${theme.primary}`,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",background:theme.isDark?"#2d2a45":"#f0f9ff"}}>
                <div style={{fontSize:56,marginBottom:8}}>📷</div>
                <div style={{fontSize:12,fontWeight:700,color:theme.primary}}>Toca para abrir cámara</div>
              </div>
            </label>
            <button onClick={()=>{setCamOpen(false);navTo("enviar");}}
              style={{width:"100%",background:theme.primary,border:"none",borderRadius:50,
                color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              Ir a Enviar dinero →
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      {!hideNav&&(
      <div style={{position:"sticky",bottom:0,width:"100%",zIndex:100}}>
        <div style={{position:"absolute",top:-22,left:"50%",transform:"translateX(-50%)",zIndex:101}}>
          <button onClick={()=>setCamOpen(true)} style={{
            width:68,height:68,borderRadius:"50%",background:theme.primary,
            border:`4px solid ${theme.navBg}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:26,cursor:"pointer",
            boxShadow:`0 4px 20px ${theme.primary}66`,outline:"none",transition:"background .3s"}}>
            📷
          </button>
        </div>
        <div style={{background:theme.navBg,borderTop:`1px solid ${theme.navBord}`,
          padding:"6px 4px 14px",display:"flex",justifyContent:"space-around",
          boxShadow:"0 -2px 16px rgba(0,0,0,.12)",transition:"background .3s"}}>
          {[
            {id:"home",       icon:"🏠",label:"Inicio"},
            {id:"tienda",     icon:"🛒",label:"Tienda"},
            {id:"_cam",       isCam:true},
            {id:"movimientos",icon:"📊",label:"Movimientos"},
            {id:"opciones",   icon:"☰", label:"Opciones"},
          ].map(item=>{
            if(item.isCam) return <div key="_cam" style={{width:68,flexShrink:0}}/>;
            const on=tab===item.id;
            return(
              <button key={item.id} onClick={()=>navTo(item.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
                background:"none",border:"none",cursor:"pointer",
                color:on?theme.navActiv:theme.navInact,
                fontFamily:"Nunito,sans-serif",padding:"3px 6px",transition:"color .3s",position:"relative"}}>
                <div style={{width:36,height:30,borderRadius:10,
                  background:on?theme.navPill:"transparent",
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
    </ThemeCtx.Provider>
  );
}
function AOpciones({me,logout,notifs=[]}){
  const {primary:accent,isDark,txt,sub,cardBg} = useTheme();
  const dark = isDark;
  const noLeidas=notifs.filter(n=>!n.leida).length;

  const NOTIF_ICON={
    reward:"🪙", transfer:"💸", chat_personal:"💬",
    mission_approved:"✅", mission_rejected:"❌",
    checkin:"🔥", gift:"🎁", tax:"⚖️",
  };
  const NOTIF_TEXT={
    reward:       n=>`Recibiste 🪙${n.amount} — ${n.description||""}`,
    transfer:     n=>`Te enviaron 🪙${n.amount}`,
    chat_personal:n=>`Nuevo mensaje de ${n.from||"alguien"}`,
    mission_approved:n=>`Mision aprobada! +🪙${n.amount||""}${n.feedback?` — "${n.feedback}"`:""}`,
    mission_rejected:n=>`Necesita mejoras: ${n.feedback||""}`,
    checkin:      n=>`Check-in dia ${n.racha}! +🪙${n.recompensa||""}`,
    gift:         n=>`Regalo de ${n.from||"alguien"}! 🎁`,
    tax:          n=>`Impuesto aplicado: -🪙${n.amount} — ${n.motivo||""}`,
  };

  return(
    <div style={{background:dark?"#12101e":"#F0F0F0",minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="☰ Opciones"/>
      <div style={{padding:"0 14px",marginTop:12}}>

        {/* Notificaciones recientes */}
        {notifs.length>0&&(
          <div style={{background:cardBg,borderRadius:20,overflow:"hidden",marginBottom:12,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${dark?"#2d2a45":"#f0f0f0"}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt}}>🔔 Notificaciones</div>
              {noLeidas>0&&<span style={{background:"#ef4444",color:"white",borderRadius:99,
                padding:"2px 8px",fontSize:10,fontWeight:800}}>{noLeidas} nuevas</span>}
            </div>
            {notifs.slice(0,5).map((n,i)=>(
              <div key={n.id||i} style={{padding:"11px 16px",
                borderBottom:i<Math.min(notifs.length,5)-1?`1px solid ${dark?"#2d2a45":"#f5f5f5"}`:"none",
                display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:20,flexShrink:0}}>{NOTIF_ICON[n.type]||"🔔"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:txt,fontWeight:600}}>
                    {NOTIF_TEXT[n.type]?.(n)||n.type}
                  </div>
                  <div style={{fontSize:10,color:sub,marginTop:1}}>Hace un momento</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {[
          ["❓","Ayuda","Como funciona Aubank","#3b82f6"],
          ["⚙️","Configuracion","Ajustes de la cuenta","#94a3b8"],
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
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}

function AHome({me,balance,displayBalance,balDir,onNav,badges={},nameColorConfig}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;
  const [checkin,setCheckin]=useState(null);
  const [doingCheckin,setDoingCheckin]=useState(false);
  const arrow = dark?"#555":"#ddd";

  useEffect(()=>{ api.checkinMe().then(d=>setCheckin(d.data||d)).catch(()=>{}); },[]);

  const hacerCheckin=async()=>{
    setDoingCheckin(true);
    try{
      const d=await api.checkin();
      const data=d.data||d;
      setCheckin(prev=>({...prev, ya_hizo_hoy:true, racha_actual:data.racha, hoy:data}));
    }catch(e){}
    finally{setDoingCheckin(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:pageBg,transition:"background .3s"}}>
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,overflow:"hidden",
        paddingBottom:20,color:"white",transition:"background .3s"}}>
        <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-80,right:-70,pointerEvents:"none"}}/>
        <div style={{padding:"22px 20px 0",position:"relative"}}>

          {/* Fila superior */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button onClick={()=>onNav("perfil")} style={{display:"flex",alignItems:"center",gap:10,
              background:"none",border:"none",cursor:"pointer",padding:0,color:"white"}}>
              <Av user={me} sz={44}/>
              <div style={{fontWeight:900,fontSize:17,lineHeight:1.1}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
            </button>
            <button onClick={()=>onNav("personalizar")} style={{
              display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.18)",
              border:"1.5px solid rgba(255,255,255,.3)",borderRadius:50,padding:"6px 12px",
              cursor:"pointer",color:"white",fontSize:12,fontWeight:800,fontFamily:"Nunito,sans-serif"}}>
              🎨 Tema
            </button>
          </div>

          {/* Caja de ahorro */}
          <div style={{background:"rgba(255,255,255,.18)",borderRadius:22,padding:"16px 20px 14px",
            border:"1.5px solid rgba(255,255,255,.25)",marginBottom:18}}>
            <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:".1em",marginBottom:4}}>CAJA DE AHORRO</div>
            <div style={{fontWeight:900,fontSize:38,letterSpacing:"-1.5px",lineHeight:1,
              animation:balDir==="up"?"balUp 1.4s ease":balDir==="down"?"balDown 1.4s ease":"none",
              display:"flex",alignItems:"center",gap:10}}>
              🪙 {(displayBalance||balance).toLocaleString("es-AR")}
              {balDir&&(
                <span style={{fontSize:18,fontWeight:900,animation:"fadeIn .2s ease",
                  color:balDir==="up"?"#a7f3d0":"#fca5a5"}}>
                  {balDir==="up"?"▲":"▼"}
                </span>
              )}
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
            <CircBtn icon="💸" label="Enviar"    onClick={()=>onNav("enviar")}/>
            <CircBtn icon="⬇️" label="Ingresar"  onClick={()=>onNav("ingresar")}/>
            <CircBtn icon="👥" label="Amigos"    onClick={()=>onNav("chat")}/>
            <CircBtn icon="⚡" label="Misiones"  onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"   onClick={()=>onNav("ranking")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos con check-in */}
      <div style={{padding:"14px 14px 8px",background:dark?"#12101e":"#F5F5F5",minHeight:"60vh",transition:"background .3s"}}>

        {/* Widget check-in */}
        {checkin&&(
          <div onClick={!checkin.ya_hizo_hoy&&!doingCheckin?hacerCheckin:undefined}
            style={{marginBottom:12,borderRadius:20,padding:"14px 16px",cursor:!checkin.ya_hizo_hoy?"pointer":"default",
              background:checkin.ya_hizo_hoy
                ?(dark?"#052e16":"#f0fdf4")
                :accent+"22",
              border:`1.5px solid ${checkin.ya_hizo_hoy?"#10b981":(dark?"#7c3aed":"#00c1fc")}`,
              display:"flex",alignItems:"center",gap:12,transition:"all .2s"}}>
            <div style={{fontSize:32}}>{checkin.ya_hizo_hoy?"✅":"🔥"}</div>
            <div style={{flex:1}}>
              {checkin.ya_hizo_hoy?(
                <>
                  <div style={{fontWeight:800,fontSize:14,color:"#10b981"}}>Check-in completado</div>
                  <div style={{fontSize:12,color:sub}}>Racha: {checkin.racha_actual} día{checkin.racha_actual!==1?"s":""} 🔥</div>
                </>
              ):(
                <>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>Hacé tu check-in diario</div>
                  <div style={{fontSize:12,color:sub}}>
                    {doingCheckin?"Registrando...":
                     `Racha actual: ${checkin.racha_actual||0} días · Ganás 🪙${checkin.config?.base_reward||5}`}
                  </div>
                </>
              )}
            </div>
            {!checkin.ya_hizo_hoy&&!doingCheckin&&(
              <div style={{background:"#10b981",borderRadius:99,padding:"6px 12px",
                fontSize:11,fontWeight:800,color:"white"}}>
                +🪙{checkin.config?.base_reward||5}
              </div>
            )}
          </div>
        )}

        <div style={{fontWeight:900,color:txt,fontSize:15,marginBottom:10,transition:"color .3s"}}>Accesos rápidos</div>
        {[
          ["💬","Chat",          "Personal · Aula · Global",    "#3b82f6","chat",         badges.chat],
          ["📰","Noticias",      "Novedades de la escuela",     "#10b981","noticias",     0],
          ["🗳️","Votaciones",    "Participá en encuestas",      "#8b5cf6","votaciones",   0],
          ["🎨","Personalizar",  "Temas, emojis y más",         "#f59e0b","personalizar", 0],
          ["🔔","Notificaciones","Misiones, premios y más",     "#ef4444","notificaciones",badges.notifs],
          ["🚩","Reportes",      "Enviá un reporte",            "#64748b","reportes",     0],
        ].map(([ic,lb,sb,col,dest,badge])=>(
          <div key={lb} onClick={()=>onNav(dest)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",
              marginBottom:8,background:dark?`${accent}22`:`${accent}18`,borderRadius:20,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              transition:"background .3s",position:"relative"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:46,height:46,borderRadius:14,background:col+"22",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{ic}</div>
              {badge>0&&(
                <div style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"white",
                  borderRadius:99,minWidth:18,height:18,fontSize:10,fontWeight:900,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>
                  {badge>9?"9+":badge}
                </div>
              )}
            </div>
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

function AMisiones({me,balance,showToast,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const [missions,setMissions]=useState([]);
  const [mySubmissions,setMySubmissions]=useState([]);
  const [loading,setLoading]=useState(true);

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
      <OHdrA title="Misiones ⚡"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {missions.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center"}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin misiones disponibles</div>
          </div>
        )}
        {missions.map(m=>{
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

function ATienda({me,balance,showToast,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub:subTxt,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(null);
  const [revealed,setRevealed]=useState(null);
  const [lightbox,setLightbox]=useState(null);

  useEffect(()=>{
    api.storeItems().then(d=>setItems(Array.isArray(d)?d:d.data||d||[])).finally(()=>setLoading(false));
  },[]);

  const buy=async(item)=>{
    if(balance<item.precio){showToast("No tenes saldo suficiente","error");return;}
    setBuying(item.id);
    try{
      await api.purchase(item.id);
      showToast(`Compraste "${item.nombre}"! 🎉`);
      await refreshBalance();
      const updated=await api.storeItems();
      const arr=Array.isArray(updated)?updated:updated.data||updated||[];
      setItems(arr);
      const freshItem=arr.find(i=>i.id===item.id);
      if(freshItem?.mensaje_oculto) setRevealed(freshItem);
    }catch(e){showToast(e.message||"Error al comprar","error");}
    finally{setBuying(null);}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando tienda...</div>;

  return(
    <div style={{background:bg,minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Tienda"
        extra={<div style={{marginTop:8,fontSize:13,opacity:.9,fontWeight:700}}>
          Tu saldo: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>

      {/* Lightbox */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:500,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <img src={lightbox} alt="" style={{maxWidth:"100%",maxHeight:"80vh",
            borderRadius:16,objectFit:"contain"}}/>
          <button onClick={()=>setLightbox(null)}
            style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",
              border:"none",borderRadius:"50%",color:"white",width:40,height:40,
              cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>
        </div>
      )}

      {/* Modal mensaje oculto */}
      {revealed&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:cardBg,borderRadius:24,padding:28,width:"100%",maxWidth:360,
            textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{fontSize:48,marginBottom:12}}>{revealed.icon||"🎁"}</div>
            <div style={{fontWeight:900,fontSize:16,color:txt,marginBottom:4}}>{revealed.nombre}</div>
            <div style={{fontSize:12,color:subTxt,marginBottom:16}}>Tu recompensa secreta:</div>
            <div style={{background:dark?"#2d2a45":"#faf5ff",border:`1.5px solid ${accent}44`,
              borderRadius:14,padding:"14px 16px",fontSize:13,color:txt,fontWeight:700,
              lineHeight:1.6,marginBottom:20,textAlign:"left"}}>
              🔒 {revealed.mensaje_oculto}
            </div>
            <button onClick={()=>setRevealed(null)}
              style={{background:accent,border:"none",borderRadius:50,color:"white",
                padding:"12px 32px",fontWeight:800,fontSize:14,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
              Entendido!
            </button>
          </div>
        </div>
      )}

      <div style={{padding:"0 14px",marginTop:12}}>
        {items.map(item=>{
          const canBuy=balance>=item.precio;
          const sinStock=item.stock===0;
          const hasMensaje=!!item.mensaje_oculto;
          const hasImg=!!item.imagen_url;
          return(
            <div key={item.id} style={{marginBottom:12,background:cardBg,borderRadius:20,
              overflow:"hidden",opacity:sinStock?.5:1,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              {/* Imagen clicable con aspect ratio correcto */}
              {hasImg&&(
                <div onClick={()=>setLightbox(item.imagen_url)}
                  style={{cursor:"pointer",position:"relative",
                    paddingBottom:"52%", // aspect ratio 52% ≈ landscape
                    background:dark?"#2d2a45":"#f5f5f5",overflow:"hidden"}}>
                  <img src={item.imagen_url} alt={item.nombre}
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",
                      objectFit:"cover",transition:"transform .2s"}}
                    onMouseEnter={e=>e.target.style.transform="scale(1.04)"}
                    onMouseLeave={e=>e.target.style.transform="scale(1)"}/>
                  <div style={{position:"absolute",bottom:8,right:8,
                    background:"rgba(0,0,0,.4)",borderRadius:99,padding:"3px 8px",
                    fontSize:10,color:"white",fontWeight:700}}>
                    🔍 Ver completa
                  </div>
                </div>
              )}
              <div style={{padding:"14px 14px",display:"flex",gap:12,alignItems:"center"}}>
                {!hasImg&&<div style={{fontSize:36,flexShrink:0}}>{item.icon||"🎁"}</div>}
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{item.nombre}</div>
                  {item.descripcion&&<div style={{fontSize:12,color:subTxt,marginTop:2}}>{item.descripcion}</div>}
                  {hasMensaje&&(
                    <div style={{marginTop:4}}>
                      <span style={{background:accent+"22",color:accent,borderRadius:99,
                        padding:"2px 8px",fontSize:10,fontWeight:800}}>🔒 Mensaje secreto incluido</span>
                    </div>
                  )}
                  {item.stock!==-1&&<div style={{fontSize:10,color:dark?"#555":"#ccc",fontWeight:700,marginTop:4}}>
                    Stock: {item.stock}
                  </div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,color:accent,fontSize:15,marginBottom:8}}>
                    🪙{item.precio}
                  </div>
                  <button onClick={()=>buy(item)}
                    disabled={!canBuy||sinStock||buying===item.id}
                    style={{background:sinStock?"#f0f0f0":!canBuy?"#f0f0f0":buying===item.id?"#ccc":accent,
                      color:sinStock||!canBuy?"#aaa":"white",border:"none",borderRadius:99,
                      padding:"8px 14px",fontWeight:800,fontSize:11,cursor:canBuy&&!sinStock?"pointer":"not-allowed",
                      fontFamily:"Nunito,sans-serif",whiteSpace:"nowrap"}}>
                    {sinStock?"Sin stock":!canBuy?"Sin saldo":buying===item.id?"...":"Comprar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:40,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Tienda vacia</div>
          </div>
        )}
      </div>
    </div>
  );
}


function AEnviar({me,balance,showToast,refreshBalance}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
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
      <OHdrA title="Enviar 💸"
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
                style={{background:selected?.id===f.user_id?accent+"22":cardBg,
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
                style={{background:selected?.id===u.id?accent+"22":cardBg,
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

// ── INGRESAR — CVU + QR ───────────────────────────────────────
function AIngresar({me, onBack}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg} = useTheme();
  const [copied,setCopied] = useState(false);

  // CVU = primeros 8 chars del ID del usuario, formateado
  const cvu = me.id.replace(/-/g,"").toUpperCase().slice(0,22);
  const cvuFormateado = cvu.match(/.{1,4}/g)?.join(" ") || cvu;

  const copiar = () => {
    navigator.clipboard?.writeText(cvu).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    }).catch(()=>{
      // Fallback para móvil
      const el = document.createElement("textarea");
      el.value = cvu;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    });
  };

  // QR visual generado con CSS — matriz de 21x21 con patrón único basado en el ID
  const qrData = me.id.replace(/-/g,"");
  const QR_SIZE = 21;
  const qrMatrix = Array.from({length:QR_SIZE}, (_, row) =>
    Array.from({length:QR_SIZE}, (_, col) => {
      // Patrones fijos de esquinas (finder patterns)
      const inTL = row<7&&col<7;
      const inTR = row<7&&col>13;
      const inBL = row>13&&col<7;
      if(inTL||inTR||inBL){
        const lr=inTL?row:(inTR?row:row-14);
        const lc=inTL?col:(inTR?col-14:col);
        if(lr===0||lr===6||lc===0||lc===6) return 1;
        if(lr>=2&&lr<=4&&lc>=2&&lc<=4) return 1;
        return 0;
      }
      // Timing patterns
      if(row===6||col===6) return (row+col)%2===0?1:0;
      // Datos — generados del ID del usuario
      const idx = (row*QR_SIZE+col)%qrData.length;
      const charCode = qrData.charCodeAt(idx);
      return (charCode+(row*7)+(col*3))%3===0?1:0;
    })
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="⬇️ Ingresar" onBack={onBack}
        extra={<div style={{fontSize:12,opacity:.85,marginTop:4,fontWeight:600}}>
          Tu código para recibir monedas
        </div>}/>

      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>

        {/* QR Code */}
        <div style={{background:cardBg,borderRadius:24,padding:"24px 20px",textAlign:"center",
          boxShadow:dark?"0 2px 16px rgba(0,0,0,.4)":"0 2px 16px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:13,fontWeight:700,color:sub,marginBottom:16}}>
            Mostrá este QR para recibir monedas
          </div>

          {/* QR Visual */}
          <div style={{display:"inline-block",background:"white",padding:12,borderRadius:16,
            boxShadow:"0 2px 12px rgba(0,0,0,.12)"}}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${QR_SIZE},10px)`,gap:0}}>
              {qrMatrix.flat().map((cell,i)=>(
                <div key={i} style={{
                  width:10,height:10,
                  background:cell?"#1a1a1a":"white"
                }}/>
              ))}
            </div>
          </div>

          <div style={{marginTop:16,fontWeight:900,fontSize:13,color:txt}}>{me.nombre}</div>
          <div style={{fontSize:11,color:sub,marginTop:2}}>ID: {me.id.slice(0,8).toUpperCase()}...</div>
        </div>

        {/* CVU */}
        <div style={{background:cardBg,borderRadius:20,padding:"18px 16px",
          boxShadow:dark?"0 2px 16px rgba(0,0,0,.4)":"0 2px 16px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:11,fontWeight:800,color:sub,letterSpacing:".08em",marginBottom:8}}>
            TU ID ÚNICO (CVU)
          </div>
          <div style={{fontWeight:900,fontSize:17,color:txt,letterSpacing:"2px",
            fontFamily:"monospace",marginBottom:14,wordBreak:"break-all"}}>
            {cvuFormateado}
          </div>
          <button onClick={copiar} style={{
            width:"100%",background:copied?"#10b981":accent,border:"none",
            borderRadius:50,color:"white",padding:"13px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"background .3s",
            boxShadow:`0 4px 14px ${copied?"#10b981":"#00c1fc"}44`}}>
            {copied?"✓ Copiado!":"📋 Copiar ID"}
          </button>
        </div>

        {/* Instrucciones */}
        <div style={{background:cardBg,borderRadius:20,padding:"16px",
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,color:txt,fontSize:13,marginBottom:10}}>¿Cómo recibir monedas?</div>
          {[
            ["1","Compartí tu QR o tu ID con quien te quiera enviar monedas"],
            ["2","En la pantalla Enviar, el otro alumno pega tu ID en la sección Manual"],
            ["3","Las monedas llegan instantáneamente a tu cuenta"],
          ].map(([n,t])=>(
            <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:accent+"22",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:900,color:accent,flexShrink:0}}>{n}</div>
              <div style={{fontSize:12,color:sub,lineHeight:1.5}}>{t}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function AMovimientos(){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg,inputBg,inputBd} = useTheme();
  const [txs,setTxs]       = useState([]);
  const [loading,setLoading]= useState(true);
  const [search,setSearch]  = useState("");

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
      <OHdrA title="Movimientos 📊"/>

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

// ── Panel de Apodo ────────────────────────────────────────────
function ApodoPanel({me,owned,items,balance,dark,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent,inputBg,inputBd}){
  const hasPermiso = owned.some(o=>o.tipo==="nickname");
  const nicknameItem = items.find(i=>i.tipo==="nickname");
  const [apodoVal, setApodoVal] = useState(me.apodo||"");
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);

  const comprar=async()=>{
    if(!nicknameItem){showToast("Item no disponible","error");return;}
    if(balance<nicknameItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{
      await api.customBuy(nicknameItem.id);
      showToast("Permiso de apodo desbloqueado!");
      await onRefreshBalance();
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardar=async()=>{
    if(!apodoVal.trim()){showToast("Escribe un apodo","error");return;}
    setSaving(true);
    try{
      await api.setApodo(apodoVal.trim());
      showToast("Apodo guardado!");
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const borrar=async()=>{
    setSaving(true);
    try{
      await api.setApodo(null);
      setApodoVal("");
      showToast("Apodo eliminado");
      onRefresh();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,
      boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>🏷️</div>
        <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Cambio de Apodo</div>
        <div style={{fontSize:12,color:sub,lineHeight:1.6}}>
          Elegis como te ven todos en el chat, ranking y perfil.
          Tu nombre real no cambia.
        </div>
      </div>
      {nicknameItem?(
        <button onClick={comprar} disabled={buying||balance<nicknameItem.precio}
          style={{width:"100%",background:buying||balance<nicknameItem.precio?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif",
            boxShadow:`0 4px 14px ${accent}44`}}>
          {buying?"Comprando...":balance<nicknameItem.precio
            ?`Sin saldo (necesitas 🪙${nicknameItem.precio})`
            :`Comprar por 🪙${nicknameItem.precio}`}
        </button>
      ):(
        <div style={{background:dark?"#2d2a45":"#f0f0f0",borderRadius:12,padding:"12px 16px",
          fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aun no habilitó este item en la tienda
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,
      boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>🏷️ Tu Apodo</div>
      <div style={{fontSize:12,color:sub,marginBottom:14,lineHeight:1.5}}>
        Todos te veran por este apodo. Tu nombre real ({me.nombre}) no cambia.
      </div>
      {me.apodo&&(
        <div style={{background:accent+"18",borderRadius:12,padding:"10px 14px",
          marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:900,fontSize:18,color:accent}}>{me.apodo}</span>
          <span style={{fontSize:11,color:sub}}>— tu apodo actual</span>
        </div>
      )}
      <input value={apodoVal} onChange={e=>setApodoVal(e.target.value)} maxLength={30}
        placeholder="Escribe tu apodo..."
        style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
          borderRadius:12,padding:"11px 14px",fontSize:15,fontWeight:700,outline:"none",
          color:txt,fontFamily:"Nunito,sans-serif",marginBottom:10}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={guardar} disabled={saving||!apodoVal.trim()}
          style={{flex:1,background:saving||!apodoVal.trim()?"#ccc":accent,border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:13,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":"Guardar apodo"}
        </button>
        {me.apodo&&(
          <button onClick={borrar} disabled={saving}
            style={{background:dark?"#2d2a45":"#f0f0f0",border:"none",borderRadius:50,
              color:sub,padding:"12px 16px",fontWeight:700,fontSize:12,cursor:"pointer",
              fontFamily:"Nunito,sans-serif"}}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Panel de Foto de Perfil ───────────────────────────────────
function FotoPanel({me,owned,items,balance,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent}){
  const hasPermiso = owned.some(o=>o.tipo==="photo_profile");
  const fotoItem   = items.find(i=>i.tipo==="photo_profile");
  const [buying,setBuying] = useState(false);
  const [saving,setSaving] = useState(false);

  const comprar=async()=>{
    if(!fotoItem||balance<fotoItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{ await api.customBuy(fotoItem.id); showToast("Foto desbloqueada!"); await onRefreshBalance(); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const subirFoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>500000){showToast("Imagen muy grande (max 500KB)","error");return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      setSaving(true);
      try{ await api.setFoto(ev.target.result); showToast("Foto actualizada!"); onRefresh(); }
      catch(err){showToast(err.message||"Error","error");}
      finally{setSaving(false);}
    };
    reader.readAsDataURL(file);
  };

  const quitarFoto=async()=>{
    setSaving(true);
    try{ await api.setFoto(null); showToast("Foto eliminada"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",
      boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:48,marginBottom:8}}>📸</div>
      <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Foto de Perfil</div>
      <div style={{fontSize:12,color:sub,lineHeight:1.6,marginBottom:16}}>
        Subi tu propia foto. Se verá en tu perfil, ranking y chat.
      </div>
      {fotoItem?(
        <button onClick={comprar} disabled={buying||balance<(fotoItem.precio||0)}
          style={{width:"100%",background:buying||balance<(fotoItem.precio||0)?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {buying?"Comprando...":balance<(fotoItem.precio||0)
            ?`Sin saldo (necesitas 🪙${fotoItem.precio})`
            :`Comprar por 🪙${fotoItem.precio}`}
        </button>
      ):(
        <div style={{background:"#f0f0f0",borderRadius:12,padding:"12px 16px",
          fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aún no habilitó este item
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>📸 Tu Foto de Perfil</div>
      <div style={{fontSize:12,color:sub,marginBottom:14}}>Se verá en tu perfil, ranking y chat.</div>
      {me.foto_url&&(
        <div style={{textAlign:"center",marginBottom:14}}>
          <img src={me.foto_url} alt="" style={{width:80,height:80,borderRadius:"50%",
            objectFit:"cover",border:`3px solid ${accent}`}}/>
        </div>
      )}
      <label style={{display:"block",cursor:"pointer",marginBottom:10}}>
        <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
        <div style={{border:`1.5px dashed ${accent}`,borderRadius:12,padding:"14px",
          textAlign:"center",fontSize:13,color:accent,fontWeight:700}}>
          {saving?"Subiendo...":"📱 Subir foto desde el celular"}
        </div>
      </label>
      {me.foto_url&&(
        <button onClick={quitarFoto} disabled={saving}
          style={{width:"100%",background:"#fee2e2",border:"none",borderRadius:50,
            color:"#ef4444",padding:"11px",fontWeight:800,fontSize:13,cursor:"pointer",
            fontFamily:"Nunito,sans-serif"}}>
          Quitar foto
        </button>
      )}
    </div>
  );
}

// ── Panel Título Personalizado ────────────────────────────────
function TituloCustomPanel({me,owned,items,balance,showToast,onRefresh,onRefreshBalance,cardBg,txt,sub,accent,inputBg,inputBd}){
  const hasPermiso = owned.some(o=>o.tipo==="title_custom");
  const titleItem  = items.find(i=>i.tipo==="title_custom");
  const [tituloVal,setTituloVal] = useState(me.titulo_custom||"");
  const [saving,setSaving] = useState(false);
  const [buying,setBuying] = useState(false);

  const comprar=async()=>{
    if(!titleItem||balance<titleItem.precio){showToast("Saldo insuficiente","error");return;}
    setBuying(true);
    try{ await api.customBuy(titleItem.id); showToast("Título desbloqueado!"); await onRefreshBalance(); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardar=async()=>{
    if(!tituloVal.trim()){showToast("Escribí un título","error");return;}
    setSaving(true);
    try{ await api.setTituloCustom(tituloVal.trim()); showToast("Título guardado!"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const borrar=async()=>{
    setSaving(true);
    try{ await api.setTituloCustom(null); setTituloVal(""); showToast("Título eliminado"); onRefresh(); }
    catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  if(!hasPermiso) return(
    <div style={{background:cardBg,borderRadius:20,padding:24,textAlign:"center",
      boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:48,marginBottom:8}}>👑</div>
      <div style={{fontWeight:800,fontSize:16,color:txt,marginBottom:6}}>Título Personalizado</div>
      <div style={{fontSize:12,color:sub,lineHeight:1.6,marginBottom:16}}>
        Escribí tu propio título único. Máximo 20 caracteres. Se verá en tu perfil y chat.
      </div>
      {titleItem?(
        <button onClick={comprar} disabled={buying||balance<(titleItem.precio||0)}
          style={{width:"100%",background:buying||balance<(titleItem.precio||0)?"#ccc":accent,
            border:"none",borderRadius:50,color:"white",padding:"14px",fontWeight:900,
            fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {buying?"Comprando...":balance<(titleItem.precio||0)
            ?`Sin saldo (🪙${titleItem.precio})`
            :`Comprar por 🪙${titleItem.precio}`}
        </button>
      ):(
        <div style={{background:"#f0f0f0",borderRadius:12,padding:"12px 16px",fontSize:12,color:sub,textAlign:"center"}}>
          El administrador aún no habilitó este item
        </div>
      )}
    </div>
  );

  return(
    <div style={{background:cardBg,borderRadius:20,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>👑 Tu Título</div>
      <div style={{fontSize:12,color:sub,marginBottom:14}}>Máximo 20 caracteres. Visible en perfil y chat.</div>
      {me.titulo_custom&&(
        <div style={{background:accent+"18",borderRadius:12,padding:"10px 14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:900,fontSize:16,color:accent}}>{me.titulo_custom}</span>
          <span style={{fontSize:11,color:sub}}>— tu título actual</span>
        </div>
      )}
      <input value={tituloVal} onChange={e=>setTituloVal(e.target.value.slice(0,20))} maxLength={20}
        placeholder="Ej: El más rápido..."
        style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
          borderRadius:12,padding:"11px 14px",fontSize:15,fontWeight:700,outline:"none",
          color:txt,fontFamily:"Nunito,sans-serif",marginBottom:4}}/>
      <div style={{fontSize:10,color:sub,textAlign:"right",marginBottom:10}}>
        {tituloVal.length}/20 caracteres
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={guardar} disabled={saving||!tituloVal.trim()}
          style={{flex:1,background:saving||!tituloVal.trim()?"#ccc":accent,border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:13,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":"Guardar título"}
        </button>
        {me.titulo_custom&&(
          <button onClick={borrar} disabled={saving}
            style={{background:"#f0f0f0",border:"none",borderRadius:50,color:sub,
              padding:"12px 14px",fontWeight:700,fontSize:12,cursor:"pointer",
              fontFamily:"Nunito,sans-serif"}}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TIENDA DE PERSONALIZACIÓN
// ════════════════════════════════════════════════════════════
function ATiendaCustom({me,balance,showToast,refreshBalance,onBack,onCustomChange,onThemeChange,onDarkChange,currentThemeId,isDark}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
  const [sec,setSec]     = useState("app");    // app|colores|emojis|efectos|apodo
  const [items,setItems] = useState([]);
  const [owned,setOwned]   = useState([]);
  const [active,setActive]  = useState(null);
  const [subs,setSubs]      = useState([]); // suscripciones activas del alumno
  const [gifts,setGifts]   = useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]  = useState(null);
  const [preview,setPreview]= useState(null); // item en preview (tap en cuadro)
  const [giftOpen,setGiftOpen]=useState(null);
  const [giftTo,setGiftTo]  = useState("");
  const [giftMsg,setGiftMsg]= useState("");

  const SECS=[["app","🎨 App"],["colores","🖊️ Nombres"],["emojis","😄 Emojis"],["efectos","✨ Efectos"],["apodo","🏷️ Apodo"]];

  const loadAll=async()=>{
    setLoading(true);
    try{
      const [shop,me2,g,mysubs]=await Promise.all([
        api.customShop(), api.customMe(), api.customGifts(), api.mySubscriptions()
      ]);
      setItems(Array.isArray(shop)?shop:shop.data||[]);
      setOwned((me2.data||me2)?.owned||[]);
      setActive((me2.data||me2)?.active||null);
      setGifts((g.data||g||[]).filter(x=>!x.leido));
      setSubs((mysubs.data||mysubs||[]));
    }catch(e){}
    setLoading(false);
  };
  useEffect(()=>{ loadAll(); },[]);

  // Helper: días restantes de suscripción de un item
  const diasRestantes=(item_nombre)=>{
    const sub=subs.find(s=>s.item_nombre===item_nombre);
    if(!sub) return null;
    const diff=new Date(sub.next_charge)-new Date();
    return Math.max(0,Math.ceil(diff/86400000));
  };

  const comprar=async(item)=>{
    if(item.precio>balance){showToast("Saldo insuficiente","error");return;}
    setBuying(item.id);
    try{
      await api.customBuy(item.id);
      showToast(`Compraste: ${item.nombre} ✅`);
      await refreshBalance();
      await loadAll();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  const suscribir=async(item,periodo="monthly")=>{
    const precio=item.precio_mensual??item.precio??0;
    if(precio>balance){showToast("Saldo insuficiente","error");return;}
    setBuying(item.id);
    try{
      await api.subscribe(item.id,periodo);
      showToast(`Suscripción activada: ${item.nombre} ✅`);
      await refreshBalance();
      await loadAll();
      const d=await api.customEquip("theme",item.id);
      const newActive=d.data||d;
      setActive(newActive);
      if(onCustomChange) onCustomChange(newActive);
      // Aplicar color directo
      if(onThemeChange){
        const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
        onThemeChange(null, cfg.primary||null);
      }
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(null);}
  };

  const equipar=async(tipo,item_id)=>{
    const isActive=active?.[`${tipo}_id`]===item_id;
    try{
      const d=await api.customEquip(tipo,isActive?null:item_id);
      const newActive=d.data||d;
      setActive(newActive);
      if(onCustomChange) onCustomChange(newActive);
      // Si es tema, aplicar color primario directamente al contexto
      if(tipo==="theme"&&!isActive&&onThemeChange){
        const tItem=items.find(i=>i.id===item_id);
        if(tItem){
          const cfg=typeof tItem.config==="string"?JSON.parse(tItem.config||"{}"):tItem.config||{};
          // Pasar el color primario real para que el ThemeCtx lo use directamente
          onThemeChange(null, cfg.primary||null);
        }
      }
      if(tipo==="theme"&&isActive&&onThemeChange) onThemeChange("oceano", null); // reset
      showToast(isActive?"Desequipado":"Equipado ✅");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const regalar=async()=>{
    if(!giftTo.trim()){showToast("Ingresá el ID del destinatario","error");return;}
    try{
      await api.customGift({to_user_id:giftTo.trim(),item_id:giftOpen.id,mensaje:giftMsg.trim()||null});
      showToast(`Regalaste ${giftOpen.nombre}! 🎁`);
      setGiftOpen(null);setGiftTo("");setGiftMsg("");
    }catch(e){showToast(e.message||"Error","error");}
  };

  const ownedIds=new Set(owned.map(o=>o.id));

  const filteredItems=items.filter(i=>{
    if(sec==="app")     return false;
    if(sec==="temas")   return i.tipo==="theme";
    if(sec==="colores") return i.tipo==="name_color";
    if(sec==="emojis")  return i.tipo==="emoji_pack";
    if(sec==="efectos") return ["title_effect","name_effect","avatar_frame"].includes(i.tipo);
    if(sec==="apodo")   return i.tipo==="nickname";
    return true;
  });

  // Modal de regalo
  if(giftOpen) return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🎁 Regalar" onBack={()=>setGiftOpen(null)}/>
      <div style={{padding:"16px 14px"}}>
        <div style={{background:cardBg,borderRadius:20,padding:16,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:48}}>{giftOpen.preview||"🎁"}</div>
            <div style={{fontWeight:800,color:txt,fontSize:16}}>{giftOpen.nombre}</div>
            <div style={{fontSize:12,color:sub,marginTop:2}}>
              Regalás este item a otro alumno
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:12,color:sub,marginBottom:6}}>ID del destinatario</div>
          <input value={giftTo} onChange={e=>setGiftTo(e.target.value)}
            placeholder="Pegá el ID del alumno..."
            style={{width:"100%",boxSizing:"border-box",background:inputBg,border:`1.5px solid ${inputBd}`,
              borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",color:txt,
              fontFamily:"Nunito,sans-serif",fontWeight:600,marginBottom:8}}/>
          <textarea value={giftMsg} onChange={e=>setGiftMsg(e.target.value)}
            placeholder="Mensaje opcional..."
            rows={2} style={{width:"100%",boxSizing:"border-box",background:inputBg,
              border:`1.5px solid ${inputBd}`,borderRadius:12,padding:"10px 14px",fontSize:13,
              outline:"none",color:txt,fontFamily:"Nunito,sans-serif",resize:"none",marginBottom:12}}/>
          <button onClick={regalar} style={{width:"100%",background:accent,border:"none",
            borderRadius:50,color:"white",padding:"13px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Enviar regalo 🎁
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🎨 Personalización" onBack={onBack}/>

      {/* Regalos pendientes */}
      {gifts.length>0&&(
        <div style={{margin:"10px 14px 0",background:dark?"#2d1a4e":"#fff7ed",borderRadius:16,
          padding:"12px 14px",border:`1.5px solid ${accent}44`}}>
          <div style={{fontWeight:800,color:accent,fontSize:13,marginBottom:6}}>
            🎁 {gifts.length} regalo{gifts.length!==1?"s":""} sin leer
          </div>
          {gifts.map(g=>(
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:18}}>{g.item_preview||"🪙"}</span>
              <div style={{flex:1}}>
                <span style={{fontWeight:700,color:txt,fontSize:12}}>{g.from_nombre}</span>
                <span style={{color:sub,fontSize:12}}> te regaló {g.item_nombre||`🪙${g.coins}`}</span>
                {g.mensaje&&<div style={{fontSize:11,color:sub,fontStyle:"italic"}}>"{g.mensaje}"</div>}
              </div>
              <button onClick={()=>api.customGiftRead(g.id).then(loadAll)}
                style={{background:"none",border:"none",color:accent,fontWeight:800,
                  fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>OK</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",background:cardBg,
        borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`,margin:"10px 0 0"}}>
        {SECS.map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)}
            style={{flex:1,padding:"10px 2px",background:"none",border:"none",
              fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Nunito,sans-serif",
              color:sec===id?accent:sub,
              borderBottom:`2.5px solid ${sec===id?accent:"transparent"}`,
              transition:"all .2s"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{padding:"10px 14px"}}>
        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}

        {/* Sección especial de apodo */}
        {sec==="apodo"&&!loading&&<ApodoPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent} inputBg={inputBg} inputBd={inputBd}/>}
        {sec==="foto"&&!loading&&<FotoPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent}/>}
        {sec==="titulo"&&!loading&&<TituloCustomPanel me={me} owned={owned} items={items} balance={balance} showToast={showToast} onRefresh={loadAll} onRefreshBalance={refreshBalance} cardBg={cardBg} txt={txt} sub={sub} accent={accent} inputBg={inputBg} inputBd={inputBd}/>}

        {/* Sección de tema de APP — duales primario+secundario */}
        {sec==="app"&&(
          <div>
            {/* ── Modos de pantalla ─────────────────────────── */}
            <div style={{background:cardBg,borderRadius:18,padding:"14px 16px",marginBottom:12,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt,marginBottom:10}}>🖥️ Modo de pantalla</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{d:false,icon:"☀️",lbl:"Claro"},{d:true,icon:"🌙",lbl:"Oscuro"}].map(m=>(
                  <button key={m.lbl} onClick={()=>onDarkChange&&onDarkChange(m.d)}
                    style={{background:isDark===m.d?accent:dark?"#2d2a45":"#f0f0f0",
                      color:isDark===m.d?"white":txt,
                      border:`2px solid ${isDark===m.d?accent:"transparent"}`,
                      borderRadius:14,padding:"14px 8px",fontWeight:800,fontSize:13,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <span style={{fontSize:26}}>{m.icon}</span>
                    <span>{m.lbl}</span>
                    {isDark===m.d&&<span style={{fontSize:9,opacity:.8}}>✅ Activo</span>}
                  </button>
                ))}
                {/* Modos extra comprables (tipo screen_mode en la DB) */}
                {items.filter(i=>i.tipo==="screen_mode").map(item=>{
                  const isOwned=ownedIds.has(item.id)||item.precio===0;
                  const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
                  const isActive=active?.screen_mode_id===item.id;
                  const isPreviewing=preview?.id===item.id;
                  return(
                    <div key={item.id} style={{borderRadius:14,overflow:"hidden",
                      border:`2px solid ${isActive?accent:isPreviewing?accent+"88":dark?"#2d2a45":"#e8e8e8"}`,
                      background:dark?"#2d2a45":"#f8f8f8",
                      opacity:!isOwned&&item.precio>0?.8:1}}>
                      {/* Tap para preview */}
                      <div style={{padding:"10px 6px 4px",fontSize:26,textAlign:"center",cursor:"pointer"}}
                        onClick={()=>{
                          if(isOwned) equipar("screen_mode",item.id);
                          else setPreview(isPreviewing?null:item);
                        }}>
                        {item.preview||"🌑"}
                      </div>
                      <div style={{fontWeight:800,fontSize:10,color:txt,padding:"0 4px 2px",textAlign:"center"}}>
                        {item.nombre}
                      </div>
                      {isOwned
                        ? <button onClick={()=>equipar("screen_mode",item.id)}
                            style={{background:"none",border:"none",fontSize:10,color:accent,
                              fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                              width:"100%",paddingBottom:8}}>
                            {isActive?"✅ Activo":"Equipar"}
                          </button>
                        : <button onClick={()=>comprar(item)} disabled={buying===item.id||item.precio>balance}
                            style={{background:"none",border:"none",fontSize:10,color:accent,
                              fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                              width:"100%",paddingBottom:8}}>
                            🪙{item.precio}
                          </button>
                      }
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Paletas de color (tipo theme en la DB) ─────── */}
            <div style={{background:cardBg,borderRadius:18,padding:"14px 16px",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt,marginBottom:10}}>🎨 Paleta de color</div>
              {items.filter(i=>i.tipo==="theme").length===0&&(
                <div style={{textAlign:"center",color:sub,fontSize:12,padding:16}}>
                  El administrador aún no configuró paletas de color
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {items.filter(i=>i.tipo==="theme").map(item=>{
                  const isOwned=ownedIds.has(item.id)||item.precio===0;
                  const cfg=typeof item.config==="string"?JSON.parse(item.config||"{}"):item.config||{};
                  const isActive=active?.theme_id===item.id;
                  const isSub=item.es_suscripcion;
                  const precio=isSub?(item.precio_mensual??item.precio):item.precio;
                  const dias=diasRestantes(item.nombre);
                  const isPreviewing=preview?.id===item.id;
                  return(
                    <div key={item.id} style={{borderRadius:16,overflow:"hidden",
                      border:`2px solid ${isActive?cfg.primary||accent:isPreviewing?accent+"99":dark?"#2d2a45":"transparent"}`,
                      boxShadow:isActive?`0 0 0 3px ${cfg.primary||accent}44`:isPreviewing?`0 0 0 2px ${accent}33`:"none",
                      transition:"all .2s",
                      opacity:!isOwned&&precio>0?.8:1}}>
                      {/* Preview — tap para ver en tiempo real */}
                      <div style={{height:54,cursor:"pointer",
                        background:`linear-gradient(135deg,${cfg.primary||"#00c1fc"} 50%,${cfg.accent||cfg.secondary||"#0ea5e9"} 50%)`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
                        position:"relative"}}
                        onClick={()=>{
                          if(isOwned){
                            equipar("theme",item.id);
                          } else {
                            // Preview temporal del color
                            setPreview(isPreviewing?null:item);
                            if(!isPreviewing&&onThemeChange) onThemeChange(null, cfg.primary||null);
                            else if(onThemeChange) onThemeChange("oceano",null); // reset
                          }
                        }}>
                        {isActive?"✅":isPreviewing?"👁️":item.preview||cfg.icon||"🎨"}
                        {!isOwned&&!isPreviewing&&precio>0&&(
                          <div style={{position:"absolute",top:4,right:4,
                            background:"rgba(0,0,0,.4)",borderRadius:99,padding:"2px 6px",
                            fontSize:9,color:"white",fontWeight:800}}>
                            🔒
                          </div>
                        )}
                      </div>
                      <div style={{background:dark?"#2d2a45":"#f8f8f8",padding:"8px 6px"}}>
                        <div style={{fontWeight:800,fontSize:11,color:isActive?cfg.primary||accent:txt,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          padding:"0 2px",textAlign:"center",marginBottom:4}}>{item.nombre}</div>
                        {/* Estado / días restantes */}
                        {isActive&&dias!==null&&(
                          <div style={{fontSize:9,color:dias<=3?"#ef4444":"#10b981",fontWeight:700,
                            textAlign:"center",marginBottom:4}}>
                            🔄 {dias===0?"Vence hoy":`${dias}d restantes`}
                          </div>
                        )}
                        {isActive&&dias===null&&(
                          <div style={{fontSize:9,color:"#10b981",fontWeight:700,textAlign:"center",marginBottom:4}}>
                            ✅ Activo
                          </div>
                        )}
                        {!isActive&&isOwned&&(
                          <button onClick={()=>equipar("theme",item.id)}
                            style={{width:"100%",background:"none",border:`1px solid ${accent}`,
                              borderRadius:99,padding:"3px 0",fontSize:10,color:accent,
                              fontWeight:700,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                            Equipar
                          </button>
                        )}
                        {!isOwned&&precio===0&&(
                          <button onClick={()=>equipar("theme",item.id)}
                            style={{width:"100%",background:"#10b98122",border:"none",borderRadius:99,
                              padding:"3px 0",fontSize:10,color:"#10b981",fontWeight:700,
                              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                            Gratis
                          </button>
                        )}
                        {!isOwned&&precio>0&&(
                          <button onClick={()=>isSub?suscribir(item,item.periodo_default||"monthly"):comprar(item)}
                            disabled={buying===item.id||precio>balance}
                            style={{width:"100%",
                              background:buying===item.id?"#ccc":precio>balance?"#f0f0f0":cfg.primary||accent,
                              color:precio>balance?"#aaa":"white",border:"none",borderRadius:99,
                              padding:"4px 0",fontSize:10,fontWeight:800,cursor:precio>balance?"not-allowed":"pointer",
                              fontFamily:"Nunito,sans-serif",display:"block"}}>
                            {buying===item.id?"...":`🪙${precio}${isSub?`/${item.periodo_default==="weekly"?"sem":item.periodo_default==="annual"?"año":"mes"}`:""}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {subs.filter(s=>s.item_tipo==="theme"&&s.activo).length>0&&(
                <div style={{marginTop:10,fontSize:10,color:sub,textAlign:"center",lineHeight:1.6}}>
                  Suscripciones activas: {subs.filter(s=>s.item_tipo==="theme").length} • Se renuevan automáticamente
                </div>
              )}
            </div>
          </div>
        )}
        {sec!=="apodo"&&sec!=="app"&&filteredItems.map(item=>{
          const isOwned   = ownedIds.has(item.id)||item.precio===0;
          const isFree    = item.precio===0;
          const isEquipped= active&&Object.values(active).includes(item.id);
          const tipoMap   = {theme:"theme",name_color:"name_color",emoji_pack:"emoji_pack",
                             title_effect:"title_effect",name_effect:"name_effect",avatar_frame:"avatar_frame"};

          return(
            <div key={item.id} style={{background:cardBg,borderRadius:18,marginBottom:10,
              overflow:"hidden",boxShadow:isEquipped?`0 2px 12px ${accent}33`:"0 1px 8px rgba(0,0,0,.06)",
              border:`1.5px solid ${isEquipped?accent:dark?"#2d2a45":"transparent"}`}}>

              {/* Preview visual según tipo */}
              {item.tipo==="theme"&&(
                <div style={{height:40,background:`linear-gradient(135deg,${item.config.primary},${item.config.accent})`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                  {item.config.icon||"🎨"}
                </div>
              )}
              {item.tipo==="name_color"&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  background:dark?"#2d2a45":"#f8f8f8"}}>
                  <span style={{fontWeight:900,fontSize:18,
                    color:item.config.rainbow?"transparent":item.config.color,
                    background:item.config.rainbow?"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6,#00c1fc)":"none",
                    WebkitBackgroundClip:item.config.rainbow?"text":"none",
                    WebkitTextFillColor:item.config.rainbow?"transparent":"unset"}}>
                    Tu Nombre
                  </span>
                </div>
              )}
              {item.tipo==="emoji_pack"&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  gap:4,background:dark?"#2d2a45":"#f8f8f8",fontSize:20}}>
                  {(item.config.emojis||[]).slice(0,6).map((e,i)=><span key={i}>{e}</span>)}
                </div>
              )}
              {["title_effect","name_effect"].includes(item.tipo)&&(
                <div style={{height:40,display:"flex",alignItems:"center",justifyContent:"center",
                  background:dark?"#2d2a45":"#f8f8f8"}}>
                  <span style={{fontWeight:900,fontSize:16,color:accent,
                    textShadow:item.tipo==="title_effect"?item.config.css?.split(":")?.[1]?.trim():"none"}}>
                    {item.config.label||item.nombre}
                  </span>
                </div>
              )}

              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:txt}}>{item.nombre}</div>
                  {item.descripcion&&<div style={{fontSize:11,color:sub,marginTop:1}}>{item.descripcion}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                    {isFree
                      ? <span style={{background:"#10b98122",color:"#10b981",borderRadius:99,
                          padding:"2px 8px",fontSize:10,fontWeight:800}}>Gratis</span>
                      : <span style={{fontWeight:800,color:accent,fontSize:13}}>🪙{item.precio}</span>
                    }
                    {isEquipped&&<span style={{background:accent+"22",color:accent,borderRadius:99,
                      padding:"2px 8px",fontSize:10,fontWeight:800}}>✅ Activo</span>}
                    {isOwned&&!isEquipped&&<span style={{background:"#10b98122",color:"#10b981",
                      borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>Tenés</span>}
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  {/* Equipar */}
                  {isOwned&&(
                    <button onClick={()=>equipar(tipoMap[item.tipo],item.id)}
                      style={{background:isEquipped?"#ef444422":accent+"22",
                        color:isEquipped?"#ef4444":accent,border:"none",borderRadius:99,
                        padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {isEquipped?"Quitar":"Equipar"}
                    </button>
                  )}
                  {/* Comprar */}
                  {!isOwned&&!isFree&&(
                    <button onClick={()=>comprar(item)} disabled={buying===item.id||item.precio>balance}
                      style={{background:buying===item.id?"#ccc":item.precio>balance?"#f0f0f0":accent,
                        color:item.precio>balance?"#aaa":"white",border:"none",borderRadius:99,
                        padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",
                        fontFamily:"Nunito,sans-serif"}}>
                      {buying===item.id?"...":item.precio>balance?"Sin saldo":"Comprar"}
                    </button>
                  )}
                  {/* Regalar (si lo tenés) */}
                  {isOwned&&(
                    <button onClick={()=>setGiftOpen(item)}
                      style={{background:dark?"#2d2a45":"#f0f0f0",color:sub,border:"none",
                        borderRadius:99,padding:"5px 10px",fontSize:10,fontWeight:700,
                        cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      🎁 Regalar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NOTIFICACIONES ────────────────────────────────────────────
function ANotificaciones({me,onBack,notifs=[],setNotifs}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg} = useTheme();
  const [serverNotifs,setServerNotifs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [unread,setUnread]=useState(0);


  const NOTIF_ICON={
    reward:"🪙",transfer:"💸",chat_personal:"💬",mission_approved:"✅",
    mission_rejected:"❌",checkin:"🔥",gift:"🎁",new_submission:"📬",tax:"⚖️",
  };
  const NOTIF_COLOR={
    reward:"#10b981",transfer:"#3b82f6",chat_personal:"#00c1fc",
    mission_approved:"#10b981",mission_rejected:"#ef4444",
    checkin:"#f59e0b",gift:"#ec4899",new_submission:"#8b5cf6",tax:"#f97316",
  };

  useEffect(()=>{
    api.myNotifs()
      .then(d=>{
        const data=d.data||d;
        setServerNotifs(data.notifications||[]);
        setUnread(data.unread||0);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
    // Marcar todas como leídas
    api.notifReadAll().catch(()=>{});
    setNotifs(prev=>prev.map(n=>({...n,leida:true})));
  },[]);

  // Combinar notifs del servidor con las del socket (en tiempo real)
  const allNotifs=[
    ...notifs.filter(n=>!n.leida),
    ...serverNotifs,
  ].slice(0,30);

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      <OHdrA title="🔔 Notificaciones" onBack={onBack}/>
      <div style={{padding:"10px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:sub,padding:24}}>Cargando...</div>}
        {!loading&&allNotifs.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:40,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40,marginBottom:8}}>🔔</div>
            <div style={{fontWeight:800,color:txt}}>Sin notificaciones</div>
            <div style={{fontSize:12,color:sub,marginTop:4}}>Aqui apareceran tus premios, misiones y mas</div>
          </div>
        )}
        {allNotifs.map((n,i)=>{
          const tipo = n.tipo||n.type||"";
          const icon = NOTIF_ICON[tipo]||"🔔";
          const col  = NOTIF_COLOR[tipo]||accent;
          const titulo = n.titulo||(
            tipo==="reward"?`Recibiste 🪙${n.amount}`:
            tipo==="mission_approved"?`Mision aprobada! +🪙${n.amount||""}`:
            tipo==="checkin"?`Check-in dia ${n.racha}! +🪙${n.recompensa||""}`:
            tipo==="gift"?`Regalo de ${n.from||"alguien"}`:
            tipo
          );
          const cuerpo = n.cuerpo||(
            tipo==="mission_approved"&&n.feedback?`"${n.feedback}"`:
            tipo==="mission_rejected"&&n.feedback?`"${n.feedback}"`:
            null
          );
          const isNew = !n.leida;
          return(
            <div key={n.id||i} style={{background:cardBg,borderRadius:16,marginBottom:8,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              borderLeft:`4px solid ${isNew?col:"transparent"}`,
              overflow:"hidden"}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:isNew?col:txt}}>{titulo}</div>
                  {cuerpo&&<div style={{fontSize:11,color:sub,marginTop:2,lineHeight:1.4}}>{cuerpo}</div>}
                  <div style={{fontSize:10,color:sub,marginTop:4}}>
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
                      : "Ahora"}
                  </div>
                </div>
                {isNew&&<div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,marginTop:6}}/>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ARanking({nameColorConfig}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg} = useTheme();
  const [periodo,setPeriodo] = useState("weekly");
  const [scope,setScope]     = useState("global");
  const [classrooms,setCl]   = useState([]);
  const [selClass,setSelClass]= useState(null);
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [closing,setClosing] = useState(false);

  const PERIODO_LABEL = {daily:"📅 Hoy", weekly:"📆 Semana", monthly:"🗓️ Mes"};
  const MEDAL = ["🥇","🥈","🥉"];

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({periodo,scope});
    if(scope==="aula"&&selClass) params.append("classroom_id",selClass.id);
    apiFetch(`/ranking/live?${params}`)
      .then(d=>setData(d.data||d))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    api.chatClassroomInfo().then(d=>{ const ci=d.data||d; if(ci?.id) setCl([ci]); }).catch(()=>{});
  },[]);
  useEffect(()=>{ load(); },[periodo, scope, selClass]);

  return(
    <div style={{background:bg,minHeight:"100vh"}}>
      {/* Header con tabs */}
      <div style={{background:accent,position:"sticky",top:0,zIndex:50,color:"white",
        paddingBottom:12}}>
        <div style={{padding:"20px 16px 8px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontWeight:900,fontSize:20}}>🏆 Ranking</div>
        </div>

        {/* Período */}
        <div style={{display:"flex",gap:6,padding:"0 14px",marginBottom:8}}>
          {Object.entries(PERIODO_LABEL).map(([k,v])=>(
            <button key={k} onClick={()=>setPeriodo(k)}
              style={{flex:1,background:periodo===k?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)",
                border:`1.5px solid ${periodo===k?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"7px 4px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {v}
            </button>
          ))}
        </div>

        {/* Scope */}
        <div style={{display:"flex",gap:6,padding:"0 14px"}}>
          {[["global","🌐 Global"],["aula","🏫 Mi Aula"]].map(([k,v])=>(
            <button key={k} onClick={()=>setScope(k)}
              style={{flex:1,background:scope===k?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)",
                border:`1.5px solid ${scope===k?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"7px 4px",fontSize:12,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {/* Banner período + premios */}
        {data?.config?.length>0&&(
          <div style={{background:cardBg,borderRadius:16,padding:"12px 14px",marginBottom:12,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:12,color:txt,marginBottom:8}}>
              💰 Premios {PERIODO_LABEL[periodo]}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {data.config.slice(0,5).map(c=>(
                <div key={c.posicion} style={{background:accent+"18",borderRadius:99,
                  padding:"4px 10px",fontSize:11,fontWeight:700,color:accent}}>
                  #{c.posicion} 🪙{c.premio}
                </div>
              ))}
            </div>
            {data.ya_pagado&&(
              <div style={{marginTop:8,fontSize:10,color:"#10b981",fontWeight:700}}>
                ✅ Premios de este período ya fueron distribuidos
              </div>
            )}
          </div>
        )}

        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}

        {!loading&&(data?.ranking||[]).map((u,i)=>{
          const lv = getLv(u.total_earned||0);
          const medal = i<3?MEDAL[i]:`#${i+1}`;
          return(
            <div key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,
              padding:"12px 14px",background:cardBg,borderRadius:20,
              boxShadow:i===0?`0 2px 12px ${accent}33`:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
              border:i===0?`1.5px solid ${accent}44`:"none"}}>
              <div style={{width:28,textAlign:"center",fontWeight:900,
                fontSize:i<3?18:14,flexShrink:0,color:i<3?"inherit":sub}}>
                {medal}
              </div>
              <Av user={u} sz={42}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,
                  color:nameColorConfig?.rainbow?"transparent":nameColorConfig?.color||txt,
                  background:nameColorConfig?.rainbow?"linear-gradient(90deg,#f59e0b,#ec4899,#8b5cf6,#00c1fc)":"none",
                  WebkitBackgroundClip:nameColorConfig?.rainbow?"text":"unset",
                  WebkitTextFillColor:nameColorConfig?.rainbow?"transparent":"unset",
                }}>{displayName(u)}</div>
                <div style={{fontSize:10,color:sub}}>🪙{u.ganado_periodo.toLocaleString("es-AR")} este período</div>
              </div>
              {u.premio>0&&(
                <div style={{background:"#10b98122",color:"#10b981",borderRadius:99,
                  padding:"3px 10px",fontSize:11,fontWeight:800,flexShrink:0}}>
                  +🪙{u.premio}
                </div>
              )}
            </div>
          );
        })}

        {!loading&&(!data?.ranking||data.ranking.length===0)&&(
          <div style={{background:cardBg,borderRadius:16,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🏆</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>Sin datos para este período</div>
          </div>
        )}
      </div>
    </div>
  );
}

function APerfil({me,balance,logout,showToast,setMe}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg} = useTheme();
  const uS=me.unlocked_skins||["s1"];
  const uB=me.unlocked_borders||["b1"];
  const uT=me.unlocked_titles||["tl1"];

  // Estados para foto y titulo custom comprables directamente aquí
  const [fotoShop,setFotoShop]   = useState(null); // item de foto de la tienda
  const [tituloShop,setTituloShop]=useState(null); // item de titulo custom
  const [buying,setBuying]       = useState(false);
  const [editTitulo,setEditTitulo]=useState(false);
  const [tituloVal,setTituloVal] = useState(me.titulo_custom||"");
  const [savingT,setSavingT]     = useState(false);
  const [savingF,setSavingF]     = useState(false);

  // Cargar items de foto y titulo de la tienda custom
  useEffect(()=>{
    api.customShop("photo_profile").then(d=>{
      const arr=d.data||d||[];
      setFotoShop(arr.find(i=>i.tipo==="photo_profile")||null);
    }).catch(()=>{});
    api.customShop("title_custom").then(d=>{
      const arr=d.data||d||[];
      setTituloShop(arr.find(i=>i.tipo==="title_custom")||null);
    }).catch(()=>{});
  },[]);

  const hasFotoPerm=()=>{/* verificamos comprando */true;};

  const comprarFoto=async()=>{
    if(!fotoShop){showToast("Item no disponible","error");return;}
    if(balance<fotoShop.precio){showToast("Saldo insuficiente","error");return;}
    setBuying("foto");
    try{
      await api.customBuy(fotoShop.id);
      showToast("Foto de perfil desbloqueada! 📸");
      setFotoShop(prev=>prev?{...prev,_owned:true}:null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const subirFoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>500000){showToast("Imagen muy grande (max 500KB)","error");return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      setSavingF(true);
      try{
        await api.setFoto(ev.target.result);
        showToast("Foto actualizada! 📸");
        const updated=await api.me();
        setMe(updated);
      }catch(err){showToast(err.message||"Error","error");}
      finally{setSavingF(false);}
    };
    reader.readAsDataURL(file);
  };

  const quitarFoto=async()=>{
    setSavingF(true);
    try{
      await api.setFoto(null);
      showToast("Foto eliminada");
      const updated=await api.me();
      setMe(updated);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingF(false);}
  };

  const comprarTitulo=async()=>{
    if(!tituloShop){showToast("Item no disponible","error");return;}
    if(balance<tituloShop.precio){showToast("Saldo insuficiente","error");return;}
    setBuying("titulo");
    try{
      await api.customBuy(tituloShop.id);
      showToast("Título personalizado desbloqueado! 👑");
      setTituloShop(prev=>prev?{...prev,_owned:true}:null);
      setEditTitulo(true);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBuying(false);}
  };

  const guardarTitulo=async()=>{
    if(!tituloVal.trim()){showToast("Escribí un título","error");return;}
    setSavingT(true);
    try{
      await api.setTituloCustom(tituloVal.trim());
      showToast("Título guardado! 👑");
      const updated=await api.me();
      setMe(updated);
      setEditTitulo(false);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSavingT(false);}
  };

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
      <OHdrA title="Mi Perfil 👤"/>
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
          {/* Foto personalizada como extra skin */}
          <div style={{borderRadius:16,overflow:"hidden",
            border:`2px solid ${me.foto_url?accent:dark?"#2d2a45":"#e8e8e8"}`,
            background:cardBg,textAlign:"center",padding:"12px 6px",
            position:"relative"}}>
            {me.foto_url
              ? <img src={me.foto_url} alt="" style={{width:36,height:36,borderRadius:"50%",
                  objectFit:"cover",margin:"0 auto 4px",display:"block"}}/>
              : <div style={{fontSize:28,marginBottom:4}}>📸</div>
            }
            <div style={{fontSize:9,fontWeight:800,color:txt,marginBottom:4}}>Foto</div>
            {me.foto_url
              ? <label style={{cursor:savingF?"not-allowed":"pointer"}}>
                  <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
                  <span style={{fontSize:9,color:accent,fontWeight:700}}>
                    {savingF?"...":"Cambiar"}
                  </span>
                </label>
              : <label style={{cursor:buying==="foto"?"not-allowed":"pointer"}}>
                  <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}
                    onClick={e=>{
                      // Si no tiene permiso, comprar primero
                      if(fotoShop&&!fotoShop._owned&&me&&!me.foto_url){
                        e.preventDefault();
                        comprarFoto();
                      }
                    }}/>
                  <span style={{fontSize:9,color:accent,fontWeight:800}}>
                    {buying==="foto"?"...":fotoShop?`🪙${fotoShop.precio}`:"📱 Subir"}
                  </span>
                </label>
            }
            {me.foto_url&&(
              <button onClick={quitarFoto} style={{position:"absolute",top:3,right:3,
                background:"rgba(0,0,0,.4)",border:"none",borderRadius:"50%",color:"white",
                width:16,height:16,fontSize:8,cursor:"pointer",display:"flex",
                alignItems:"center",justifyContent:"center"}}>✕</button>
            )}
          </div>
        </div>

        {/* Título personalizado — inline en sección Títulos */}
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

        {/* Título personalizado — comprable directo */}
        <div style={{marginBottom:8,padding:"14px 16px",borderRadius:20,
          background:me.titulo_custom?dark?"#2d1a4e":cardBg:cardBg,
          border:`1.5px solid ${me.titulo_custom?accent:dark?"#2d2a45":"#E8E8E8"}`,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:15,color:txt,marginBottom:4}}>
            ✏️ Título personalizado
          </div>
          {me.titulo_custom&&!editTitulo&&(
            <div style={{fontSize:13,color:accent,fontWeight:700,marginBottom:8}}>
              "{me.titulo_custom}"
            </div>
          )}
          {editTitulo?(
            <div style={{marginTop:6}}>
              <input value={tituloVal} onChange={e=>setTituloVal(e.target.value.slice(0,20))}
                placeholder="Tu título (máx 20 chars)..."
                style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${accent}44`,
                  borderRadius:10,padding:"9px 12px",fontSize:14,fontWeight:700,outline:"none",
                  color:txt,background:dark?"#2d2a45":"#f8f8f8",fontFamily:"Nunito,sans-serif",
                  marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={guardarTitulo} disabled={savingT}
                  style={{flex:1,background:savingT?"#ccc":accent,border:"none",borderRadius:50,
                    color:"white",padding:"10px",fontWeight:800,fontSize:13,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  {savingT?"Guardando...":"Guardar"}
                </button>
                <button onClick={()=>setEditTitulo(false)}
                  style={{background:dark?"#2d2a45":"#f0f0f0",border:"none",borderRadius:50,
                    color:sub,padding:"10px 14px",fontWeight:700,cursor:"pointer",
                    fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {me.titulo_custom
                ? <button onClick={()=>setEditTitulo(true)}
                    style={{background:accent+"22",color:accent,border:"none",borderRadius:99,
                      padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                      fontFamily:"Nunito,sans-serif"}}>
                    ✏️ Cambiar
                  </button>
                : <>
                    {tituloShop
                      ? <button onClick={comprarTitulo} disabled={buying==="titulo"||balance<tituloShop.precio}
                          style={{background:buying==="titulo"||balance<tituloShop.precio?"#ccc":accent,
                            color:"white",border:"none",borderRadius:99,padding:"6px 14px",
                            fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                          {buying==="titulo"?"Comprando...":balance<tituloShop.precio
                            ?`Sin saldo (🪙${tituloShop.precio})`:`Comprar 🪙${tituloShop.precio}`}
                        </button>
                      : <span style={{fontSize:12,color:sub}}>No disponible</span>
                    }
                  </>
              }
            </div>
          )}
        </div>

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

function AChat({me, showToast, onBack, nameColorConfig}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,inputBg,inputBd} = useTheme();
  const [sec, setSec]           = useState(0);
  const [friend, setFriend]     = useState(null);
  const [friends, setFriends]   = useState([]);
  const [pendientes, setPend]   = useState([]);
  const [classInfo, setClass]   = useState(null);
  const [globalMsgs, setGlobal] = useState([]);
  const globalConvIdRef = useRef(null);
  const classConvIdRef  = useRef(null);
  const personalConvIdRef = useRef(null);
  const [classMsgs,  setClass_] = useState([]);
  const [personMsgs, setPerson] = useState([]);
  const [convId, setConvId]     = useState(null);
  const [msg, setMsg]           = useState("");
  const [typing, setTyping]     = useState(null);
  const [search, setSearch]     = useState("");
  const [results, setResults]   = useState([]);
  const [addOpen, setAddOpen]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [perfilUserId,setPerfilUserId] = useState(null); // modal perfil
  const bottomRef               = useRef(null);
  const typingTimer             = useRef(null);
  const token                   = localStorage.getItem("ec_token");

  const bg       = dark?"#12101e":"#F5F5F5";
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
                {!isMe&&<div onClick={()=>setPerfilUserId(m.sender_id)}
                  style={{fontSize:10,color:sub,marginBottom:2,marginLeft:4,cursor:"pointer",
                    fontWeight:700,"&:hover":{textDecoration:"underline"}}}>
                  {m.sender_nombre}
                </div>}
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
                  <div onClick={()=>setPerfilUserId(m.sender_id)}
                    style={{fontSize:10,color:m.sender_rol==='teacher'?accent:sub,
                      marginBottom:2,marginLeft:4,fontWeight:m.sender_rol==='teacher'?800:600,
                      cursor:"pointer"}}>
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
      <OHdrA title="💬 Chat" onBack={onBack}/>

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

      {/* Modal perfil de usuario */}
      {perfilUserId&&(
        <PerfilModal userId={perfilUserId} onClose={()=>setPerfilUserId(null)} showToast={showToast}/>
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

function ANoticias({me,onBack}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg} = useTheme();
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState(null);
  const [tagFilt,setTagFilt]=useState("Todos");


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
      <OHdrA title="📰 Noticias" onBack={onBack}/>
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
function AVotaciones({me,showToast,onBack}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
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
                <Av user={c} sz={28}/>
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
                      <Av user={r} sz={22}/>
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
            <Av user={me} sz={28}/>
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
        borderBottom:`1px solid ${dark?"#2d2a45":"#eee"}`}}>
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
          const yaVote   = !!v.mi_voto;
          const mostrar  = yaVote||!v.activa;
          const isVoting = voting===v.id;
          const opSel    = seleccion[v.id];
          const esAdmin  = v.creador_rol==="admin";
          const esTeacher= v.creador_rol==="teacher";
          const jerarCol = esAdmin?accent:esTeacher?"#8b5cf6":"#94a3b8";

          return(
            <div key={v.id} style={{background:cardBg,borderRadius:20,padding:"16px",marginBottom:12,
              boxShadow:esAdmin?`0 2px 14px ${accent}33`:esTeacher?"0 2px 14px #8b5cf633":"0 1px 8px rgba(0,0,0,.06)",
              border:`1.5px solid ${esAdmin||esTeacher?jerarCol+"44":dark?"#2d2a45":"transparent"}`,
              transition:"all .2s"}}>

              {/* Badge jerarquía */}
              {(esAdmin||esTeacher)&&(
                <div style={{display:"inline-flex",alignItems:"center",gap:4,
                  background:jerarCol+"18",borderRadius:99,padding:"2px 8px",marginBottom:6}}>
                  <span style={{fontSize:9,fontWeight:800,color:jerarCol}}>
                    {esAdmin?"⭐ Admin":"👩‍🏫 Docente"} · {v.creador_nombre}
                  </span>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:12}}>
                <div style={{fontWeight:800,fontSize:14,color:txt,flex:1,lineHeight:1.3}}>{v.titulo}</div>
                <span style={{background:v.activa?"#10b98122":"#94a3b822",
                  color:v.activa?"#10b981":"#94a3b8",
                  borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:800,flexShrink:0}}>
                  {v.activa?"Activa":"Cerrada"}
                </span>
              </div>

              {/* Opciones */}
              {v.opciones.map(op=>{
                const pct      = v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                const esMiVoto = v.mi_voto===op.id;
                const esSel    = opSel===op.id;
                const esGanador= !v.activa&&op.votos===Math.max(...v.opciones.map(o=>o.votos));
                return(
                  <div key={op.id}
                    onClick={()=>v.activa&&!yaVote&&!isVoting&&setSel(s=>({...s,[v.id]:op.id}))}
                    style={{marginBottom:8,cursor:v.activa&&!yaVote?"pointer":"default",
                      borderRadius:12,padding:"8px 10px",transition:"all .15s",
                      background:esSel?accent+"22":esMiVoto?accent+"11":"transparent",
                      border:`1.5px solid ${esSel?accent:esMiVoto?accent+"66":"transparent"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:mostrar?4:0}}>
                      <span style={{fontSize:13,fontWeight:esMiVoto||esSel?800:600,
                        color:esMiVoto?accent:esSel?accent:txt}}>
                        {esGanador?"🏆 ":""}{esSel?"→ ":""}{op.texto}
                        {esMiVoto&&<span style={{fontSize:10,marginLeft:6,opacity:.7}}>✓ Tu voto</span>}
                      </span>
                      {mostrar&&<span style={{fontSize:11,fontWeight:700,color:sub,flexShrink:0}}>{pct}%</span>}
                    </div>
                    {mostrar&&(
                      <div style={{background:dark?"#2d2a45":"#f0f0f0",borderRadius:99,height:6,overflow:"hidden"}}>
                        <div style={{width:pct+"%",height:"100%",borderRadius:99,
                          background:esMiVoto?accent:"#3b82f6",transition:"width .6s ease"}}/>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Confirmar voto */}
              {v.activa&&!yaVote&&opSel&&(
                <button onClick={()=>confirmarVoto(v.id)} disabled={isVoting}
                  style={{width:"100%",marginTop:8,background:isVoting?"#ccc":accent,
                    border:"none",borderRadius:50,color:"white",padding:"11px",
                    fontWeight:800,fontSize:13,cursor:isVoting?"not-allowed":"pointer",
                    fontFamily:"Nunito,sans-serif",boxShadow:`0 4px 14px ${accent}44`}}>
                  {isVoting?"Registrando...":"Confirmar voto"}
                </button>
              )}
              {v.activa&&!yaVote&&!opSel&&(
                <div style={{marginTop:6,fontSize:11,color:sub,textAlign:"center"}}>
                  Toca una opcion para seleccionar
                </div>
              )}

              {/* Footer: info + reacciones + comentarios */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12,
                paddingTop:10,borderTop:`1px solid ${dark?"#2d2a45":"#f0f0f0"}`}}>
                <span style={{fontSize:10,color:sub,flex:1}}>
                  {v.total_votos} votos
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
const REPORTE_TIPOS = [
  {id:"bullying",   label:"Bullying",      icon:"😰", col:"#ef4444"},
  {id:"accidente",  label:"Accidente",     icon:"🚑", col:"#f59e0b"},
  {id:"perdido",    label:"Obj. perdido",  icon:"🔍", col:"#3b82f6"},
  {id:"sugerencia", label:"Sugerencia",    icon:"💡", col:"#10b981"},
  {id:"otro",       label:"Otro",          icon:"📋", col:"#8b5cf6"},
];
const ESTADO_LABEL={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const ESTADO_COLOR={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};

function AReportes({me,showToast,onBack}){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg:bg,inputBg,inputBd} = useTheme();
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
      <OHdrA title="🚩 Nuevo Reporte" onBack={()=>setVista("lista")}/>
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
      <OHdrA title="🚩 Reportes" onBack={onBack}/>
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
        {tab==="home"       && <AdminHome    me={me} onNav={setTab} showToast={showToast}/>}
        {tab==="usuarios"   && <AdminUsuarios showToast={showToast}/>}
        {tab==="tesoro"     && <AdminTesoro  me={me} showToast={showToast}/>}
        {tab==="banco"      && <AdminBanco   me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="ranking"    && <AdminRanking onBack={()=>setTab("home")}/>}
        {tab==="tienda"     && <AdminTienda  showToast={showToast}/>}
        {tab==="audit"      && <AdminAudit/>}
        {tab==="config"     && <AdminConfig  me={me} logout={logout}/>}
        {tab==="noticias"   && <AdminNoticias  showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="votaciones" && <AdminVotaciones showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="reportes"   && <AdminReportes  showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="aulas"      && <AdminAulas     showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="economia"   && <AdminEconomia   showToast={showToast} onBack={()=>setTab("home")}/>}
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
  const [stats,setStats]=useState(null);

  useEffect(()=>{
    api.treasury().then(setTreasury).catch(()=>{});
    api.adminUsers().then(u=>{
      const arr=Array.isArray(u)?u:u.data||u||[];
      setUsers(arr);
      // Calcular stats locales
      const students=arr.filter(x=>x.rol==="student"&&x.activo);
      const top5=[...students].sort((a,b)=>(b.total_earned||0)-(a.total_earned||0)).slice(0,5);
      const totalCoins=students.reduce((s,x)=>s+(x.total_earned||0),0);
      setStats({students,top5,totalCoins});
    }).catch(()=>{});
  },[]);

  const students=users.filter(u=>u.rol==="student"&&u.activo).length;
  const teachers=users.filter(u=>u.rol==="teacher"&&u.activo).length;

  return(
    <div>
      <div style={{background:"#00c1fc",color:"white",padding:"52px 20px 28px",
        position:"sticky",top:0,zIndex:50,overflow:"hidden",textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>Panel Admin ⚙️</div>
        <div style={{fontSize:13,opacity:.8}}>Hola, {me.nombre}</div>
      </div>
      <div style={{padding:"16px 14px",marginTop:-20}}>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[
            {icon:"🏦",val:treasury?treasury.balance.toLocaleString("es-AR"):"...",label:"En Tesorería",col:"#00c1fc"},
            {icon:"👨‍🎓",val:students,label:"Alumnos activos",col:"#10b981"},
            {icon:"👩‍🏫",val:teachers,label:"Docentes",col:"#8b5cf6"},
            {icon:"🪙",val:stats?stats.totalCoins.toLocaleString("es-AR"):"...",label:"Coins circulando",col:"#f59e0b"},
          ].map(s=>(
            <WCard key={s.label} style={{textAlign:"center",padding:"14px 10px"}}>
              <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
              <div style={{fontWeight:900,fontSize:18,color:s.col}}>{s.val}</div>
              <div style={{fontSize:10,color:"#aaa",fontWeight:700,marginTop:2}}>{s.label}</div>
            </WCard>
          ))}
        </div>

        {/* Accesos rápidos */}
        {[
          {icon:"👥",title:"Usuarios",         sub:`${students} alumnos · ${teachers} docentes`,dest:"usuarios",  col:"#3b82f6"},
          {icon:"🏦",title:"Tesorería",         sub:"Mint y burn de monedas",                   dest:"tesoro",    col:"#f59e0b"},
          {icon:"🛒",title:"Tienda",            sub:"Administrar ítems",                         dest:"tienda",    col:"#10b981"},
          {icon:"📰",title:"Noticias",          sub:"Crear y moderar publicaciones",             dest:"noticias",  col:"#00c1fc"},
          {icon:"🗳️",title:"Votaciones",        sub:"Crear encuestas y ver resultados",          dest:"votaciones",col:"#8b5cf6"},
          {icon:"🚩",title:"Reportes",          sub:"Gestionar reportes de alumnos",             dest:"reportes",  col:"#ef4444"},
          {icon:"🏆",title:"Ranking",           sub:"Top holders y top ganancias",               dest:"ranking",   col:"#f59e0b"},
          {icon:"🏛️",title:"Banco",             sub:"Transferir a alumnos y docentes",           dest:"banco",     col:"#10b981"},
          {icon:"🏫",title:"Aulas",             sub:"Crear aulas y asignar miembros",            dest:"aulas",     col:"#f59e0b"},
          {icon:"💹",title:"Economía",           sub:"Temas, precios, premios y suscripciones",  dest:"economia",  col:"#10b981"},
          {icon:"📋",title:"Audit Log",         sub:"Historial de todas las acciones",           dest:"audit",     col:"#64748b"},
        ].map(item=>(
          <WCard key={item.dest} onClick={()=>onNav(item.dest)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",marginBottom:8}}>
            <div style={{width:46,height:46,borderRadius:13,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{item.title}</div>
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
  const [data,setData]=useState(null);
  const [txs,setTxs]=useState([]);
  const [users,setUsers]=useState([]);
  const [mintAmount,setMintAmount]=useState("");
  const [mintDesc,setMintDesc]=useState("");
  const [burnAmount,setBurnAmount]=useState("");
  const [burnReason,setBurnReason]=useState("");
  const [mintSheet,setMintSheet]=useState(false);
  const [burnSheet,setBurnSheet]=useState(false);
  const [loading,setLoading]=useState(true);

  const refresh=async()=>{
    try{
      const [t,u,auditData]=await Promise.all([
        api.treasury(),
        api.adminUsers(),
        api.auditLog(),
      ]);
      setData(t);
      const usArr=Array.isArray(u)?u:u.data||u||[];
      setUsers(usArr.filter(x=>x.rol==="student"&&x.activo));
      // Filtrar solo mint y burn del audit
      const logs=Array.isArray(auditData)?auditData:auditData.data||[];
      setTxs(logs.filter(l=>l.action==="mint"||l.action==="burn").slice(0,10));
    }catch(e){}
    finally{setLoading(false);}
  };
  useEffect(()=>{refresh();},[]);

  const doMint=async()=>{
    if(!mintAmount||!mintDesc){showToast("Completa monto y descripcion","error");return;}
    try{
      await api.mint(parseInt(mintAmount),mintDesc);
      showToast(`Mint exitoso: +${mintAmount} monedas a Tesoreria`);
      refresh();setMintAmount("");setMintDesc("");setMintSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const doBurn=async()=>{
    if(!burnAmount||!burnReason){showToast("Completa monto y motivo","error");return;}
    try{
      await api.burn(parseInt(burnAmount),burnReason);
      showToast(`Burn exitoso: -${burnAmount} monedas destruidas`);
      refresh();setBurnAmount("");setBurnReason("");setBurnSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  // Calcular coins en circulación (en manos de alumnos)
  const coinsCirculando = users.reduce((s,u)=>s+(u.total_earned||0),0);
  const treasury = data?.balance||0;

  return(
    <div>
      <OHdr title="Tesoreria" sub="ADMIN"/>
      <div style={{padding:"0 14px",marginTop:12}}>

        {/* Balance principal */}
        <WCard style={{textAlign:"center",padding:"24px 20px",marginBottom:12}}>
          <div style={{fontSize:12,color:"#aaa",fontWeight:700,letterSpacing:".1em",marginBottom:6}}>
            BALANCE TESORERIA
          </div>
          <div style={{fontWeight:900,fontSize:44,color:"#00c1fc",letterSpacing:"-2px"}}>
            {loading?"...":treasury.toLocaleString("es-AR")}
          </div>
          <div style={{fontSize:11,color:"#aaa",marginTop:4}}>monedas disponibles para distribuir</div>
        </WCard>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <WCard style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:22,marginBottom:4}}>🎓</div>
            <div style={{fontWeight:900,fontSize:18,color:"#f59e0b"}}>{coinsCirculando.toLocaleString("es-AR")}</div>
            <div style={{fontSize:10,color:"#aaa",fontWeight:700}}>En manos de alumnos</div>
          </WCard>
          <WCard style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:22,marginBottom:4}}>📊</div>
            <div style={{fontWeight:900,fontSize:18,color:"#8b5cf6"}}>{(treasury+coinsCirculando).toLocaleString("es-AR")}</div>
            <div style={{fontSize:10,color:"#aaa",fontWeight:700}}>Total en circulacion</div>
          </WCard>
        </div>

        {/* Acciones */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <button onClick={()=>setMintSheet(true)}
            style={{background:"#10b981",border:"none",borderRadius:16,color:"white",
              padding:"16px",fontWeight:800,fontSize:15,cursor:"pointer",
              fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 14px #10b98133"}}>
            + Mint 🪙
          </button>
          <button onClick={()=>setBurnSheet(true)}
            style={{background:"#ef4444",border:"none",borderRadius:16,color:"white",
              padding:"16px",fontWeight:800,fontSize:15,cursor:"pointer",
              fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 14px #ef444433"}}>
            Burn 🔥
          </button>
        </div>

        {/* Explicacion */}
        <WCard style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#888",fontWeight:700,lineHeight:1.7}}>
            <div><span style={{color:"#10b981"}}>● Mint</span> — Crea monedas y las acredita a la Tesoreria. Estas se distribuyen via misiones y premios.</div>
            <div style={{marginTop:4}}><span style={{color:"#ef4444"}}>● Burn</span> — Destruye monedas de la Tesoreria permanentemente. Reduce la oferta total.</div>
            <div style={{marginTop:4}}><span style={{color:"#f59e0b"}}>● Distribucion</span> — Las monedas pasan de Tesoreria a alumnos via rewards y misiones. El sistema es de doble entrada.</div>
          </div>
        </WCard>

        {/* Historial mint/burn */}
        {txs.length>0&&(
          <>
            <div style={{fontWeight:800,color:"#1a1a1a",fontSize:13,marginBottom:8}}>
              Historial de operaciones
            </div>
            {txs.map((t,i)=>(
              <WCard key={i} style={{marginBottom:6,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{t.action==="mint"?"🪙":"🔥"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",textTransform:"capitalize"}}>
                      {t.action} — {t.actor_nombre||"Admin"}
                    </div>
                    <div style={{fontSize:11,color:"#aaa"}}>
                      {new Date(t.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{fontWeight:900,fontSize:14,
                    color:t.action==="mint"?"#10b981":"#ef4444"}}>
                    {t.action==="mint"?"+":"-"}{t.details?.amount?.toLocaleString("es-AR")||"?"}
                  </div>
                </div>
              </WCard>
            ))}
          </>
        )}
      </div>

      {mintSheet&&(
        <Sheet title="Mint — Crear monedas" onClose={()=>setMintSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#f0fdf4",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#10b981",fontWeight:700}}>
              Las monedas se acreditaran a la Tesoreria y podras distribuirlas via misiones y premios.
            </div>
            <Inp val={mintAmount} set={setMintAmount} ph="Cantidad de monedas" type="number" icon="🪙"/>
            <Inp val={mintDesc}   set={setMintDesc}   ph="Descripcion (ej: Inicio de trimestre)" icon="📝"/>
            <PBtn label="Confirmar mint" onClick={doMint} full color="#10b981"/>
          </div>
        </Sheet>
      )}
      {burnSheet&&(
        <Sheet title="Burn — Destruir monedas" onClose={()=>setBurnSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fef2f2",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#ef4444",fontWeight:700}}>
              Esta accion es irreversible. Solo se pueden destruir monedas de la Tesoreria.
            </div>
            <Inp val={burnAmount} set={setBurnAmount} ph="Cantidad a destruir" type="number" icon="🔥"/>
            <Inp val={burnReason} set={setBurnReason} ph="Motivo obligatorio" icon="📝"/>
            <PBtn label="Confirmar burn" onClick={doBurn} full color="#ef4444"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN RANKING — Top holders y top misiones
// ════════════════════════════════════════════════════════════
function AdminRanking({onBack}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sec,setSec]=useState("holders");
  const [classrooms,setCl]=useState([]);
  const [selClass,setSelClass]=useState(null); // null = global
  const [clView,setClView]=useState(false); // mostrar selector de aulas

  useEffect(()=>{
    setLoading(true);
    api.adminRanking(selClass?.id||null)
      .then(d=>setData(d.data||d)).catch(()=>{}).finally(()=>setLoading(false));
    api.adminClassrooms().then(d=>setCl(d.data||d||[])).catch(()=>{});
  },[selClass]);

  // Filtrar datos por aula si hay una seleccionada
  const filterByClass=(list,field="id")=>{
    if(!selClass||!list) return list||[];
    // Necesitamos los miembros del aula — simplificado: filtramos por nombre si tenemos los datos
    return list; // se filtra server-side en una mejora futura; por ahora mostramos todo
  };

  const MEDAL=["🥇","🥈","🥉"];
  const COLOR=["#f59e0b","#94a3b8","#cd7c2f"];

  const RankCard=({user,rank,value,sub,maxVal})=>(
    <div style={{background:"white",borderRadius:16,padding:"12px 14px",marginBottom:8,
      boxShadow:"0 1px 8px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12,
      border:rank===0?"1.5px solid #f59e0b22":"none"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:COLOR[rank]+"22",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:rank<3?18:12,fontWeight:900,color:COLOR[rank]||"#94a3b8",flexShrink:0}}>
        {rank<3?MEDAL[rank]:rank+1}
      </div>
      <Av user={user} sz={36}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nombre}</div>
        {sub&&<div style={{fontSize:10,color:"#aaa"}}>{sub}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontWeight:900,fontSize:15,color:rank===0?"#f59e0b":"#00c1fc"}}>
          🪙{value.toLocaleString("es-AR")}
        </div>
        {maxVal&&(
          <div style={{width:60,height:4,background:"#f0f0f0",borderRadius:99,marginTop:3}}>
            <div style={{width:Math.round(value/maxVal*100)+"%",height:"100%",borderRadius:99,
              background:rank===0?"#f59e0b":"#00c1fc"}}/>
          </div>
        )}
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#f59e0b",color:"white",padding:"22px 16px 16px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",
            alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,fontWeight:900,fontSize:20}}>
            🏆 {selClass?selClass.nombre:"Ranking Global"}
          </div>
          <button onClick={()=>setClView(v=>!v)}
            style={{background:"rgba(0,0,0,.2)",border:"none",borderRadius:10,color:"white",
              padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            🏫 Aulas
          </button>
        </div>

        {/* Selector de aulas */}
        {clView&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            <button onClick={()=>{setSelClass(null);setClView(false);}}
              style={{background:!selClass?"rgba(255,255,255,.35)":"rgba(255,255,255,.15)",
                border:"1.5px solid "+(selClass?"rgba(255,255,255,.2)":"rgba(255,255,255,.6)"),
                borderRadius:99,padding:"5px 11px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              🌐 Global
            </button>
            {classrooms.map(c=>(
              <button key={c.id} onClick={()=>{setSelClass(c);setClView(false);}}
                style={{background:selClass?.id===c.id?"rgba(255,255,255,.35)":"rgba(255,255,255,.15)",
                  border:"1.5px solid "+(selClass?.id===c.id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                  borderRadius:99,padding:"5px 11px",fontSize:11,fontWeight:800,color:"white",
                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                🏫 {c.nombre} ({c.total_miembros||0})
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        {data?.stats&&!clView&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {v:data.stats.total_alumnos,l:"Alumnos"},
              {v:data.stats.total_misiones_completadas,l:"Misiones"},
              {v:data.stats.total_checkins,l:"Check-ins"},
              {v:(data.stats.total_distribuido||0).toLocaleString("es-AR"),l:"Distribuido"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,.2)",borderRadius:10,
                padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontWeight:900,fontSize:16}}>{s.v}</div>
                <div style={{fontSize:9,opacity:.8,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginTop:12}}>
          {[["holders","💰 Top Saldo"],["misiones","⚡ Top Misiones"],["checkin","🔥 Top Racha"]].map(([id,l])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{background:sec===id?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:"1.5px solid "+(sec===id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Calculando...</div>}

        {/* TOP HOLDERS — saldo actual */}
        {sec==="holders"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MAYOR SALDO ACTUAL
            </div>
            <div style={{background:"#fff7ed",borderRadius:12,padding:"10px 14px",marginBottom:12,
              fontSize:11,color:"#92400e",fontWeight:700,lineHeight:1.5}}>
              💡 Saldo real en cuenta ahora mismo (incluye todo lo recibido menos todo lo gastado)
            </div>
            {(data?.topHolders||[]).map((u,i)=>(
              <RankCard key={u.id} user={u} rank={i} value={u.balance}
                maxVal={data.topHolders[0]?.balance||1}/>
            ))}
          </>
        )}

        {/* TOP MISIONES — solo lo ganado por misiones aprobadas */}
        {sec==="misiones"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MONEDAS GANADAS POR MISIONES
            </div>
            <div style={{background:"#eff6ff",borderRadius:12,padding:"10px 14px",marginBottom:12,
              fontSize:11,color:"#1e40af",fontWeight:700,lineHeight:1.5}}>
              💡 Solo cuenta lo ganado por misiones aprobadas. No descuenta gastos, transferencias ni nada.
            </div>
            {(data?.topMisiones||[]).map((u,i)=>(
              <RankCard key={u.id} user={u} rank={i} value={u.ganado_misiones}
                sub={`${u.misiones_completadas} misiones completadas`}
                maxVal={data.topMisiones[0]?.ganado_misiones||1}/>
            ))}
          </>
        )}

        {/* TOP RACHA CHECK-IN */}
        {sec==="checkin"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MAYOR RACHA DIARIA
            </div>
            {(data?.topCheckin||[]).map((u,i)=>(
              <div key={u.id} style={{background:"white",borderRadius:16,padding:"12px 14px",
                marginBottom:8,boxShadow:"0 1px 8px rgba(0,0,0,.06)",
                display:"flex",alignItems:"center",gap:12,
                border:i===0?"1.5px solid #f59e0b22":"none"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:COLOR[i]+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:i<3?18:12,fontWeight:900,color:COLOR[i]||"#94a3b8",flexShrink:0}}>
                  {i<3?MEDAL[i]:i+1}
                </div>
                <Av user={u} sz={36}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{u.nombre}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>{u.total_checkins} check-ins totales</div>
                </div>
                <div style={{fontWeight:900,fontSize:16,color:"#f97316"}}>
                  🔥{u.racha_max}
                </div>
              </div>
            ))}
          </>
        )}

        {!loading&&data&&Object.values(data).every(v=>!Array.isArray(v)||v.length===0)&&(
          <div style={{textAlign:"center",color:"#aaa",padding:40}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontWeight:800,marginTop:8}}>Sin datos todavia</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN BANCO — Transferencias directas desde tesorería
// ════════════════════════════════════════════════════════════
function AdminBanco({me,showToast,onBack}){
  const [sec,setSec]     = useState("enviar"); // enviar|impuesto|historial
  const [users,setUsers] = useState([]);
  const [classrooms,setCl]= useState([]);
  const [historial,setHist]=useState([]);
  // Enviar
  const [rMode,setRMode] = useState("individual"); // individual|students|teachers|classroom|all
  const [selUser,setSelUser]=useState(null);
  const [selClass,setSelClass]=useState(null);
  const [userSearch,setUserSearch]=useState("");
  const [amount,setAmount]=useState("");
  const [desc,setDesc]=useState("");
  const [tipo,setTipo]=useState("premio");
  const [sending,setSending]=useState(false);
  const [lastResult,setLastResult]=useState(null);
  // Revertir
  const [revertId,setRevertId]=useState("");
  const [revertMotivo,setRevertMotivo]=useState("");
  const [reverting,setReverting]=useState(false);
  // Impuesto
  const [taxRMode,setTaxRMode]=useState("individual");
  const [taxUser,setTaxUser]=useState(null);
  const [taxClass,setTaxClass]=useState(null);
  const [taxSearch,setTaxSearch]=useState("");
  const [taxAmt,setTaxAmt]=useState("");
  const [taxMotivo,setTaxMotivo]=useState("");
  const [taxPer,setTaxPer]=useState("unico");
  const [taxing,setTaxing]=useState(false);

  useEffect(()=>{
    api.adminUsers().then(u=>{
      const arr=Array.isArray(u)?u:u.data||u||[];
      setUsers(arr.filter(x=>x.activo&&x.rol!=="admin"));
    }).catch(()=>{});
    api.adminClassrooms().then(d=>setCl(d.data||d||[])).catch(()=>{});
    api.auditLog().then(logs=>{
      const arr=Array.isArray(logs)?logs:logs.data||[];
      setHist(arr.filter(l=>l.action==="reward"||l.details?.tax).slice(0,15));
    }).catch(()=>{});
  },[]);

  const filtUsers=users.filter(u=>u.nombre.toLowerCase().includes(userSearch.toLowerCase())||u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filtTaxUsers=users.filter(u=>u.nombre.toLowerCase().includes(taxSearch.toLowerCase()));

  const enviar=async()=>{
    if(!amount||parseInt(amount)<=0){showToast("Ingresa un monto","error");return;}
    if(rMode==="individual"&&!selUser){showToast("Selecciona un destinatario","error");return;}
    if(rMode==="classroom"&&!selClass){showToast("Selecciona un aula","error");return;}
    setSending(true);
    try{
      const recipients = rMode==="individual"?[selUser.id]:rMode;
      const d=await api.bankTransfer({
        recipients, classroom_id:selClass?.id||null,
        amount:parseInt(amount), descripcion:desc.trim()||null, tipo
      });
      const r=d.data||d;
      setLastResult(r);
      showToast(`Enviado a ${r.ok} usuario${r.ok!==1?"s":""} correctamente`);
      setAmount("");setDesc("");setSelUser(null);
      // Recargar historial
      api.auditLog().then(logs=>{
        const arr=Array.isArray(logs)?logs:logs.data||[];
        setHist(arr.filter(l=>l.action==="reward"||l.details?.tax).slice(0,15));
      }).catch(()=>{});
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSending(false);}
  };

  const revertir=async()=>{
    if(!revertId.trim()||!revertMotivo.trim()){showToast("Completa ID y motivo","error");return;}
    setReverting(true);
    try{
      const d=await api.bankRevert({transaction_id:revertId.trim(),motivo:revertMotivo.trim()});
      const r=d.data||d;
      showToast(`Revertido: -🪙${r.amount} de ${r.user}`);
      setRevertId("");setRevertMotivo("");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setReverting(false);}
  };

  const cobrarImpuesto=async()=>{
    if(!taxAmt||parseInt(taxAmt)<=0){showToast("Ingresa un monto","error");return;}
    if(!taxMotivo.trim()){showToast("El motivo es obligatorio","error");return;}
    if(taxRMode==="individual"&&!taxUser){showToast("Selecciona un alumno","error");return;}
    if(taxRMode==="classroom"&&!taxClass){showToast("Selecciona un aula","error");return;}
    setTaxing(true);
    try{
      const recipients=taxRMode==="individual"?[taxUser.id]:taxRMode==="classroom"?"classroom":"all";
      const d=await api.applyTax({
        recipients, classroom_id:taxClass?.id||null,
        amount:parseInt(taxAmt), motivo:taxMotivo.trim(), periodicidad:taxPer
      });
      const r=d.data||d;
      showToast(`Impuesto aplicado a ${r.ok} alumno${r.ok!==1?"s":""}`);
      setTaxAmt("");setTaxMotivo("");setTaxUser(null);
    }catch(e){showToast(e.message||"Error","error");}
    finally{setTaxing(false);}
  };

  const TIPO_OPTS=[
    {v:"premio","l":"🏆 Premio",col:"#f59e0b"},
    {v:"salario","l":"💼 Salario",col:"#3b82f6"},
    {v:"beca","l":"🎓 Beca",col:"#10b981"},
    {v:"prestamo","l":"🏦 Prestamo",col:"#8b5cf6"},
    {v:"ajuste","l":"⚖️ Ajuste",col:"#64748b"},
    {v:"otro","l":"📋 Otro",col:"#94a3b8"},
  ];
  const RMODE_OPTS=[
    {v:"individual",l:"👤 Individual"},
    {v:"students",l:"🎓 Todos los alumnos"},
    {v:"teachers",l:"👩‍🏫 Todos los docentes"},
    {v:"classroom",l:"🏫 Un aula"},
    {v:"all",l:"🌐 Todos"},
  ];

  const UserSearch=({val,setVal,onSel,excludeTeachers})=>{
    const filtered=(excludeTeachers?users.filter(u=>u.rol!=="teacher"):users)
      .filter(u=>u.nombre.toLowerCase().includes(val.toLowerCase()));
    return(
      <div>
        <input value={val} onChange={e=>{setVal(e.target.value);onSel(null);}}
          placeholder="Buscar por nombre..."
          style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",
            borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",
            fontFamily:"Nunito,sans-serif",color:"#1a1a1a",marginBottom:6}}/>
        {val&&filtered.slice(0,5).map(u=>(
          <div key={u.id} onClick={()=>{onSel(u);setVal(u.nombre);}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
              borderRadius:10,cursor:"pointer",background:"#f9f9f9",marginBottom:3}}>
            <Av user={u} sz={28}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:12}}>{u.nombre}</div>
              <div style={{fontSize:10,color:"#aaa"}}>{u.rol}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#10b981",color:"white",padding:"22px 16px 16px",
        position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div>
            <div style={{fontWeight:900,fontSize:20}}>🏛️ Banco Aubank</div>
            <div style={{fontSize:11,opacity:.85}}>Transferencias · Impuestos · Reversas</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["enviar","💸 Enviar"],["impuesto","⚖️ Impuesto"],["historial","📋 Historial"]].map(([id,l])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{background:sec===id?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:"1.5px solid "+(sec===id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>

        {/* ── ENVIAR ── */}
        {sec==="enviar"&&(
          <>
            {/* Info pedagógica */}
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:"4px solid #10b981",fontSize:11,
              color:"#555",lineHeight:1.6}}>
              <b>Tesoro</b> crea/destruye monedas. <b>Banco</b> distribuye esas monedas a personas específicas.
              Esta separación pedagógica refleja cómo funciona la economía real.
            </div>

            {/* Tipo de envío */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>Destinatarios</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {RMODE_OPTS.map(opt=>(
                  <button key={opt.v} onClick={()=>{setRMode(opt.v);setSelUser(null);setSelClass(null);setUserSearch("");}}
                    style={{background:rMode===opt.v?"#10b981":"#f0f0f0",
                      color:rMode===opt.v?"white":"#555",border:"none",borderRadius:99,
                      padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {rMode==="individual"&&(
                <UserSearch val={userSearch} setVal={setUserSearch} onSel={setSelUser}/>
              )}
              {rMode==="classroom"&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {classrooms.map(c=>(
                    <button key={c.id} onClick={()=>setSelClass(c)}
                      style={{background:selClass?.id===c.id?"#10b981":"#f0f0f0",
                        color:selClass?.id===c.id?"white":"#555",border:"none",borderRadius:10,
                        padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {c.nombre} ({c.total_miembros||0})
                    </button>
                  ))}
                </div>
              )}
              {rMode!=="individual"&&rMode!=="classroom"&&(
                <div style={{background:"#f0fdf4",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#10b981",fontWeight:700}}>
                  {rMode==="students"?`Se enviará a todos los alumnos activos (${users.filter(u=>u.rol==="student").length})`
                   :rMode==="teachers"?`Se enviará a todos los docentes (${users.filter(u=>u.rol==="teacher").length})`
                   :`Se enviará a todos los usuarios (${users.length})`}
                </div>
              )}
            </div>

            {/* Tipo de transferencia */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Tipo</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {TIPO_OPTS.map(t=>(
                  <button key={t.v} onClick={()=>setTipo(t.v)}
                    style={{background:tipo===t.v?t.col:"#f0f0f0",color:tipo===t.v?"white":"#555",
                      border:"none",borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:800,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Monto y descripcion</div>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                <input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)}
                  placeholder="🪙"
                  style={{width:80,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px",
                    fontSize:18,fontWeight:900,outline:"none",color:"#10b981",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
                {[5,10,25,50,100,200,500].map(n=>(
                  <button key={n} onClick={()=>setAmount(String(n))}
                    style={{background:amount===String(n)?"#10b981":"#f0f0f0",
                      color:amount===String(n)?"white":"#555",border:"none",borderRadius:8,
                      padding:"6px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{n}</button>
                ))}
              </div>
              <input value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="Descripcion (opcional)..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",color:"#1a1a1a"}}/>
            </div>

            <button onClick={enviar} disabled={sending||!amount}
              style={{width:"100%",background:sending||!amount?"#ccc":"#10b981",
                border:"none",borderRadius:50,color:"white",padding:"15px",fontWeight:900,
                fontSize:15,cursor:sending||!amount?"not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 16px #10b98133",marginBottom:10}}>
              {sending?"Enviando...":"Enviar transferencia"}
            </button>

            {lastResult&&(
              <div style={{background:"#f0fdf4",borderRadius:14,padding:"12px 14px",
                border:"1.5px solid #10b981",fontSize:12,color:"#10b981",fontWeight:700}}>
                ✅ Enviado a {lastResult.ok}/{lastResult.total} usuarios
                {lastResult.failed>0&&<span style={{color:"#ef4444"}}> · {lastResult.failed} fallidos</span>}
              </div>
            )}

            {/* Revertir */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginTop:12,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",borderLeft:"4px solid #ef4444"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:4}}>↩️ Revertir transaccion</div>
              <div style={{fontSize:11,color:"#aaa",marginBottom:10}}>Pega el ID de la transaccion a revertir (visible en Audit Log)</div>
              <input value={revertId} onChange={e=>setRevertId(e.target.value)}
                placeholder="UUID de la transaccion..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fecaca",borderRadius:12,
                  padding:"9px 14px",fontSize:12,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:6,fontFamily:"monospace"}}/>
              <input value={revertMotivo} onChange={e=>setRevertMotivo(e.target.value)}
                placeholder="Motivo de la reversa..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fecaca",borderRadius:12,
                  padding:"9px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:8}}/>
              <button onClick={revertir} disabled={reverting||!revertId||!revertMotivo}
                style={{width:"100%",background:reverting||!revertId||!revertMotivo?"#ccc":"#ef4444",
                  border:"none",borderRadius:50,color:"white",padding:"11px",fontWeight:800,
                  fontSize:13,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                {reverting?"Revirtiendo...":"Confirmar reversa"}
              </button>
            </div>
          </>
        )}

        {/* ── IMPUESTO ── */}
        {sec==="impuesto"&&(
          <>
            <div style={{background:"#fff7ed",borderRadius:14,padding:"12px 14px",marginBottom:10,
              border:"1.5px solid #fed7aa",fontSize:11,color:"#92400e",lineHeight:1.6}}>
              <b>Impuesto / Penalidad</b> — descuenta monedas de los alumnos y las devuelve al Tesoro.
              El alumno recibe una notificación con el motivo.
            </div>

            {/* Destinatarios */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:10}}>Destinatarios</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {[{v:"individual",l:"👤 Individual"},{v:"classroom",l:"🏫 Un aula"},{v:"all",l:"🎓 Todos los alumnos"}].map(opt=>(
                  <button key={opt.v} onClick={()=>{setTaxRMode(opt.v);setTaxUser(null);setTaxClass(null);setTaxSearch("");}}
                    style={{background:taxRMode===opt.v?"#f97316":"#f0f0f0",
                      color:taxRMode===opt.v?"white":"#555",border:"none",borderRadius:99,
                      padding:"6px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {taxRMode==="individual"&&(
                <UserSearch val={taxSearch} setVal={setTaxSearch} onSel={setTaxUser} excludeTeachers/>
              )}
              {taxRMode==="classroom"&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {classrooms.map(c=>(
                    <button key={c.id} onClick={()=>setTaxClass(c)}
                      style={{background:taxClass?.id===c.id?"#f97316":"#f0f0f0",
                        color:taxClass?.id===c.id?"white":"#555",border:"none",borderRadius:10,
                        padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Monto, motivo, periodicidad */}
            <div style={{background:"white",borderRadius:14,padding:"14px",marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",marginBottom:8}}>Detalle</div>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <input type="number" min="1" value={taxAmt} onChange={e=>setTaxAmt(e.target.value)}
                  placeholder="🪙"
                  style={{width:80,border:"1.5px solid #fed7aa",borderRadius:12,padding:"10px",
                    fontSize:18,fontWeight:900,outline:"none",color:"#f97316",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
                {[5,10,25,50,100].map(n=>(
                  <button key={n} onClick={()=>setTaxAmt(String(n))}
                    style={{background:taxAmt===String(n)?"#f97316":"#f0f0f0",
                      color:taxAmt===String(n)?"white":"#555",border:"none",borderRadius:8,
                      padding:"6px 8px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{n}</button>
                ))}
              </div>
              <input value={taxMotivo} onChange={e=>setTaxMotivo(e.target.value)}
                placeholder="Motivo obligatorio (visible para el alumno)..."
                style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #fed7aa",borderRadius:12,
                  padding:"10px 14px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",
                  color:"#1a1a1a",marginBottom:8}}/>
              <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>Periodicidad</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[["unico","📌 Unico"],["diario","📅 Diario"],["semanal","📆 Semanal"],["mensual","🗓️ Mensual"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTaxPer(v)}
                    style={{background:taxPer===v?"#f97316":"#f0f0f0",color:taxPer===v?"white":"#555",
                      border:"none",borderRadius:99,padding:"6px 12px",fontSize:11,fontWeight:800,
                      cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{l}</button>
                ))}
              </div>
            </div>

            <button onClick={cobrarImpuesto} disabled={taxing||!taxAmt||!taxMotivo}
              style={{width:"100%",background:taxing||!taxAmt||!taxMotivo?"#ccc":"#f97316",
                border:"none",borderRadius:50,color:"white",padding:"15px",fontWeight:900,
                fontSize:15,cursor:"pointer",fontFamily:"Nunito,sans-serif",
                boxShadow:"0 4px 16px #f9731633"}}>
              {taxing?"Aplicando...":"Aplicar impuesto/penalidad"}
            </button>
          </>
        )}

        {/* ── HISTORIAL ── */}
        {sec==="historial"&&(
          <>
            <div style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 8px rgba(0,0,0,.06)",fontSize:11,color:"#555",lineHeight:1.6}}>
              💡 Toca el icono 📋 de cualquier transaccion para copiar su ID y usarlo en "Revertir".
            </div>
            {historial.length===0&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Sin historial todavia</div>}
            {historial.map((h,i)=>{
              const txId = h.details?.transaction_id||h.id||"";
              return(
                <div key={i} style={{background:"white",borderRadius:14,padding:"12px 14px",
                  marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{h.details?.tax?"⚖️":"🏛️"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:12,color:"#1a1a1a"}}>
                        → {h.target_nombre||"Varios usuarios"}
                      </div>
                      <div style={{fontSize:10,color:"#aaa"}}>
                        {new Date(h.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                      </div>
                      {txId&&(
                        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                          <span style={{fontSize:9,color:"#bbb",fontFamily:"monospace"}}>
                            {txId.slice(0,18)}...
                          </span>
                          <button onClick={()=>{
                            navigator.clipboard?.writeText(txId);
                            showToast("ID copiado");
                          }} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,padding:2}}>📋</button>
                        </div>
                      )}
                    </div>
                    <div style={{fontWeight:900,fontSize:13,color:h.details?.tax?"#f97316":"#10b981",textAlign:"right"}}>
                      {h.details?.tax?"-":"+"} 🪙{h.details?.amount||"?"}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}


// ── StoreItemForm — componente propio para evitar re-mount bug ─
function StoreItemForm({creating, editing, onClose, onSaved, showToast}){
  const [fNombre,setFNombre] = useState(editing?.nombre||"");
  const [fDesc,setFDesc]     = useState(editing?.descripcion||"");
  const [fPrecio,setFPrecio] = useState(editing?String(editing.precio):"");
  const [fStock,setFStock]   = useState(editing?.stock===-1?"":String(editing?.stock||""));
  const [fIcon,setFIcon]     = useState(editing?.icon||"🎁");
  const [fImagen,setFImagen] = useState(editing?.imagen_url||"");
  const [fMensaje,setFMensaje]=useState(editing?.mensaje_oculto||"");
  const [fActivo,setFActivo] = useState(editing?.activo!==false);
  const [saving,setSaving]   = useState(false);

  const handleImg=(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>setFImagen(ev.target.result);
    r.readAsDataURL(f);
  };

  const guardar=async()=>{
    if(!fNombre.trim()||!fPrecio){showToast("Nombre y precio requeridos","error");return;}
    setSaving(true);
    const body={
      nombre:fNombre.trim(), descripcion:fDesc.trim(),
      precio:parseInt(fPrecio)||0, stock:fStock?parseInt(fStock):-1,
      icon:fIcon, imagen_url:fImagen||null,
      mensaje_oculto:fMensaje.trim()||null, activo:fActivo,
    };
    try{
      if(creating) await api.createItem(body);
      else await api.updateItem(editing.id,body);
      showToast(creating?"Item creado ✅":"Item actualizado ✅");
      onSaved();
    }catch(e){showToast(e.message||"Error al guardar","error");}
    finally{setSaving(false);}
  };

  return(
    <Sheet title={creating?"Nuevo item":fNombre} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={fIcon} onChange={e=>setFIcon(e.target.value)} maxLength={4}
            style={{width:54,border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px",
              fontSize:22,textAlign:"center",outline:"none",fontFamily:"Nunito,sans-serif"}}/>
          <div style={{flex:1}}><Inp val={fNombre} set={setFNombre} ph="Nombre del item"/></div>
        </div>
        <Inp val={fDesc} set={setFDesc} ph="Descripcion visible" icon="📝"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp val={fPrecio} set={setFPrecio} ph="Precio 🪙" type="number"/>
          <Inp val={fStock}  set={setFStock}  ph="Stock (vacio=∞)" type="number"/>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#666",marginBottom:6}}>📸 Imagen (opcional)</div>
          {fImagen&&(
            <div style={{position:"relative",marginBottom:8}}>
              <img src={fImagen} alt="" style={{width:"100%",height:100,objectFit:"cover",borderRadius:10}}/>
              <button onClick={()=>setFImagen("")}
                style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.6)",border:"none",
                  borderRadius:"50%",color:"white",width:26,height:26,cursor:"pointer",fontSize:13,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          )}
          <label style={{display:"block",cursor:"pointer"}}>
            <input type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
            <div style={{border:"1.5px dashed #ddd",borderRadius:10,padding:"10px",
              textAlign:"center",fontSize:12,color:"#aaa",fontWeight:700}}>
              {fImagen?"📸 Cambiar imagen":"📱 Subir imagen del celular"}
            </div>
          </label>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#8b5cf6",marginBottom:6}}>
            🔒 Mensaje oculto (solo visible al comprar)
          </div>
          <textarea value={fMensaje} onChange={e=>setFMensaje(e.target.value)} rows={3}
            placeholder="Contraseña, codigo, instruccion secreta..."
            style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e0d4ff",
              borderRadius:10,padding:"9px 12px",fontSize:12,outline:"none",resize:"none",
              fontFamily:"Nunito,sans-serif",color:"#1a1a1a",background:"#faf5ff"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setFActivo(a=>!a)}
            style={{background:fActivo?"#10b981":"#f0f0f0",color:fActivo?"white":"#555",
              border:"none",borderRadius:99,padding:"7px 14px",fontWeight:800,fontSize:12,
              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            {fActivo?"Activo":"Inactivo"}
          </button>
          <span style={{fontSize:11,color:"#aaa"}}>Los inactivos no aparecen en la tienda</span>
        </div>
        <button onClick={guardar} disabled={saving}
          style={{background:saving?"#ccc":"#00c1fc",border:"none",borderRadius:50,
            color:"white",padding:"13px",fontWeight:800,fontSize:14,cursor:"pointer",
            fontFamily:"Nunito,sans-serif"}}>
          {saving?"Guardando...":creating?"Crear item":"Guardar cambios"}
        </button>
      </div>
    </Sheet>
  );
}

function AdminTienda({showToast}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState(null); // null | {type:'create'} | {type:'edit',item}
  const [delConfirm,setDelConfirm]=useState(null);

  const load=()=>{ setLoading(true); api.storeItems().then(d=>setItems(Array.isArray(d)?d:d.data||d||[])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const eliminar=async(id)=>{
    try{ await api.deleteItem(id); setItems(prev=>prev.filter(i=>i.id!==id)); setDelConfirm(null); showToast("Item eliminado"); }
    catch(e){ showToast(e.message||"Error","error"); }
  };

  return(
    <div>
      <OHdr title="Tienda" sub="ADMIN"
        extra={<button onClick={()=>setMode({type:"create"})}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nuevo item
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {items.map(item=>(
          <div key={item.id} style={{background:"white",borderRadius:16,marginBottom:10,
            overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,.06)",opacity:item.activo!==false?1:.55}}>
            {item.imagen_url&&<img src={item.imagen_url} alt={item.nombre} style={{width:"100%",height:100,objectFit:"cover"}}/>}
            <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:28,flexShrink:0}}>{item.icon||"🎁"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{item.nombre}</div>
                {item.descripcion&&<div style={{fontSize:11,color:"#aaa",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.descripcion}</div>}
                <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontWeight:800,color:"#00c1fc",fontSize:12}}>🪙{item.precio}</span>
                  <span style={{fontSize:10,color:"#ddd"}}>Stock:{item.stock===-1?"∞":item.stock}</span>
                  {item.mensaje_oculto&&<span style={{background:"#8b5cf622",color:"#8b5cf6",borderRadius:99,padding:"1px 6px",fontSize:9,fontWeight:800}}>🔒 Oculto</span>}
                  {item.activo===false&&<span style={{background:"#f0f0f0",color:"#aaa",borderRadius:99,padding:"1px 6px",fontSize:9,fontWeight:800}}>Inactivo</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button onClick={()=>setMode({type:"edit",item})}
                  style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"7px 12px",fontSize:11,fontWeight:800,cursor:"pointer",color:"#555",fontFamily:"Nunito,sans-serif"}}>Editar</button>
                <button onClick={()=>setDelConfirm(item.id)}
                  style={{background:"#fee2e2",border:"none",borderRadius:10,padding:"7px 12px",fontSize:11,fontWeight:800,cursor:"pointer",color:"#ef4444",fontFamily:"Nunito,sans-serif"}}>Borrar</button>
              </div>
            </div>
          </div>
        ))}
        {!loading&&items.length===0&&(
          <div style={{background:"white",borderRadius:16,padding:40,textAlign:"center",boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Tienda vacia</div>
          </div>
        )}
      </div>

      {mode?.type==="create"&&(
        <StoreItemForm creating={true} editing={null}
          onClose={()=>setMode(null)} onSaved={()=>{setMode(null);load();}} showToast={showToast}/>
      )}
      {mode?.type==="edit"&&(
        <StoreItemForm creating={false} editing={mode.item}
          onClose={()=>setMode(null)} onSaved={()=>{setMode(null);load();}} showToast={showToast}/>
      )}

      {delConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"white",borderRadius:20,padding:"24px",width:"100%",maxWidth:340}}>
            <div style={{fontWeight:900,fontSize:16,color:"#1a1a1a",marginBottom:8,textAlign:"center"}}>Eliminar item</div>
            <div style={{fontSize:13,color:"#555",textAlign:"center",marginBottom:20}}>Esta accion no se puede deshacer.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDelConfirm(null)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:50,padding:"12px",fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Cancelar</button>
              <button onClick={()=>eliminar(delConfirm)} style={{flex:1,background:"#ef4444",border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>Eliminar</button>
            </div>
          </div>
        </div>
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
// ════════════════════════════════════════════════════════════
// ADMIN — VOTACIONES
// ════════════════════════════════════════════════════════════
function AdminVotaciones({showToast, onBack}){
  const [polls,setPolls]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [titulo,setTitulo]=useState("");
  const [opciones,setOpciones]=useState(["",""]);
  const [durUnidad,setDurUnidad]=useState("horas");
  const [durValor,setDurValor]=useState("24");
  const [saving,setSaving]=useState(false);

  const DUR_MAX={minutos:1440,horas:480,dias:20};
  const DUR_LABEL={minutos:"minutos",horas:"horas",dias:"dias"};
  const JERARQUIA_COLOR={admin:"#00c1fc",teacher:"#8b5cf6"};

  const load=()=>{
    api.polls()
      .then(d=>setPolls(Array.isArray(d)?d:d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

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
    const val=parseInt(durValor)||0;
    if(val<1){showToast("La duracion debe ser mayor a 0","error");return;}
    setSaving(true);
    try{
      await api.createPoll({titulo:titulo.trim(),opciones:ops,fin:calcFinISO()});
      showToast("Votacion creada");
      setForm(false);setTitulo("");setOpciones(["",""]);setDurValor("24");setDurUnidad("horas");
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

  const previewFin=(()=>{
    const val=Math.min(parseInt(durValor)||1,DUR_MAX[durUnidad]);
    const d=new Date();
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
                  {(esAdmin||esTeacher)&&(
                    <div style={{display:"inline-flex",alignItems:"center",gap:4,
                      background:jerarCol+"18",borderRadius:99,padding:"2px 8px",marginBottom:4}}>
                      <span style={{fontSize:9,fontWeight:800,color:jerarCol}}>
                        {esAdmin?"ADMIN":"DOCENTE"}
                      </span>
                    </div>
                  )}
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
                const pct=v.total_votos>0?Math.round(op.votos/v.total_votos*100):0;
                return(
                  <div key={op.id} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,color:"#555",marginBottom:2}}>
                      <span>{op.texto}</span><span>{op.votos} votos ({pct}%)</span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:99,height:6}}>
                      <div style={{width:pct+"%",height:"100%",borderRadius:99,background:jerarCol,transition:"width .4s"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                <span style={{fontSize:11,color:"#aaa"}}>{v.total_votos} votos totales</span>
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
const ESTADO_COL={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};
const ESTADO_LABEL2={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const TIPO_ICON={bullying:"😰",accidente:"🚑",perdido:"🔍",sugerencia:"💡",otro:"📋"};

function AdminReportes({showToast, onBack}){
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filtro,setFiltro]=useState("todos");
  const [sel,setSel]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [newMsg,setNewMsg]=useState("");
  const [resolucion,setResolucion]=useState("");
  const [saving,setSaving]=useState(false);
  const bottomRef=useRef(null);

  const ESTADOS=["recibido","en_revision","resuelto","descartado"];

  const load=()=>{
    const q = filtro==="todos" ? "" : `?estado=${filtro}`;
    api.allReports(q)
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
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20}}>🚩 Reportes</div>
        </div>
        {/* Resumen de conteos */}
        <div style={{display:"flex",gap:6,marginTop:12,overflowX:"auto"}}>
          {[["todos","Todos",null],...ESTADOS.map(e=>[e,ESTADO_LABEL2[e],ESTADO_COL[e]])].map(([val,label,col])=>(
            <button key={val} onClick={()=>setFiltro(val)}
              style={{background:filtro===val?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:`1.5px solid ${filtro===val?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`,
                borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:800,
                color:"white",cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"Nunito,sans-serif",flexShrink:0}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {!loading&&reports.length===0&&(
          <div style={{textAlign:"center",color:"#aaa",padding:32,background:"white",borderRadius:16,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            Sin reportes {filtro!=="todos"?`en estado "${ESTADO_LABEL2[filtro]}"`:""} 
          </div>
        )}
        {reports.map(r=>{
          const tipoInfo = REPORTE_TIPOS.find(t=>t.id===r.tipo)||{icon:"📋",label:r.tipo,col:"#64748b"};
          const estCol   = ESTADO_COL[r.estado]||"#94a3b8";
          return(
            <div key={r.id} onClick={()=>openSel(r)}
              style={{background:"white",borderRadius:16,marginBottom:8,cursor:"pointer",
                boxShadow:"0 1px 8px rgba(0,0,0,.06)",overflow:"hidden",
                borderLeft:`4px solid ${estCol}`}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:12,background:tipoInfo.col+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {tipoInfo.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <span style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{tipoInfo.label}</span>
                    <span style={{background:estCol+"22",color:estCol,borderRadius:99,
                      padding:"1px 7px",fontSize:10,fontWeight:800}}>{ESTADO_LABEL2[r.estado]}</span>
                  </div>
                  <div style={{fontSize:11,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {r.descripcion}
                  </div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                    {r.reporter_nombre||"Anónimo"} · {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <span style={{color:"#ddd",fontSize:18,flexShrink:0}}>›</span>
              </div>
            </div>
          );
        })}
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
  const [checkinCfg,setCheckinCfg]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toast,showToast]=useToast();

  useEffect(()=>{ api.checkinConfig().then(d=>setCheckinCfg(d.data||d)).catch(()=>{}); },[]);

  const saveCheckin=async()=>{
    setSaving(true);
    try{
      await api.checkinConfigUpdate(checkinCfg);
      showToast("Configuracion guardada");
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const infoItems=[
    {icon:"👤", label:"Nombre",      value:me.nombre},
    {icon:"📧", label:"Correo",      value:me.email},
    {icon:"🔑", label:"Rol",         value:ROL_LABEL[me.rol]||me.rol},
    {icon:"🆔", label:"ID de cuenta",value:me.id?.slice(0,8)+"..."},
    {icon:"🌐", label:"Version",     value:"Aubank v1.0"},
    {icon:"🏫", label:"Sistema",     value:"EduCoins Economia Escolar"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{background:"#00c1fc",position:"sticky",top:0,zIndex:50,
        padding:"22px 20px 40px",color:"white",overflow:"hidden",
        textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-40,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22}}>Config</div>
        <div style={{fontSize:13,opacity:.85,marginTop:2}}>Panel de administrador</div>
      </div>

      <div style={{padding:"0 14px 24px",marginTop:-20}}>
        {/* Card avatar */}
        <div style={{background:"white",borderRadius:20,padding:"20px 16px",
          marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)",textAlign:"center"}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#00c1fc22",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 10px"}}>👨‍💼</div>
          <div style={{fontWeight:900,fontSize:18,color:"#1a1a1a"}}>{me.nombre}</div>
          <div style={{fontSize:12,color:"#777",marginTop:2}}>{me.email}</div>
          <div style={{display:"inline-block",marginTop:8,background:"#00c1fc22",
            color:"#00c1fc",borderRadius:99,padding:"4px 14px",fontSize:11,fontWeight:800}}>
            {ROL_LABEL[me.rol]}
          </div>
        </div>

        {/* Check-in config */}
        {checkinCfg&&(
          <div style={{background:"white",borderRadius:20,padding:"16px",
            marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:12}}>
              🔥 Configuracion Check-in Diario
            </div>
            {[
              {key:"base_reward",label:"Monedas base por dia",icon:"🪙"},
              {key:"bonus_3days",label:"Bonus racha 3 dias",icon:"🥉"},
              {key:"bonus_7days",label:"Bonus racha 7 dias",icon:"🥈"},
              {key:"bonus_30days",label:"Bonus racha 30 dias",icon:"🥇"},
            ].map(f=>(
              <div key={f.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
                <div style={{flex:1,fontSize:12,fontWeight:700,color:"#333"}}>{f.label}</div>
                <input type="number" min="0"
                  value={checkinCfg[f.key]||0}
                  onChange={e=>setCheckinCfg(c=>({...c,[f.key]:parseInt(e.target.value)||0}))}
                  style={{width:70,border:"1.5px solid #e8e8e8",borderRadius:10,padding:"7px 10px",
                    fontSize:14,fontWeight:800,outline:"none",color:"#00c1fc",textAlign:"center",
                    fontFamily:"Nunito,sans-serif"}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:16}}>✅</span>
              <div style={{flex:1,fontSize:12,fontWeight:700,color:"#333"}}>Check-in activo</div>
              <button onClick={()=>setCheckinCfg(c=>({...c,activo:!c.activo}))}
                style={{background:checkinCfg.activo?"#10b981":"#f0f0f0",
                  color:checkinCfg.activo?"white":"#555",border:"none",borderRadius:99,
                  padding:"6px 14px",fontWeight:800,fontSize:12,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {checkinCfg.activo?"Activo":"Inactivo"}
              </button>
            </div>
            <button onClick={saveCheckin} disabled={saving}
              style={{width:"100%",background:saving?"#ccc":"#00c1fc",border:"none",
                borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:14,
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Guardando...":"Guardar configuracion"}
            </button>
          </div>
        )}

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

        {/* Cerrar sesión */}
        <button onClick={logout} style={{width:"100%",background:"#fee2e2",border:"none",
          borderRadius:16,color:"#ef4444",padding:"14px",fontWeight:900,fontSize:15,
          cursor:"pointer",fontFamily:"Nunito,sans-serif",
          boxShadow:"0 2px 8px rgba(239,68,68,.2)"}}>
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// ADMIN — TIENDA CUSTOM (precios, items, activar/desactivar)
// ════════════════════════════════════════════════════════════
function PerfilModal({userId, onClose, showToast}){
  const {primary:accent,isDark:dark,txt,sub,cardBg} = useTheme();
  const [perfil,setPerfil]=useState(null);
  const [loading,setLoading]=useState(true);
  const [bloqueado,setBloqueado]=useState(false);
  const [blocking,setBlocking]=useState(false);

  useEffect(()=>{
    api.publicProfile(userId)
      .then(d=>setPerfil(d.data||d))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[userId]);

  const toggleBloquear=async()=>{
    setBlocking(true);
    try{
      if(bloqueado){ await api.unblockUser(userId); setBloqueado(false); showToast("Usuario desbloqueado"); }
      else{ await api.blockUser(userId); setBloqueado(true); showToast("Usuario bloqueado"); }
    }catch(e){showToast(e.message||"Error","error");}
    finally{setBlocking(false);}
  };

  const lv = perfil ? getLv(perfil.total_earned||0) : null;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:500,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:cardBg,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
        padding:"20px 20px 44px",animation:"slideUp .25s ease",maxHeight:"80vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:dark?"#555":"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>

        {loading&&<div style={{textAlign:"center",padding:32,color:sub}}>Cargando...</div>}
        {!loading&&!perfil&&<div style={{textAlign:"center",padding:32,color:sub}}>Perfil no encontrado</div>}
        {perfil&&(
          <>
            {/* Avatar y nombre */}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{margin:"0 auto 12px"}}>
                <Av user={perfil} sz={80}/>
              </div>
              <div style={{fontWeight:900,fontSize:20,color:txt}}>{displayName(perfil)}</div>
              {perfil.titulo_custom&&(
                <div style={{fontSize:12,color:accent,fontWeight:700,marginTop:2}}>{perfil.titulo_custom}</div>
              )}
              {!perfil.titulo_custom&&perfil.rol&&(
                <div style={{fontSize:11,color:sub,marginTop:2}}>
                  {perfil.rol==="teacher"?"👩‍🏫 Docente":"🎓 Alumno"}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {icon:"🪙",v:(perfil.total_earned||0).toLocaleString("es-AR"),l:"Ganadas"},
                {icon:"⚡",v:perfil.misiones||0,l:"Misiones"},
                {icon:"🔥",v:perfil.racha||0,l:"Racha"},
              ].map(s=>(
                <div key={s.l} style={{background:dark?"#2d2a45":"#f8f8f8",borderRadius:14,
                  padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{s.icon}</div>
                  <div style={{fontWeight:900,fontSize:16,color:accent}}>{s.v}</div>
                  <div style={{fontSize:10,color:sub,fontWeight:700}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Nivel */}
            {lv&&(
              <div style={{background:dark?"#2d2a45":"#f8f8f8",borderRadius:14,padding:"10px 14px",
                marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:22}}>{lv.icon}</span>
                <div>
                  <div style={{fontWeight:800,color:txt,fontSize:13}}>{lv.name}</div>
                  <div style={{fontSize:10,color:sub}}>{perfil.total_earned||0} XP total</div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={toggleBloquear} disabled={blocking}
                style={{flex:1,background:bloqueado?"#fee2e2":"#f0f0f0",
                  color:bloqueado?"#ef4444":sub,border:"none",borderRadius:50,
                  padding:"11px",fontWeight:800,fontSize:12,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                {blocking?"...":(bloqueado?"✓ Bloqueado":"Bloquear")}
              </button>
              <button onClick={onClose}
                style={{flex:1,background:accent,color:"white",border:"none",borderRadius:50,
                  padding:"11px",fontWeight:800,fontSize:12,cursor:"pointer",
                  fontFamily:"Nunito,sans-serif"}}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — ECONOMÍA (panel unificado con subsecciones tipo cards)
// Reemplaza AdminCustomShop + AdminEconomia
// ════════════════════════════════════════════════════════════
function AdminEconomia({showToast, onBack}){
  const [sec,setSec] = useState(null); // null=home, o nombre de sección

  const SECCIONES = [
    {id:"colores",    icon:"🖊️", title:"Colores de Nombre",  sub:"Precios y suscripciones", col:"#8b5cf6"},
    {id:"temas",      icon:"🎨", title:"Temas de App",        sub:"Paletas y suscripciones", col:"#ec4899"},
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
    colores: "name_color", temas: "theme", emojis: "emoji_pack",
    efectos: ["title_effect","name_effect","avatar_frame"],
  };
  const PERIODO_PER_SEC = ["colores","temas"];

  useEffect(()=>{
    if(["colores","temas","emojis","efectos"].includes(sec)){
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
    colores:"🖊️ Colores de Nombre", temas:"🎨 Temas", emojis:"😄 Packs Emoji",
    efectos:"✨ Efectos", ranking:"🏆 Premios Ranking", checkin:"🔥 Check-in",
    suscripciones:"🔄 Suscripciones", historial:"📋 Historial",
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
        {["colores","temas","emojis","efectos"].includes(sec)&&!loading&&items.map(item=>(
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
