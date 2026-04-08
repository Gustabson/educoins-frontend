// DiwyMaestra.jsx — Teacher view of Diwy.
// Tabs: Alumnos | Mensajes | Clase de hoy
// NOTE: Header components are defined at MODULE scope (not inside DiwyMaestra)
// to avoid the React anti-pattern of component-inside-component which caused
// the student list to not render (Header redefined on every render → unmount/remount loop).

import { useState, useEffect, useRef } from "react";
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

function estadoBadge(estado) {
  if (estado === "aprobado")           return { label:"Publicado",   bg:"#10b981" };
  if (estado === "pendiente_revision") return { label:"En revisión", bg:"#f59e0b" };
  if (estado === "draft")              return { label:"Borrador",    bg:"#6b7280" };
  return null;
}

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

// ── Standalone header components (MODULE scope — stable references) ──────────

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
          { id:"alumnos",  label:"Alumnos",      badge: 0 },
          { id:"mensajes", label:"Mensajes",      badge: pendingCount },
          { id:"clase",    label:"Clase de hoy",  badge: 0 },
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

function DetailHeader({ primary, onBack, nombre }) {
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
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>🐾 Observaciones Diwy</div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiwyMaestra({ me }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const [activeTab,    setActiveTab]    = useState("alumnos");
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [observations, setObservations] = useState([]);
  const [loadingObs,   setLoadingObs]   = useState(false);
  const [obsText,      setObsText]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");

  // Messages
  const [messages,      setMessages]      = useState([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [replies,       setReplies]       = useState({});
  const [sendingReply,  setSendingReply]  = useState({});
  const [msgFilter,     setMsgFilter]     = useState("todos");   // todos | pending | replied
  const [msgSearch,     setMsgSearch]     = useState("");
  const [msgSort,       setMsgSort]       = useState("newest"); // newest | oldest

  // Clase de hoy
  const [tema,       setTema]       = useState("");
  const [detalle,    setDetalle]    = useState("");
  const [imagen,     setImagen]     = useState(null);
  const [savingPrev, setSavingPrev] = useState(false);
  const [savedPrev,  setSavedPrev]  = useState(null);
  const fileRef = useRef(null);

  // Load students
  useEffect(() => {
    api.diwyStudents()
      .then(d => setStudents(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load + poll messages + socket
  useEffect(() => {
    let active = true;
    const load = () => api.diwyTeacherMessages()
      .then(d => { if (active) setMessages(Array.isArray(d) ? d : []); })
      .catch(() => {});

    if (activeTab === "mensajes") {
      setLoadingMsgs(true);
      load().finally(() => { if (active) setLoadingMsgs(false); });
    }

    const socket = getSocket();
    const onNew = () => load();
    if (socket) socket.on("diwy_message", onNew);

    const iv = setInterval(load, activeTab === "mensajes" ? 10000 : 60000);
    return () => {
      active = false;
      clearInterval(iv);
      if (socket) socket.off("diwy_message", onNew);
    };
  }, [activeTab]);

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
        tema: tema.trim(),
        detalle: detalle.trim() || undefined,
        imagen: imagen || undefined,
      });
      setSavedPrev(d);
    } catch(e) {}
    finally { setSavingPrev(false); }
  };

  const filteredStudents = search.trim()
    ? students.filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
    : students;

  const pendingCount = messages.filter(m => m.estado === "pending").length;

  // Filtered + sorted messages
  const filteredMessages = messages
    .filter(m => {
      if (msgFilter === "pending")  return m.estado === "pending";
      if (msgFilter === "replied")  return m.estado === "replied";
      return true;
    })
    .filter(m => !msgSearch.trim() || m.alumno_nombre?.toLowerCase().includes(msgSearch.toLowerCase()))
    .sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return msgSort === "newest" ? db - da : da - db;
    });

  // ── Detail view ──
  if (selected) {
    return (
      <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
        <DetailHeader
          primary={primary}
          onBack={() => { setSelected(null); setObsText(""); setObservations([]); }}
          nombre={selected.nombre}
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
                color:txt, background:inputBg, transition:"background .3s, color .3s" }}
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

      <div style={{ padding:"16px 14px 32px" }}>

        {/* ── Alumnos ── */}
        {activeTab === "alumnos" && (
          <div>
            <div style={{ position:"relative", marginBottom:12 }}>
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

            {loading && (
              <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>
            )}

            {!loading && filteredStudents.map(s => {
              const badge = estadoBadge(s.last_report_estado);
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ background:cardBg, borderRadius:14, padding:"12px 14px",
                    marginBottom:8, border:`1.5px solid ${navBord}`, cursor:"pointer",
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

            {!loading && filteredStudents.length === 0 && (
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
            {/* Filters */}
            <div style={{ marginBottom:12 }}>
              {/* Status chips */}
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
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
              {/* Search + sort row */}
              <div style={{ display:"flex", gap:8 }}>
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
                    padding:"0 12px", fontSize:11, fontWeight:800, color:sub, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap",
                    transition:"background .3s, color .3s" }}>
                  {msgSort === "newest" ? "Más reciente ↓" : "Más antiguo ↑"}
                </button>
              </div>
            </div>

            {loadingMsgs && (
              <div style={{ textAlign:"center", color:sub, padding:32 }}>Cargando...</div>
            )}
            {!loadingMsgs && filteredMessages.length === 0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:44, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:sub }}>
                  {msgSearch || msgFilter !== "todos" ? "Sin resultados para los filtros aplicados" : "No hay mensajes de padres todavía."}
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
                    <div style={{ fontSize:10, color:sub, marginTop:2 }}>{fmtDateTime(m.created_at)}</div>
                  </div>
                  <span style={{
                    background: m.estado==="pending" ? `${primary}20` : "#10b98120",
                    color: m.estado==="pending" ? primary : "#10b981",
                    borderRadius:99, padding:"3px 10px", fontSize:9, fontWeight:900,
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
      </div>
    </div>
  );
}
