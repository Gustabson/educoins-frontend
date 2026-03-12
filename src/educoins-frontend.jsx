// EduCoins Frontend — Conectado a API REST
// Reemplaza window.storage por fetch() a localhost:3000

const { useState, useEffect, useCallback, useRef } = React;

// ── CONFIGURACIÓN DE API ──────────────────────────────────────
const API = "http://localhost:3000/api/v1";

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
  {id:"s4",emoji:"🧙",  name:"Mago",    price:250, bg:"#7c3aed"},
  {id:"s5",emoji:"🤖",  name:"Robot",   price:300, bg:"#0f766e"},
  {id:"s6",emoji:"🧔",  name:"Vikingo", price:350, bg:"#92400e"},
  {id:"s7",emoji:"🦸",  name:"Héroe",   price:400, bg:"#1d4ed8"},
  {id:"s8",emoji:"🏴‍☠️", name:"Pirata",  price:500, bg:"#1c1917"},
];
const BORDERS = [
  {id:"b1",name:"Básico",  bs:"3px solid #FF5C00", price:0},
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
  const c=col||"#FF5C00";
  return <span style={{background:c+"1a",color:c,border:`1px solid ${c}33`,
    borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>{text}</span>;
}

function PBtn({label,onClick,disabled,color,full,sm,style}){
  const bg=disabled?"#e0e0e0":color||"#FF5C00";
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
  const c=color||"#FF5C00";
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
    <div style={{background:"#FF5C00",position:"relative",overflow:"hidden",paddingBottom:48,color:"white"}}>
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
    <div style={{minHeight:"100vh",background:"#FF5C00",display:"flex",alignItems:"center",
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
      fontFamily:"Nunito,sans-serif",background:"#FF5C00"}}>
      <style>{GS}</style>
      <div style={{padding:"60px 28px 40px",color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:240,height:240,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-60,pointerEvents:"none"}}/>
        <div style={{fontSize:48,marginBottom:6}}>🏦</div>
        <div style={{fontWeight:900,fontSize:30,letterSpacing:"-1px",lineHeight:1}}>EduCoins</div>
        <div style={{fontSize:14,opacity:.8,marginTop:4,fontWeight:600}}>Tu economía escolar</div>
      </div>
      <div style={{flex:1,background:"white",borderRadius:"28px 28px 0 0",padding:"28px 24px 40px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontWeight:900,fontSize:22,color:"#1a1a1a"}}>Iniciá sesión</div>
          <Inp val={email} set={setEmail} ph="Email" type="email" icon="📧"/>
          <Inp val={pass}  set={setPass}  ph="Contraseña" type="password" icon="🔒"/>
          {err&&<div style={{color:"#ef4444",fontSize:13,fontWeight:700,textAlign:"center"}}>{err}</div>}
          <PBtn label={logging?"Ingresando...":"Ingresar →"} onClick={login} full disabled={logging}/>
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

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#F0F0F0",
      display:"flex",flexDirection:"column",fontFamily:"Nunito,sans-serif"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        {tab==="home"       && <AHome       me={me} balance={balance} onNav={setTab}/>}
        {tab==="misiones"   && <AMisiones   me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="tienda"     && <ATienda     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="enviar"     && <AEnviar     me={me} balance={balance} showToast={showToast} refreshBalance={refreshBalance}/>}
        {tab==="movimientos"&& <AMovimientos/>}
        {tab==="perfil"     && <APerfil     me={me} balance={balance} logout={logout} showToast={showToast} setMe={setMe}/>}
        {tab==="ranking"    && <ARanking/>}
        {tab==="opciones"   && <AOpciones   me={me} logout={logout}/>}
      </div>

      {/* Cámara QR sheet */}
      {camOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:400,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setCamOpen(false);}}>
          <div style={{background:"white",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,
            padding:"20px 24px 44px",animation:"slideUp .25s ease"}}>
            <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:64,marginBottom:12}}>📷</div>
              <div style={{fontWeight:900,fontSize:18,color:"#1a1a1a",marginBottom:6}}>Escáner QR</div>
              <div style={{fontSize:13,color:"#999",marginBottom:24}}>Apuntá la cámara a un código QR</div>
              <div style={{width:180,height:180,margin:"0 auto",borderRadius:20,
                border:"3px solid #FF5C00",display:"flex",alignItems:"center",
                justifyContent:"center",background:"#FFF4EE",fontSize:56}}>🔍</div>
              <div style={{marginTop:16,fontSize:12,color:"#bbb"}}>Disponible en versión móvil</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav con cámara flotante estilo Naranja/Ualá */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,zIndex:100}}>
        {/* Botón cámara flotante */}
        <div style={{position:"absolute",top:-26,left:"50%",transform:"translateX(-50%)",zIndex:101}}>
          <button onClick={()=>setCamOpen(true)} style={{
            width:56,height:56,borderRadius:"50%",background:"#FF5C00",
            border:"4px solid #F0F0F0",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:24,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(255,92,0,.45)",outline:"none"}}>
            📷
          </button>
        </div>
        <div style={{background:"white",borderTop:"1px solid #EFEFEF",
          padding:"6px 4px 20px",display:"flex",justifyContent:"space-around",
          boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
          {[
            {id:"home",       icon:"🏠", label:"Inicio"},
            {id:"tienda",     icon:"🛒", label:"Tienda"},
            {id:"_cam",       icon:"",   label:"",        isCam:true},
            {id:"movimientos",icon:"📊", label:"Movimientos"},
            {id:"opciones",   icon:"☰",  label:"Opciones"},
          ].map(item=>{
            if(item.isCam) return <div key="_cam" style={{width:56,flexShrink:0}}/>;
            const on=tab===item.id;
            return(
              <button key={item.id} onClick={()=>setTab(item.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
                background:"none",border:"none",cursor:"pointer",
                color:on?"#FF5C00":"#BBBBBB",fontFamily:"Nunito,sans-serif",padding:"3px 6px"}}>
                <div style={{width:36,height:30,borderRadius:10,
                  background:on?"#FFF0EA":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:19}}>{item.icon}</span>
                </div>
                <span style={{fontSize:9,fontWeight:800}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Pantalla Opciones del alumno
function AOpciones({me,logout}){
  return(
    <div>
      <OHdr title="Opciones ☰" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        {[
          ["🔔","Notificaciones","Próximamente","#f59e0b"],
          ["❓","Ayuda","¿Cómo funciona EduCoins?","#3b82f6"],
          ["⚙️","Configuración","Ajustes de la cuenta","#94a3b8"],
        ].map(([ic,lb,sub,col])=>(
          <WCard key={lb} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
            cursor:"pointer",marginBottom:8}}>
            <div style={{width:46,height:46,borderRadius:14,background:col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ic}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{lb}</div>
              <div style={{fontSize:12,color:"#999",marginTop:1}}>{sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </WCard>
        ))}
        <div style={{marginTop:8}}>
          <button onClick={logout} style={{width:"100%",background:"white",
            border:"1.5px solid #E8E8E8",borderRadius:50,color:"#888",
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function AHome({me,balance,onNav}){
  const lv=getLv(me.total_earned||0);
  const next=nextLv(me.total_earned||0);
  const prog=next?Math.min(100,((me.total_earned||0)-lv.min)/(next.min-lv.min)*100):100;
  const titleObj=TITLES.find(t=>t.id===(me.title||"tl1"))||TITLES[0];

  return(
    <div>
      <div style={{background:"#FF5C00",position:"relative",overflow:"hidden",paddingBottom:20,color:"white"}}>
        <div style={{position:"absolute",width:260,height:260,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-80,right:-70,pointerEvents:"none"}}/>
        <div style={{padding:"52px 20px 0",position:"relative"}}>

          {/* Avatar arriba a la izquierda - toca para abrir perfil */}
          <button onClick={()=>onNav("perfil")} style={{display:"flex",alignItems:"center",gap:10,
            background:"none",border:"none",cursor:"pointer",padding:0,color:"white",marginBottom:16}}>
            <Av user={me} sz={44}/>
            <div>
              <div style={{fontSize:11,opacity:.8,fontWeight:700}}>{titleObj.name}</div>
              <div style={{fontWeight:900,fontSize:17,lineHeight:1.1}}>Hola, {me.nombre.split(" ")[0]} 👋</div>
            </div>
          </button>

          {/* Saldo */}
          <div style={{background:"rgba(255,255,255,.18)",borderRadius:22,padding:"16px 20px 14px",
            border:"1.5px solid rgba(255,255,255,.25)",marginBottom:18}}>
            <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:".1em",marginBottom:4}}>SALDO</div>
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

          {/* 5 botones: Enviar · Ingresar · Cobrar · Misiones · Ranking */}
          <div style={{display:"flex",justifyContent:"space-around",paddingBottom:4}}>
            <CircBtn icon="💸" label="Enviar"   onClick={()=>onNav("enviar")}/>
            <CircBtn icon="⬇️" label="Ingresar" onClick={()=>onNav("movimientos")}/>
            <CircBtn icon="💰" label="Cobrar"   onClick={()=>onNav("movimientos")}/>
            <CircBtn icon="⚡" label="Misiones" onClick={()=>onNav("misiones")}/>
            <CircBtn icon="🏆" label="Ranking"  onClick={()=>onNav("ranking")}/>
          </div>
        </div>
      </div>

      {/* Accesos rápidos - padding ajustado para no quedar tapado */}
      <div style={{padding:"16px 14px 10px"}}>
        <div style={{fontWeight:900,color:"#1a1a1a",fontSize:15,marginBottom:10}}>Accesos rápidos</div>
        {[
          ["⚡","Misiones disponibles","Completalas y ganá monedas","#f59e0b","misiones"],
          ["🛒","Tienda de premios",   "Canjeá tus monedas",        "#10b981","tienda"],
          ["💸","Enviar a un compañero","Transferí monedas",         "#8b5cf6","enviar"],
          ["📊","Mis movimientos",     "Historial de monedas",       "#3b82f6","movimientos"],
        ].map(([ic,lb,sub,col,dest])=>(
          <WCard key={lb} onClick={()=>onNav(dest)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",marginBottom:8}}>
            <div style={{width:46,height:46,borderRadius:14,background:col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ic}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{lb}</div>
              <div style={{fontSize:12,color:"#999",marginTop:1}}>{sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

function AMisiones({me,balance,showToast,refreshBalance}){
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
    <div>
      <OHdr title="Misiones ⚡" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        {missions.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>✨</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Sin misiones disponibles</div>
          </WCard>
        )}
        {missions.map(m=>{
          const sub=getSubState(m.id);
          const estado=sub?.estado;
          return(
            <WCard key={m.id} style={{marginBottom:10,borderLeft:`4px solid ${DIFCOL[m.dificultad]||"#ddd"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
                    {estado&&<Pill text={estado==="aprobada"?"✅ Aprobada":estado==="rechazada"?"❌ Rechazada":"⏳ Pendiente"}
                      col={estado==="aprobada"?"#10b981":estado==="rechazada"?"#ef4444":"#f59e0b"}/>}
                  </div>
                  <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{m.titulo}</div>
                  {m.descripcion&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{m.descripcion}</div>}
                  <div style={{marginTop:8,fontWeight:800,color:"#FF5C00",fontSize:14}}>🪙 {m.recompensa}</div>
                </div>
                {!estado&&(
                  <PBtn label="Entregar" sm onClick={()=>submit(m.id)} color="#10b981"/>
                )}
              </div>
            </WCard>
          );
        })}
      </div>
    </div>
  );
}

function ATienda({me,balance,showToast,refreshBalance}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [buying,setBuying]=useState(null);

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
    <div>
      <OHdr title="Tienda 🛒" sub="EDUCOINS"
        extra={<div style={{marginTop:12,fontSize:13,opacity:.9,fontWeight:700}}>
          Tu saldo: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {items.map(item=>{
            const canBuy=balance>=item.precio;
            const sinStock=item.stock===0;
            return(
              <WCard key={item.id} style={{padding:"14px 12px",opacity:sinStock?.5:1}}>
                <div style={{fontSize:36,marginBottom:8}}>{item.icon||"🎁"}</div>
                <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",lineHeight:1.2}}>{item.nombre}</div>
                <div style={{fontSize:11,color:"#aaa",margin:"4px 0 10px",minHeight:26}}>{item.descripcion}</div>
                <div style={{fontWeight:900,color:"#FF5C00",fontSize:13,marginBottom:8}}>🪙 {item.precio}</div>
                {item.stock!==-1&&<div style={{fontSize:10,color:"#ccc",fontWeight:700,marginBottom:6}}>Stock: {item.stock}</div>}
                <PBtn label={sinStock?"Sin stock":buying===item.id?"...":"Comprar"} sm full
                  disabled={!canBuy||sinStock||buying===item.id}
                  onClick={()=>buy(item)} color="#FF5C00"/>
              </WCard>
            );
          })}
        </div>
        {items.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>🛒</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Tienda vacía</div>
          </WCard>
        )}
      </div>
    </div>
  );
}

function AEnviar({me,balance,showToast,refreshBalance}){
  const [users,setUsers]=useState([]);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [amount,setAmount]=useState("");
  const [sending,setSending]=useState(false);
  const [confirm,setConfirm]=useState(false);

  useEffect(()=>{
    // Cargamos usuarios para buscar — usamos el endpoint de admin si es student
    // En una app real habría un endpoint público de búsqueda
    api.adminUsers().then(us=>setUsers(us.filter(u=>u.rol==="student"&&u.id!==me.id))).catch(()=>{});
  },[]);

  const filtered=users.filter(u=>u.nombre.toLowerCase().includes(search.toLowerCase()));

  const send=async()=>{
    const amt=parseInt(amount);
    if(!selected||!amt||amt<=0){showToast("Seleccioná un destinatario y un monto válido","error");return;}
    if(amt>balance){showToast("No tenés saldo suficiente","error");return;}
    setSending(true);
    try{
      await api.transfer(selected.id, amt);
      showToast(`¡Enviaste 🪙${amt} a ${selected.nombre}! 🎉`);
      await refreshBalance();
      setSelected(null);setAmount("");setConfirm(false);setSearch("");
    }catch(e){
      showToast(e.message||"Error al transferir","error");
    }finally{setSending(false);}
  };

  return(
    <div>
      <OHdr title="Enviar 💸" sub="EDUCOINS"
        extra={<div style={{marginTop:12,fontSize:13,opacity:.9,fontWeight:700}}>
          Tu saldo: 🪙 {balance.toLocaleString("es-AR")}
        </div>}/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        <WCard style={{marginBottom:12}}>
          <div style={{fontWeight:800,color:"#1a1a1a",marginBottom:10}}>Buscar compañero</div>
          <Inp val={search} set={setSearch} ph="Nombre..." icon="🔍"/>
          <div style={{marginTop:10,maxHeight:200,overflowY:"auto"}}>
            {filtered.map(u=>(
              <div key={u.id} onClick={()=>{setSelected(u);setSearch(u.nombre);}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                  borderBottom:"1px solid #f5f5f5",cursor:"pointer",
                  background:selected?.id===u.id?"#FFF4EE":"white",
                  borderRadius:10,paddingLeft:selected?.id===u.id?8:0}}>
                <Av user={u} sz={36}/>
                <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>{u.nombre}</div>
                {selected?.id===u.id&&<span style={{marginLeft:"auto",color:"#FF5C00",fontSize:16}}>✓</span>}
              </div>
            ))}
            {filtered.length===0&&search&&(
              <div style={{color:"#bbb",fontSize:13,padding:"10px 0"}}>No encontramos a nadie con ese nombre</div>
            )}
          </div>
        </WCard>
        {selected&&(
          <WCard style={{marginBottom:12}}>
            <div style={{fontWeight:800,color:"#1a1a1a",marginBottom:10}}>
              Enviarle a <span style={{color:"#FF5C00"}}>{selected.nombre}</span>
            </div>
            <Inp val={amount} set={setAmount} ph="Cantidad de monedas" type="number" icon="🪙"/>
            <div style={{marginTop:12}}>
              <PBtn label={sending?"Enviando...":"Confirmar envío 💸"} full
                disabled={sending||!amount||parseInt(amount)<=0}
                onClick={send}/>
            </div>
          </WCard>
        )}
      </div>
    </div>
  );
}

function AMovimientos(){
  const [txs,setTxs]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.transactions().then(setTxs).finally(()=>setLoading(false));
  },[]);

  const iconFor=(type)=>({reward:"↓",transfer:"↕",purchase:"↑",adjustment:"⚙"}[type]||"•");
  const colorFor=(amount)=>amount>0?"#10b981":"#ef4444";

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando movimientos...</div>;

  return(
    <div>
      <OHdr title="Movimientos 📊" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        {txs.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Sin movimientos aún</div>
          </WCard>
        )}
        {txs.map((t,i)=>(
          <WCard key={i} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
            <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
              background:t.amount>0?"#f0fdf4":"#fef2f2",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:700,color:colorFor(t.amount),fontSize:18}}>
              {iconFor(t.type)}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{t.description}</div>
              <div style={{fontSize:11,color:"#bbb"}}>{new Date(t.created_at).toLocaleDateString("es-AR")}</div>
            </div>
            <span style={{fontWeight:900,color:colorFor(t.amount),fontSize:15,flexShrink:0}}>
              {t.amount>0?"+":""}{t.amount} 🪙
            </span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

function ARanking(){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.ranking().then(setUsers).finally(()=>setLoading(false));
  },[]);

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando ranking...</div>;

  return(
    <div>
      <OHdr title="Ranking 🏆" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        {users.map((u,i)=>{
          const lv=getLv(u.total_earned||0);
          const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
          return(
            <WCard key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
              <div style={{width:28,textAlign:"center",fontWeight:900,fontSize:16,color:"#1a1a1a",flexShrink:0}}>
                {medal||`#${i+1}`}
              </div>
              <Av user={u} sz={42}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{u.nombre}</div>
                <Pill text={lv.icon+" "+lv.name} col={lv.color}/>
              </div>
              <div style={{fontWeight:900,color:"#FF5C00",fontSize:14}}>🪙 {(u.total_earned||0).toLocaleString("es-AR")}</div>
            </WCard>
          );
        })}
      </div>
    </div>
  );
}

function APerfil({me,balance,logout,showToast,setMe}){
  const uS=me.unlocked_skins||["s1"];
  const uB=me.unlocked_borders||["b1"];
  const uT=me.unlocked_titles||["tl1"];

  const equip=async(type,item_id)=>{
    try{
      await api.equip(type,item_id);
      const updated=await api.me();
      setMe(updated);
      showToast("¡Equipado! ✨");
    }catch(e){showToast(e.message||"Error","error");}
  };

  return(
    <div>
      <OHdr title="Mi Perfil 👤" sub="EDUCOINS"/>
      <div style={{padding:"0 14px",marginTop:-24}}>
        <WCard style={{textAlign:"center",marginBottom:12,padding:24}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <Av user={me} sz={72}/>
          </div>
          <div style={{fontWeight:900,fontSize:20,color:"#1a1a1a"}}>{me.nombre}</div>
          <div style={{fontSize:13,color:"#aaa",marginBottom:8}}>{me.email}</div>
          <div style={{fontWeight:800,color:"#FF5C00",fontSize:16}}>🪙 {balance.toLocaleString("es-AR")}</div>
        </WCard>

        {/* Skins */}
        <div style={{fontWeight:800,color:"#1a1a1a",marginBottom:8,marginTop:4}}>🎨 Skins</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {SKINS.map(s=>{
            const owned=uS.includes(s.id);
            const equipped=me.skin===s.id;
            return(
              <div key={s.id} onClick={()=>{if(owned)equip("skin",s.id);}}
                style={{background:equipped?s.bg:"white",border:`2px solid ${equipped?"#FFB800":owned?"#E8E8E8":"#F0F0F0"}`,
                  borderRadius:16,padding:"12px 6px",textAlign:"center",cursor:owned?"pointer":"default",
                  opacity:!owned?.4:1,transition:"all .2s",position:"relative"}}>
                {equipped&&<div style={{position:"absolute",top:4,right:5,fontSize:10}}>✅</div>}
                <div style={{fontSize:28,marginBottom:4}}>{s.emoji}</div>
                <div style={{fontSize:10,fontWeight:800,color:equipped?"white":"#1a1a1a"}}>{s.name}</div>
                {!owned&&<div style={{fontSize:9,color:"#FF5C00",fontWeight:800,marginTop:2}}>🪙{s.price}</div>}
              </div>
            );
          })}
        </div>

        {/* Títulos */}
        <div style={{fontWeight:800,color:"#1a1a1a",marginBottom:8}}>📛 Títulos</div>
        {TITLES.map(t=>{
          const owned=uT.includes(t.id);
          const equipped=me.title===t.id;
          return(
            <WCard key={t.id} onClick={()=>{if(owned)equip("title",t.id);}}
              style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",
                cursor:owned?"pointer":"default",background:equipped?"#FFF4EE":"white",
                border:`1.5px solid ${equipped?"#FF5C00":"#E8E8E8"}`,opacity:!owned?.4:1}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{t.name}</div>
                {!owned&&t.price>0&&<div style={{fontSize:12,color:"#FF5C00",fontWeight:800}}>🪙{t.price}</div>}
                {owned&&<div style={{fontSize:12,color:equipped?"#FF5C00":"#10b981",fontWeight:800}}>
                  {equipped?"✅ Activo":"Tocar para activar"}
                </div>}
              </div>
              {equipped&&<span style={{fontSize:20}}>✅</span>}
            </WCard>
          );
        })}

        <div style={{marginTop:16}}>
          <button onClick={logout} style={{width:"100%",background:"white",
            border:"1.5px solid #E8E8E8",borderRadius:50,color:"#888",
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Cerrar sesión
          </button>
        </div>
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
              background:"none",border:"none",cursor:"pointer",color:on?"#FF5C00":"#BBBBBB",
              fontFamily:"Nunito,sans-serif",padding:"3px 6px"}}>
              <div style={{width:36,height:30,borderRadius:10,background:on?"#FFF0EA":"transparent",
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
      <div style={{background:"#FF5C00",color:"white",padding:"52px 20px 28px",position:"relative",overflow:"hidden"}}>
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
              <div style={{fontSize:12,color:"#999"}}>{item.sub}</div>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
        {missions.map(m=>(
          <WCard key={m.id} style={{marginBottom:10,borderLeft:`4px solid ${DIFCOL[m.dificultad]||"#ddd"}`}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
            </div>
            <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{m.titulo}</div>
            {m.descripcion&&<div style={{fontSize:12,color:"#888",marginTop:2}}>{m.descripcion}</div>}
            <div style={{marginTop:8,fontWeight:800,color:"#FF5C00"}}>🪙 {m.recompensa}</div>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
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
                <div style={{fontSize:12,color:"#FF5C00",fontWeight:700}}>{s.titulo}</div>
              </div>
              <span style={{fontWeight:900,color:"#FF5C00",fontSize:15}}>🪙 {s.recompensa}</span>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
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

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#F0F0F0",fontFamily:"Nunito,sans-serif"}}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{paddingBottom:90}}>
        {tab==="home"     && <AdminHome    me={me} onNav={setTab} showToast={showToast}/>}
        {tab==="usuarios" && <AdminUsuarios showToast={showToast}/>}
        {tab==="tesoro"   && <AdminTesoro  me={me} showToast={showToast}/>}
        {tab==="tienda"   && <AdminTienda  showToast={showToast}/>}
        {tab==="audit"    && <AdminAudit/>}
        {tab==="perfil"   && <MPerfilSimple me={me} logout={logout}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,background:"white",borderTop:"1px solid #EFEFEF",
        padding:"6px 4px 20px",display:"flex",justifyContent:"space-around",
        boxShadow:"0 -2px 16px rgba(0,0,0,.07)"}}>
        {[
          {id:"home",    icon:"🏠",label:"Inicio"},
          {id:"usuarios",icon:"👥",label:"Usuarios"},
          {id:"tesoro",  icon:"🏦",label:"Tesorería"},
          {id:"tienda",  icon:"🛒",label:"Tienda"},
          {id:"audit",   icon:"📋",label:"Audit"},
        ].map(item=>{
          const on=tab===item.id;
          return(
            <button key={item.id} onClick={()=>setTab(item.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,
              background:"none",border:"none",cursor:"pointer",color:on?"#FF5C00":"#BBBBBB",
              fontFamily:"Nunito,sans-serif",padding:"3px 6px"}}>
              <div style={{width:36,height:30,borderRadius:10,background:on?"#FFF0EA":"transparent",
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
      <div style={{background:"#FF5C00",color:"white",padding:"52px 20px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>Panel Admin ⚙️</div>
        <div style={{fontSize:13,opacity:.8}}>Hola, {me.nombre}</div>
      </div>
      <div style={{padding:"20px 14px",marginTop:-24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <WCard style={{textAlign:"center"}}>
            <div style={{fontSize:28}}>🏦</div>
            <div style={{fontWeight:900,fontSize:20,color:"#FF5C00"}}>
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
          {icon:"👥",title:"Gestionar usuarios",sub:`${students} alumnos · ${teachers} docentes`,dest:"usuarios",col:"#3b82f6"},
          {icon:"🏦",title:"Tesorería",sub:"Mint y burn de monedas",dest:"tesoro",col:"#f59e0b"},
          {icon:"🛒",title:"Tienda",sub:"Administrar ítems",dest:"tienda",col:"#10b981"},
          {icon:"📋",title:"Audit Log",sub:"Historial de todas las acciones",dest:"audit",col:"#8b5cf6"},
        ].map(item=>(
          <WCard key={item.dest} onClick={()=>onNav(item.dest)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"16px",cursor:"pointer",marginBottom:10}}>
            <div style={{width:50,height:50,borderRadius:14,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15,color:"#1a1a1a"}}>{item.title}</div>
              <div style={{fontSize:12,color:"#999"}}>{item.sub}</div>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
        <WCard style={{textAlign:"center",padding:28,marginBottom:16}}>
          <div style={{fontSize:13,color:"#aaa",fontWeight:700,letterSpacing:".1em",marginBottom:8}}>BALANCE ACTUAL</div>
          <div style={{fontWeight:900,fontSize:42,color:"#FF5C00",letterSpacing:"-2px"}}>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {items.map(item=>(
            <WCard key={item.id} style={{padding:"14px 12px"}}>
              <div style={{fontSize:36,marginBottom:8}}>{item.icon||"🎁"}</div>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",lineHeight:1.2}}>{item.nombre}</div>
              <div style={{fontSize:11,color:"#aaa",margin:"4px 0 10px",minHeight:26}}>{item.descripcion}</div>
              <div style={{fontWeight:900,color:"#FF5C00",fontSize:13}}>🪙 {item.precio}</div>
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
      <div style={{padding:"0 14px",marginTop:-24}}>
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
