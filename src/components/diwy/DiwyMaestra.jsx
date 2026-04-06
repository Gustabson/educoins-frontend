// DiwyMaestra.jsx — Teacher view of Diwy.
// Tabs: "Alumnos" (observations) | "Mensajes" (parent→teacher via Diwy) | "Clase de hoy"

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard, OHdrA } from "../shared/index";

const fmtSemana = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit" })
  : "";

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
  : "";

function estadoBadge(estado) {
  if (estado === "aprobado")            return { label:"Publicado",   bg:"#10b981" };
  if (estado === "pendiente_revision")  return { label:"En revisión", bg:"#f59e0b" };
  if (estado === "draft")               return { label:"Borrador",    bg:"#6b7280" };
  return null;
}

export default function DiwyMaestra({ me }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const [activeTab,    setActiveTab]    = useState("alumnos"); // alumnos | mensajes | clase
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [observations, setObservations] = useState([]);
  const [loadingObs,   setLoadingObs]   = useState(false);
  const [obsText,      setObsText]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");

  // Mensajes
  const [messages,     setMessages]     = useState([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [replies,      setReplies]      = useState({}); // { [msgId]: text }
  const [sendingReply, setSendingReply] = useState({}); // { [msgId]: bool }

  // Clase de hoy
  const [tema,         setTema]         = useState("");
  const [detalle,      setDetalle]      = useState("");
  const [savingPrev,   setSavingPrev]   = useState(false);
  const [savedPrev,    setSavedPrev]    = useState(null);

  useEffect(() => {
    api.diwyStudents()
      .then(d => setStudents(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "mensajes") return;
    setLoadingMsgs(true);
    api.diwyTeacherMessages()
      .then(d => setMessages(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeTab]);

  useEffect(() => {
    if (!selected) return;
    setLoadingObs(true);
    api.diwyObservations(selected.id)
      .then(d => setObservations(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoadingObs(false));
  }, [selected]);

  const handleAdd = async () => {
    if (!obsText.trim()) return;
    setSaving(true);
    try {
      const r = await api.diwyAddObs({ student_id: selected.id, texto: obsText.trim() });
      setObservations(prev => [r?.data || r, ...prev]);
      setObsText("");
    } catch(e) {}
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.diwyDeleteObs(id);
      setObservations(prev => prev.filter(o => o.id !== id));
    } catch(e) {}
  };

  const handleReply = async (msgId) => {
    const text = replies[msgId]?.trim();
    if (!text) return;
    setSendingReply(p => ({ ...p, [msgId]: true }));
    try {
      const updated = await api.diwyTeacherReply(msgId, { reply: text });
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, estado:"replied", teacher_reply: text,
              formatted_reply: updated?.formatted_reply || text,
              replied_at: updated?.replied_at || new Date().toISOString() }
          : m
      ));
      setReplies(p => ({ ...p, [msgId]: "" }));
    } catch(e) {}
    finally { setSendingReply(p => ({ ...p, [msgId]: false })); }
  };

  const handleSavePreview = async () => {
    if (!tema.trim()) return;
    setSavingPrev(true);
    try {
      const d = await api.diwyTeacherPreview({ tema: tema.trim(), detalle: detalle.trim() || undefined });
      setSavedPrev(d);
    } catch(e) {}
    finally { setSavingPrev(false); }
  };

  const filtered = search.trim()
    ? students.filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
    : students;

  const pendingCount = messages.filter(m => m.estado === "pending").length;

  // ── Detail: per-student observations ──
  if (selected) {
    return (
      <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
        <OHdrA
          title={selected.nombre}
          onBack={() => { setSelected(null); setObsText(""); setObservations([]); }}
          extra={<div style={{ fontSize:12, opacity:.8, marginTop:2 }}>🐾 Observaciones Diwy</div>}
        />
        <div style={{ padding:"16px 14px 32px" }}>
          <WCard style={{ marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8 }}>
              Observación — semana actual
            </div>
            <textarea
              value={obsText}
              onChange={e => setObsText(e.target.value)}
              placeholder={`¿Cómo fue la semana de ${selected.nombre}? Participación, actitud, logros, dificultades...`}
              rows={4} maxLength={500}
              style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:12,
                padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:txt, background:inputBg, transition:"background .3s, color .3s, border-color .3s" }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <span style={{ fontSize:11, color:sub }}>{obsText.length}/500</span>
              <button onClick={handleAdd} disabled={saving || !obsText.trim()}
                style={{ background:(!obsText.trim()||saving) ? navBord : primary,
                  border:"none", borderRadius:50, padding:"8px 22px",
                  color:"white", fontWeight:800, fontSize:12,
                  cursor:saving?"not-allowed":"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                {saving ? "Guardando..." : "✓ Guardar"}
              </button>
            </div>
          </WCard>

          <div style={{ fontWeight:800, fontSize:11, color:sub, marginBottom:8,
            paddingLeft:4, letterSpacing:".06em" }}>HISTORIAL DE OBSERVACIONES</div>

          {loadingObs && <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>}
          {!loadingObs && observations.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
              <div style={{ fontSize:13, color:sub }}>Sin observaciones todavía</div>
            </div>
          )}
          {observations.map(o => {
            const isOwn = o.teacher_id === me?.id;
            return (
              <div key={o.id} style={{ background:cardBg, borderRadius:14,
                padding:"12px 14px", marginBottom:8,
                border:`1.5px solid ${isOwn ? primary+"44" : navBord}` }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:primary }}>
                      Sem. {fmtSemana(o.semana)}
                    </span>
                    <span style={{ fontSize:10, color:sub }}>· {o.docente_nombre}</span>
                    {isOwn && (
                      <span style={{ fontSize:9, background:`${primary}18`, color:primary,
                        borderRadius:99, padding:"1px 6px", fontWeight:800 }}>tuya</span>
                    )}
                  </div>
                  {isOwn && (
                    <button onClick={() => handleDelete(o.id)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        color:sub, fontSize:16, lineHeight:1, padding:"0 2px",
                        fontFamily:"Nunito,sans-serif" }}>×</button>
                  )}
                </div>
                <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{o.texto}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main view with tabs ──
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <OHdrA
        title="🐾 Diwy"
        extra={<div style={{ fontSize:12, opacity:.8, marginTop:2 }}>Seguimiento semanal</div>}
      />

      {/* Tab bar */}
      <div style={{ display:"flex", background:cardBg, borderBottom:`1px solid ${navBord}`,
        padding:"0 14px", gap:4, position:"sticky", top:0, zIndex:10,
        transition:"background .3s, border-color .3s" }}>
        {[
          { id:"alumnos",  label:"Alumnos" },
          { id:"mensajes", label:"Mensajes", badge: pendingCount },
          { id:"clase",    label:"Clase de hoy" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex:1, padding:"12px 4px", background:"none", border:"none",
              borderBottom:`2px solid ${activeTab===t.id ? primary : "transparent"}`,
              color: activeTab===t.id ? primary : sub,
              fontWeight:800, fontSize:12, cursor:"pointer",
              fontFamily:"Nunito,sans-serif", transition:"color .2s, border-color .2s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                fontSize:9, fontWeight:900, minWidth:16, height:16,
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                padding:"0 4px" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px 14px 32px" }}>

        {/* ── Tab: Alumnos ── */}
        {activeTab === "alumnos" && (
          <>
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:"absolute", left:13, top:"50%",
                transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar alumno..."
                style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:12,
                  padding:"10px 12px 10px 38px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
                  transition:"background .3s, color .3s" }}/>
            </div>
            {loading && <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>}
            {filtered.map(s => {
              const badge = estadoBadge(s.last_report_estado);
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ background:cardBg, borderRadius:14, padding:"12px 14px", marginBottom:8,
                    border:`1.5px solid ${navBord}`, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    transition:"background .3s" }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:txt }}>{s.nombre}</div>
                    <div style={{ fontSize:11, color:sub, marginTop:2 }}>
                      {s.last_report_at
                        ? `Último reporte: ${new Date(s.last_report_at).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"})}`
                        : "Sin reportes aún"}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {badge && (
                      <span style={{ background:badge.bg, color:"white", borderRadius:99,
                        fontSize:9, fontWeight:900, padding:"2px 8px" }}>{badge.label}</span>
                    )}
                    <span style={{ color:sub, fontSize:18 }}>›</span>
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>🐾</div>
                <div style={{ fontSize:13, color:sub }}>
                  {search.trim() ? `Sin resultados para "${search}"` : "Sin alumnos registrados"}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Mensajes ── */}
        {activeTab === "mensajes" && (
          <>
            {loadingMsgs && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
            {!loadingMsgs && messages.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:sub }}>No hay mensajes de padres todavía.</div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ background:cardBg, borderRadius:14,
                padding:"14px 16px", marginBottom:10,
                border:`1.5px solid ${m.estado==="pending" ? primary+"55" : navBord}`,
                transition:"background .3s, border .3s" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>
                      👧 {m.alumno_nombre}
                    </div>
                    <div style={{ fontSize:10, color:sub, marginTop:2 }}>
                      {fmtDateTime(m.created_at)}
                    </div>
                  </div>
                  <span style={{
                    background: m.estado==="pending" ? `${primary}20` : "#10b98120",
                    color: m.estado==="pending" ? primary : "#10b981",
                    borderRadius:99, padding:"3px 10px", fontSize:9, fontWeight:900,
                  }}>
                    {m.estado==="pending" ? "⏳ Pendiente" : "✓ Respondido"}
                  </span>
                </div>

                {/* Diwy-formatted message */}
                <div style={{ background: isDark ? "rgba(255,255,255,.05)" : "#f8f5ff",
                  border:"1px solid #7c3aed22", borderRadius:10,
                  padding:"10px 12px", marginBottom: m.estado==="pending" ? 10 : 0,
                  transition:"background .3s" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#7c3aed", marginBottom:4 }}>
                    🐾 Diwy le dice:
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.55, fontStyle:"italic" }}>
                    "{m.formatted_msg || m.original_msg}"
                  </div>
                </div>

                {/* Reply area (pending only) */}
                {m.estado === "pending" && (
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      value={replies[m.id] || ""}
                      onChange={e => setReplies(p => ({ ...p, [m.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handleReply(m.id)}
                      placeholder="Respondé rápido — Diwy lo organiza para los padres..."
                      style={{ flex:1, border:`1.5px solid ${(replies[m.id]||"").trim() ? primary : inputBd}`,
                        borderRadius:12, padding:"9px 12px", fontSize:13,
                        fontFamily:"Nunito,sans-serif", outline:"none",
                        color:txt, background:inputBg,
                        transition:"border-color .2s, background .3s, color .3s" }}
                    />
                    <button onClick={() => handleReply(m.id)}
                      disabled={sendingReply[m.id] || !(replies[m.id]||"").trim()}
                      style={{
                        background:(!(replies[m.id]||"").trim()||sendingReply[m.id]) ? navBord : primary,
                        border:"none", borderRadius:12, padding:"0 16px", color:"white",
                        fontWeight:900, fontSize:15, cursor:(!(replies[m.id]||"").trim()||sendingReply[m.id])?"not-allowed":"pointer",
                        fontFamily:"Nunito,sans-serif", transition:"background .2s", flexShrink:0,
                      }}>
                      {sendingReply[m.id] ? "·  ·" : "✓"}
                    </button>
                  </div>
                )}

                {/* Formatted reply if answered */}
                {m.estado === "replied" && m.formatted_reply && (
                  <div style={{ background: isDark?"rgba(255,255,255,.05)":"#f0fdf4",
                    border:"1px solid #10b98133", borderRadius:10,
                    padding:"10px 12px", marginTop:8 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#10b981", marginBottom:4 }}>
                      Tu respuesta (via Diwy):
                    </div>
                    <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{m.formatted_reply}</div>
                    <div style={{ fontSize:10, color:sub, marginTop:4 }}>
                      Enviada {fmtDateTime(m.replied_at)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── Tab: Clase de hoy ── */}
        {activeTab === "clase" && (
          <>
            <div style={{ fontSize:13, color:sub, marginBottom:16, lineHeight:1.6 }}>
              Publicá el tema de hoy para que los padres lo vean en Diwy antes de que empiece la clase.
            </div>
            <WCard style={{ marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10 }}>
                🗓️ Tema de hoy
              </div>
              <input
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ej: Fracciones — suma y resta"
                maxLength={120}
                style={{ width:"100%", border:`1.5px solid ${tema.trim() ? primary : inputBd}`,
                  borderRadius:12, padding:"10px 12px", fontSize:13,
                  fontFamily:"Nunito,sans-serif", outline:"none", boxSizing:"border-box",
                  color:txt, background:inputBg, marginBottom:10,
                  transition:"border-color .2s, background .3s, color .3s" }}
              />
              <textarea
                value={detalle}
                onChange={e => setDetalle(e.target.value)}
                placeholder="Detalles opcionales: materiales necesarios, actividades planificadas..."
                rows={3} maxLength={300}
                style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:12,
                  padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  resize:"none", outline:"none", boxSizing:"border-box",
                  color:txt, background:inputBg, marginBottom:10,
                  transition:"background .3s, color .3s, border-color .3s" }}
              />
              <button onClick={handleSavePreview} disabled={savingPrev || !tema.trim()}
                style={{ width:"100%", background:(!tema.trim()||savingPrev) ? navBord : primary,
                  border:"none", borderRadius:50, padding:"12px",
                  color:"white", fontWeight:800, fontSize:14, cursor:(!tema.trim()||savingPrev)?"not-allowed":"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                {savingPrev ? "Publicando..." : "📡 Publicar para padres"}
              </button>
            </WCard>

            {savedPrev && (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98144",
                borderRadius:14, padding:"14px 16px", textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:6 }}>✅</div>
                <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>
                  Publicado. Los padres ya pueden verlo.
                </div>
                <div style={{ fontSize:12, color:sub }}>"{savedPrev.tema}"</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
