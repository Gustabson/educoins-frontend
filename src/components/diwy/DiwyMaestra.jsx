// DiwyMaestra.jsx — Teacher view of Diwy.
// Tabs: Reportes | Mensajes | Clase de hoy
// NOTE: Header/modal components are defined at MODULE scope to avoid
// the React anti-pattern of component-inside-component (constant remount).

import { useState, useEffect, useRef, useCallback } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtSemana = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit" })
  : "";

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
  : "";

const fmtDateShort = iso => iso
  ? new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit" })
  : "";

function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Preset observation templates
const PRESETS = [
  { emoji:"✅", label:"Sin novedades",    text:"Buena semana, sin inconvenientes. Comportamiento y participación dentro de lo esperado." },
  { emoji:"⭐", label:"Excelente semana", text:"Semana excelente. Muy buena participación, actitud positiva y gran desempeño académico." },
  { emoji:"📈", label:"Buen progreso",    text:"Se nota un progreso positivo esta semana. Continúa mejorando en su desempeño general." },
  { emoji:"⚠️", label:"Necesita atención",text:"Esta semana presentó algunas dificultades de atención/comportamiento que requieren seguimiento." },
  { emoji:"📚", label:"Dificultad académica", text:"Muestra dificultades con los contenidos trabajados esta semana. Se recomienda refuerzo en casa." },
  { emoji:"🤝", label:"Mejora conductual", text:"Se observa una mejora notable en su conducta respecto a semanas anteriores. Sigue adelante." },
];

// ── Standalone header components (MODULE scope) ───────────────────────────────

