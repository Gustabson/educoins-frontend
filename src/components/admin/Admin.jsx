import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";

import AdminHome from "./AdminHome";
import AdminUsuarios from "./AdminUsuarios";
import AdminTesoro from "./AdminTesoro";
import AdminBanco from "./AdminBanco";
import AdminRanking from "./AdminRanking";
import AdminTienda from "./AdminTienda";
import AdminAudit from "./AdminAudit";
import AdminNoticias from "./AdminNoticias";
import AdminVotaciones from "./AdminVotaciones";
import AdminReportes from "./AdminReportes";
import AdminAulas from "./AdminAulas";
import AdminConfig from "./AdminConfig";
import AdminEconomia from "./AdminEconomia";

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

export default Admin;
