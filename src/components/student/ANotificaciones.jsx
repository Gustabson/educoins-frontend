import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function ANotificaciones({me,onBack,notifs=[],setNotifs}){
  const {primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg} = useTheme();
  const [serverNotifs,setServerNotifs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [unread,setUnread]=useState(0);


  const NOTIF_ICON={
    reward:"🪙",transfer:"💸",chat_personal:"💬",mission_approved:"✅",
    mission_rejected:"❌",checkin:"🔥",gift:"🎁",new_submission:"📬",tax:"⚖️",
    toque:"👋",
  };
  const NOTIF_COLOR={
    reward:"#10b981",transfer:"#3b82f6",chat_personal:"#00c1fc",
    mission_approved:"#10b981",mission_rejected:"#ef4444",
    checkin:"#f59e0b",gift:"#ec4899",new_submission:"#8b5cf6",tax:"#f97316",
    toque:"#f59e0b",
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

export default ANotificaciones;
