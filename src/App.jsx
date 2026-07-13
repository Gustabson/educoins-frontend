import React, { Suspense, lazy, useState, useEffect } from 'react';
import { api, connectSocket, disconnectSocket } from './api';
import { GS } from './constants';
import { Inp, PBtn } from './components/shared/index';
const Alumno = lazy(() => import('./components/student/Alumno'));
const Maestra = lazy(() => import('./components/teacher/Maestra'));
const Admin = lazy(() => import('./components/admin/Admin'));
const Padre = lazy(() => import('./components/parent/Padre'));

export default function App(){
  const [me,setMe]         = useState(null);
  const [balance,setBalance] = useState(0);
  const [loading,setLoading] = useState(true);
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [err,setErr]       = useState("");
  const [logging,setLogging] = useState(false);

  useEffect(()=>{
    const token = localStorage.getItem("ec_token");
    if(!token){ setLoading(false); return; }
    api.me()
      .then(async user=>{
        const acc = await api.account().catch(()=>({balance:user.balance||0}));
        setMe(user); setBalance(acc.balance||0);
        connectSocket(token);
      })
      .catch(()=>{
        localStorage.removeItem("ec_token");
        disconnectSocket();
      })
      .finally(()=>setLoading(false));
  },[]);

  const login = async () => {
    if(!email||!pass){ setErr("Completá email y contraseña"); return; }
    setLogging(true); setErr("");
    try{
      const {token,user} = await api.login(email.trim().toLowerCase(),pass);
      localStorage.setItem("ec_token",token);
      connectSocket(token); // Conectar socket para TODOS los roles al login
      const acc = await api.account().catch(()=>({balance:0}));
      setMe(user); setBalance(acc.balance);
    }catch(e){
      setErr(e.message||"Email o contraseña incorrectos");
    }finally{ setLogging(false); }
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem("ec_token");
    setMe(null); setBalance(0); setEmail(""); setPass("");
  };

  const refreshBalance = async () => {
    try{ const acc = await api.account(); setBalance(acc.balance); }catch{}
  };

  // Loading
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

  // Login
  if(!me) return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
      fontFamily:"Nunito,sans-serif",background:"#00c1fc"}}>
      <style>{GS}</style>
      <div style={{padding:"60px 28px 40px",color:"white",position:"relative",
        overflow:"hidden",textAlign:"center"}}>
        <div style={{position:"absolute",width:240,height:240,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-60,pointerEvents:"none"}}/>
        <div style={{fontSize:48,marginBottom:6}}>🏦</div>
        <div style={{fontWeight:900,fontSize:30,letterSpacing:"-1px",lineHeight:1}}>EduCoins</div>
        <div style={{fontSize:14,opacity:.8,marginTop:4,fontWeight:600}}>Juega, aprende y gana</div>
      </div>
      <div className="ec-login-card" style={{flex:1,alignSelf:"center",width:"100%",maxWidth:520,background:"white",borderRadius:"28px 28px 0 0",padding:"28px 24px 40px"}}>
        <form onSubmit={event=>{event.preventDefault();login();}} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontWeight:900,fontSize:22,color:"#1a1a1a",textAlign:"center"}}>Iniciá sesión</div>
          <Inp val={email} set={setEmail} ph="Email" label="Correo electrónico" name="email" type="email" icon="✉️" autoComplete="email"/>
          <Inp val={pass} set={setPass} ph="Contraseña" label="Contraseña" name="password" type="password" icon="🔒" autoComplete="current-password"/>
          {err&&<div role="alert" style={{color:"#ef4444",fontSize:13,fontWeight:700,textAlign:"center"}}>{err}</div>}
          <PBtn type="submit" label={logging?"Ingresando...":"Ingresar"} full disabled={logging}/>
        </form>
        <div style={{marginTop:24,textAlign:"center",fontSize:12,color:"#aaa",fontWeight:600}}>
          Las cuentas son creadas por el administrador del sistema.
        </div>
      </div>
    </div>
  );

  // Routing por rol
  const roleView = me.rol==="student" ? <Alumno me={me} balance={balance} refreshBalance={refreshBalance} logout={logout} setMe={setMe}/>
    : me.rol==="teacher" ? <Maestra me={me} logout={logout}/>
    : me.rol==="admin" ? <Admin me={me} logout={logout}/>
    : me.rol==="parent" ? <Padre me={me} balance={balance} refreshBalance={refreshBalance} logout={logout} setMe={setMe}/>
    : null;
  if (roleView) return <Suspense fallback={<div style={{padding:40,textAlign:'center',fontFamily:'Nunito'}}>Cargando tu espacio…</div>}>{roleView}</Suspense>;
  return <div style={{padding:40,fontFamily:"Nunito",textAlign:"center"}}>Rol desconocido: {me.rol}</div>;
}
