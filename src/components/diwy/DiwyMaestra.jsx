// DiwyMaestra.jsx — Teacher Diwy view: Mensajes de padres + Clase de hoy.
// Asistencias and Reportes are now standalone sections in Maestra.jsx.
// NOTE: Header/modal components are defined at MODULE scope to avoid
// the React anti-pattern of component-inside-component (constant remount).

import { useState, useEffect, useRef, useCallback } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

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

// ── Standalone header components (MODULE scope) ───────────────────────────────

function MainHeader({ primary, activeTab, setActiveTab, pendingCount, parentUnread }) {
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
          { id:"mensajes", label:"Mensajes",       badge: pendingCount },
          { id:"clase",    label:"Clase",          badge: 0 },
          { id:"padres",   label:"Padres",         badge: parentUnread || 0 },
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

  const [activeTab,    setActiveTab]    = useState("mensajes");

  const [parentThreads,     setParentThreads]     = useState([]);
  const [parentUnread,      setParentUnread]       = useState(0);
  const [selParentThread,   setSelParentThread]    = useState(null); // { parentId, studentId, parentNombre, studentNombre }
  const [parentThread,      setParentThread]       = useState([]);
  const [loadingPThread,    setLoadingPThread]     = useState(false);
  const [teacherReply,        setTeacherReply]        = useState("");
  const [sendingTeacherReply, setSendingTeacherReply] = useState(false);

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

  // Clase de hoy
  const [tema,       setTema]       = useState("");
  const [detalle,    setDetalle]    = useState("");
  const [imagen,     setImagen]     = useState(null);
  const [savingPrev, setSavingPrev] = useState(false);
  const [savedPrev,  setSavedPrev]  = useState(null);
  const fileRef = useRef(null);

  // Load classrooms on mount (for message filter)
  useEffect(() => {
    api.diwyTeacherClassrooms()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setClassrooms(list);
      })
      .catch(() => {});
  }, []);

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

    const loadParentInbox = () =>
      api.diwyTeacherParentInbox()
        .then(d => {
          if (!active) return;
          const threads = Array.isArray(d) ? d : [];
          setParentThreads(threads);
          setParentUnread(threads.reduce((sum, t) => sum + (t.unread||0), 0));
        })
        .catch(() => {});
    loadParentInbox();
    const parentInboxIv = setInterval(loadParentInbox, 15000);

    const socket = getSocket();
    const onNew = () => { if (active) fetchMessages(); };
    const onParentMsg = () => loadParentInbox();
    if (socket) {
      socket.on("diwy_message",        onNew);
      socket.on("parent_direct_message", onParentMsg);
    }
    const iv = setInterval(() => { if (active) fetchMessages(); }, activeTab === "mensajes" ? 10000 : 60000);
    return () => {
      active = false;
      clearInterval(iv);
      clearInterval(parentInboxIv);
      if (socket) {
        socket.off("diwy_message",          onNew);
        socket.off("parent_direct_message", onParentMsg);
      }
    };
  }, [activeTab, fetchMessages]);

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

  const handleSelectParentThread = async (thread) => {
    setSelParentThread(thread);
    setLoadingPThread(true);
    try {
      const d = await api.diwyTeacherParentThread({ parentId: thread.parent_id, studentId: thread.student_id });
      setParentThread(Array.isArray(d) ? d : []);
      // Update unread count
      setParentThreads(prev => prev.map(t =>
        t.parent_id === thread.parent_id && t.student_id === thread.student_id
          ? { ...t, unread: 0 } : t
      ));
      setParentUnread(prev => Math.max(0, prev - (thread.unread||0)));
    } catch(e) {
      setParentThread([]);
    } finally { setLoadingPThread(false); }
  };

  const handleTeacherReply = async () => {
    if (!teacherReply.trim() || !selParentThread || sendingTeacherReply) return;
    setSendingTeacherReply(true);
    try {
      const d = await api.diwyTeacherParentReply({
        parentId: selParentThread.parent_id,
        studentId: selParentThread.student_id,
        content: teacherReply.trim(),
      });
      setParentThread(prev => [...prev, { ...d, sender_role:'teacher' }]);
      setTeacherReply("");
    } catch(e) {
      // handle error
    } finally { setSendingTeacherReply(false); }
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

  // ── Main view ──
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <MainHeader
        primary={primary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        parentUnread={parentUnread}
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

        {/* ── Padres tab ── */}
        {activeTab === "padres" && (
          <div style={{ padding:"0 0 48px" }}>
            {!selParentThread ? (
              // Inbox list
              <>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:12, paddingLeft:4 }}>
                  MENSAJES DE PADRES
                </div>
                {parentThreads.length === 0 ? (
                  <WCard style={{ textAlign:"center", padding:32 }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>✉️</div>
                    <div style={{ fontSize:13, color:sub }}>Ningún padre te escribió todavía.</div>
                  </WCard>
                ) : parentThreads.map((t, i) => (
                  <div key={i} onClick={() => handleSelectParentThread(t)} style={{
                    background:cardBg, border:`1.5px solid ${t.unread>0 ? primary+"66" : navBord}`,
                    borderLeft:`3px solid ${t.unread>0 ? primary : navBord}`,
                    borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:"pointer",
                    transition:"all .2s",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:4 }}>
                      <div>
                        <span style={{ fontWeight:800, fontSize:13, color:txt }}>
                          {t.parent_nombre}
                        </span>
                        <span style={{ fontSize:11, color:sub, marginLeft:6 }}>
                          sobre {t.student_nombre}
                        </span>
                      </div>
                      {t.unread > 0 && (
                        <span style={{ background:primary, color:"white",
                          borderRadius:99, fontSize:9, fontWeight:900,
                          padding:"2px 7px", flexShrink:0 }}>
                          {t.unread} nuevo{t.unread>1?"s":""}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:sub, lineHeight:1.4,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {t.last_sender === "teacher" ? "Vos: " : ""}{t.last_content}
                    </div>
                    <div style={{ fontSize:10, color:sub, marginTop:3, opacity:.7 }}>
                      {new Date(t.last_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Thread view
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <button onClick={() => { setSelParentThread(null); setParentThread([]); }}
                    style={{ background:`${primary}15`, border:`1px solid ${primary}33`,
                      borderRadius:99, padding:"5px 12px", fontSize:12, fontWeight:800,
                      color:primary, cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                    ← Volver
                  </button>
                  <div>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>
                      {selParentThread.parent_nombre}
                    </div>
                    <div style={{ fontSize:11, color:sub }}>
                      sobre {selParentThread.student_nombre}
                    </div>
                  </div>
                </div>

                {loadingPThread ? (
                  <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14,
                    maxHeight:400, overflowY:"auto" }}>
                    {parentThread.map((m, i) => {
                      const isTeacher = m.sender_role === "teacher";
                      return (
                        <div key={m.id||i} style={{
                          alignSelf: isTeacher ? "flex-end" : "flex-start",
                          maxWidth:"80%",
                          background: isTeacher
                            ? (isDark?`${primary}30`:`${primary}18`)
                            : (isDark?"rgba(255,255,255,.08)":"#f1f5f9"),
                          border:`1px solid ${isTeacher ? primary+"44" : navBord}`,
                          borderRadius:12, padding:"8px 12px",
                        }}>
                          <div style={{ fontSize:10, color:sub, marginBottom:3, fontWeight:700 }}>
                            {isTeacher ? "Vos" : m.sender_nombre}
                            {" · "}
                            {new Date(m.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                          </div>
                          <div style={{ fontSize:13, color:txt, lineHeight:1.5 }}>{m.content}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display:"flex", gap:8 }}>
                  <input value={teacherReply} onChange={e => setTeacherReply(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && !e.shiftKey && handleTeacherReply()}
                    placeholder="Respondé al mensaje..."
                    style={{ flex:1, border:`1.5px solid ${teacherReply.trim()?primary:inputBd}`,
                      borderRadius:12, padding:"10px 12px", fontSize:13,
                      fontFamily:"Nunito,sans-serif", outline:"none",
                      color:txt, background:inputBg,
                      transition:"border-color .2s, background .3s, color .3s" }}/>
                  <button onClick={handleTeacherReply}
                    disabled={sendingTeacherReply||!teacherReply.trim()} style={{
                      background:(!teacherReply.trim()||sendingTeacherReply)?navBord:`linear-gradient(135deg,${primary},#7c3aed)`,
                      border:"none", borderRadius:12, padding:"0 18px", color:"white",
                      fontWeight:900, fontSize:16,
                      cursor:(!teacherReply.trim()||sendingTeacherReply)?"not-allowed":"pointer",
                      fontFamily:"Nunito,sans-serif", flexShrink:0,
                    }}>{sendingTeacherReply?"·  ·  ·":"→"}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
