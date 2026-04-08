// DiwyPadre.jsx — Full parent dashboard for Diwy.
//   ✅ Reportes IA semanales
//   ✅ Solicitar análisis cuando quieras
//   ✅ Preguntale a Diwy (AI Q&A)
//   ✅ Datos en tiempo real (balance, mood, streak, activity)
//   ✅ Alertas de conducta (verdicts)
//   ✅ Ordenale a Diwy (parent→teacher messaging via AI, 2/day)
//   ✅ Preview de clase (published by teacher each day)

import { useState, useEffect, useRef } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"long" }) : "";

const fmtTime = d => d
  ? new Date(d).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" }) : "";

const moodEmoji = avg => {
  if (!avg) return "—";
  if (avg >= 4.5) return "🌟";
  if (avg >= 3.5) return "😊";
  if (avg >= 2.5) return "😐";
  return "😟";
};

const SEVERITY_ICON = {
  advertencia:"⚠️", sancion:"🚔", grave:"⛔",
  absolucion:"⚖️", reconocimiento:"🏅",
};

const ASK_SUGGESTIONS = [
  "¿Cómo estuvo esta semana?",
  "¿Está bien emocionalmente?",
  "¿Tiene algo pendiente?",
  "¿Cómo fue su comportamiento?",
];

const DAY_ABBR = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const ATT_CFG  = {
  presente: { emoji:"✅", color:"#10b981" },
  ausente:  { emoji:"❌", color:"#ef4444" },
  tarde:    { emoji:"⏰", color:"#f59e0b" },
};

