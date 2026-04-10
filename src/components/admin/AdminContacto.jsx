// AdminContacto.jsx — Admin inbox for parent contact messages
//
// Views:
//   list   → all threads from parents (teacher threads + admin contact threads)
//   thread → single conversation with reply compose

import { useState, useEffect, useRef } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard, displayName } from "../shared/index";

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
  : "";

export default function AdminContacto({ me, showToast, onBack }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd } = useTheme();

  const [view,     setView]     = useState("list");   // list | thread
  const [threads,  setThreads]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);     // { type:'teacher'|'admin', parentId, studentId?, teacherId?, threadId? }
  const [msgs,     setMsgs]     = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply,    setReply]    = useState("");
  const [sending,  setSending]  = useState(false);
  const scrollRef = useRef(null);

  // ── load inbox ────────────────────────────────────────────────
  const loadInbox = () => {
    setLoading(true);
    Promise.all([
      api.diwyAdminParentInbox().catch(() => []),
    ]).then(([adminThreads]) => {
      setThreads(Array.isArray(adminThreads) ? adminThreads : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInbox();
    const socket = getSocket();
    if (socket) {
      const onMsg = () => loadInbox();
      socket.on("parent_admin_message", onMsg);
      return () => socket.off("parent_admin_message", onMsg);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  // ── open a thread ─────────────────────────────────────────────
  const openThread = (thread) => {
    setSelected(thread);
    setView("thread");
    setLoadingThread(true);
    api.diwyAdminParentThread({ parentId: thread.parent_id, studentId: thread.student_id })
      .then(d => setMsgs(Array.isArray(d) ? d : []))
      .catch(() => setMsgs([]))
      .finally(() => setLoadingThread(false));
  };

  // ── send reply ────────────────────────────────────────────────
  const handleReply = async () => {
    if (!reply.trim() || sending || !selected) return;
    setSending(true);
    try {
      const d = await api.diwyAdminParentReply({
        parentId: selected.parent_id,
        content: reply.trim(),
      });
      setMsgs(prev => [...prev, d]);
      setReply("");
      loadInbox();
    } catch (e) {
      showToast?.(e.message || "Error al enviar", "error");
    } finally { setSending(false); }
  };

  // ── socket: incoming reply confirmation ──────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onReply = (data) => {
      if (selected && data.parent_id === selected.parent_id) {
        setMsgs(prev => [...prev, { ...data, sender_role: "admin" }]);
      }
    };
    socket.on("admin_contact_reply", onReply);
    return () => socket.off("admin_contact_reply", onReply);
  }, [selected]);

  // ── THREAD VIEW ───────────────────────────────────────────────
  if (view === "thread" && selected) {
    return (
      <div style={{ background:pageBg, minHeight:"100vh", transition:"background .3s" }}>
        {/* Header */}
        <div style={{ background:primary, padding:"16px 20px 14px", display:"flex",
          alignItems:"center", gap:12, color:"white" }}>
          <button onClick={() => { setView("list"); setSelected(null); setMsgs([]); }}
            style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
              width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"Nunito,sans-serif" }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:15 }}>{selected.parent_nombre || "Padre/Madre"}</div>
            <div style={{ fontSize:11, opacity:.8 }}>
              {selected.student_nombre ? `Re: ${selected.student_nombre}` : "Contacto general"}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ padding:"14px 14px 120px", overflowY:"auto",
          maxHeight:"calc(100vh - 130px)", display:"flex", flexDirection:"column", gap:8 }}>
          {loadingThread ? (
            <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign:"center", color:sub, padding:24 }}>Sin mensajes.</div>
          ) : msgs.map((m, i) => {
            const isAdmin = m.sender_role === "admin";
            return (
              <div key={m.id || i} style={{
                alignSelf: isAdmin ? "flex-end" : "flex-start",
                maxWidth:"80%",
                background: isAdmin
                  ? (dark ? "#0ea5e930" : "#e0f2fe")
                  : (dark ? "rgba(255,255,255,.08)" : "#f1f5f9"),
                border:`1px solid ${isAdmin ? "#0ea5e944" : navBord}`,
                borderRadius:12, padding:"10px 14px",
              }}>
                <div style={{ fontSize:10, color:sub, marginBottom:4, fontWeight:700 }}>
                  {isAdmin ? "Vos (admin)" : (m.sender_nombre || "Padre/Madre")}
                  {" · "}{fmtDate(m.created_at)}
                </div>
                <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{m.content}</div>
              </div>
            );
          })}
        </div>

        {/* Reply compose (fixed bottom) */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:480,
          margin:"0 auto", background:dark?"#1e1b2e":"white",
          borderTop:`1px solid ${navBord}`, padding:"12px 14px 28px",
          display:"flex", gap:8 }}>
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => e.key==="Enter" && !e.shiftKey && handleReply()}
            placeholder="Escribí tu respuesta..."
            style={{ flex:1, border:`1.5px solid ${reply.trim() ? primary : inputBd}`,
              borderRadius:12, padding:"10px 12px", fontSize:13,
              fontFamily:"Nunito,sans-serif", outline:"none",
              color:txt, background:inputBg,
              transition:"border-color .2s, background .3s, color .3s" }}
          />
          <button onClick={handleReply} disabled={sending || !reply.trim()}
            style={{
              background: (!reply.trim() || sending) ? navBord : `linear-gradient(135deg, ${primary}, #0284c7)`,
              border:"none", borderRadius:12, padding:"0 18px", color:"white",
              fontWeight:900, fontSize:16, cursor: (!reply.trim() || sending) ? "not-allowed" : "pointer",
              fontFamily:"Nunito,sans-serif", transition:"all .2s", flexShrink:0,
            }}>{sending ? "·  ·  ·" : "→"}</button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div style={{ background:pageBg, minHeight:"100vh", transition:"background .3s" }}>
      {/* Header */}
      <div style={{ background:primary, padding:"16px 20px 14px", display:"flex",
        alignItems:"center", gap:12, color:"white", position:"sticky", top:0, zIndex:50 }}>
        <button onClick={onBack}
          style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Nunito,sans-serif" }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, fontSize:17 }}>✉️ Contacto de padres</div>
          <div style={{ fontSize:11, opacity:.8 }}>Mensajes recibidos de familias</div>
        </div>
        <button onClick={loadInbox}
          style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Nunito,sans-serif" }}>↻</button>
      </div>

      <div style={{ padding:"14px 14px 32px" }}>
        {loading ? (
          <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando mensajes...</div>
        ) : threads.length === 0 ? (
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
            <div style={{ fontWeight:800, color:txt, marginBottom:6 }}>Sin mensajes</div>
            <div style={{ fontSize:13, color:sub }}>Los mensajes de padres aparecerán acá.</div>
          </div>
        ) : threads.map((t, i) => (
          <WCard key={t.parent_id || i}
            onClick={() => openThread(t)}
            style={{ marginBottom:10, cursor:"pointer",
              borderLeft: t.unread > 0 ? `4px solid ${primary}` : `4px solid transparent` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14,
                background:`${primary}22`, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:22, flexShrink:0 }}>👤</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <div style={{ fontWeight:900, fontSize:14, color:txt,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {t.parent_nombre || "Padre/Madre"}
                  </div>
                  {t.unread > 0 && (
                    <span style={{ background:"#ef4444", color:"white", borderRadius:99,
                      fontSize:9, fontWeight:900, minWidth:16, height:16,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      padding:"0 4px" }}>{t.unread}</span>
                  )}
                </div>
                {t.student_nombre && (
                  <div style={{ fontSize:11, color:sub, marginBottom:2 }}>
                    Re: {t.student_nombre}
                  </div>
                )}
                <div style={{ fontSize:12, color:sub,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {t.last_content || "Sin mensajes"}
                </div>
              </div>
              <div style={{ fontSize:10, color:sub, flexShrink:0, textAlign:"right" }}>
                {t.last_at ? new Date(t.last_at).toLocaleDateString("es-AR",
                  { day:"numeric", month:"short" }) : ""}
                <div style={{ fontSize:18, color:sub, marginTop:2 }}>›</div>
              </div>
            </div>
          </WCard>
        ))}
      </div>
    </div>
  );
}
