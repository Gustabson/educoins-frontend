// AdminVincular.jsx — Gestión de vinculaciones padre-alumno
import { useState, useEffect, useMemo } from "react";
import { api } from "../../api";
import { WCard, Av } from "../shared/index";

const ACCENT = "#f59e0b";

const EST_BADGE = {
  pendiente: { bg:"#fef3c7", col:"#b45309", label:"Pendiente" },
  aprobado:  { bg:"#d1fae5", col:"#065f46", label:"Aprobado"  },
  rechazado: { bg:"#fee2e2", col:"#991b1b", label:"Rechazado" },
};

export default function AdminVincular({ showToast, onBack }) {
  const [activeTab,   setActiveTab]   = useState("solicitudes"); // "solicitudes" | "vinculos"
  const [requests,    setRequests]    = useState([]);
  const [links,       setLinks]       = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [loadingLnks, setLoadingLnks] = useState(true);
  const [processing,  setProcessing]  = useState({});
  const [searchReq,   setSearchReq]   = useState("");
  const [searchLnk,   setSearchLnk]   = useState("");

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => {
    api.adminLinkRequests()
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]))
      .finally(() => setLoadingReqs(false));

    api.adminParentLinks()
      .then(d => setLinks(Array.isArray(d) ? d : []))
      .catch(() => setLinks([]))
      .finally(() => setLoadingLnks(false));
  }, []);

  // ── Actions ─────────────────────────────────────────────────
  const approve = async (id) => {
    setProcessing(p => ({ ...p, [id]: "approving" }));
    try {
      await api.adminLinkApprove(id);
      setRequests(rs => rs.map(r => r.id === id ? { ...r, estado: "aprobado" } : r));
      // Refresh links to include the newly created one
      api.adminParentLinks()
        .then(d => setLinks(Array.isArray(d) ? d : []))
        .catch(() => {});
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

  const revoke = async (link) => {
    const key = `${link.parent_id}_${link.student_id}`;
    setProcessing(p => ({ ...p, [key]: "revoking" }));
    try {
      await api.adminParentUnlink(link.parent_id, link.student_id);
      setLinks(ls => ls.filter(l => !(l.parent_id === link.parent_id && l.student_id === link.student_id)));
      showToast("Vínculo revocado");
    } catch(e) {
      showToast(e.message || "Error al revocar", "error");
    } finally { setProcessing(p => ({ ...p, [key]: null })); }
  };

  // ── Filtered lists ──────────────────────────────────────────
  const filteredReqs = useMemo(() => {
    if (!searchReq.trim()) return requests;
    const q = searchReq.toLowerCase();
    return requests.filter(r =>
      (r.parent_nombre || "").toLowerCase().includes(q) ||
      (r.student_nombre || r.student_name || "").toLowerCase().includes(q) ||
      (r.parent_email || "").toLowerCase().includes(q)
    );
  }, [requests, searchReq]);

  const filteredLinks = useMemo(() => {
    if (!searchLnk.trim()) return links;
    const q = searchLnk.toLowerCase();
    return links.filter(l =>
      (l.parent_nombre || "").toLowerCase().includes(q) ||
      (l.student_nombre || "").toLowerCase().includes(q) ||
      (l.parent_email || "").toLowerCase().includes(q) ||
      (l.student_email || "").toLowerCase().includes(q)
    );
  }, [links, searchLnk]);

  const pendingReqs   = filteredReqs.filter(r => r.estado === "pendiente");
  const resolvedReqs  = filteredReqs.filter(r => r.estado !== "pendiente");
  const pendingCount  = requests.filter(r => r.estado === "pendiente").length;

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })
    : "—";

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#F5F5F5", fontFamily:"Nunito,sans-serif" }}>

      {/* Header */}
      <div style={{ background:ACCENT, color:"white", padding:"52px 20px 0",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-50, right:-40, pointerEvents:"none" }}/>

        {/* Fila título */}
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
            borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            fontFamily:"Nunito,sans-serif" }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:22 }}>🔗 Vinculaciones</div>
            <div style={{ fontSize:13, opacity:.85 }}>Padres · Alumnos</div>
          </div>
          {pendingCount > 0 && (
            <span style={{ background:"white", color:ACCENT, borderRadius:99,
              fontWeight:900, fontSize:12, padding:"3px 12px", flexShrink:0 }}>
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, position:"relative" }}>
          {[
            { id:"solicitudes", label:"Solicitudes", count: requests.filter(r=>r.estado==="pendiente").length },
            { id:"vinculos",    label:`Vínculos (${links.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex:1, background:"none", border:"none", color:"white",
              fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:13,
              padding:"10px 4px", cursor:"pointer", position:"relative",
              opacity: activeTab===t.id ? 1 : .65,
              borderBottom: activeTab===t.id ? "3px solid white" : "3px solid transparent",
              transition:"opacity .15s, border-color .15s" }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft:6, background:"#ef4444", color:"white",
                  borderRadius:99, fontSize:10, fontWeight:900,
                  padding:"1px 7px", verticalAlign:"middle" }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 14px" }}>

        {/* ── TAB: SOLICITUDES ───────────────────────────────── */}
        {activeTab === "solicitudes" && (
          <>
            {/* Buscador */}
            <input
              placeholder="Buscar por nombre o email..."
              value={searchReq}
              onChange={e => setSearchReq(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", border:"1.5px solid #e8e8e8",
                borderRadius:50, padding:"10px 18px", fontSize:13, outline:"none",
                fontFamily:"Nunito,sans-serif", background:"white", color:"#333",
                marginBottom:14 }}/>

            {loadingReqs && (
              <div style={{ textAlign:"center", color:"#aaa", padding:32 }}>Cargando...</div>
            )}

            {!loadingReqs && pendingReqs.length === 0 && resolvedReqs.length === 0 && (
              <WCard style={{ textAlign:"center", padding:36 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🔗</div>
                <div style={{ fontWeight:800, color:"#333", fontSize:15 }}>
                  {searchReq ? "Sin resultados" : "Sin solicitudes"}
                </div>
                <div style={{ fontSize:12, color:"#aaa", marginTop:6, lineHeight:1.5 }}>
                  {searchReq ? "Probá con otro término" : "Los padres pueden solicitar vincularse desde su portal"}
                </div>
              </WCard>
            )}

            {/* Pendientes */}
            {pendingReqs.length > 0 && (
              <>
                <div style={{ fontWeight:900, fontSize:11, color:"#b45309",
                  letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>
                  ⏳ Pendientes ({pendingReqs.length})
                </div>
                {pendingReqs.map(r => (
                  <WCard key={r.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-start" }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:"#fef3c7",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:22, flexShrink:0 }}>👨‍👩‍👧</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>
                          {r.parent_nombre}
                        </div>
                        <div style={{ fontSize:11, color:"#888", margin:"2px 0" }}>
                          {r.parent_email}
                        </div>
                        <div style={{ fontSize:11, color:"#aaa", margin:"4px 0 2px" }}>
                          solicita vincular con
                        </div>
                        <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>
                          🧑‍🎓 {r.student_nombre || r.student_name || "(no especificado)"}
                        </div>
                        <div style={{ fontSize:10, color:"#aaa", marginTop:4 }}>
                          {fmtDate(r.created_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => approve(r.id)} disabled={!!processing[r.id]}
                        style={{ flex:1, background:processing[r.id]?"#ccc":"#10b981",
                          border:"none", borderRadius:50, color:"white", padding:"11px",
                          fontWeight:800, fontSize:13, fontFamily:"Nunito,sans-serif",
                          cursor:processing[r.id]?"not-allowed":"pointer" }}>
                        {processing[r.id]==="approving" ? "..." : "✅ Aprobar"}
                      </button>
                      <button onClick={() => reject(r.id)} disabled={!!processing[r.id]}
                        style={{ flex:1, background:processing[r.id]?"#f5f5f5":"#fee2e2",
                          border:"1.5px solid #fca5a5", borderRadius:50, color:"#ef4444",
                          padding:"11px", fontWeight:800, fontSize:13,
                          fontFamily:"Nunito,sans-serif",
                          cursor:processing[r.id]?"not-allowed":"pointer" }}>
                        {processing[r.id]==="rejecting" ? "..." : "✕ Rechazar"}
                      </button>
                    </div>
                  </WCard>
                ))}
              </>
            )}

            {/* Historial */}
            {resolvedReqs.length > 0 && (
              <>
                <div style={{ fontWeight:900, fontSize:11, color:"#888",
                  letterSpacing:".07em", textTransform:"uppercase",
                  marginBottom:10, marginTop: pendingReqs.length > 0 ? 20 : 0 }}>
                  Historial ({resolvedReqs.length})
                </div>
                {resolvedReqs.map(r => {
                  const badge = EST_BADGE[r.estado] || EST_BADGE.rechazado;
                  return (
                    <WCard key={r.id} style={{ marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:18 }}>
                          {r.estado === "aprobado" ? "✅" : "✕"}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:"#333",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {r.parent_nombre}
                            <span style={{ color:"#ccc", margin:"0 5px" }}>→</span>
                            {r.student_nombre || r.student_name}
                          </div>
                          <div style={{ fontSize:10, color:"#aaa" }}>{fmtDate(r.created_at)}</div>
                        </div>
                        <span style={{ background:badge.bg, color:badge.col,
                          borderRadius:99, padding:"2px 10px",
                          fontSize:11, fontWeight:800, flexShrink:0 }}>
                          {badge.label}
                        </span>
                      </div>
                    </WCard>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── TAB: VÍNCULOS ACTIVOS ───────────────────────────── */}
        {activeTab === "vinculos" && (
          <>
            {/* Buscador */}
            <input
              placeholder="Buscar padre, alumno o email..."
              value={searchLnk}
              onChange={e => setSearchLnk(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", border:"1.5px solid #e8e8e8",
                borderRadius:50, padding:"10px 18px", fontSize:13, outline:"none",
                fontFamily:"Nunito,sans-serif", background:"white", color:"#333",
                marginBottom:14 }}/>

            {loadingLnks && (
              <div style={{ textAlign:"center", color:"#aaa", padding:32 }}>Cargando...</div>
            )}

            {!loadingLnks && filteredLinks.length === 0 && (
              <WCard style={{ textAlign:"center", padding:36 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🔗</div>
                <div style={{ fontWeight:800, color:"#333", fontSize:15 }}>
                  {searchLnk ? "Sin resultados" : "Sin vínculos activos"}
                </div>
                <div style={{ fontSize:12, color:"#aaa", marginTop:6 }}>
                  {searchLnk ? "Probá con otro término" : "Aprobá solicitudes para crear vínculos"}
                </div>
              </WCard>
            )}

            {filteredLinks.map(link => {
              const key = `${link.parent_id}_${link.student_id}`;
              const isRevoking = processing[key] === "revoking";
              return (
                <WCard key={key} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>

                      {/* Padre */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background:"#10b98118",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:16, flexShrink:0 }}>👨‍👩‍👧</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {link.parent_nombre}
                          </div>
                          <div style={{ fontSize:10, color:"#aaa" }}>{link.parent_email}</div>
                        </div>
                      </div>

                      <div style={{ display:"flex", alignItems:"center", paddingLeft:4,
                        marginBottom:6, gap:6 }}>
                        <div style={{ width:1, height:20, background:"#e0e0e0", marginLeft:15 }}/>
                        <span style={{ fontSize:10, color:"#aaa", fontWeight:700 }}>vinculado con</span>
                      </div>

                      {/* Alumno */}
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background:"#6366f118",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:16, flexShrink:0 }}>🧑‍🎓</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {link.student_nombre}
                          </div>
                          <div style={{ fontSize:10, color:"#aaa" }}>{link.student_email}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fecha + Revocar */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    paddingTop:10, borderTop:"1px solid #f0f0f0" }}>
                    <div style={{ fontSize:10, color:"#aaa" }}>
                      Vinculado el {fmtDate(link.created_at)}
                    </div>
                    <button onClick={() => revoke(link)} disabled={isRevoking}
                      style={{ background:isRevoking?"#f5f5f5":"#fee2e2",
                        border:"1.5px solid #fca5a5", borderRadius:50,
                        color:"#ef4444", padding:"6px 14px", fontWeight:800,
                        fontSize:11, fontFamily:"Nunito,sans-serif",
                        cursor:isRevoking?"not-allowed":"pointer" }}>
                      {isRevoking ? "..." : "🔗 Revocar"}
                    </button>
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