function AttendanceTable({ data, weeks, onMoreWeeks, primary, txt, sub, navBord, isDark }) {
  if (!data?.length) return (
    <div style={{ textAlign:"center", padding:"20px 0", color:sub, fontSize:13 }}>
      Sin registros de asistencia todavía.
    </div>
  );

  // Group by student and week
  const byStudent = {};
  const allDates  = new Set();
  data.forEach(r => {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = { nombre: r.student_nombre, byDate: {} };
    byStudent[r.student_id].byDate[r.fecha] = r.estado;
    allDates.add(r.fecha);
  });

  // Build week groups: key = ISO monday
  const weekMap = {};
  [...allDates].forEach(d => {
    const dt  = new Date(d + "T00:00:00");
    const dow = dt.getDay();
    const mon = new Date(dt);
    mon.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = mon.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = [];
    if (!weekMap[key].includes(d)) weekMap[key].push(d);
  });
  const sortedWeeks = Object.keys(weekMap).sort().reverse();
  const students    = Object.values(byStudent);

  return (
    <div>
      {sortedWeeks.map(wk => {
        const dates   = weekMap[wk].sort();
        const monDate = new Date(wk + "T00:00:00");
        const friDate = new Date(monDate); friDate.setDate(monDate.getDate() + 4);
        const fmtD    = d => new Date(d + "T00:00:00").toLocaleDateString("es-AR",{ day:"2-digit", month:"2-digit" });
        return (
          <div key={wk} style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, fontWeight:900, color:sub, letterSpacing:".06em",
              marginBottom:8, textTransform:"uppercase" }}>
              Semana {fmtD(wk)} → {fmtD(friDate.toISOString().split("T")[0])}
            </div>
            {/* Day headers */}
            <div style={{ display:"flex", gap:4, marginBottom:4 }}>
              {students.length > 1 && <div style={{ width:70, flexShrink:0 }}/>}
              {dates.map(d => (
                <div key={d} style={{ flex:1, textAlign:"center", fontSize:9, fontWeight:800, color:sub }}>
                  {DAY_ABBR[new Date(d+"T00:00:00").getDay()]}<br/>
                  {new Date(d+"T00:00:00").getDate()}
                </div>
              ))}
            </div>
            {/* Student rows */}
            {students.map(st => (
              <div key={st.nombre} style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                {students.length > 1 && (
                  <div style={{ width:70, fontSize:11, fontWeight:700, color:txt, flexShrink:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {st.nombre.split(" ")[0]}
                  </div>
                )}
                {dates.map(d => {
                  const cfg = ATT_CFG[st.byDate[d]];
                  return (
                    <div key={d} style={{
                      flex:1, aspectRatio:"1", maxWidth:44, borderRadius:10,
                      background: cfg ? cfg.color+"18" : (isDark?"rgba(255,255,255,.05)":"#f5f5f5"),
                      border:`1.5px solid ${cfg ? cfg.color+"44" : navBord}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18,
                    }}>{cfg ? cfg.emoji : <span style={{ color:sub, fontSize:12, fontWeight:700 }}>—</span>}</div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
      <button onClick={onMoreWeeks} style={{
        width:"100%", background:`${primary}15`, border:`1px solid ${primary}33`,
        borderRadius:50, padding:"10px", color:primary, fontWeight:800, fontSize:12,
        cursor:"pointer", fontFamily:"Nunito,sans-serif", marginTop:4,
      }}>
        📅 Ver {weeks < 4 ? "semanas anteriores" : "más semanas"}
      </button>
    </div>
  );
}

const ORDER_SUGGESTIONS = [
  "¿Tiene tarea para hoy?",
  "¿Cómo se portó en clase?",
  "¿Viene bien con los contenidos?",
  "¿Necesita algún material especial?",
];

const ETIQUETTE_TIPS = [
  "Diwy entrega tu mensaje en momentos libres de la clase, sin interrumpir al docente.",
  "Usá este canal para consultas puntuales. Para temas importantes, coordiná una reunión.",
  "Tenés 2 mensajes por día. Usálos para lo que realmente importa.",
  "La maestra puede tardar en responder si está en clase. Diwy te avisa cuando llegue la respuesta.",
];

export default function DiwyPadre({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  // Data
  const [snapshot,       setSnapshot]       = useState([]);
  const [reports,        setReports]        = useState([]);
  const [messages,       setMessages]       = useState([]);
  const [preview,        setPreview]        = useState(null);
  const [loadingSnap,    setLoadingSnap]    = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedChild,  setSelectedChild]  = useState(null);

  // Ask Diwy
  const [question,    setQuestion]    = useState("");
  const [asking,      setAsking]      = useState(false);
  const [lastAnswer,  setLastAnswer]  = useState(null);
  const [answerIsErr, setAnswerIsErr] = useState(false);

  // Ordenale a Diwy
  const [orderMsg,      setOrderMsg]      = useState("");
  const [ordering,      setOrdering]      = useState(false);
  const [orderSent,     setOrderSent]     = useState(null);  // { formatted_msg }
  const [orderRateErr,  setOrderRateErr]  = useState(null);
  const [showTip,       setShowTip]       = useState(0);

  // Attendance
  const [attData,     setAttData]     = useState(null);   // null = not fetched yet
  const [loadingAtt,  setLoadingAtt]  = useState(false);
  const [attWeeks,    setAttWeeks]    = useState(1);

  // Report
  const [expandedId,  setExpandedId]  = useState(null);
  const [requesting,  setRequesting]  = useState(false);
  const [rateMsg,     setRateMsg]     = useState(null);

  useEffect(() => {
    api.diwyParentSnapshot()
      .then(d => {
        const arr = Array.isArray(d) ? d : [];
        setSnapshot(arr);
        if (arr.length > 0) setSelectedChild(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingSnap(false));

    api.diwyParentReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingReports(false));

    let active = true;
    const loadMsgs    = () => api.diwyParentMessages().then(d => { if (active) setMessages(Array.isArray(d) ? d : []); }).catch(() => {});
    const loadPreview = () => api.diwyParentPreview().then(d => { if (active) setPreview(d || null); }).catch(() => {});

    loadMsgs();
    loadPreview();

    // Polling as fallback (10s msgs, 30s preview)
    const msgIv  = setInterval(loadMsgs,    10000);
    const prevIv = setInterval(loadPreview, 30000);

    // Socket: instant updates
    const socket = getSocket();
    const onDiwyReply = (data) => {
      setMessages(prev => prev.map(m =>
        m.id === data.message_id
          ? { ...m, estado:"replied", formatted_reply: data.formatted_reply, replied_at: data.replied_at }
          : m
      ));
    };
    const onDiwyPreview = (data) => {
      setPreview(data);
    };
    if (socket) {
      socket.on("diwy_reply",   onDiwyReply);
      socket.on("diwy_preview", onDiwyPreview);
    }

    // Rotate tip every 8s
    const tipIv = setInterval(() => setShowTip(p => (p + 1) % ETIQUETTE_TIPS.length), 8000);

    return () => {
      active = false;
      clearInterval(msgIv);
      clearInterval(prevIv);
      clearInterval(tipIv);
      if (socket) {
        socket.off("diwy_reply",   onDiwyReply);
        socket.off("diwy_preview", onDiwyPreview);
      }
    };
  }, []);

  const child        = snapshot.find(c => c.id === selectedChild);
  const childReports = reports.filter(r => r.student_id === selectedChild);
  const latestReport = childReports[0] || null;
  const childMessages = messages.filter(m => m.student_id === selectedChild);
  const todayMsgCount = messages.filter(m => {
    const d = new Date(m.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const handleAsk = async () => {
    if (!question.trim() || !selectedChild || asking) return;
    setAsking(true); setLastAnswer(null); setAnswerIsErr(false);
    try {
      const d = await api.diwyParentAsk({ studentId: selectedChild, question: question.trim() });
      setLastAnswer(d?.answer || ""); setQuestion("");
    } catch (e) {
      setAnswerIsErr(true);
      setLastAnswer(e.message || "Error al consultar Diwy");
    } finally { setAsking(false); }
  };

  const handleOrder = async () => {
    if (!orderMsg.trim() || !selectedChild || ordering) return;
    setOrdering(true); setOrderSent(null); setOrderRateErr(null);
    try {
      const d = await api.diwyParentMessage({ studentId: selectedChild, message: orderMsg.trim() });
      setOrderSent(d);
      setMessages(prev => [{ ...d, student_id: selectedChild, estado:"pending", original_msg: orderMsg.trim() }, ...prev]);
      setOrderMsg("");
    } catch (e) {
      if (e.code === "RATE_LIMITED") setOrderRateErr(e.message);
      else showToast?.(e.message || "Error al enviar mensaje", "error");
    } finally { setOrdering(false); }
  };

  const handleFetchAttendance = async (weeks = attWeeks) => {
    if (loadingAtt) return;
    setLoadingAtt(true);
    try {
      const d = await api.diwyParentAttendance(weeks);
      setAttData(Array.isArray(d) ? d : []);
      setAttWeeks(weeks);
    } catch(e) { setAttData([]); }
    finally { setLoadingAtt(false); }
  };

  const handleRequest = async () => {
    if (!selectedChild || requesting) return;
    setRequesting(true); setRateMsg(null);
    try {
      await api.diwyParentRequest(selectedChild);
      showToast?.("Solicitud enviada. El equipo generará el reporte pronto.");
    } catch (e) {
      if (e.code === "RATE_LIMITED") setRateMsg(e.message);
      else showToast?.(e.message || "Error", "error");
    } finally { setRequesting(false); }
  };

  const msgsLeft = Math.max(0, 2 - todayMsgCount);

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>

      {/* ── Header ── */}
      <div style={{
        background:`linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
        padding:"52px 20px 20px", position:"sticky", top:0, zIndex:50, overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.07)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"white" }}>🐾 Diwy</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Tu espía en el aula</div>
          </div>
        </div>
        {snapshot.length > 1 && (
          <div style={{ display:"flex", gap:8, marginTop:14, overflowX:"auto", paddingBottom:2 }}>
            {snapshot.map(c => (
              <button key={c.id}
                onClick={() => { setSelectedChild(c.id); setLastAnswer(null); setOrderSent(null); setExpandedId(null); }}
                style={{
                  background: c.id === selectedChild ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.18)",
                  border:"none", borderRadius:99, padding:"5px 16px",
                  color: c.id === selectedChild ? primary : "white",
                  fontWeight:800, fontSize:12, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap", flexShrink:0, transition:"all .2s",
                }}>
                {c.nombre.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"16px 14px 48px" }}>

        {loadingSnap ? (
          <div style={{ textAlign:"center", color:sub, padding:48 }}>Cargando...</div>
        ) : !child ? (
          <WCard style={{ textAlign:"center", padding:36, marginTop:8 }}>
            <div style={{ fontSize:44, marginBottom:10 }}>🔗</div>
            <div style={{ fontWeight:800, fontSize:16, color:txt, marginBottom:6 }}>Sin hijos vinculados</div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6 }}>
              Vinculá tu cuenta con la de tu hijo/a<br/>desde el menú de inicio → Vincular.
            </div>
          </WCard>
        ) : (
          <>
            {/* ── Quick Stats ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { icon:"🪙", val: child.balance ?? "—",                label:"Balance" },
                { icon: moodEmoji(child.mood_avg), val: child.mood_avg ? `${child.mood_avg}/5` : "—", label:"Estado" },
                { icon:"🔥", val: `${child.checkin_streak ?? 0}d`,     label:"Racha"   },
              ].map(s => (
                <WCard key={s.label} style={{ padding:"14px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:22, marginBottom:3 }}>{s.icon}</div>
                  <div style={{ fontWeight:900, fontSize:17, color:primary }}>{s.val}</div>
                  <div style={{ fontSize:10, color:sub, marginTop:2 }}>{s.label}</div>
                </WCard>
              ))}
            </div>

            {/* ── Preview de clase ── */}
            {preview ? (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub, letterSpacing:".07em",
                  marginBottom:8, paddingLeft:4 }}>CLASE DE HOY</div>
                <div style={{
                  background:`linear-gradient(135deg, ${primary}18, #7c3aed18)`,
                  border:`1.5px solid ${primary}44`,
                  borderRadius:14, padding:"14px 16px",
                  transition:"background .3s",
                }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontSize:28, flexShrink:0 }}>🗓️</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900, fontSize:14, color:txt }}>{preview.tema}</div>
                      {preview.detalle && (
                        <div style={{ fontSize:12, color:sub, marginTop:3, lineHeight:1.5 }}>{preview.detalle}</div>
                      )}
                      <div style={{ fontSize:10, color:sub, marginTop:4, opacity:.7 }}>
                        Publicado por {preview.docente_nombre}
                      </div>
                    </div>
                  </div>
                  {preview.imagen && (
                    <img src={preview.imagen} alt="clase"
                      style={{ width:"100%", borderRadius:10, marginTop:12,
                        maxHeight:200, objectFit:"cover", display:"block" }}/>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom:14, border:`1.5px dashed ${navBord}`, borderRadius:14,
                padding:"12px 16px", display:"flex", alignItems:"center", gap:10,
                opacity:.5, transition:"border-color .3s" }}>
                <span style={{ fontSize:24 }}>🗓️</span>
                <div style={{ fontSize:12, color:sub }}>
                  La maestra no publicó el tema de hoy todavía.
                </div>
              </div>
            )}

            {/* ── Preguntale a Diwy ── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, ${primary}, #7c3aed)`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🤔</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Preguntale a Diwy</div>
                  <div style={{ fontSize:11, color:sub }}>IA responde con datos reales de {child.nombre.split(" ")[0]}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10, paddingBottom:2 }}>
                {/* Attendance chip — fetches data directly, no AI */}
                <button onClick={() => { setAttData(null); handleFetchAttendance(1); }}
                  style={{
                    background: attData !== null ? primary : `${primary}15`,
                    border:`1px solid ${primary}`,
                    borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:800,
                    color: attData !== null ? "white" : primary,
                    cursor:"pointer", whiteSpace:"nowrap",
                    fontFamily:"Nunito,sans-serif", flexShrink:0,
                  }}>
                  🗓️ {loadingAtt ? "Cargando..." : "Asistencia de esta semana"}
                </button>
                {ASK_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setAttData(null); setQuestion(s); }} style={{
                    background:`${primary}15`, border:`1px solid ${primary}40`,
                    borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:700,
                    color:primary, cursor:"pointer", whiteSpace:"nowrap",
                    fontFamily:"Nunito,sans-serif", flexShrink:0,
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={question} onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAsk()}
                  placeholder="¿Qué querés saber sobre tu hijo/a?"
                  style={{ flex:1, border:`1.5px solid ${question.trim() ? primary : inputBd}`,
                    borderRadius:12, padding:"10px 12px", fontSize:13,
                    fontFamily:"Nunito,sans-serif", outline:"none",
                    color:txt, background:inputBg, transition:"border-color .2s, background .3s, color .3s" }}/>
                <button onClick={handleAsk} disabled={asking || !question.trim()} style={{
                  background:(!question.trim()||asking) ? navBord : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                  border:"none", borderRadius:12, padding:"0 18px", color:"white",
                  fontWeight:900, fontSize:16, cursor:(!question.trim()||asking)?"not-allowed":"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"all .2s", flexShrink:0,
                }}>{asking ? "·  ·  ·" : "→"}</button>
              </div>
              {lastAnswer && (
                <div style={{ marginTop:12,
                  background: answerIsErr ? (isDark?"#422":"#fef3c7") : `${primary}12`,
                  border:`1px solid ${answerIsErr ? "#f59e0b55" : primary+"33"}`,
                  borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:800, marginBottom:6,
                    color: answerIsErr ? "#92400e" : primary }}>
                    {answerIsErr ? "⏳ Aviso" : "🐾 Diwy dice:"}
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{lastAnswer}</div>
                </div>
              )}

              {/* Attendance view — shown when chip was clicked */}
              {attData !== null && (
                <div style={{ marginTop:12, borderTop:`1.5px solid ${navBord}`, paddingTop:14 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:primary, marginBottom:10,
                    display:"flex", alignItems:"center", gap:6 }}>
                    🗓️ Asistencia
                    <span style={{ background:`${primary}18`, borderRadius:99, padding:"1px 8px",
                      fontSize:9, fontWeight:900 }}>
                      {attWeeks === 1 ? "Esta semana" : `Últimas ${attWeeks} semanas`}
                    </span>
                  </div>
                  {loadingAtt
                    ? <div style={{ textAlign:"center", color:sub, padding:16 }}>Cargando...</div>
                    : <AttendanceTable
                        data={attData} weeks={attWeeks}
                        onMoreWeeks={() => handleFetchAttendance(Math.min(attWeeks + 1, 8))}
                        primary={primary} txt={txt} sub={sub}
                        navBord={navBord} isDark={isDark}
                      />
                  }
                </div>
              )}
            </WCard>

            {/* ── Ordenale a Diwy ── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, #7c3aed, #a855f7)`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📨</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Ordenale a Diwy</div>
                  <div style={{ fontSize:11, color:sub }}>Diwy le pregunta a la maestra por vos</div>
                </div>
                <div style={{
                  background: msgsLeft > 0 ? `${primary}20` : `${navBord}`,
                  color: msgsLeft > 0 ? primary : sub,
                  borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:800, flexShrink:0,
                }}>
                  {todayMsgCount}/2 usados
                </div>
              </div>

              {/* Etiquette tip */}
              <div style={{ background: isDark ? "rgba(255,255,255,.05)" : "#f8f5ff",
                borderRadius:10, padding:"8px 12px", marginBottom:10,
                border:`1px solid #7c3aed22`, transition:"background .3s" }}>
                <div style={{ fontSize:11, color:"#7c3aed", lineHeight:1.5 }}>
                  💡 {ETIQUETTE_TIPS[showTip]}
                </div>
              </div>

              {msgsLeft === 0 ? (
                <div style={{ background: isDark?"#2a2a2a":"#fef3c7", borderRadius:12,
                  padding:"12px 14px", fontSize:13, color: isDark ? "#f59e0b" : "#92400e",
                  textAlign:"center", fontWeight:700 }}>
                  ⏳ Usaste tus 2 mensajes del día. Volvé mañana.
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10, paddingBottom:2 }}>
                    {ORDER_SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => setOrderMsg(s)} style={{
                        background:"#7c3aed18", border:"1px solid #7c3aed40",
                        borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:700,
                        color:"#7c3aed", cursor:"pointer", whiteSpace:"nowrap",
                        fontFamily:"Nunito,sans-serif", flexShrink:0,
                      }}>{s}</button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={orderMsg} onChange={e => setOrderMsg(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleOrder()}
                      placeholder="Decile algo a Diwy para pasarle a la maestra..."
                      style={{ flex:1, border:`1.5px solid ${orderMsg.trim() ? "#7c3aed" : inputBd}`,
                        borderRadius:12, padding:"10px 12px", fontSize:13,
                        fontFamily:"Nunito,sans-serif", outline:"none",
                        color:txt, background:inputBg, transition:"border-color .2s, background .3s, color .3s" }}/>
                    <button onClick={handleOrder} disabled={ordering || !orderMsg.trim()} style={{
                      background:(!orderMsg.trim()||ordering) ? navBord : "linear-gradient(135deg, #7c3aed, #a855f7)",
                      border:"none", borderRadius:12, padding:"0 18px", color:"white",
                      fontWeight:900, fontSize:16, cursor:(!orderMsg.trim()||ordering)?"not-allowed":"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"all .2s", flexShrink:0,
                    }}>{ordering ? "·  ·  ·" : "→"}</button>
                  </div>

                  {orderRateErr && (
                    <div style={{ marginTop:10, background:"#fef3c7", borderRadius:10,
                      padding:"8px 12px", fontSize:12, color:"#92400e" }}>
                      ⏳ {orderRateErr}
                    </div>
                  )}

                  {orderSent && (
                    <div style={{ marginTop:10, background:"#7c3aed12",
                      border:"1px solid #7c3aed33", borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ fontSize:11, fontWeight:800, color:"#7c3aed", marginBottom:6 }}>
                        ✅ Diwy lo pasó a la maestra:
                      </div>
                      <div style={{ fontSize:13, color:txt, lineHeight:1.55, fontStyle:"italic" }}>
                        "{orderSent.formatted_msg}"
                      </div>
                      <div style={{ fontSize:11, color:sub, marginTop:6 }}>
                        Te avisamos cuando la maestra responda.
                      </div>
                    </div>
                  )}
                </>
              )}
            </WCard>

            {/* ── Historial de mensajes a la maestra ── */}
            {childMessages.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:8, paddingLeft:4 }}>
                  MENSAJES A LA MAESTRA
                </div>
                {childMessages.slice(0, 5).map(m => (
                  <div key={m.id} style={{
                    background:cardBg, border:`1.5px solid ${navBord}`,
                    borderLeft:`3px solid #7c3aed`,
                    borderRadius:12, padding:"12px 14px", marginBottom:8,
                    transition:"background .3s, border .3s",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontSize:11, color:sub }}>
                        {fmtDate(m.created_at)} {fmtTime(m.created_at)}
                      </div>
                      <span style={{
                        background: m.estado === "replied" ? "#10b98120" : "#f59e0b20",
                        color: m.estado === "replied" ? "#10b981" : "#f59e0b",
                        borderRadius:99, padding:"2px 8px", fontSize:9, fontWeight:900,
                      }}>
                        {m.estado === "replied" ? "✓ Respondido" : "⏳ Pendiente"}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:sub, fontStyle:"italic",
                      marginBottom:6, lineHeight:1.5 }}>
                      "{m.formatted_msg || m.original_msg}"
                    </div>
                    {m.estado === "replied" && m.formatted_reply && (
                      <div style={{ background: isDark?"rgba(255,255,255,.06)":"#f0fdf4",
                        border:"1px solid #10b98133",
                        borderRadius:10, padding:"8px 12px", marginTop:4 }}>
                        <div style={{ fontSize:10, fontWeight:800, color:"#10b981", marginBottom:4 }}>
                          🐾 Diwy (de {m.docente_nombre || "la maestra"}):
                        </div>
                        <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>
                          {m.formatted_reply}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Último reporte ── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`${primary}18`, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:20, flexShrink:0 }}>📊</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Último reporte IA</div>
                  <div style={{ fontSize:11, color:sub }}>Generado y revisado por el equipo docente</div>
                </div>
              </div>
              {loadingReports ? (
                <div style={{ color:sub, fontSize:13, padding:"4px 0" }}>Cargando...</div>
              ) : !latestReport ? (
                <div style={{ fontSize:13, color:sub, padding:"4px 0", lineHeight:1.55 }}>
                  Todavía no hay reportes publicados para {child.nombre.split(" ")[0]}.<br/>
                  Solicitá uno abajo y el equipo lo generará pronto.
                </div>
              ) : (
                <>
                  <div style={{ fontSize:11, color:sub, marginBottom:8 }}>
                    {latestReport.periodo_label} · Publicado el {fmtDate(latestReport.approved_at)}
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.65, position:"relative",
                    overflow:"hidden", maxHeight: expandedId === latestReport.id ? "none" : 80 }}>
                    <div style={{ whiteSpace:"pre-wrap" }}>{latestReport.reporte_final}</div>
                    {expandedId !== latestReport.id && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:36,
                        background:`linear-gradient(transparent, ${cardBg})` }}/>
                    )}
                  </div>
                  <button onClick={() => setExpandedId(expandedId === latestReport.id ? null : latestReport.id)}
                    style={{ background:"none", border:"none", color:primary, fontWeight:800,
                      fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                      padding:"6px 0 0", display:"block" }}>
                    {expandedId === latestReport.id ? "Ver menos ▲" : "Ver completo ▼"}
                  </button>
                </>
              )}
              <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${navBord}` }}>
                {rateMsg && (
                  <div style={{ background:"#fef3c7", borderRadius:10, padding:"8px 12px",
                    fontSize:12, color:"#92400e", marginBottom:8 }}>⏳ {rateMsg}</div>
                )}
                <button onClick={handleRequest} disabled={requesting} style={{
                  width:"100%", background:requesting ? navBord : `${primary}15`,
                  border:`1.5px dashed ${primary}55`, borderRadius:12, padding:"11px",
                  cursor:requesting?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif",
                  color:primary, fontWeight:800, fontSize:13, transition:"all .2s",
                }}>
                  {requesting ? "Enviando..." : "📨 Solicitar nuevo reporte"}
                </button>
              </div>
            </WCard>

            {/* ── Actividad reciente ── */}
            {child.recent_txns?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:8, paddingLeft:4 }}>ACTIVIDAD RECIENTE</div>
                <WCard style={{ padding:"4px 0" }}>
                  {child.recent_txns.map((tx, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"10px 14px",
                      borderBottom: i < child.recent_txns.length-1 ? `1px solid ${navBord}` : "none" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:txt, fontWeight:600 }}>
                          {tx.descripcion || tx.tipo || "Transacción"}
                        </div>
                        <div style={{ fontSize:10, color:sub, marginTop:1 }}>
                          {new Date(tx.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                      <div style={{ fontWeight:900, fontSize:14, flexShrink:0,
                        color: tx.direccion === "ingreso" ? "#10b981" : "#ef4444" }}>
                        {tx.direccion === "ingreso" ? "+" : "−"}{Math.abs(tx.amount)} 🪙
                      </div>
                    </div>
                  ))}
                </WCard>
              </div>
            )}

            {/* ── Alertas de conducta ── */}
            {child.recent_verdicts?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:8, paddingLeft:4 }}>ALERTAS DE CONDUCTA</div>
                {child.recent_verdicts.map((v, i) => (
                  <div key={i} style={{ background:cardBg, border:`1.5px solid ${navBord}`,
                    borderLeft:`3px solid ${primary}`, borderRadius:12, padding:"10px 14px",
                    marginBottom:7, display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>{SEVERITY_ICON[v.severity] || "📋"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:txt, textTransform:"capitalize" }}>
                        {v.severity}
                      </div>
                      <div style={{ fontSize:11, color:sub, marginTop:2 }}>
                        {fmtDate(v.created_at)}{v.coins_penalty ? ` · −${Math.abs(v.coins_penalty)} 🪙` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
