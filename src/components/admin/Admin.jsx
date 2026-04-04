import { GS } from "../../constants";
import { useState } from "react";
import { useToast, Toast } from "../shared/index";

import AdminHome       from "./AdminHome";
import AdminUsuarios   from "./AdminUsuarios";
import AdminTesoro     from "./AdminTesoro";
import AdminBanco      from "./AdminBanco";
import AdminRanking    from "./AdminRanking";
import AdminTienda     from "./AdminTienda";
import AdminAudit      from "./AdminAudit";
import AdminNoticias   from "./AdminNoticias";
import AdminVotaciones from "./AdminVotaciones";
import AdminReportes   from "./AdminReportes";
import AdminAulas      from "./AdminAulas";
import AdminConfig     from "./AdminConfig";
import AdminEconomia   from "./AdminEconomia";
import AdminPsicologia from "./AdminPsicologia";
import AdminSolicitudes from "./AdminSolicitudes";
import AdminVeredictos  from "./AdminVeredictos";
import AdminDocs        from "./AdminDocs";
import AdminDiwy        from "./AdminDiwy";
import AdminVincular    from "./AdminVincular";

// ── Mapa de secciones → permiso requerido ─────────────────────
// null = solo superadmin (rol='admin')
// string = cualquiera con ese permiso (o superadmin)
const SECTION_PERMS = {
  usuarios:    "administracion",
  tesoro:      "economia",
  banco:       "economia",
  ranking:     "economia",
  tienda:      "economia",
  economia:    "economia",
  noticias:    "administracion",
  votaciones:  "administracion",
  reportes:    "administracion",
  aulas:       "administracion",
  psicologia:  "psicologia",
  audit:       null,
  config:      null,
  solicitudes: null,
  veredictos:  null,
  aidocs:      null,
  diwy:        "administracion",
};

function Admin({ me, logout }) {
  const [tab, setTab]     = useState("home");
  const [toast, showToast] = useToast();

  const isSuperAdmin = me?.rol === "admin";
  const userPerms    = me?.permisos || [];
  const hasPerm = (p) =>
    isSuperAdmin || userPerms.includes("*") || userPerms.includes(p);
  const canSee = (section) => {
    const req = SECTION_PERMS[section];
    if (req === undefined) return true;      // siempre visible
    if (req === null)      return isSuperAdmin; // solo superadmin
    return hasPerm(req);
  };

  // Nav inferior — tabs visibles según permisos
  const NAV_ITEMS = [
    { id:"home",        icon:"🏠", label:"Inicio"   },
    canSee("usuarios")  && { id:"usuarios",   icon:"👥", label:"Usuarios" },
    canSee("tesoro")    && { id:"tesoro",      icon:"🏦", label:"Tesoro"   },
    canSee("tienda")    && { id:"tienda",      icon:"🛒", label:"Tienda"   },
    canSee("audit")     && { id:"audit",       icon:"📋", label:"Audit"    },
    canSee("config")    && { id:"config",      icon:"⚙️",  label:"Config"   },
  ].filter(Boolean);

  const navTabs  = NAV_ITEMS.map(n => n.id);
  const hideNav  = !navTabs.includes(tab) || tab === "_sendProposal";

  return (
    <div style={{ maxWidth:480, margin:"0 auto", height:"100vh", background:"#F0F0F0",
      fontFamily:"Nunito,sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:hideNav?0:90, animation:"fadeIn .18s ease" }}>

        {tab==="home"       && <AdminHome me={me} onNav={setTab} showToast={showToast}
                                  isSuperAdmin={isSuperAdmin} hasPerm={hasPerm} canSee={canSee}/>}
        {tab==="usuarios"   && canSee("usuarios")   && <AdminUsuarios   showToast={showToast}/>}
        {tab==="tesoro"     && canSee("tesoro")     && <AdminTesoro     me={me} showToast={showToast}/>}
        {tab==="banco"      && canSee("banco")      && <AdminBanco      me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="ranking"    && canSee("ranking")    && <AdminRanking    onBack={()=>setTab("home")}/>}
        {tab==="tienda"     && canSee("tienda")     && <AdminTienda     showToast={showToast}/>}
        {tab==="audit"      && canSee("audit")      && <AdminAudit/>}
        {tab==="config"     && canSee("config")     && <AdminConfig     me={me} logout={logout}/>}
        {tab==="noticias"   && canSee("noticias")   && <AdminNoticias   showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="votaciones" && canSee("votaciones") && <AdminVotaciones showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="reportes"   && canSee("reportes")   && <AdminReportes   me={me} showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="aulas"      && canSee("aulas")      && <AdminAulas      showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="economia"   && canSee("economia")   && <AdminEconomia   showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="psicologia" && canSee("psicologia") && <AdminPsicologia showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="solicitudes"   && canSee("solicitudes")  && <AdminSolicitudes showToast={showToast} onBack={()=>setTab("home")} me={me} mode="review"/>}
        {tab==="_sendProposal" && !isSuperAdmin           && <AdminSolicitudes showToast={showToast} onBack={()=>setTab("home")} me={me} mode="send"/>}
        {tab==="veredictos"   && canSee("veredictos")    && <AdminVeredictos  showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="aidocs"       && canSee("aidocs")        && <AdminDocs        showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="diwy"         && canSee("diwy")          && <AdminDiwy        showToast={showToast} onBack={()=>setTab("home")}/>}
        {tab==="link-requests"                           && <AdminVincular    showToast={showToast} onBack={()=>setTab("home")}/>}

      </div>

      {!hideNav && (
        <div style={{ position:"sticky", bottom:0, width:"100%", background:"white",
          borderTop:"1px solid #EFEFEF", padding:"6px 4px 20px", display:"flex",
          justifyContent:"space-around", boxShadow:"0 -2px 16px rgba(0,0,0,.07)" }}>
          {NAV_ITEMS.map(item => {
            const on = tab === item.id;
            return (
              <button key={item.id} onClick={()=>setTab(item.id)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1,
                background:"none", border:"none", cursor:"pointer",
                color:on?"#00c1fc":"#777777",
                fontFamily:"Nunito,sans-serif", padding:"3px 2px" }}>
                <div style={{ width:36, height:30, borderRadius:10,
                  background:on?"#e0f7fe":"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:19 }}>{item.icon}</span>
                </div>
                <span style={{ fontSize:9, fontWeight:800 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Admin;
