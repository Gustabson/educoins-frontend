import { useState } from "react";
import { Toast, useToast } from "../shared/index";




function AdminConfig({me, logout}){
  const ROL_LABEL={admin:"Administrador",teacher:"Docente",student:"Alumno"};
  const [toast,showToast]=useToast();

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

export default AdminConfig;
