// TeacherAsistencias.jsx — Standalone attendance management for teachers.
// NOTE: Defined entirely at module scope — no component-inside-component.

import { useState, useEffect, useCallback } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";

const todayISO = () => new Date().toISOString().split("T")[0];

const fmtDate = iso => iso
  ? new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"2-digit" })
  : "";

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString("es-AR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })
  : "";

// ── Header (module scope) ─────────────────────────────────────────────────────
function AttHeader({ primary, onBack }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primary} 0%, #1e40af 100%)`,
      padding: "16px 20px 20px", position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
          borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div>
          <div style={{ fontWeight:900, fontSize:20, color:"white" }}>📋 Asistencias</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Tomá y consultá la asistencia del aula</div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TeacherAsistencias({ onBack, showToast }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, isDark } = useTheme();

  const [classrooms,    setClassrooms]    = useState([]);
  const [attClassroom,  setAttClassroom]  = useState(null);
  const [attDate,       setAttDate]       = useState(todayISO);
  const [attStudents,   setAttStudents]   = useState([]);
  const [loadingAtt,    setLoadingAtt]    = useState(false);
  const [savingAtt,     setSavingAtt]     = useState(false);
  const [attSaved,      setAttSaved]      = useState(false);
  const [attLocked,     setAttLocked]     = useState(false);
  const [attFirstSaved, setAttFirstSaved] = useState(null);
  const [attReqSending, setAttReqSending] = useState(false);
  const [attReqSent,    setAttReqSent]    = useState(false);
  const [attReqMotivo,  setAttReqMotivo]  = useState("");
  const [showReqForm,   setShowReqForm]   = useState(false);
  const [attHistory,    setAttHistory]    = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState({});

  // Load classrooms + history on mount
  useEffect(() => {
    api.diwyTeacherClassrooms()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setClassrooms(list);
        if (list.length > 0) setAttClassroom(list[0].id);
      })
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = () => {
    api.diwyTeacherAttendanceHistory()
      .then(d => setAttHistory(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {});
  };

  // Direct-load function — used by both the useEffect and the history "jump" button
  const loadAttendance = useCallback((classroomId, fecha) => {
    if (!classroomId) return;
    setLoadingAtt(true);
    setAttSaved(false);
    setAttLocked(false);
    setAttFirstSaved(null);
    setShowReqForm(false);
    setAttReqSent(false);
    setAttReqMotivo("");
    api.diwyTeacherAttendance({ classroom_id: classroomId, fecha })
      .then(d => {
        const rows = Array.isArray(d) ? d : d?.data || [];
        const fs   = d?.first_saved || null;
        setAttStudents(rows.map(s => ({ id: s.id, nombre: s.nombre, estado: s.estado || null })));
        setAttFirstSaved(fs);
        if (fs && (Date.now() - new Date(fs).getTime()) > 4 * 3600 * 1000) {
          setAttLocked(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAtt(false));
  }, []);

  // Reload whenever classroom or date changes
  useEffect(() => {
    if (attClassroom) loadAttendance(attClassroom, attDate);
  }, [attClassroom, attDate, loadAttendance]);

  // Socket: unlock when admin approves
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onReviewed = (data) => {
      if (data?.status === "approved") {
        setAttLocked(false);
        setAttReqSent(false);
        setShowReqForm(false);
        showToast?.("🔓 Autorización recibida — ya podés editar");
      }
    };
    socket.on("attendance_request_reviewed", onReviewed);
    return () => socket.off("attendance_request_reviewed", onReviewed);
  }, [showToast]);

  const handleSaveAttendance = async () => {
    const records = attStudents.filter(s => s.estado !== null);
    if (!attClassroom || records.length === 0) return;
    setSavingAtt(true);
    try {
      await api.diwyTeacherAttendanceSave({
        classroom_id: attClassroom,
        fecha: attDate,
        records: records.map(s => ({ student_id: s.id, estado: s.estado })),
      });
      setAttSaved(true);
      setAttLocked(false);
      loadHistory();
      setTimeout(() => setAttSaved(false), 3000);
    } catch(e) {
      if (e?.code === "ATTENDANCE_LOCKED" || e?.message?.includes("4 horas")) {
        setAttLocked(true);
      } else {
        showToast?.(e?.message || "Error al guardar", "error");
      }
    }
    finally { setSavingAtt(false); }
  };

  const handleRequestEdit = async () => {
    if (!attClassroom) return;
    setAttReqSending(true);
    try {
      await api.diwyTeacherAttendanceRequestEdit({
        classroom_id: attClassroom,
        fecha: attDate,
        motivo: attReqMotivo.trim() || undefined,
      });
      setAttReqSent(true);
      setShowReqForm(false);
      showToast?.("📨 Solicitud enviada al administrador");
    } catch(e) {
      showToast?.(e?.message || "Error al enviar solicitud", "error");
    }
    finally { setAttReqSending(false); }
  };

  // Jump to a history entry — uses loadAttendance directly (bypasses potential no-op state update)
  const handleJumpToHistory = (classroomId, fecha) => {
    setAttClassroom(classroomId);
    setAttDate(fecha);
    // Force re-load even if both values were already the same
    loadAttendance(classroomId, fecha);
    // Collapse all history
    setHistoryExpanded({});
    // Scroll top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <AttHeader primary={primary} onBack={onBack} />

      <div style={{ padding:"16px 14px 48px" }}>

        {/* Classroom selector */}
        {classrooms.length > 1 && (
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {classrooms.map(c => (
              <button key={c.id} onClick={() => setAttClassroom(c.id)} style={{
                background: attClassroom===c.id ? primary : `${primary}15`,
                border:`1px solid ${attClassroom===c.id ? primary : primary+"33"}`,
                borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:800,
                color: attClassroom===c.id ? "white" : primary,
                cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .2s",
              }}>{c.nombre}</button>
            ))}
          </div>
        )}

        {/* Date picker + todos presentes */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <input type="date" value={attDate} max={todayISO()}
            onChange={e => setAttDate(e.target.value)}
            style={{ flex:1, border:`1.5px solid ${navBord}`, borderRadius:12,
              padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
              outline:"none", color:txt, background:cardBg,
              transition:"background .3s, color .3s" }}/>
          <button
            onClick={() => setAttStudents(p => p.map(s => ({ ...s, estado:"presente" })))}
            style={{ background:`#10b98115`, border:`1px solid #10b98133`,
              borderRadius:99, padding:"9px 14px", fontSize:11, fontWeight:800,
              color:"#10b981", cursor:"pointer", fontFamily:"Nunito,sans-serif",
              whiteSpace:"nowrap" }}>
            ✅ Todos
          </button>
        </div>

        {/* Student list */}
        {loadingAtt && (
          <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>
        )}

        {!loadingAtt && attStudents.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🏫</div>
            <div style={{ fontSize:13, color:sub }}>
              {attClassroom ? "Sin alumnos en este curso" : "Seleccioná un curso"}
            </div>
          </div>
        )}

        {!loadingAtt && attStudents.map((s, i) => (
          <div key={s.id} style={{
            background:cardBg, borderRadius:14, padding:"11px 14px",
            marginBottom:6, display:"flex", alignItems:"center", gap:10,
            border:`1.5px solid ${
              s.estado === "presente" ? "#10b98133"
              : s.estado === "ausente" ? "#ef444433"
              : s.estado === "tarde"   ? "#f59e0b33"
              : navBord}`,
            transition:"background .3s, border .3s",
          }}>
            <div style={{ flex:1, fontWeight:700, fontSize:13, color:txt }}>{s.nombre}</div>
            {[
              { val:"presente", icon:"✅", label:"P", col:"#10b981" },
              { val:"tarde",    icon:"⏰", label:"T", col:"#f59e0b" },
              { val:"ausente",  icon:"❌", label:"A", col:"#ef4444" },
            ].map(opt => (
              <button key={opt.val}
                onClick={() => setAttStudents(p => p.map((x,j) =>
                  j===i ? { ...x, estado: x.estado===opt.val ? null : opt.val } : x
                ))}
                style={{
                  background: s.estado===opt.val ? opt.col+"20" : (isDark?"rgba(255,255,255,.06)":"#f5f5f5"),
                  border:`1.5px solid ${s.estado===opt.val ? opt.col : "transparent"}`,
                  borderRadius:10, padding:"6px 10px", fontSize:12, fontWeight:800,
                  color: s.estado===opt.val ? opt.col : sub,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .15s",
                  display:"flex", alignItems:"center", gap:3,
                }}>
                <span style={{ fontSize:14 }}>{opt.icon}</span>
                <span style={{ fontSize:10 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Lock banner */}
        {!loadingAtt && attLocked && !attSaved && (
          <div style={{ background:"#fef3c718", border:"1.5px solid #f59e0b55",
            borderRadius:14, padding:"14px 16px", marginTop:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#b45309", marginBottom:6 }}>
              🔒 Asistencia bloqueada
            </div>
            <div style={{ fontSize:12, color:"#92400e", lineHeight:1.55, marginBottom:10 }}>
              Han pasado más de 4 horas desde que se tomó esta asistencia. Necesitás autorización del administrador para editarla.
            </div>
            {attReqSent ? (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98144",
                borderRadius:10, padding:"10px 12px", textAlign:"center",
                color:"#10b981", fontWeight:800, fontSize:12 }}>
                ✅ Solicitud enviada — esperando autorización
              </div>
            ) : showReqForm ? (
              <div>
                <input
                  value={attReqMotivo}
                  onChange={e => setAttReqMotivo(e.target.value)}
                  placeholder="Motivo de la corrección (opcional)..."
                  maxLength={200}
                  style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:12,
                    padding:"9px 12px", fontSize:12, fontFamily:"Nunito,sans-serif",
                    outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
                    marginBottom:8, transition:"background .3s, color .3s" }}
                />
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setShowReqForm(false)}
                    style={{ flex:1, background:`${navBord}`, border:"none", borderRadius:50,
                      padding:"9px", color:sub, fontWeight:800, fontSize:12,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                    Cancelar
                  </button>
                  <button onClick={handleRequestEdit} disabled={attReqSending}
                    style={{ flex:2, background:attReqSending ? navBord : "#f59e0b",
                      border:"none", borderRadius:50, padding:"9px", color:"white",
                      fontWeight:800, fontSize:12, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif" }}>
                    {attReqSending ? "Enviando..." : "📨 Enviar solicitud"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReqForm(true)}
                style={{ width:"100%", background:"#f59e0b", border:"none", borderRadius:50,
                  padding:"10px", color:"white", fontWeight:800, fontSize:13,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                🔓 Solicitar autorización
              </button>
            )}
          </div>
        )}

        {/* Save button */}
        {!loadingAtt && attStudents.length > 0 && !attLocked && (
          <div style={{ marginTop:14 }}>
            {attSaved ? (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98144",
                borderRadius:14, padding:"12px", textAlign:"center",
                color:"#10b981", fontWeight:800, fontSize:14 }}>
                ✅ Asistencia guardada
              </div>
            ) : (
              <button onClick={handleSaveAttendance}
                disabled={savingAtt || attStudents.every(s => s.estado === null)}
                style={{
                  width:"100%",
                  background: (savingAtt || attStudents.every(s => s.estado === null))
                    ? navBord
                    : `linear-gradient(135deg, ${primary}, #1e40af)`,
                  border:"none", borderRadius:50, padding:"13px", color:"white",
                  fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"all .2s",
                }}>
                {savingAtt ? "Guardando..." : `💾 Guardar — ${attStudents.filter(s=>s.estado).length}/${attStudents.length} marcados`}
              </button>
            )}
          </div>
        )}

        {/* History */}
        {attHistory.length > 0 && (
          <div style={{ marginTop:28 }}>
            <div style={{ fontSize:11, fontWeight:900, color:sub,
              letterSpacing:".06em", marginBottom:10 }}>HISTORIAL</div>
            {attHistory.map(h => {
              const key = `${h.classroom_id}_${h.fecha}`;
              const isOpen = historyExpanded[key];
              const isLocked = h.first_saved &&
                (Date.now() - new Date(h.first_saved).getTime()) > 4 * 3600 * 1000;
              return (
                <div key={key} style={{ background:cardBg, borderRadius:12,
                  border:`1.5px solid ${navBord}`, marginBottom:6, overflow:"hidden",
                  transition:"background .3s" }}>
                  <button
                    onClick={() => setHistoryExpanded(p => ({ ...p, [key]: !isOpen }))}
                    style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                      padding:"11px 14px", display:"flex", alignItems:"center",
                      justifyContent:"space-between", fontFamily:"Nunito,sans-serif" }}>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontWeight:800, fontSize:13, color:txt }}>
                        {h.classroom_nombre}
                        {isLocked && <span style={{ marginLeft:6, fontSize:11 }}>🔒</span>}
                      </div>
                      <div style={{ fontSize:11, color:sub, marginTop:2 }}>
                        {fmtDate(h.fecha)}
                        {" · "}
                        <span style={{ color:"#10b981", fontWeight:700 }}>✅ {h.presentes}P</span>
                        {" "}
                        <span style={{ color:"#f59e0b", fontWeight:700 }}>⏰ {h.tardes}T</span>
                        {" "}
                        <span style={{ color:"#ef4444", fontWeight:700 }}>❌ {h.ausentes}A</span>
                      </div>
                    </div>
                    <span style={{ color:sub, fontSize:16, transition:"transform .2s",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${navBord}`, padding:"10px 14px 12px" }}>
                      <div style={{ fontSize:11, color:sub, marginBottom:10 }}>
                        Total {h.total} alumnos · Guardado {fmtDateTime(h.first_saved)}
                      </div>
                      <button
                        onClick={() => handleJumpToHistory(h.classroom_id, h.fecha)}
                        style={{ background:`${primary}15`, border:`1px solid ${primary}33`,
                          borderRadius:99, padding:"7px 16px", fontSize:12, fontWeight:800,
                          color:primary, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                        📋 Ver / editar este día
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
