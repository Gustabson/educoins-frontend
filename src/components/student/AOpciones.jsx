import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function AOpciones({me,logout,notifs=[]}){
  const {primary:accent, isDark, txt, sub, cardBg, inputBg, navInact, pageBg} = useTheme();
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
    <div style={{background:pageBg,minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="☰ Opciones"/>
      <div style={{padding:"0 14px",marginTop:12}}>

        {/* Notificaciones recientes */}
        {notifs.length>0&&(
          <div style={{background:cardBg,borderRadius:20,overflow:"hidden",marginBottom:12,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${inputBg}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:800,fontSize:13,color:txt}}>🔔 Notificaciones</div>
              {noLeidas>0&&<span style={{background:"#ef4444",color:"white",borderRadius:99,
                padding:"2px 8px",fontSize:10,fontWeight:800}}>{noLeidas} nuevas</span>}
            </div>
            {notifs.slice(0,5).map((n,i)=>(
              <div key={n.id||i} style={{padding:"11px 16px",
                borderBottom:i<Math.min(notifs.length,5)-1?`1px solid ${inputBg}`:"none",
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
            <span style={{color:navInact,fontSize:18}}>›</span>
          </div>
        ))}
        <div style={{marginTop:8}}>
          <button onClick={logout} style={{width:"100%",background:cardBg,
            border:`1.5px solid ${inputBg}`,borderRadius:50,color:sub,
            padding:"14px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif",transition:"all .3s"}}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}

export default AOpciones;
