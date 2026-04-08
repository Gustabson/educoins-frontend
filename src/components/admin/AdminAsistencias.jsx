// AdminAsistencias.jsx — Admin read-only view of attendance + edit-request approvals
import { useState, useEffect, useCallback } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const todayISO = () => new Date().toISOString().split("T")[0];

const fmtDate = iso => iso
  ? new Date(iso + "T00:00:00").toLocaleDateString("es-AR",{ weekday:"short", day:"2-digit", month:"2-digit" })
  : "";

const fmtTime = iso => iso
  ? new Date(iso).toLocaleTimeString("es-AR",{ hour:"2-digit", minute:"2-digit" })
  : "";

export default function AdminAsistencias({ onBack, showToast }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const [fecha,        setFecha]        = useState(todayISO());
  const [search,       setSearch]       = useState("");
  const [overview,     setOverview]     = useState([]);   // classrooms summary
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState({});   // classroomId → students[]
  const [loadingDetail,setLoadingDetail]= useState({});
  const [editRequests, setEditRequests] = useState([]);
  const [reviewing,    setReviewing]    = useState({});
  const [searchResults,setSearchResults]= useState(null); // null = not searching

  // Load overview
  const loadOverview = useCallback(() => {
    setLoading(true);
    api.diwyAdminAttendance({ fecha })
      .then(d => setOverview(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fecha]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Load edit requests
  const loadRequests = useCallback(() => {
    api.diwyAdminEditRequests()
      .then(d => setEditRequests(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRequests();
    const socket = getSocket();
    if (socket) {
      socket.on("attendance_edit_request", loadRequests);
      return () => socket.off("attendance_edit_request", loadRequests);
    }
  }, [loadRequests]);

  // Search
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(() => {
      api.diwyAdminAttendance({ fecha, search: search.trim() })
        .then(d => setSearchResults(Array.isArray(d) ? d : []))
        .catch(() => setSearchResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fecha]);

  const toggleExpand = async (classroomId) => {
    if (expanded[classroomId]) {
      setExpanded(p => ({ ...p, [classroomId]: null }));
      return;
    }
    setLoadingDetail(p => ({ ...p, [classroomId]: true }));
    try {
      const d = await api.diwyAdminAttendanceDetail(classroomId, fecha);
      setExpanded(p => ({ ...p, [classroomId]: Array.isArray(d) ? d : [] }));
    } catch {}
    finally { setLoadingDetail(p => ({ ...p, [classroomId]: false })); }
  };

  const handleReview = async (reqId, action) => {
    setReviewing(p => ({ ...p, [reqId]: true }));
    try {
      await api.diwyAdminReviewRequest(reqId, action);
      setEditRequests(p => p.filter(r => r.id !== reqId));
      showToast?.(action === "approved" ? "✅ Autorización otorgada" : "❌ Solicitud denegada");
    } catch(e) { showToast?.(e.message || "Error", "error"); }
    finally { setReviewing(p => ({ ...p, [reqId]: false })); }
  };

  const ATT_COLOR = { presente:"#10b981", ausente:"#ef4444", tarde:"#f59e0b" };
  const ATT_EMOJI = { presente:"✅", ausente:"❌", tarde:"⏰" };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${primary} 0%, #1e40af 100%)`,
        padding:"16px 20px 20px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
            borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:"white" }}>📋 Asistencias</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Vista de administrador — solo lectura</div>
          </div>
          {editRequests.length > 0 && (
            <span style={{ marginLeft:"auto", background:"#ef4444", color:"white",
              borderRadius:99, fontSize:11, fontWeight:900, padding:"3px 10px" }}>
              {editRequests.length} solicitud{editRequests.length > 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding:"16px 14px 48px" }}>

        {/* ── Solicitudes de edición pendientes ── */}
        {editRequests.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:900, color:"#ef4444",
              letterSpacing:".06em", marginBottom:8 }}>⚠️ SOLICITUDES DE EDICIÓN</div>
            {editRequests.map(r => (
              <div key={r.id} style={{ background:cardBg, borderRadius:14,
                border:"1.5px solid #ef444433", padding:"14px 16px", marginBottom:8,
                transition:"background .3s" }}>
                <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:3 }}>
                  {r.teacher_nombre}
                </div>
                <div style={{ fontSize:12, color:sub, marginBottom:10 }}>
                  Curso: <b style={{ color:txt }}>{r.classroom_nombre}</b> —
                  Fecha: <b style={{ color:txt }}>{fmtDate(r.fecha)}</b>
                  {r.motivo && <span> — "{r.motivo}"</span>}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleReview(r.id, "approved")}
                    disabled={reviewing[r.id]}
                    style={{ flex:1, background:"#10b981", border:"none", borderRadius:50,
                      padding:"9px", color:"white", fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                    {reviewing[r.id] ? "..." : "✅ Aprobar"}
                  </button>
                  <button onClick={() => handleReview(r.id, "denied")}
                    disabled={reviewing[r.id]}
                    style={{ flex:1, background:`${navBord}`, border:"none", borderRadius:50,
                      padding:"9px", color:sub, fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                    ❌ Denegar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setExpanded({}); }}
            style={{ flex:1, border:`1.5px solid ${navBord}`, borderRadius:12,
              padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
              outline:"none", color:txt, background:cardBg,
              transition:"background .3s, color .3s" }}/>
        </div>
        <div style={{ position:"relative", marginBottom:16 }}>
          <span style={{ position:"absolute", left:13, top:"50%",
            transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar alumno por nombre o ID..."
            style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:12,
              padding:"10px 12px 10px 38px", fontSize:13, fontFamily:"Nunito,sans-serif",
              outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
              transition:"background .3s, color .3s" }}/>
          {search && <button onClick={() => setSearch("")}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer", fontSize:16, color:sub }}>×</button>}
        </div>

        {/* ── Search results ── */}
        {searchResults !== null && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:900, color:sub, letterSpacing:".06em",
              marginBottom:8 }}>RESULTADOS ({searchResults.length})</div>
            {searchResults.length === 0
              ? <div style={{ textAlign:"center", color:sub, padding:20, fontSize:13 }}>Sin resultados</div>
              : searchResults.map(s => (
                <div key={s.id} style={{ background:cardBg, borderRadius:12,
                  border:`1.5px solid ${s.estado ? ATT_COLOR[s.estado]+"33" : navBord}`,
                  padding:"11px 14px", marginBottom:6,
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  transition:"background .3s" }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>{s.nombre}</div>
                    <div style={{ fontSize:11, color:sub, marginTop:2 }}>{s.classroom_nombre}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {s.estado
                      ? <span style={{ background:ATT_COLOR[s.estado]+"20", color:ATT_COLOR[s.estado],
                          borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:900 }}>
                          {ATT_EMOJI[s.estado]} {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                        </span>
                      : <span style={{ color:sub, fontSize:12 }}>Sin registro</span>
                    }
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── Overview by classroom ── */}
        {!search.trim() && (
          <>
            <div style={{ fontSize:11, fontWeight:900, color:sub, letterSpacing:".06em",
              marginBottom:10 }}>
              AULAS — {fmtDate(fecha)}
            </div>

            {loading && <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>}

            {!loading && overview.map(c => {
              const hasTaken = c.marked > 0;
              const detail   = expanded[c.id];
              const isExpanded = !!detail;

              return (
                <div key={c.id} style={{ marginBottom:10 }}>
                  <div style={{ background:cardBg, borderRadius:14,
                    border:`1.5px solid ${hasTaken ? primary+"33" : navBord}`,
                    overflow:"hidden", transition:"background .3s, border .3s" }}>

                    {/* Classroom header */}
                    <button onClick={() => toggleExpand(c.id)}
                      style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                        padding:"14px 16px", display:"flex", alignItems:"center",
                        justifyContent:"space-between", fontFamily:"Nunito,sans-serif" }}>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontWeight:900, fontSize:14, color:txt }}>
                          🏫 {c.nombre}
                        </div>
                        {hasTaken ? (
                          <div style={{ display:"flex", gap:10, marginTop:4 }}>
                            <span style={{ fontSize:11, color:"#10b981", fontWeight:800 }}>✅ {c.presentes}P</span>
                            <span style={{ fontSize:11, color:"#f59e0b", fontWeight:800 }}>⏰ {c.tardes}T</span>
                            <span style={{ fontSize:11, color:"#ef4444", fontWeight:800 }}>❌ {c.ausentes}A</span>
                            <span style={{ fontSize:10, color:sub }}>
                              {c.marked}/{c.total_students} · {c.teacher_nombre} {fmtTime(c.taken_at)}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize:11, color:sub, marginTop:3 }}>
                            Sin asistencia — {c.total_students} alumnos
                          </div>
                        )}
                      </div>
                      <span style={{ color:sub, fontSize:18, flexShrink:0,
                        transition:"transform .2s",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                    </button>

                    {/* Expanded student list */}
                    {loadingDetail[c.id] && (
                      <div style={{ padding:"10px 16px", color:sub, fontSize:12 }}>Cargando...</div>
                    )}
                    {isExpanded && (
                      <div style={{ borderTop:`1px solid ${navBord}`, padding:"8px 14px 12px" }}>
                        {detail.map(s => (
                          <div key={s.id} style={{ display:"flex", alignItems:"center",
                            justifyContent:"space-between", padding:"7px 0",
                            borderBottom:`1px solid ${navBord}55` }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, color:txt }}>{s.nombre}</div>
                              {s.created_at && (
                                <div style={{ fontSize:10, color:sub }}>
                                  Registrado {fmtTime(s.created_at)}
                                </div>
                              )}
                            </div>
                            {s.estado
                              ? <span style={{
                                  background: ATT_COLOR[s.estado] + "20",
                                  color: ATT_COLOR[s.estado],
                                  borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:900
                                }}>
                                  {ATT_EMOJI[s.estado]} {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                                </span>
                              : <span style={{ color:sub, fontSize:12 }}>—</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && overview.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>📋</div>
                <div style={{ fontSize:13, color:sub }}>Sin aulas activas</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
