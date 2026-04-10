// PContacto.jsx — Parent contact hub
// Two sections: Guías (teachers of child's classrooms) and Administración (institution)
// Uses formal direct-message system, NOT Diwy AI-mediated urgent messages.

import { useState, useEffect } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtDT = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
  : "";

// ─── Thread view (shared between Guías and Admin) ────────────────────────────
function ThreadView({ thread, loading, myMsg, setMyMsg, onSend, sending, rateErr,
  accentColor, txt, sub, navBord, inputBg, inputBd, isDark, pageBg }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {/* Formal tone note */}
      <div style={{
        background: isDark ? "rgba(14,165,233,.1)" : "#f0f9ff",
        border:`1px solid ${accentColor}33`, borderRadius:9,
        padding:"8px 12px", marginBottom:12,
        fontSize:11, color: isDark ? "#7dd3fc" : "#0369a1", lineHeight:1.6,
      }}>
        📋 Canal de comunicación <strong>formal</strong>.
        Solo temas educativos importantes — los mensajes quedan registrados.
      </div>

      {/* Messages */}
      <div style={{ maxHeight:320, overflowY:"auto", marginBottom:12,
        display:"flex", flexDirection:"column", gap:7 }}>
        {loading ? (
          <div style={{ textAlign:"center", color:sub, padding:"20px 0", fontSize:13 }}>
            Cargando conversación...
          </div>
        ) : thread.length === 0 ? (
          <div style={{ textAlign:"center", color:sub, padding:"24px 0", fontSize:13 }}>
            Aún no hay mensajes. Empezá la conversación.
          </div>
        ) : thread.map((m, i) => {
          const isMe = m.sender_role === "parent";
          return (
            <div key={m.id||i} style={{
              alignSelf: isMe ? "flex-end" : "flex-start",
              maxWidth:"82%",
              background: isMe
                ? (isDark ? `${accentColor}30` : `${accentColor}18`)
                : (isDark ? "rgba(255,255,255,.08)" : "#f1f5f9"),
              border:`1px solid ${isMe ? accentColor+"44" : navBord}`,
              borderRadius:12, padding:"8px 12px",
            }}>
              <div style={{ fontSize:10, color:sub, marginBottom:3, fontWeight:700 }}>
                {isMe ? "Vos" : m.sender_nombre} · {fmtDT(m.created_at)}
              </div>
              <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{m.content}</div>
            </div>
          );
        })}
      </div>

      {rateErr && (
        <div style={{ background:"#fef3c7", borderRadius:9, padding:"7px 12px",
          fontSize:11, color:"#92400e", marginBottom:8 }}>
          ⏳ {rateErr}
        </div>
      )}

      {/* Compose */}
      <div style={{ display:"flex", gap:8 }}>
        <input value={myMsg} onChange={e => setMyMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
          placeholder="Escribí tu mensaje (formal, temas importantes)..."
          style={{ flex:1, border:`1.5px solid ${myMsg.trim() ? accentColor : inputBd}`,
            borderRadius:12, padding:"10px 12px", fontSize:13,
            fontFamily:"Nunito,sans-serif", outline:"none",
            color:txt, background:inputBg,
            transition:"border-color .2s, background .3s, color .3s" }}/>
        <button onClick={onSend} disabled={sending || !myMsg.trim()} style={{
          background: (!myMsg.trim() || sending) ? navBord
            : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          border:"none", borderRadius:12, padding:"0 18px", color:"white",
          fontWeight:900, fontSize:16,
          cursor: (!myMsg.trim() || sending) ? "not-allowed" : "pointer",
          fontFamily:"Nunito,sans-serif", transition:"all .2s", flexShrink:0,
        }}>{sending ? "·  ·  ·" : "→"}</button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PContacto({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  // Children
  const [snapshot,      setSnapshot]      = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loadingSnap,   setLoadingSnap]   = useState(true);

  // Navigation: home | guias | admin
  const [view, setView] = useState("home");

  // Guías state
  const [teachers,        setTeachers]        = useState([]);
  const [selTeacher,      setSelTeacher]       = useState(null);
  const [teacherThread,   setTeacherThread]    = useState([]);
  const [loadingTThread,  setLoadingTThread]   = useState(false);
  const [teacherMsg,      setTeacherMsg]       = useState("");
  const [sendingTeacher,  setSendingTeacher]   = useState(false);
  const [tRateErr,        setTRateErr]         = useState(null);

  // Admin state
  const [adminThread,     setAdminThread]      = useState([]);
  const [loadingAdmin,    setLoadingAdmin]      = useState(false);
  const [adminMsg,        setAdminMsg]         = useState("");
  const [sendingAdmin,    setSendingAdmin]      = useState(false);
  const [aRateErr,        setARateErr]         = useState(null);

  // ── Load children ────────────────────────────────────────────
  useEffect(() => {
    api.diwyParentSnapshot()
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setSnapshot(arr);
        if (arr.length > 0) setSelectedChild(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingSnap(false));

    // Socket: incoming teacher reply
    const socket = getSocket();
    const onTeacherReply = (data) => {
      if (data.student_id === selectedChild) {
        setTeacherThread(prev => {
          if (data.teacher_id === selTeacher)
            return [...prev, { ...data, sender_role:"teacher" }];
          return prev;
        });
      }
    };
    const onAdminReply = (data) => {
      if (data.student_id === selectedChild) {
        setAdminThread(prev => [...prev, { ...data, sender_role:"admin" }]);
      }
    };
    if (socket) {
      socket.on("teacher_direct_reply", onTeacherReply);
      socket.on("admin_contact_reply",  onAdminReply);
    }
    return () => {
      if (socket) {
        socket.off("teacher_direct_reply", onTeacherReply);
        socket.off("admin_contact_reply",  onAdminReply);
      }
    };
  }, []); // eslint-disable-line

  // ── Load teachers when child changes ─────────────────────────
  useEffect(() => {
    if (!selectedChild) return;
    api.diwyChildTeachers(selectedChild)
      .then(d => setTeachers(Array.isArray(d) ? d : []))
      .catch(() => setTeachers([]));
    setSelTeacher(null);
    setTeacherThread([]);
  }, [selectedChild]);

  // ── Load teacher thread when teacher selected ─────────────────
  useEffect(() => {
    if (!selTeacher || !selectedChild) return;
    setLoadingTThread(true);
    api.diwyParentDirectThread({ studentId: selectedChild, teacherId: selTeacher })
      .then(d => setTeacherThread(Array.isArray(d) ? d : []))
      .catch(() => setTeacherThread([]))
      .finally(() => setLoadingTThread(false));
  }, [selTeacher, selectedChild]);

  // ── Load admin thread when entering admin view ────────────────
  useEffect(() => {
    if (view !== "admin" || !selectedChild) return;
    setLoadingAdmin(true);
    api.diwyParentAdminThread(selectedChild)
      .then(d => setAdminThread(Array.isArray(d) ? d : []))
      .catch(() => setAdminThread([]))
      .finally(() => setLoadingAdmin(false));
  }, [view, selectedChild]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleSendTeacher = async () => {
    if (!teacherMsg.trim() || !selTeacher || !selectedChild || sendingTeacher) return;
    setSendingTeacher(true); setTRateErr(null);
    try {
      const d = await api.diwyParentDirectMsg({
        studentId: selectedChild, teacherId: selTeacher, content: teacherMsg.trim(),
      });
      setTeacherThread(prev => [...prev, { ...d, sender_role:"parent" }]);
      setTeacherMsg("");
    } catch(e) {
      if (e.code === "RATE_LIMITED") setTRateErr(e.message);
      else showToast?.(e.message || "Error al enviar", "error");
    } finally { setSendingTeacher(false); }
  };

  const handleSendAdmin = async () => {
    if (!adminMsg.trim() || !selectedChild || sendingAdmin) return;
    setSendingAdmin(true); setARateErr(null);
    try {
      const d = await api.diwyParentAdminSend({
        studentId: selectedChild, content: adminMsg.trim(),
      });
      setAdminThread(prev => [...prev, { ...d, sender_role:"parent" }]);
      setAdminMsg("");
    } catch(e) {
      if (e.code === "RATE_LIMITED") setARateErr(e.message);
      else showToast?.(e.message || "Error al enviar", "error");
    } finally { setSendingAdmin(false); }
  };

  const handleBack = () => {
    if (view === "guias" && selTeacher) { setSelTeacher(null); return; }
    if (view !== "home") { setView("home"); return; }
    onBack();
  };

  const child = snapshot.find(c => c.id === selectedChild);

  // ── Shared style ──────────────────────────────────────────────
  const sectionLabel = t => (
    <div style={{ fontWeight:800, fontSize:11, color:sub,
      letterSpacing:".07em", marginBottom:8, paddingLeft:2 }}>{t}</div>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s",
      fontFamily:"Nunito,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background:primary,
        padding:"52px 20px 20px", position:"sticky", top:0, zIndex:50, overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.07)", top:-60, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={handleBack} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"white" }}>
              {view === "home"  ? "✉️ Contacto"
               : view === "guias" ? "👨‍🏫 Guías"
               : "🏫 Administración"}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>
              {view === "home"  ? "Comunicación formal con la institución"
               : view === "guias" && selTeacher
                 ? (teachers.find(t => t.id === selTeacher)?.nombre || "Docente")
               : view === "guias" ? "Docentes de tu hijo/a"
               : "Mensajes con la institución"}
            </div>
          </div>
        </div>

        {/* Child selector */}
        {snapshot.length > 1 && (
          <div style={{ display:"flex", gap:8, marginTop:14, overflowX:"auto", paddingBottom:2 }}>
            {snapshot.map(c => (
              <button key={c.id}
                onClick={() => {
                  setSelectedChild(c.id);
                  setSelTeacher(null); setTeacherThread([]);
                  setAdminThread([]); setView("home");
                }}
                style={{
                  background: c.id===selectedChild ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.18)",
                  border:"none", borderRadius:99, padding:"5px 16px",
                  color: c.id===selectedChild ? primary : "white",
                  fontWeight:800, fontSize:12, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap",
                  flexShrink:0, transition:"all .2s",
                }}>{c.nombre.split(" ")[0]}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"16px 14px 48px" }}>
        {loadingSnap ? (
          <div style={{ textAlign:"center", color:sub, padding:48 }}>Cargando...</div>
        ) : !child ? (
          <WCard style={{ textAlign:"center", padding:36 }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔗</div>
            <div style={{ fontWeight:800, fontSize:15, color:txt, marginBottom:6 }}>Sin hijos vinculados</div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6 }}>
              Vinculá tu cuenta con la de tu hijo/a<br/>desde el menú de inicio → Vincular.
            </div>
          </WCard>

        ) : view === "home" ? (
          /* ─── Landing ─────────────────────────────────────────── */
          <>
            {sectionLabel(`CONTACTO — ${child.nombre.split(" ")[0].toUpperCase()}`)}

            {/* Guías card */}
            <div onClick={() => setView("guias")} style={{
              background:`${primary}12`,
              border:`1.5px solid ${primary}33`, borderRadius:18,
              padding:"22px 20px", marginBottom:12, cursor:"pointer",
              transition:"all .2s",
              display:"flex", alignItems:"center", gap:16,
            }}>
              <div style={{ width:56, height:56, borderRadius:16, flexShrink:0,
                background:primary,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                👨‍🏫
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:17, color:txt, marginBottom:4 }}>Guías</div>
                <div style={{ fontSize:12, color:sub, lineHeight:1.5 }}>
                  Mensajes directos con los docentes de {child.nombre.split(" ")[0]}
                </div>
                <div style={{ fontSize:11, color:primary, marginTop:5, fontWeight:700 }}>
                  {teachers.length > 0
                    ? `${teachers.length} docente${teachers.length > 1 ? "s" : ""} asignado${teachers.length > 1 ? "s" : ""}`
                    : "Cargando docentes..."}
                </div>
              </div>
              <div style={{ fontSize:20, color:primary, flexShrink:0 }}>→</div>
            </div>

            {/* Administración card */}
            <div onClick={() => setView("admin")} style={{
              background:`${primary}12`,
              border:`1.5px solid ${primary}33`, borderRadius:18,
              padding:"22px 20px", marginBottom:12, cursor:"pointer",
              transition:"all .2s",
              display:"flex", alignItems:"center", gap:16,
            }}>
              <div style={{ width:56, height:56, borderRadius:16, flexShrink:0,
                background:primary,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                🏫
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:17, color:txt, marginBottom:4 }}>Administración</div>
                <div style={{ fontSize:12, color:sub, lineHeight:1.5 }}>
                  Consultas, trámites y comunicaciones con la institución
                </div>
              </div>
              <div style={{ fontSize:20, color:primary, flexShrink:0 }}>→</div>
            </div>

            {/* Reminder */}
            <div style={{ marginTop:8, padding:"10px 14px",
              background: isDark?"rgba(255,255,255,.04)":"#f9fafb",
              border:`1px solid ${navBord}`, borderRadius:12,
              fontSize:11, color:sub, lineHeight:1.65 }}>
              💬 Este es un canal de comunicación formal y registrada.
              Para consultas urgentes o de clase, usá <strong>Diwy</strong>.
            </div>
          </>

        ) : view === "guias" ? (
          /* ─── Guías ─────────────────────────────────────────── */
          <>
            {!selTeacher ? (
              /* Teacher list */
              <>
                {sectionLabel("SELECCIONÁ UN DOCENTE")}
                {teachers.length === 0 ? (
                  <WCard style={{ textAlign:"center", padding:32 }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>👨‍🏫</div>
                    <div style={{ fontSize:13, color:sub, lineHeight:1.6 }}>
                      No hay docentes asignados a {child.nombre.split(" ")[0]} todavía.
                    </div>
                  </WCard>
                ) : teachers.map(t => (
                  <div key={t.id} onClick={() => setSelTeacher(t.id)}
                    style={{
                      background:cardBg, border:`1.5px solid ${primary}33`,
                      borderRadius:14, padding:"16px 18px", marginBottom:10,
                      cursor:"pointer", transition:"all .2s",
                      display:"flex", alignItems:"center", gap:14,
                    }}>
                    <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                      background:primary,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:20 }}>👤</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:14, color:txt }}>{t.nombre}</div>
                      <div style={{ fontSize:11, color:sub, marginTop:2 }}>Docente de {child.nombre.split(" ")[0]}</div>
                    </div>
                    <div style={{ fontSize:18, color:primary }}>→</div>
                  </div>
                ))}
              </>
            ) : (
              /* Thread with selected teacher */
              <WCard>
                <ThreadView
                  thread={teacherThread}
                  loading={loadingTThread}
                  myMsg={teacherMsg}
                  setMyMsg={setTeacherMsg}
                  onSend={handleSendTeacher}
                  sending={sendingTeacher}
                  rateErr={tRateErr}
                  accentColor={primary}
                  txt={txt} sub={sub} navBord={navBord}
                  inputBg={inputBg} inputBd={inputBd}
                  isDark={isDark} pageBg={pageBg}
                />
              </WCard>
            )}
          </>

        ) : (
          /* ─── Administración ─────────────────────────────────── */
          <WCard>
            <ThreadView
              thread={adminThread}
              loading={loadingAdmin}
              myMsg={adminMsg}
              setMyMsg={setAdminMsg}
              onSend={handleSendAdmin}
              sending={sendingAdmin}
              rateErr={aRateErr}
              accentColor={primary}
              txt={txt} sub={sub} navBord={navBord}
              inputBg={inputBg} inputBd={inputBd}
              isDark={isDark} pageBg={pageBg}
            />
          </WCard>
        )}
      </div>
    </div>
  );
}
