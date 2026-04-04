// AdminVincular.jsx — Gestión de solicitudes de vinculación padre-alumno
import { useState, useEffect } from "react";
import { api } from "../../api";
import { WCard } from "../shared/index";

const EST = {
  pendiente: { bg:"#fef3c7", col:"#b45309", label:"Pendiente" },
  aprobado:  { bg:"#d1fae5", col:"#065f46", label:"Aprobado"  },
  rechazado: { bg:"#fee2e2", col:"#991b1b", label:"Rechazado" },
};

export default function AdminVincular({ showToast, onBack }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    api.adminLinkRequests()
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const approve = async (id) => {
    setProcessing(p => ({ ...p, [id]: "approving" }));
    try {
      await api.adminLinkApprove(id);
      setRequests(rs => rs.map(r => r.id === id ? { ...r, estado: "aprobado" } : r));
      showToast("Vinculación aprobada ✅");
    } catch(e) {
      showToast(e.message || "Error al aprobar", "error");
    } finally { setProcessing(p => ({ ...p, [id]: null })); }
  };

  const reject = async (id) => {
    setProcessing(p => ({ ...p, [id]: "rejecting" }));
    try {
      await api.adminLinkReject(id);
      setRequests(rs => rs.map(r => r.id === id ? { ...r, estado: "rechazado" } : r));
      showToast("Solicitud rechazada");
    } catch(e) {
      showToast(e.message || "Error al rechazar", "error");
    } finally { setProcessing(p => ({ ...p, [id]: null })); }
  };

  const pending  = requests.filter(r => r.estado === "pendiente");
  const resolved = requests.filter(r => r.estado !== "pendiente");

  return (
    <div style={{ minHeight:"100vh", background:"#F5F5F5", fontFamily:"Nunito,sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#f59e0b", color:"white", padding:"52px 20px 24px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0, fontFamily:"Nunito,sans-serif" }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🔗 Vinculaciones</div>
            <div style={{ fontSize:13, opacity:.85 }}>Solicitudes padre‑alumno</div>
          </div>
          {pending.length > 0 && (
            <span style={{ marginLeft:"auto", background:"white", color:"#f59e0b",
              borderRadius:99, fontWeight:900, fontSize:12, padding:"2px 12px" }}>
              {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding:"16px 14px" }}>

        {loading && (
          <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>Cargando...</div>
        )}

        {!loading && pending.length === 0 && resolved.length === 0 && (
          <WCard style={{ textAlign:"center", padding:36 }}>
            <div style={{ fontSize:42, marginBottom:8 }}>🔗</div>
            <div style={{ fontWeight:800, color:"#333", fontSize:16 }}>Sin solicitudes</div>
            <div style={{ fontSize:13, color:"#aaa", marginTop:6, lineHeight:1.5 }}>
              Los padres pueden solicitar vincularse desde su portal.
            </div>
          </WCard>
        )}

        {/* Pendientes */}
        {pending.length > 0 && (
          <>
            <div style={{ fontWeight:900, fontSize:12, color:"#b45309",
              letterSpacing:".06em", textTransform:"uppercase", marginBottom:10 }}>
              ⏳ Pendientes
            </div>
            {pending.map(r => (
              <WCard key={r.id} style={{ marginBottom:12 }}>
                {/* Participantes */}
                <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-start" }}>
                  <div style={{ width:44, height:44, borderRadius:14,
                    background:"#f59e0b22", display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:24, flexShrink:0 }}>👨‍👩‍👧</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:"#1a1a1a" }}>
                      {r.parent_nombre}
                    </div>
                    <div style={{ fontSize:11, color:"#888", margin:"2px 0" }}>
                      solicita vincular con
                    </div>
                    <div style={{ fontWeight:800, fontSize:15, color:"#1a1a1a",
                      display:"flex", alignItems:"center", gap:6 }}>
                      <span>🧑‍🎓</span>
                      {r.student_nombre || r.student_name || "(alumno no especificado)"}
                    </div>
                    <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
                      {new Date(r.created_at).toLocaleDateString("es-AR",
                        { day:"numeric", month:"long", year:"numeric" })}
                    </div>
                  </div>
                </div>

                {/* Emails */}
                <div style={{ background:"#f8f8f8", borderRadius:10, padding:"8px 12px",
                  marginBottom:12, fontSize:11, color:"#666", lineHeight:1.7 }}>
                  <div>📧 <b>Padre:</b> {r.parent_email || "—"}</div>
                  <div>📧 <b>Alumno:</b> {r.student_email || r.student_nombre || "—"}</div>
                </div>

                {/* Botones */}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => approve(r.id)}
                    disabled={!!processing[r.id]}
                    style={{ flex:1, background:processing[r.id]?"#ccc":"#10b981",
                      border:"none", borderRadius:50, color:"white", padding:"11px",
                      fontWeight:800, fontSize:13, fontFamily:"Nunito,sans-serif",
                      cursor:processing[r.id]?"not-allowed":"pointer",
                      transition:"background .2s" }}>
                    {processing[r.id]==="approving" ? "..." : "✅ Aprobar"}
                  </button>
                  <button onClick={() => reject(r.id)}
                    disabled={!!processing[r.id]}
                    style={{ flex:1, background:processing[r.id]?"#f5f5f5":"#fee2e2",
                      border:"1.5px solid #fca5a5", borderRadius:50, color:"#ef4444",
                      padding:"11px", fontWeight:800, fontSize:13,
                      fontFamily:"Nunito,sans-serif",
                      cursor:processing[r.id]?"not-allowed":"pointer",
                      transition:"background .2s" }}>
                    {processing[r.id]==="rejecting" ? "..." : "✕ Rechazar"}
                  </button>
                </div>
              </WCard>
            ))}
          </>
        )}

        {/* Historial */}
        {resolved.length > 0 && (
          <>
            <div style={{ fontWeight:900, fontSize:12, color:"#888",
              letterSpacing:".06em", textTransform:"uppercase",
              marginBottom:10, marginTop: pending.length > 0 ? 20 : 0 }}>
              Historial
            </div>
            {resolved.map(r => {
              const est = EST[r.estado] || EST.rechazado;
              return (
                <WCard key={r.id} style={{ marginBottom:8, opacity:.75 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>
                      {r.estado === "aprobado" ? "✅" : "✕"}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#333" }}>
                        {r.parent_nombre}
                        <span style={{ color:"#aaa", margin:"0 6px" }}>→</span>
                        {r.student_nombre || r.student_name}
                      </div>
                      <div style={{ fontSize:10, color:"#aaa" }}>
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </div>
                    </div>
                    <span style={{ background:est.bg, color:est.col,
                      borderRadius:99, padding:"2px 10px",
                      fontSize:11, fontWeight:800, flexShrink:0 }}>
                      {est.label}
                    </span>
                  </div>
                </WCard>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
