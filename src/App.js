import React, { useState, useEffect } from 'react';
import { api, connectSocket } from './api';
import { GS } from './constants';
import { Inp, PBtn } from './components/shared/index';
import Alumno from './components/student/Alumno';
import Maestra from './components/teacher/Maestra';
import Admin   from './components/admin/Admin';
import Padre   from './components/parent/Padre';

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
    connectSocket(token); // Conectar socket para TODOS los roles al cargar
    Promise.all([api.me(), api.account()])
      .then(([user,acc])=>{ setMe(user); setBalance(acc.balance); })
      .catch(()=>localStorage.removeItem("ec_token"))
      .finally(()=>setLoading(false));
  },[]);

  const login = async () => {
    if(!email||!pass){ setErr("Completá email y contraseña"); return; }
    setLogging(true); setErr("");
    try{
      const {token,user} = await api.login(email,pass);
      localStorage.setItem("ec_token",token);
      connectSocket(token); // Conectar socket para TODOS los roles al login
      const acc = await api.account().catch(()=>({balance:0}));
      setMe(user); setBalance(acc.balance);
    }catch(e){
      setErr(e.message||"Email o contraseña incorrectos");
    }finally{ setLogging(false); }
  };

  const logout = () => {
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

  // Routing por rol
  if(me.rol==="student") return <Alumno me={me} balance={balance} refreshBalance={refreshBalance} logout={logout} setMe={setMe}/>;
  if(me.rol==="teacher") return <Maestra me={me} logout={logout}/>;
  if(me.rol==="admin")   return <Admin   me={me} logout={logout}/>;
  if(me.rol==="parent")  return <Padre   me={me} balance={balance} refreshBalance={refreshBalance} logout={logout} setMe={setMe}/>;
  return <div style={{padding:40,fontFamily:"Nunito",textAlign:"center"}}>Rol desconocido: {me.rol}</div>;
}
