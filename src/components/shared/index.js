import { useState, useEffect, useRef, useContext } from "react";
import { useTheme } from "../../ThemeContext";
import { SKINS, BORDERS, TITLES, getLv } from "../../constants";

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
function Av({user,sz,avatarBg}){
  const s=sz||48;
  const sk=SKINS.find(x=>x.id===(user?.skin||"s1"))||SKINS[0];
  const br=BORDERS.find(x=>x.id===(user?.border||"b1"))||BORDERS[0];

  // Resolver fondo — avatarBg prop override, sino skin
  const bg = avatarBg ? null : sk.bg; // null = usamos avatarBg en el wrapper

  const inner = user?.foto_url
    ? <div style={{width:s,height:s,borderRadius:"50%",overflow:"hidden",flexShrink:0}}>
        <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      </div>
    : <div style={{width:s,height:s,borderRadius:"50%",
        background:avatarBg?"transparent":sk.bg,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:s*.46,flexShrink:0}}>{sk.emoji}</div>;

  if(!avatarBg || avatarBg.type==="none") {
    // Sin fondo override — comportamiento normal con borde
    return(
      <div style={{width:s,height:s,borderRadius:"50%",
        background:user?.foto_url?"transparent":sk.bg,
        border:br.bs,display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:s*.46,flexShrink:0,overflow:user?.foto_url?"hidden":"visible",
        boxShadow:`0 2px 10px ${sk.bg}55`}}>
        {user?.foto_url
          ? <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : sk.emoji}
      </div>
    );
  }

  // Con avatarBg:
  // - wrapper exterior = fondo/marco elegido
  // - inner = SIEMPRE transparente (el fondo del wrapper se ve a través)
  const wrapBg     = avatarBg.type==="frame" ? sk.bg : avatarBg.value; // frame: bg de skin adentro
  const wrapBorder = avatarBg.type==="frame" ? avatarBg.value : "none";
  const wrapGlow   = avatarBg.glow ? `0 0 16px 5px ${avatarBg.glow}` : "none";
  // Para sólido/gradiente: padding crea el halo de color alrededor del avatar
  const pad = avatarBg.type==="frame" ? 4 : Math.round(s * 0.15);

  return(
    <div style={{borderRadius:"50%",background:wrapBg,border:wrapBorder,
      boxShadow:wrapGlow,padding:pad,display:"inline-flex",
      alignItems:"center",justifyContent:"center",flexShrink:0}}>
      {/* inner: fondo transparente para que el wrapper se vea */}
      <div style={{width:s,height:s,borderRadius:"50%",overflow:"hidden",
        background:avatarBg.type==="frame" ? "transparent" : sk.bg,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*.46}}>
        {user?.foto_url
          ? <img src={user.foto_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : sk.emoji}
      </div>
    </div>
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

export { displayName, useCountUp, Av, Pill, PBtn, OBtn, Inp, WCard, Sheet, OHdr, OHdrA, CircBtn, Toast, useToast };
