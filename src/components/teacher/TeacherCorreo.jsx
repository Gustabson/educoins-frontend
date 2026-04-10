// TeacherCorreo.jsx — Standalone teacher inbox for parent direct messages.
// Extracted from the "Padres" tab in DiwyMaestra.jsx as a full-page component.

import { useState, useEffect, useRef } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
  : "";

export default function TeacherCorreo({ me, onBack, showToast }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd } = useTheme();

  const [parentThreads,      setParentThreads]      = useState([]);
  const [parentUnread,       setParentUnread]        = useState(0);
  const [selParentThread,    setSelParentThread]     = useState(null);
  const [parentThread,       setParentThread]        = useState([]);
  const [loadingPThread,     setLoadingPThread]      = useState(false);
  const [teacherReply,       setTeacherReply]        = useState("");
  const [sendingTeacherReply,setSendingTeacherReply] = useState(false);

  const scrollRef = useRef(null);

  // ── Load inbox ────────────────────────────────────────────────────────────────

  const loadInbox = () =>
    api.diwyTeacherParentInbox()
      .then(d => {
        const threads = Array.isArray(d) ? d : [];
        setParentThreads(threads);
        setParentUnread(threads.reduce((sum, t) => sum + (t.unread || 0), 0));
      })
      .catch(() => {});

  useEffect(() => {
    let active = true;

    loadInbox();
    const inboxIv = setInterval(() => { if (active) loadInbox(); }, 15000);

    const socket = getSocket();
    const onParentMsg = () => { if (active) loadInbox(); };
    if (socket) socket.on("parent_direct_message", onParentMsg);

    return () => {
      active = false;
      clearInterval(inboxIv);
      if (socket) socket.off("parent_direct_message", onParentMsg);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket: incoming teacher_direct_reply ─────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onReply = (data) => {
      if (
        selParentThread &&
        data.parent_id  === selParentThread.parent_id &&
        data.student_id === selParentThread.student_id
      ) {
        setParentThread(prev => [...prev, data]);
      }
    };
    socket.on("teacher_direct_reply", onReply);
    return () => socket.off("teacher_direct_reply", onReply);
  }, [selParentThread]);

  // ── Auto-scroll when thread messages change ───────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parentThread]);

  // ── Select a thread ───────────────────────────────────────────────────────────

  const handleSelectParentThread = async (thread) => {
    setSelParentThread(thread);
    setLoadingPThread(true);
    try {
      const d = await api.diwyTeacherParentThread({
        parentId:  thread.parent_id,
        studentId: thread.student_id,
      });
      setParentThread(Array.isArray(d) ? d : []);
      // Mark as read locally
      setParentThreads(prev => prev.map(t =>
        t.parent_id === thread.parent_id && t.student_id === thread.student_id
          ? { ...t, unread: 0 } : t
      ));
      setParentUnread(prev => Math.max(0, prev - (thread.unread || 0)));
    } catch (e) {
      setParentThread([]);
    } finally {
      setLoadingPThread(false);
    }
  };

  // ── Send reply ────────────────────────────────────────────────────────────────

  const handleTeacherReply = async () => {
    if (!teacherReply.trim() || !selParentThread || sendingTeacherReply) return;
    setSendingTeacherReply(true);
    try {
      const d = await api.diwyTeacherParentReply({
        parentId:  selParentThread.parent_id,
        studentId: selParentThread.student_id,
        content:   teacherReply.trim(),
      });
      setParentThread(prev => [...prev, { ...d, sender_role: "teacher" }]);
      setTeacherReply("");
    } catch (e) {
      showToast?.(e.message || "Error al enviar", "error");
    } finally {
      setSendingTeacherReply(false);
    }
  };

  // ── THREAD VIEW ───────────────────────────────────────────────────────────────

  if (selParentThread) {
    return (
      <div style={{ background:pageBg, minHeight:"100vh", transition:"background .3s" }}>

        {/* Sticky header */}
        <div style={{
          background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
          padding:"14px 16px", display:"flex", alignItems:"center", gap:12,
          color:"white", position:"sticky", top:0, zIndex:50,
        }}>
          <button
            onClick={() => { setSelParentThread(null); setParentThread([]); }}
            style={{
              background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
              width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"Nunito,sans-serif",
            }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:15 }}>
              {selParentThread.parent_nombre}
            </div>
            <div style={{ fontSize:11, opacity:.8 }}>
              sobre {selParentThread.student_nombre}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            padding:"14px 14px 120px", overflowY:"auto",
            maxHeight:"calc(100vh - 130px)",
            display:"flex", flexDirection:"column", gap:6,
          }}
        >
          {loadingPThread ? (
            <div style={{ textAlign:"center", color:sub, padding:24 }}>Cargando...</div>
          ) : parentThread.length === 0 ? (
            <div style={{ textAlign:"center", color:sub, padding:24 }}>Sin mensajes.</div>
          ) : parentThread.map((m, i) => {
            const isTeacher = m.sender_role === "teacher";
            return (
              <div key={m.id || i} style={{
                alignSelf: isTeacher ? "flex-end" : "flex-start",
                maxWidth:"80%",
                background: isTeacher
                  ? (isDark ? `${primary}30` : `${primary}18`)
                  : (isDark ? "rgba(255,255,255,.08)" : "#f1f5f9"),
                border:`1px solid ${isTeacher ? primary+"44" : navBord}`,
                borderRadius:12, padding:"8px 12px",
              }}>
                <div style={{ fontSize:10, color:sub, marginBottom:3, fontWeight:700 }}>
                  {isTeacher ? "Vos" : m.sender_nombre}
                  {" · "}
                  {fmtDate(m.created_at)}
                </div>
                <div style={{ fontSize:13, color:txt, lineHeight:1.5 }}>
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply compose — fixed bottom */}
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, maxWidth:480,
          margin:"0 auto",
          background: isDark ? "#1e1b2e" : "white",
          borderTop:`1px solid ${navBord}`,
          padding:"12px 14px 28px",
          display:"flex", gap:8,
        }}>
          <input
            value={teacherReply}
            onChange={e => setTeacherReply(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleTeacherReply()}
            placeholder="Respondé al mensaje..."
            style={{
              flex:1, border:`1.5px solid ${teacherReply.trim() ? primary : inputBd}`,
              borderRadius:12, padding:"10px 12px", fontSize:13,
              fontFamily:"Nunito,sans-serif", outline:"none",
              color:txt, background:inputBg,
              transition:"border-color .2s, background .3s, color .3s",
            }}
          />
          <button
            onClick={handleTeacherReply}
            disabled={sendingTeacherReply || !teacherReply.trim()}
            style={{
              background: (!teacherReply.trim() || sendingTeacherReply)
                ? navBord
                : `linear-gradient(135deg, ${primary}, #7c3aed)`,
              border:"none", borderRadius:12, padding:"0 18px", color:"white",
              fontWeight:900, fontSize:16,
              cursor: (!teacherReply.trim() || sendingTeacherReply) ? "not-allowed" : "pointer",
              fontFamily:"Nunito,sans-serif", flexShrink:0, transition:"all .2s",
            }}
          >{sendingTeacherReply ? "·  ·  ·" : "→"}</button>
        </div>
      </div>
    );
  }

  // ── INBOX LIST VIEW ───────────────────────────────────────────────────────────

  return (
    <div style={{ background:pageBg, minHeight:"100vh", transition:"background .3s" }}>

      {/* Sticky header */}
      <div style={{
        background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
        padding:"14px 16px", display:"flex", alignItems:"center", gap:12,
        color:"white", position:"sticky", top:0, zIndex:50,
      }}>
        <button
          onClick={onBack}
          style={{
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Nunito,sans-serif",
          }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, fontSize:17, display:"flex", alignItems:"center", gap:8 }}>
            ✉️ Correo de padres
            {parentUnread > 0 && (
              <span style={{
                background:"#ef4444", color:"white", borderRadius:99,
                fontSize:10, fontWeight:900, minWidth:18, height:18,
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                padding:"0 5px",
              }}>{parentUnread}</span>
            )}
          </div>
          <div style={{ fontSize:11, opacity:.8 }}>Mensajes directos de familias</div>
        </div>
        <button
          onClick={loadInbox}
          style={{
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
            width:34, height:34, cursor:"pointer", color:"white", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"Nunito,sans-serif",
          }}>↻</button>
      </div>

      {/* Thread list */}
      <div style={{ padding:"16px 14px 32px" }}>
        <div style={{
          fontWeight:800, fontSize:11, color:sub,
          letterSpacing:".07em", marginBottom:12, paddingLeft:4,
        }}>MENSAJES DE PADRES</div>

        {parentThreads.length === 0 ? (
          <WCard style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✉️</div>
            <div style={{ fontWeight:800, color:txt, marginBottom:6, fontSize:14 }}>
              Ningún padre te escribió todavía.
            </div>
            <div style={{ fontSize:12, color:sub }}>
              Cuando un padre te mande un mensaje va a aparecer acá.
            </div>
          </WCard>
        ) : parentThreads.map((t, i) => (
          <div
            key={`${t.parent_id}-${t.student_id}-${i}`}
            onClick={() => handleSelectParentThread(t)}
            style={{
              background:cardBg,
              border:`1.5px solid ${t.unread > 0 ? primary+"66" : navBord}`,
              borderLeft:`3px solid ${t.unread > 0 ? primary : navBord}`,
              borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:"pointer",
              transition:"all .2s",
            }}
          >
            <div style={{
              display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:4,
            }}>
              <div>
                <span style={{ fontWeight:800, fontSize:13, color:txt }}>
                  {t.parent_nombre}
                </span>
                <span style={{ fontSize:11, color:sub, marginLeft:6 }}>
                  sobre {t.student_nombre}
                </span>
              </div>
              {t.unread > 0 && (
                <span style={{
                  background:primary, color:"white",
                  borderRadius:99, fontSize:9, fontWeight:900,
                  padding:"2px 7px", flexShrink:0,
                }}>
                  {t.unread} nuevo{t.unread > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{
              fontSize:12, color:sub, lineHeight:1.4,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              {t.last_sender === "teacher" ? "Vos: " : ""}{t.last_content}
            </div>
            <div style={{ fontSize:10, color:sub, marginTop:3, opacity:.7 }}>
              {fmtDate(t.last_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
