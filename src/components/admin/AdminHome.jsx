import { useState, useEffect } from "react";
import { api } from "../../api";
import { Av, WCard } from "../shared/index";

// Header según dominio
const DOMAIN_HDR = {
  psicologia:    { color:"#8b5cf6", icon:"🧠", title:"Psicología"     },
  economia:      { color:"#10b981", icon:"💹", title:"Economía"       },
  administracion:{ color:"#f97316", icon:"🏫", title:"Administración" },
};

function AdminHome({ me, onNav, showToast, isSuperAdmin, hasPerm, canSee }) {
  const [treasury,    setTreasury]    = useState(null);
  const [users,       setUsers]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [pendingLinks,setPendingLinks] = useState(0);

  useEffect(() => {
    if (isSuperAdmin || hasPerm("economia")) {
      api.treasury().then(setTreasury).catch(() => {});
    }
    api.adminUsers().then(u => {
      const arr = Array.isArray(u) ? u : u.data || u || [];
      setUsers(arr);
      const students = arr.filter(x => x.rol === "student" && x.activo);
      const totalCoins = students.reduce((s, x) => s + (x.total_earned || 0), 0);
      setStats({ students, totalCoins });
    }).catch(() => {});
    if (isSuperAdmin || hasPerm("administracion")) {
      api.adminLinkRequests()
        .then(reqs => {
          const arr = Array.isArray(reqs) ? reqs : [];
          setPendingLinks(arr.filter(r => r.estado === "pendiente").length);
        })
        .catch(() => {});
    }
  }, []);

  const students = users.filter(u => u.rol === "student" && u.activo).length;
  const teachers = users.filter(u => u.rol === "teacher" && u.activo).length;

  // Detectar dominio del usuario para el header
  const userPerms = me?.permisos || [];
  const domainKey = !isSuperAdmin && userPerms.length
    ? (userPerms.includes("psicologia") ? "psicologia"
     : userPerms.includes("economia")   ? "economia"
     : userPerms.includes("administracion") ? "administracion"
     : null)
    : null;
  const domain = domainKey ? DOMAIN_HDR[domainKey] : null;
  const hdrColor = domain?.color || "#00c1fc";
  const hdrIcon  = domain?.icon  || "⚙️";
  const hdrTitle = domain?.title || "Panel Admin";

  // Todas las secciones posibles — filtradas por permisos
  const ALL_SECTIONS = [
    { icon:"👥", title:"Usuarios",         sub:`${students} alumnos · ${teachers} docentes`, dest:"usuarios",   col:"#3b82f6" },
    { icon:"🏦", title:"Tesorería",         sub:"Mint y burn de monedas",                    dest:"tesoro",     col:"#f59e0b" },
    { icon:"🛒", title:"Tienda",            sub:"Administrar ítems",                          dest:"tienda",     col:"#10b981" },
    { icon:"📰", title:"Noticias",          sub:"Crear y moderar publicaciones",              dest:"noticias",   col:"#00c1fc" },
    { icon:"🗳️", title:"Votaciones",        sub:"Crear encuestas y ver resultados",           dest:"votaciones", col:"#8b5cf6" },
    { icon:"🚩", title:"Reportes",          sub:"Gestionar reportes de alumnos",              dest:"reportes",   col:"#ef4444" },
    { icon:"🏆", title:"Ranking",           sub:"Top holders y top ganancias",                dest:"ranking",    col:"#f59e0b" },
    { icon:"🏛️", title:"Banco",             sub:"Transferir a alumnos y docentes",            dest:"banco",      col:"#10b981" },
    { icon:"🏫", title:"Aulas",             sub:"Crear aulas y asignar miembros",             dest:"aulas",      col:"#f97316" },
    { icon:"💹", title:"Economía",           sub:"Temas, precios, premios y suscripciones",   dest:"economia",   col:"#10b981" },
    { icon:"🧠", title:"Psicología",         sub:"Bienestar, alertas y reportes de alumnos",  dest:"psicologia", col:"#8b5cf6" },
    { icon:"📋", title:"Audit Log",         sub:"Historial de todas las acciones",            dest:"audit",      col:"#64748b" },
    { icon:"📨", title:"Solicitudes",       sub:"Propuestas del equipo pendientes",           dest:"solicitudes",col:"#8b5cf6" },
    { icon:"⚖️", title:"Veredictos",        sub:"Canal oficial de conducta y sanciones",      dest:"veredictos", col:"#7f1d1d" },
    { icon:"📚", title:"Documentos IA",     sub:"Reglamento e info del Asistente",            dest:"aidocs",     col:"#10b981" },
    { icon:"🐾", title:"Diwy",             sub:"Asistente preceptor IA — reportes para padres", dest:"diwy",    col:"#7c3aed" },
    { icon:"🔗", title:"Vinculaciones",    sub:"Solicitudes y vínculos padre-alumno",            dest:"link-requests", col:"#f59e0b" },
    { icon:"📋", title:"Asistencias",      sub:"Ver asistencia por aula y aprobar ediciones",    dest:"asistencias",   col:"#3b82f6" },
    { icon:"✉️", title:"Contacto padres", sub:"Mensajes de familias a la institución",           dest:"contacto",      col:"#0ea5e9" },
    { icon:"🗓️", title:"Calendario",     sub:"Eventos y fechas académicas del año",             dest:"calendario",    col:"#0ea5e9" },
    { icon:"⚡", title:"Misiones",       sub:"Actividades y desafíos para alumnos",              dest:"misiones",       col:"#f59e0b" },
  ].filter(item => canSee(item.dest));

  return (
    <div>
      {/* Header */}
      <div style={{ background:hdrColor, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden",
        textShadow:"0 1px 4px rgba(0,0,0,.3)" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ fontWeight:900, fontSize:22, marginBottom:4 }}>{hdrIcon} {hdrTitle}</div>
        <div style={{ fontSize:13, opacity:.8 }}>Hola, {me?.nombre}</div>
      </div>

      <div style={{ padding:"16px 14px", marginTop:-20 }}>

        {/* Stats grid — solo si es superadmin o tiene permisos de economía/administración */}
        {(isSuperAdmin || hasPerm("economia") || hasPerm("administracion")) && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[
              isSuperAdmin || hasPerm("economia")
                ? { icon:"🏦", val:treasury ? treasury.balance.toLocaleString("es-AR") : "...", label:"En Tesorería", col:"#00c1fc" }
                : null,
              hasPerm("administracion") || isSuperAdmin
                ? { icon:"👨‍🎓", val:students, label:"Alumnos activos", col:"#10b981" }
                : null,
              hasPerm("administracion") || isSuperAdmin
                ? { icon:"👩‍🏫", val:teachers, label:"Docentes", col:"#8b5cf6" }
                : null,
              isSuperAdmin || hasPerm("economia")
                ? { icon:"🪙", val:stats ? stats.totalCoins.toLocaleString("es-AR") : "...", label:"Coins circulando", col:"#f59e0b" }
                : null,
            ].filter(Boolean).map(s => (
              <WCard key={s.label} style={{ textAlign:"center", padding:"14px 10px" }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontWeight:900, fontSize:18, color:s.col }}>{s.val}</div>
                <div style={{ fontSize:10, color:"#aaa", fontWeight:700, marginTop:2 }}>{s.label}</div>
              </WCard>
            ))}
          </div>
        )}

        {/* Badge solicitudes de vinculación pendientes */}
        {pendingLinks > 0 && (isSuperAdmin || hasPerm("administracion")) && (
          <div onClick={() => onNav("link-requests")} style={{
            background: "#fef3c7", border: "1.5px solid #f59e0b44", borderRadius: 14,
            padding: "12px 16px", marginBottom: 10, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🔗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e" }}>
                Solicitudes de vinculación
              </div>
              <div style={{ fontSize: 12, color: "#b45309" }}>
                {pendingLinks} solicitud{pendingLinks !== 1 ? "es" : ""} pendiente{pendingLinks !== 1 ? "s" : ""}
              </div>
            </div>
            <span style={{ background: "#f59e0b", color: "white", borderRadius: 99,
              fontWeight: 900, fontSize: 12, padding: "2px 10px" }}>{pendingLinks}</span>
          </div>
        )}

        {/* Accesos rápidos filtrados */}
        {ALL_SECTIONS.map(item => (
          <WCard key={item.dest} onClick={() => onNav(item.dest)}
            style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
              cursor:"pointer", marginBottom:8 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:item.col+"18",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>{item.title}</div>
              <div style={{ fontSize:12, color:"#555" }}>{item.sub}</div>
            </div>
            <span style={{ color:"#ddd", fontSize:18 }}>›</span>
          </WCard>
        ))}

        {/* Staff: botón enviar solicitud */}
        {!isSuperAdmin && (
          <button onClick={() => onNav("_sendProposal")}
            style={{ width:"100%", background:"none", border:"1.5px dashed #c4b5fd",
              borderRadius:14, padding:"14px", marginTop:8, cursor:"pointer",
              fontFamily:"Nunito,sans-serif", color:"#8b5cf6", fontWeight:800, fontSize:13 }}>
            ✉ Enviar solicitud al Superadmin
          </button>
        )}
      </div>
    </div>
  );
}

export default AdminHome;