function MainHeader({ primary, activeTab, setActiveTab, pendingCount }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
      position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
    }}>
      <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
        background:"rgba(255,255,255,.07)", top:-60, right:-40, pointerEvents:"none" }}/>
      <div style={{ padding:"16px 20px 0", position:"relative" }}>
        <div style={{ fontWeight:900, fontSize:20, color:"white" }}>🐾 Diwy</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Seguimiento semanal</div>
      </div>
      <div style={{ display:"flex", padding:"10px 14px 0" }}>
        {[
          { id:"reportes",    label:"Reportes",    badge: 0 },
          { id:"mensajes",    label:"Mensajes",    badge: pendingCount },
          { id:"asistencia",  label:"Asistencia",  badge: 0 },
          { id:"clase",       label:"Clase",       badge: 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, background:"none", border:"none",
            borderBottom: `2.5px solid ${activeTab===t.id ? "white" : "rgba(255,255,255,.2)"}`,
            color: activeTab===t.id ? "white" : "rgba(255,255,255,.55)",
            fontWeight:800, fontSize:12, cursor:"pointer",
            fontFamily:"Nunito,sans-serif", padding:"6px 4px 10px",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
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
    </div>
  );
}

function DetailHeader({ primary, onBack, nombre, classroom }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
      position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
      padding: "16px 20px 20px",
    }}>
      <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
        background:"rgba(255,255,255,.07)", top:-60, right:-40, pointerEvents:"none" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
          borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>←</button>
        <div>
          <div style={{ fontWeight:900, fontSize:20, color:"white" }}>{nombre}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>
            🐾 Reporte Diwy{classroom ? ` · ${classroom}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Date Range Modal (MODULE scope) ──────────────────────────────────────────

function DateRangeModal({ open, dateFrom, dateTo, onApply, onClear, onClose, cardBg, primary, txt, sub, inputBg, inputBd, navBord }) {
  const [from, setFrom] = useState(dateFrom);
  const [to,   setTo]   = useState(dateTo);

  useEffect(() => {
    if (open) { setFrom(dateFrom); setTo(dateTo); }
  }, [open, dateFrom, dateTo]);

  if (!open) return null;

  const handleApply = () => { onApply(from, to); onClose(); };
  const handleClear = () => { setFrom(""); setTo(""); onClear(); onClose(); };
  const hasRange = from || to;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:cardBg, borderRadius:20,
        padding:24, width:"100%", maxWidth:320,
        boxShadow:"0 24px 80px rgba(0,0,0,.35)", border:`1px solid ${navBord}` }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontWeight:900, fontSize:16, color:txt }}>📅 Filtrar por fecha</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20,
            color:sub, cursor:"pointer", lineHeight:1, padding:"0 4px" }}>×</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:".06em", marginBottom:6 }}>DESDE</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ width:"100%", border:`1.5px solid ${from ? primary : inputBd}`, borderRadius:12,
              padding:"10px 12px", fontSize:14, fontFamily:"Nunito,sans-serif", outline:"none",
              boxSizing:"border-box", color:txt, background:inputBg, transition:"border-color .2s" }}/>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:".06em", marginBottom:6 }}>HASTA</div>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
            style={{ width:"100%", border:`1.5px solid ${to ? primary : inputBd}`, borderRadius:12,
              padding:"10px 12px", fontSize:14, fontFamily:"Nunito,sans-serif", outline:"none",
              boxSizing:"border-box", color:txt, background:inputBg, transition:"border-color .2s" }}/>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          {hasRange && (
            <button onClick={handleClear} style={{ flex:1, background:`${primary}15`,
              border:`1px solid ${primary}33`, borderRadius:50, padding:"11px", color:primary,
              fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
              Limpiar
            </button>
          )}
          <button onClick={handleApply} style={{ flex:2,
            background:`linear-gradient(135deg, ${primary}, #7c3aed)`,
            border:"none", borderRadius:50, padding:"11px", color:"white",
            fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
            ✓ Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiwyMaestra({ me }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const todayISO = new Date().toISOString().split("T")[0];

  const [activeTab,    setActiveTab]    = useState("reportes");
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadErr,      setLoadErr]      = useState(null);
  const [selected,     setSelected]     = useState(null);
  const [observations, setObservations] = useState([]);
  const [loadingObs,   setLoadingObs]   = useState(false);
  const [obsText,      setObsText]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");
  const [expandedCourses, setExpandedCourses] = useState({});

  // Messages
  const [messages,      setMessages]      = useState([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [replies,       setReplies]       = useState({});
  const [sendingReply,  setSendingReply]  = useState({});
  const [msgFilter,     setMsgFilter]     = useState("todos");
  const [msgSearch,     setMsgSearch]     = useState("");
  const [msgSort,       setMsgSort]       = useState("newest");

  // Message filters — course & date
  const [classrooms,        setClassrooms]        = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [dateFrom,          setDateFrom]          = useState("");
  const [dateTo,            setDateTo]            = useState("");
  const [calendarOpen,      setCalendarOpen]      = useState(false);

  // Asistencia
  const [attClassroom,  setAttClassroom]  = useState(null);
  const [attDate,       setAttDate]       = useState(todayISO);
  const [attStudents,   setAttStudents]   = useState([]); // [{id, nombre, estado}]
  const [loadingAtt,    setLoadingAtt]    = useState(false);
  const [savingAtt,     setSavingAtt]     = useState(false);
  const [attSaved,      setAttSaved]      = useState(false);

  // Clase de hoy
  const [tema,       setTema]       = useState("");
  const [detalle,    setDetalle]    = useState("");
  const [imagen,     setImagen]     = useState(null);
  const [savingPrev, setSavingPrev] = useState(false);
  const [savedPrev,  setSavedPrev]  = useState(null);
  const fileRef = useRef(null);

  // Load students + classrooms on mount
  useEffect(() => {
    api.diwyStudents()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setStudents(list);
        setLoadErr(null);
        // Auto-expand all courses initially
        const courses = {};
        list.forEach(s => { courses[s.classroom_id || "__none__"] = true; });
        setExpandedCourses(courses);
      })
      .catch(e => setLoadErr(e?.message || "Error al cargar alumnos"))
      .finally(() => setLoading(false));

    api.diwyTeacherClassrooms()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setClassrooms(list);
        if (list.length > 0) setAttClassroom(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Load attendance when classroom or date changes (and tab is active)
  useEffect(() => {
    if (!attClassroom) return;
    setLoadingAtt(true);
    setAttSaved(false);
    api.diwyTeacherAttendance({ classroom_id: attClassroom, fecha: attDate })
      .then(d => {
        const rows = Array.isArray(d) ? d : d?.data || [];
        setAttStudents(rows.map(s => ({ id: s.id, nombre: s.nombre, estado: s.estado || null })));
      })
      .catch(() => {})
      .finally(() => setLoadingAtt(false));
  }, [attClassroom, attDate]);

  // Fetch messages with current filters
  const fetchMessages = useCallback(() => {
    return api.diwyTeacherMessages({
      classroom_id: selectedClassroom || undefined,
      date_from:    dateFrom         || undefined,
      date_to:      dateTo           || undefined,
    }).then(d => setMessages(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
  }, [selectedClassroom, dateFrom, dateTo]);

  // Load + poll messages + socket
  useEffect(() => {
    let active = true;
    if (activeTab === "mensajes") {
      setLoadingMsgs(true);
      fetchMessages().finally(() => { if (active) setLoadingMsgs(false); });
    }
    const socket = getSocket();
    const onNew = () => { if (active) fetchMessages(); };
    if (socket) socket.on("diwy_message", onNew);
    const iv = setInterval(() => { if (active) fetchMessages(); }, activeTab === "mensajes" ? 10000 : 60000);
    return () => { active = false; clearInterval(iv); if (socket) socket.off("diwy_message", onNew); };
  }, [activeTab, fetchMessages]);

  // Load observations when student selected
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
      setTimeout(() => setAttSaved(false), 3000);
    } catch(e) {}
    finally { setSavingAtt(false); }
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setImagen(await resizeImageToBase64(file)); }
    catch { setImagen(null); }
    e.target.value = "";
  };

  const handleSavePreview = async () => {
    if (!tema.trim()) return;
    setSavingPrev(true);
    try {
      const d = await api.diwyTeacherPreview({
        tema: tema.trim(), detalle: detalle.trim() || undefined, imagen: imagen || undefined,
      });
      setSavedPrev(d);
    } catch(e) {}
    finally { setSavingPrev(false); }
  };

  // Group students by classroom for Reportes tab
  const searchedStudents = search.trim()
    ? students.filter(s => (s.nombre || "").toLowerCase().includes(search.toLowerCase()))
    : students;

  const courseGroups = searchedStudents.reduce((acc, s) => {
    const key   = s.classroom_id   || "__none__";
    const label = s.classroom_nombre || "Sin curso asignado";
    if (!acc[key]) acc[key] = { label, students: [] };
    acc[key].students.push(s);
    return acc;
  }, {});

  const pendingCount = messages.filter(m => m.estado === "pending").length;

  // Filtered + sorted messages
  const filteredMessages = messages
    .filter(m => {
      if (msgFilter === "pending")  return m.estado === "pending";
      if (msgFilter === "replied")  return m.estado === "replied";
      return true;
    })
    .filter(m => !msgSearch.trim() || (m.alumno_nombre || "").toLowerCase().includes(msgSearch.toLowerCase()))
    .sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return msgSort === "newest" ? db - da : da - db;
    });

  const dateLabel = (() => {
    if (dateFrom && dateTo) return `${fmtDateShort(dateFrom)} → ${fmtDateShort(dateTo)}`;
    if (dateFrom)           return `Desde ${fmtDateShort(dateFrom)}`;
    if (dateTo)             return `Hasta ${fmtDateShort(dateTo)}`;
    return "Todas las fechas";
  })();
  const hasDateFilter = !!(dateFrom || dateTo);

  // ── Detail view (report for a student) ──
  if (selected) {
    return (
      <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
        <DetailHeader
          primary={primary}
          onBack={() => { setSelected(null); setObsText(""); setObservations([]); }}
          nombre={selected.nombre}
          classroom={selected.classroom_nombre}
        />
        <div style={{ padding:"16px 14px 32px" }}>

          {/* ── Presets ── */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:".06em", marginBottom:8 }}>
              PLANTILLAS RÁPIDAS
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setObsText(p.text)}
                  style={{ background: obsText === p.text ? primary : `${primary}12`,
                    border:`1px solid ${obsText === p.text ? primary : primary+"30"}`,
                    borderRadius:99, padding:"5px 11px", fontSize:11, fontWeight:800,
                    color: obsText === p.text ? "white" : primary,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .18s",
                    display:"flex", alignItems:"center", gap:4 }}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Observation form ── */}
          <WCard style={{ marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8 }}>
              Observación — semana actual
            </div>
            <textarea
              value={obsText}
              onChange={e => setObsText(e.target.value)}
              placeholder={`¿Cómo fue la semana de ${selected.nombre}? Podés usar una plantilla de arriba o escribir algo personalizado...`}
              rows={4} maxLength={500}
              style={{ width:"100%", border:`1.5px solid ${obsText.trim() ? primary : inputBd}`,
                borderRadius:12, padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:txt, background:inputBg, transition:"border-color .2s, background .3s, color .3s" }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <span style={{ fontSize:11, color:sub }}>{obsText.length}/500</span>
              <button onClick={handleAdd} disabled={saving || !obsText.trim()}
                style={{ background:(!obsText.trim()||saving) ? navBord : primary,
                  border:"none", borderRadius:50, padding:"8px 22px",
                  color:"white", fontWeight:800, fontSize:12, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                {saving ? "Guardando..." : "✓ Guardar"}
              </button>
            </div>
          </WCard>

          {/* ── History ── */}
          <div style={{ fontWeight:800, fontSize:11, color:sub, marginBottom:8, paddingLeft:4, letterSpacing:".06em" }}>
            HISTORIAL
          </div>
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
              <div key={o.id} style={{ background:cardBg, borderRadius:14, padding:"12px 14px",
                marginBottom:8, border:`1.5px solid ${isOwn ? primary+"44" : navBord}`,
                transition:"background .3s, border .3s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:primary }}>Sem. {fmtSemana(o.semana)}</span>
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

  // ── Main view ──
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <MainHeader
        primary={primary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      <DateRangeModal
        open={calendarOpen}
        dateFrom={dateFrom} dateTo={dateTo}
        onApply={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onClear={() => { setDateFrom(""); setDateTo(""); }}
        onClose={() => setCalendarOpen(false)}
        cardBg={cardBg} primary={primary} txt={txt} sub={sub}
        inputBg={inputBg} inputBd={inputBd} navBord={navBord}
      />

      <div style={{ padding:"16px 14px 32px" }}>

        {/* ── Reportes ── */}
        {activeTab === "reportes" && (
          <div>
            {/* Search */}
            <div style={{ position:"relative", marginBottom:16 }}>
              <span style={{ position:"absolute", left:13, top:"50%",
                transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar alumno..."
                style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:12,
                  padding:"10px 12px 10px 38px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
                  transition:"background .3s, color .3s" }}
              />
            </div>

            {loading && <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>}

            {!loading && loadErr && (
              <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5",
                borderRadius:12, padding:"14px 16px", marginBottom:12,
                color:"#dc2626", fontSize:12, fontWeight:700 }}>
                ⚠️ {loadErr}
              </div>
            )}

            {/* Grouped by course */}
            {!loading && !loadErr && Object.entries(courseGroups).map(([key, group]) => {
              const isExpanded = expandedCourses[key] !== false;
              return (
                <div key={key} style={{ marginBottom:16 }}>
                  {/* Course header */}
                  <button
                    onClick={() => setExpandedCourses(p => ({ ...p, [key]: !isExpanded }))}
                    style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"6px 4px 8px", fontFamily:"Nunito,sans-serif" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:900, color:primary,
                        textTransform:"uppercase", letterSpacing:".07em" }}>
                        🏫 {group.label}
                      </span>
                      <span style={{ fontSize:10, background:`${primary}18`, color:primary,
                        borderRadius:99, padding:"1px 8px", fontWeight:800 }}>
                        {group.students.length}
                      </span>
                    </div>
                    <span style={{ fontSize:14, color:sub, transition:"transform .2s",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                  </button>

                  {isExpanded && group.students.map(s => {
                    const weekAgo = s.last_report_at
                      ? (Date.now() - new Date(s.last_report_at)) < 7 * 24 * 3600 * 1000
                      : false;
                    return (
                      <div key={s.id} onClick={() => setSelected(s)}
                        style={{ background:cardBg, borderRadius:14, padding:"12px 14px",
                          marginBottom:6, border:`1.5px solid ${weekAgo ? "#10b98133" : navBord}`,
                          cursor:"pointer", display:"flex", alignItems:"center",
                          justifyContent:"space-between", transition:"background .3s" }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14, color:txt }}>{s.nombre}</div>
                          <div style={{ fontSize:11, color: weekAgo ? "#10b981" : sub, marginTop:2 }}>
                            {s.last_report_at
                              ? `${weekAgo ? "✓ " : ""}Último reporte: ${new Date(s.last_report_at).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"})}`
                              : "Sin reportes aún"}
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {!s.last_report_at && (
                            <span style={{ background:"#f59e0b20", color:"#f59e0b",
                              borderRadius:99, fontSize:9, fontWeight:900, padding:"2px 8px" }}>
                              Pendiente
                            </span>
                          )}
                          <span style={{ color:sub, fontSize:18 }}>›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {!loading && !loadErr && Object.keys(courseGroups).length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>🐾</div>
                <div style={{ fontSize:13, color:sub }}>
                  {search.trim() ? `Sin resultados para "${search}"` : "Sin alumnos registrados"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Mensajes ── */}
        {activeTab === "mensajes" && (
          <div>
            <div style={{ marginBottom:12 }}>
              {/* Status chips */}
              <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                {[
                  { id:"todos",   label:"Todos",       count: messages.length },
                  { id:"pending", label:"Pendientes",  count: messages.filter(m=>m.estado==="pending").length },
                  { id:"replied", label:"Respondidos", count: messages.filter(m=>m.estado==="replied").length },
                ].map(f => (
                  <button key={f.id} onClick={() => setMsgFilter(f.id)} style={{
                    background: msgFilter===f.id ? primary : `${primary}15`,
                    border: `1px solid ${msgFilter===f.id ? primary : primary+"33"}`,
                    borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:800,
                    color: msgFilter===f.id ? "white" : primary, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    {f.label}
                    {f.count > 0 && (
                      <span style={{ background: msgFilter===f.id ? "rgba(255,255,255,.3)" : `${primary}30`,
                        borderRadius:99, fontSize:9, padding:"1px 5px" }}>{f.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Course chips — only if teacher has >1 classroom */}
              {classrooms.length > 1 && (
                <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                  <button onClick={() => setSelectedClassroom(null)} style={{
                    background: !selectedClassroom ? "#7c3aed" : "rgba(124,58,237,.12)",
                    border: `1px solid ${!selectedClassroom ? "#7c3aed" : "rgba(124,58,237,.3)"}`,
                    borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:800,
                    color: !selectedClassroom ? "white" : "#7c3aed", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .2s" }}>
                    🏫 Todos los cursos
                  </button>
                  {classrooms.map(c => (
                    <button key={c.id}
                      onClick={() => setSelectedClassroom(selectedClassroom === c.id ? null : c.id)}
                      style={{
                        background: selectedClassroom===c.id ? "#7c3aed" : "rgba(124,58,237,.12)",
                        border: `1px solid ${selectedClassroom===c.id ? "#7c3aed" : "rgba(124,58,237,.3)"}`,
                        borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:800,
                        color: selectedClassroom===c.id ? "white" : "#7c3aed", cursor:"pointer",
                        fontFamily:"Nunito,sans-serif", transition:"all .2s" }}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}

              {/* Date + search + sort */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setCalendarOpen(true)} style={{
                  background: hasDateFilter ? primary : cardBg,
                  border: `1.5px solid ${hasDateFilter ? primary : navBord}`,
                  borderRadius:10, padding:"7px 10px", fontSize:11, fontWeight:800,
                  color: hasDateFilter ? "white" : sub, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap", flexShrink:0,
                  transition:"all .2s", display:"flex", alignItems:"center", gap:5 }}>
                  📅 {dateLabel}
                  {hasDateFilter && (
                    <span onClick={e => { e.stopPropagation(); setDateFrom(""); setDateTo(""); }}
                      style={{ background:"rgba(255,255,255,.3)", borderRadius:99,
                        padding:"0 5px", fontSize:12, lineHeight:"16px", cursor:"pointer", fontWeight:900 }}>×</span>
                  )}
                </button>
                <div style={{ flex:1, position:"relative" }}>
                  <span style={{ position:"absolute", left:10, top:"50%",
                    transform:"translateY(-50%)", fontSize:13, pointerEvents:"none" }}>🔍</span>
                  <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)}
                    placeholder="Buscar alumno..."
                    style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:10,
                      padding:"7px 10px 7px 30px", fontSize:12, fontFamily:"Nunito,sans-serif",
                      outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
                      transition:"background .3s, color .3s" }}/>
                </div>
                <button onClick={() => setMsgSort(p => p==="newest" ? "oldest" : "newest")}
                  style={{ background:cardBg, border:`1.5px solid ${navBord}`, borderRadius:10,
                    padding:"0 10px", fontSize:11, fontWeight:800, color:sub, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap", flexShrink:0,
                    transition:"background .3s, color .3s" }}>
                  {msgSort === "newest" ? "↓ Reciente" : "↑ Antiguo"}
                </button>
              </div>
            </div>

            {loadingMsgs && <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>}
            {!loadingMsgs && filteredMessages.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:sub }}>
                  {msgSearch || msgFilter !== "todos" || hasDateFilter || selectedClassroom
                    ? "Sin resultados para los filtros aplicados"
                    : "No hay mensajes de padres todavía."}
                </div>
              </div>
            )}

            {filteredMessages.map(m => (
              <div key={m.id} style={{ background:cardBg, borderRadius:14, padding:"14px 16px",
                marginBottom:10, border:`1.5px solid ${m.estado==="pending" ? primary+"55" : navBord}`,
                transition:"background .3s, border .3s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>👧 {m.alumno_nombre}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                      <span style={{ fontSize:10, color:sub }}>{fmtDateTime(m.created_at)}</span>
                      {m.classroom_nombre && (
                        <span style={{ fontSize:9, background:`${primary}18`, color:primary,
                          borderRadius:99, padding:"1px 7px", fontWeight:800 }}>
                          {m.classroom_nombre}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    background: m.estado==="pending" ? `${primary}20` : "#10b98120",
                    color: m.estado==="pending" ? primary : "#10b981",
                    borderRadius:99, padding:"3px 10px", fontSize:9, fontWeight:900, flexShrink:0,
                  }}>
                    {m.estado==="pending" ? "⏳ Pendiente" : "✓ Respondido"}
                  </span>
                </div>

                <div style={{ background: isDark?"rgba(255,255,255,.05)":"#f8f5ff",
                  border:"1px solid #7c3aed22", borderRadius:10, padding:"10px 12px",
                  marginBottom: m.estado==="pending" ? 10 : 0 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#7c3aed", marginBottom:4 }}>🐾 Diwy le dice:</div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.55, fontStyle:"italic" }}>
                    "{m.formatted_msg || m.original_msg}"
                  </div>
                </div>

                {m.estado === "pending" && (
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      value={replies[m.id] || ""}
                      onChange={e => setReplies(p => ({ ...p, [m.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handleReply(m.id)}
                      placeholder="Respondé rápido — Diwy lo organiza para los padres..."
                      style={{ flex:1, border:`1.5px solid ${(replies[m.id]||"").trim() ? primary : inputBd}`,
                        borderRadius:12, padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                        outline:"none", color:txt, background:inputBg,
                        transition:"border-color .2s, background .3s, color .3s" }}
                    />
                    <button onClick={() => handleReply(m.id)}
                      disabled={sendingReply[m.id] || !(replies[m.id]||"").trim()}
                      style={{ background:(!(replies[m.id]||"").trim()||sendingReply[m.id]) ? navBord : primary,
                        border:"none", borderRadius:12, padding:"0 16px", color:"white",
                        fontWeight:900, fontSize:15, cursor:"pointer", flexShrink:0,
                        fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                      {sendingReply[m.id] ? "·  ·" : "✓"}
                    </button>
                  </div>
                )}

                {m.estado === "replied" && m.formatted_reply && (
                  <div style={{ background: isDark?"rgba(255,255,255,.05)":"#f0fdf4",
                    border:"1px solid #10b98133", borderRadius:10, padding:"10px 12px", marginTop:8 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#10b981", marginBottom:4 }}>
                      Tu respuesta (via Diwy):
                    </div>
                    <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{m.formatted_reply}</div>
                    <div style={{ fontSize:10, color:sub, marginTop:4 }}>Enviada {fmtDateTime(m.replied_at)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Asistencia ── */}
        {activeTab === "asistencia" && (
          <div>
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

            {/* Date picker */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <input type="date" value={attDate} max={todayISO}
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
                ✅ Todos presentes
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
                border:`1.5px solid ${s.estado === "presente" ? "#10b98133"
                  : s.estado === "ausente" ? "#ef444433"
                  : s.estado === "tarde"   ? "#f59e0b33"
                  : navBord}`,
                transition:"background .3s, border .3s",
              }}>
                <div style={{ flex:1, fontWeight:700, fontSize:13, color:txt }}>{s.nombre}</div>
                {[
                  { val:"presente", icon:"✅", label:"P", activeColor:"#10b981" },
                  { val:"tarde",    icon:"⏰", label:"T", activeColor:"#f59e0b" },
                  { val:"ausente",  icon:"❌", label:"A", activeColor:"#ef4444" },
                ].map(opt => (
                  <button key={opt.val}
                    onClick={() => setAttStudents(p => p.map((x,j) => j===i ? { ...x, estado: x.estado===opt.val ? null : opt.val } : x))}
                    style={{
                      background: s.estado===opt.val ? opt.activeColor+"20" : (isDark?"rgba(255,255,255,.06)":"#f5f5f5"),
                      border:`1.5px solid ${s.estado===opt.val ? opt.activeColor : "transparent"}`,
                      borderRadius:10, padding:"6px 10px", fontSize:12, fontWeight:800,
                      color: s.estado===opt.val ? opt.activeColor : sub,
                      cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .15s",
                      display:"flex", alignItems:"center", gap:3,
                    }}>
                    <span style={{ fontSize:14 }}>{opt.icon}</span>
                    <span style={{ fontSize:10 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ))}

            {/* Save button */}
            {!loadingAtt && attStudents.length > 0 && (
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
                        : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                      border:"none", borderRadius:50, padding:"13px", color:"white",
                      fontWeight:800, fontSize:14, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    }}>
                    {savingAtt ? "Guardando..." : `💾 Guardar asistencia — ${attStudents.filter(s=>s.estado).length}/${attStudents.length} marcados`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Clase de hoy ── */}
        {activeTab === "clase" && (
          <div>
            <div style={{ fontSize:13, color:sub, marginBottom:16, lineHeight:1.6 }}>
              Publicá el tema de hoy para que los padres lo vean en Diwy antes de que empiece la clase.
            </div>
            <WCard style={{ marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10 }}>🗓️ Tema de hoy</div>
              <input value={tema} onChange={e => setTema(e.target.value)}
                placeholder="Ej: Fracciones — suma y resta" maxLength={120}
                style={{ width:"100%", border:`1.5px solid ${tema.trim() ? primary : inputBd}`,
                  borderRadius:12, padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  outline:"none", boxSizing:"border-box", color:txt, background:inputBg, marginBottom:10,
                  transition:"border-color .2s, background .3s, color .3s" }}/>
              <textarea value={detalle} onChange={e => setDetalle(e.target.value)}
                placeholder="Detalles opcionales: materiales necesarios, actividades planificadas..."
                rows={3} maxLength={300}
                style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:12,
                  padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  resize:"none", outline:"none", boxSizing:"border-box",
                  color:txt, background:inputBg, marginBottom:10,
                  transition:"background .3s, color .3s" }}/>

              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={handleImagePick}/>
              {imagen ? (
                <div style={{ marginBottom:10, position:"relative" }}>
                  <img src={imagen} alt="preview" style={{ width:"100%", borderRadius:12,
                    maxHeight:200, objectFit:"cover", display:"block" }}/>
                  <button onClick={() => setImagen(null)}
                    style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,.55)",
                      border:"none", borderRadius:50, color:"white", width:28, height:28,
                      cursor:"pointer", fontSize:14, display:"flex", alignItems:"center",
                      justifyContent:"center" }}>×</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{ width:"100%", background: isDark?"rgba(255,255,255,.06)":"#f5f5f5",
                    border:`1.5px dashed ${navBord}`, borderRadius:12, padding:"12px",
                    color:sub, fontWeight:700, fontSize:13, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", marginBottom:10,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    transition:"background .3s, color .3s" }}>
                  📷 Agregar foto o imagen
                </button>
              )}

              <button onClick={handleSavePreview} disabled={savingPrev || !tema.trim()}
                style={{ width:"100%",
                  background: (!tema.trim()||savingPrev) ? navBord : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                  border:"none", borderRadius:50, padding:"12px", color:"white",
                  fontWeight:800, fontSize:14, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"all .2s" }}>
                {savingPrev ? "Publicando..." : "📡 Publicar para padres"}
              </button>
            </WCard>

            {savedPrev && (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98144",
                borderRadius:14, padding:"16px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>✅</div>
                <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4 }}>
                  Publicado. Los padres ya pueden verlo.
                </div>
                <div style={{ fontSize:12, color:sub }}>"{savedPrev.tema}"</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
