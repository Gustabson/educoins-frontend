// DiwyPadre.jsx — Parent Diwy dashboard
//
// Sections:
//   1. Header + child selector
//   2. Quick stats (balance, mood, streak)
//   3. Clase de hoy
//   4. Asistencia  (Semana / Mensual / Anual — all from one 52-week fetch)
//   5. Contacto con el aula  (send + message history, unified)
//   6. Reportes  [Reporte IA] [Institución]
//   7. Actividad reciente
//   8. Alertas de conducta

import { useState, useEffect } from "react";
import { api, getSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

// ─── date helpers ────────────────────────────────────────────────────────────
const fmtDate = d => d
  ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"long" }) : "";

const fmtTime = d => d
  ? new Date(d).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" }) : "";

const moodEmoji = avg => {
  if (!avg)     return "—";
  if (avg>=4.5) return "🌟";
  if (avg>=3.5) return "😊";
  if (avg>=2.5) return "😐";
  return "😟";
};

const SEVERITY_ICON = {
  advertencia:"⚠️", sancion:"🚔", grave:"⛔",
  absolucion:"⚖️", reconocimiento:"🏅",
};

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const FULL_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ATT_CFG = {
  presente: { emoji:"✅", color:"#10b981" },
  ausente:  { emoji:"❌", color:"#ef4444" },
  tarde:    { emoji:"⏰", color:"#f59e0b" },
};
const WEEK_DAYS = ["Lun","Mar","Mié","Jue","Vie"];

const CONTACT_TIPS = [
  "Diwy reformula tu mensaje y lo entrega en el momento oportuno, sin cortar la clase.",
  "Pensá dos veces antes de enviar: ¿puede esperar al recreo o al fin del día?",
  "Un mensaje mal usado puede demorar uno más urgente — usá este canal con criterio.",
  "Tenés 2 mensajes por día. Reservalos para lo que realmente no puede esperar.",
];

const ORDER_SUGGESTIONS = [
  "¿Tiene tarea para hoy?",
  "¿Cómo se portó en clase?",
  "¿Viene bien con los contenidos?",
  "¿Necesita algún material especial?",
];

// ─── attendance utils ────────────────────────────────────────────────────────
function getWeekDates(monISO) {
  const mon = new Date(monISO + "T00:00:00");
  return Array.from({ length:5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

// Monday ISO of week offset weeks back (offset=0 → this week)
function getMondayOfOffset(offset) {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(today);
  mon.setDate(today.getDate() - daysToMon - offset * 7);
  return mon.toISOString().split("T")[0];
}

// First/last day of month offset months back (offset=0 → this month)
function getMonthRange(offset) {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const year  = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const first = new Date(year, month, 1).toISOString().split("T")[0];
  const last  = new Date(year, month + 1, 0).toISOString().split("T")[0];
  return { first, last, label: `${FULL_MONTHS[month]} ${year}` };
}

// ─── sub-components (module scope to avoid remount) ──────────────────────────

function AttendanceWeekView({ data, weekOffset, onPrev, onNext, primary, txt, sub, navBord, isDark }) {
  const monISO    = getMondayOfOffset(weekOffset);
  const weekDates = getWeekDates(monISO);
  const friday    = weekDates[4];
  const fmtD      = iso => new Date(iso+"T00:00:00").toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});

  // Filter data to this week
  const weekSet = new Set(weekDates);
  const weekRows = (data || []).filter(r => weekSet.has(r.fecha));

  const byStudent = {};
  weekRows.forEach(r => {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = { nombre:r.student_nombre, byDate:{} };
    byStudent[r.student_id].byDate[r.fecha] = r.estado;
  });
  const students     = Object.values(byStudent);
  const multiStudent = students.length > 1;
  const gridCols     = multiStudent ? `64px repeat(5, 1fr)` : `repeat(5, 1fr)`;

  // Check if "next" would be in the future
  const isCurrentWeek = weekOffset === 0;

  return (
    <div>
      {/* Week navigator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:12 }}>
        <button onClick={onPrev} style={{
          background:`${primary}15`, border:`1.5px solid ${primary}33`,
          borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:800,
          color:primary, cursor:"pointer", fontFamily:"Nunito,sans-serif",
        }}>← Anterior</button>
        <div style={{ fontSize:11, fontWeight:900, color:sub,
          textTransform:"uppercase", letterSpacing:".05em", textAlign:"center" }}>
          {fmtD(monISO)} → {fmtD(friday)}
        </div>
        <button onClick={onNext} disabled={isCurrentWeek} style={{
          background: isCurrentWeek ? "transparent" : `${primary}15`,
          border:`1.5px solid ${isCurrentWeek ? "transparent" : primary+"33"}`,
          borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:800,
          color: isCurrentWeek ? "transparent" : primary,
          cursor: isCurrentWeek ? "default" : "pointer",
          fontFamily:"Nunito,sans-serif",
        }}>Siguiente →</button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:3, marginBottom:3 }}>
        {multiStudent && <div/>}
        {WEEK_DAYS.map((label, i) => (
          <div key={label} style={{ textAlign:"center", fontSize:9,
            fontWeight:800, color:sub, lineHeight:1.4 }}>
            {label}<br/>{new Date(weekDates[i]+"T00:00:00").getDate()}
          </div>
        ))}
      </div>

      {/* Student rows */}
      {students.length === 0 ? (
        <div style={{ textAlign:"center", padding:"14px 0", color:sub, fontSize:13 }}>
          Sin registros esta semana.
        </div>
      ) : students.map(st => (
        <div key={st.nombre} style={{ display:"grid",
          gridTemplateColumns:gridCols, gap:3, marginBottom:3 }}>
          {multiStudent && (
            <div style={{ fontSize:10, fontWeight:700, color:txt,
              display:"flex", alignItems:"center",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {st.nombre.split(" ")[0]}
            </div>
          )}
          {weekDates.map(d => {
            const cfg = ATT_CFG[st.byDate[d]];
            return (
              <div key={d} style={{
                borderRadius:8,
                background: cfg ? cfg.color+"15" : (isDark?"rgba(255,255,255,.04)":"#f8f8f8"),
                border:`1.5px solid ${cfg ? cfg.color+"44" : navBord}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, minHeight:34,
              }}>
                {cfg ? cfg.emoji : <span style={{ color:sub, fontSize:11, fontWeight:700 }}>–</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AttendanceMonthView({ data, monthOffset, onPrev, onNext, txt, sub, navBord, isDark }) {
  const { first, last, label } = getMonthRange(monthOffset);
  const monthRows = (data || []).filter(r => r.fecha >= first && r.fecha <= last);

  // Discover weeks within this month
  const weekSet = new Set();
  monthRows.forEach(r => {
    const dt  = new Date(r.fecha + "T00:00:00");
    const dow = dt.getDay();
    const mon = new Date(dt);
    mon.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1));
    weekSet.add(mon.toISOString().split("T")[0]);
  });
  const sortedWeeks = [...weekSet].sort().reverse();

  const byStudent = {};
  monthRows.forEach(r => {
    if (!byStudent[r.student_id]) byStudent[r.student_id] = { nombre:r.student_nombre, byDate:{} };
    byStudent[r.student_id].byDate[r.fecha] = r.estado;
  });
  const students     = Object.values(byStudent);
  const multiStudent = students.length > 1;
  const gridCols     = multiStudent ? `64px repeat(5, 1fr)` : `repeat(5, 1fr)`;

  const isCurrentMonth = monthOffset === 0;
  const fmtD = iso => new Date(iso+"T00:00:00").toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"});

  return (
    <div>
      {/* Month navigator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:12 }}>
        <button onClick={onPrev} style={{
          background:`${sub}18`, border:`1.5px solid ${sub}33`,
          borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:800,
          color:sub, cursor:"pointer", fontFamily:"Nunito,sans-serif",
        }}>← Anterior</button>
        <div style={{ fontSize:12, fontWeight:900, color:txt, textAlign:"center" }}>{label}</div>
        <button onClick={onNext} disabled={isCurrentMonth} style={{
          background: isCurrentMonth ? "transparent" : `${sub}18`,
          border:`1.5px solid ${isCurrentMonth ? "transparent" : sub+"33"}`,
          borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:800,
          color: isCurrentMonth ? "transparent" : sub,
          cursor: isCurrentMonth ? "default" : "pointer",
          fontFamily:"Nunito,sans-serif",
        }}>Siguiente →</button>
      </div>

      {sortedWeeks.length === 0 ? (
        <div style={{ textAlign:"center", padding:"14px 0", color:sub, fontSize:13 }}>
          Sin registros en {label}.
        </div>
      ) : sortedWeeks.map(wk => {
        const weekDates = getWeekDates(wk);
        return (
          <div key={wk} style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:900, color:sub,
              letterSpacing:".06em", marginBottom:6, textTransform:"uppercase" }}>
              Semana {fmtD(wk)} → {fmtD(weekDates[4])}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:gridCols, gap:3, marginBottom:3 }}>
              {multiStudent && <div/>}
              {WEEK_DAYS.map((label, i) => (
                <div key={label} style={{ textAlign:"center", fontSize:9,
                  fontWeight:800, color:sub, lineHeight:1.4 }}>
                  {label}<br/>{new Date(weekDates[i]+"T00:00:00").getDate()}
                </div>
              ))}
            </div>
            {students.map(st => (
              <div key={st.nombre} style={{ display:"grid",
                gridTemplateColumns:gridCols, gap:3, marginBottom:3 }}>
                {multiStudent && (
                  <div style={{ fontSize:10, fontWeight:700, color:txt,
                    display:"flex", alignItems:"center",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {st.nombre.split(" ")[0]}
                  </div>
                )}
                {weekDates.map(d => {
                  const cfg = ATT_CFG[st.byDate[d]];
                  return (
                    <div key={d} style={{
                      borderRadius:8,
                      background: cfg ? cfg.color+"15" : (isDark?"rgba(255,255,255,.04)":"#f8f8f8"),
                      border:`1.5px solid ${cfg ? cfg.color+"44" : navBord}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:15, minHeight:34,
                    }}>
                      {cfg ? cfg.emoji : <span style={{ color:sub, fontSize:11, fontWeight:700 }}>–</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AttendanceYearView({ data, txt, sub, navBord, isDark }) {
  if (!data?.length) return (
    <div style={{ textAlign:"center", padding:"20px 0", color:sub, fontSize:13 }}>
      Sin registros de asistencia.
    </div>
  );

  const byMonth = {};
  data.forEach(r => {
    const mo = r.fecha.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = { presente:0, ausente:0, tarde:0 };
    byMonth[mo][r.estado] = (byMonth[mo][r.estado] || 0) + 1;
  });
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div>
      {months.map(m => {
        const [y, mo] = m.split("-").map(Number);
        const d     = byMonth[m];
        const total = (d.presente||0) + (d.ausente||0) + (d.tarde||0);
        const pct   = total > 0 ? Math.round((d.presente / total) * 100) : 0;
        const pctColor = pct >= 85 ? "#10b981" : pct >= 65 ? "#f59e0b" : "#ef4444";
        return (
          <div key={m} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"10px 14px", marginBottom:6, borderRadius:10,
            background: isDark ? "rgba(255,255,255,.04)" : "#f8f8f8",
            border:`1.5px solid ${navBord}`,
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13, color:txt }}>
                {MONTH_NAMES[mo-1]} {y}
              </div>
              <div style={{ display:"flex", gap:10, marginTop:3 }}>
                <span style={{ fontSize:11, color:sub }}>✅ {d.presente||0}</span>
                <span style={{ fontSize:11, color:sub }}>❌ {d.ausente||0}</span>
                {d.tarde > 0 && <span style={{ fontSize:11, color:sub }}>⏰ {d.tarde}</span>}
              </div>
            </div>
            <div style={{ fontWeight:900, fontSize:20, color:pctColor }}>{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function DiwyPadre({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  // Core data
  const [snapshot,    setSnapshot]    = useState([]);
  const [reports,     setReports]     = useState([]);
  const [messages,    setMessages]    = useState([]);
  const [preview,     setPreview]     = useState(null);
  const [loadingSnap, setLoadingSnap] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);

  // Attendance (fetched once per child — 52 weeks)
  const [attData,    setAttData]    = useState(null);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attPeriod,  setAttPeriod]  = useState("week");   // week | month | year
  const [weekOffset, setWeekOffset] = useState(0);        // 0 = this week
  const [monthOffset,setMonthOffset]= useState(0);        // 0 = this month

  // Ordenale a Diwy
  const [orderMsg,     setOrderMsg]     = useState("");
  const [ordering,     setOrdering]     = useState(false);
  const [orderSent,    setOrderSent]    = useState(null);
  const [orderRateErr, setOrderRateErr] = useState(null);
  const [showTip,      setShowTip]      = useState(0);

  // Message history
  const [showAllMsgs, setShowAllMsgs] = useState(false);

  // Reports
  const [reportTab,         setReportTab]         = useState("ia");
  const [iaReport,          setIaReport]          = useState(null);
  const [generatingReport,  setGeneratingReport]  = useState(false);
  const [reportRateErr,     setReportRateErr]     = useState(null);
  const [expandedRptId,     setExpandedRptId]     = useState(null);

  // ── initial data ──────────────────────────────────────────────
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
      .catch(() => {});

    let active = true;
    const loadMsgs    = () => api.diwyParentMessages().then(d => { if (active) setMessages(Array.isArray(d) ? d : []); }).catch(() => {});
    const loadPreview = () => api.diwyParentPreview().then(d => { if (active) setPreview(d || null); }).catch(() => {});
    loadMsgs();
    loadPreview();

    const msgIv  = setInterval(loadMsgs,    10000);
    const prevIv = setInterval(loadPreview, 30000);

    const socket = getSocket();
    const onDiwyReply   = (data) => setMessages(prev => prev.map(m =>
      m.id === data.message_id
        ? { ...m, estado:"replied", formatted_reply:data.formatted_reply, replied_at:data.replied_at }
        : m
    ));
    const onDiwyPreview = (data) => setPreview(data);
    if (socket) {
      socket.on("diwy_reply",   onDiwyReply);
      socket.on("diwy_preview", onDiwyPreview);
    }

    const tipIv = setInterval(() => setShowTip(p => (p+1) % CONTACT_TIPS.length), 8000);

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

  // ── fetch attendance once per child (full year) ───────────────
  useEffect(() => {
    if (!selectedChild) return;
    setLoadingAtt(true);
    api.diwyParentAttendance(52)
      .then(d => setAttData(Array.isArray(d) ? d : []))
      .catch(() => setAttData([]))
      .finally(() => setLoadingAtt(false));
    // Reset navigation on child switch
    setWeekOffset(0);
    setMonthOffset(0);
  }, [selectedChild]);

  // ── derived ───────────────────────────────────────────────────
  const child         = snapshot.find(c => c.id === selectedChild);
  const childReports  = reports.filter(r => r.student_id === selectedChild);
  const latestReport  = childReports[0] || null;
  const childMessages = messages.filter(m => m.student_id === selectedChild);
  const todayMsgCount = messages.filter(m =>
    new Date(m.created_at).toDateString() === new Date().toDateString()
  ).length;
  const msgsLeft = Math.max(0, 2 - todayMsgCount);

  const childAttData = (attData || []).filter(r => r.student_id === selectedChild);

  // ── handlers ──────────────────────────────────────────────────
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

  const handleGenerateReport = async () => {
    if (!selectedChild || generatingReport) return;
    setGeneratingReport(true); setIaReport(null); setReportRateErr(null);
    try {
      const d = await api.diwyParentInstantReport(selectedChild);
      setIaReport(d?.report || "");
    } catch (e) {
      if (e.code === "RATE_LIMITED") setReportRateErr(e.message);
      else showToast?.(e.message || "Error al generar el reporte", "error");
    } finally { setGeneratingReport(false); }
  };

  // ── style helpers ─────────────────────────────────────────────
  const periodBtn = (label, val) => (
    <button key={val} onClick={() => setAttPeriod(val)}
      style={{
        background: attPeriod === val ? primary : `${primary}15`,
        border:`1.5px solid ${attPeriod === val ? primary : primary+"33"}`,
        borderRadius:99, padding:"5px 14px",
        color: attPeriod === val ? "white" : primary,
        fontWeight:800, fontSize:11, cursor:"pointer",
        fontFamily:"Nunito,sans-serif", transition:"all .2s",
      }}>{label}</button>
  );

  const rptTabBtn = (label, val, icon) => (
    <button key={val} onClick={() => setReportTab(val)}
      style={{
        flex:1, padding:"9px 4px",
        background: reportTab === val
          ? `linear-gradient(135deg, ${primary}, #7c3aed)`
          : (isDark ? "rgba(255,255,255,.06)" : "#f3f4f6"),
        border:`1.5px solid ${reportTab === val ? primary : navBord}`,
        borderRadius:10, color: reportTab === val ? "white" : sub,
        fontWeight:800, fontSize:12, cursor:"pointer",
        fontFamily:"Nunito,sans-serif", transition:"all .2s",
        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
      }}>
      {icon} {label}
    </button>
  );

  const sectionLabel = (t) => (
    <div style={{ fontWeight:800, fontSize:11, color:sub,
      letterSpacing:".07em", marginBottom:8, paddingLeft:4 }}>{t}</div>
  );

  // ── render ────────────────────────────────────────────────────
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
                onClick={() => {
                  setSelectedChild(c.id);
                  setOrderSent(null); setExpandedRptId(null);
                  setShowAllMsgs(false); setIaReport(null);
                  setReportRateErr(null); setWeekOffset(0); setMonthOffset(0);
                }}
                style={{
                  background: c.id===selectedChild ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.18)",
                  border:"none", borderRadius:99, padding:"5px 16px",
                  color: c.id===selectedChild ? primary : "white",
                  fontWeight:800, fontSize:12, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap",
                  flexShrink:0, transition:"all .2s",
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
            {/* ── 1. Quick stats ── */}
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

            {/* ── 2. Clase de hoy ── */}
            {preview ? (
              <div style={{ marginBottom:14 }}>
                {sectionLabel("CLASE DE HOY")}
                <div style={{
                  background:`linear-gradient(135deg, ${primary}18, #7c3aed18)`,
                  border:`1.5px solid ${primary}44`, borderRadius:14, padding:"14px 16px",
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
                padding:"12px 16px", display:"flex", alignItems:"center", gap:10, opacity:.5 }}>
                <span style={{ fontSize:24 }}>🗓️</span>
                <div style={{ fontSize:12, color:sub }}>La maestra no publicó el tema de hoy todavía.</div>
              </div>
            )}

            {/* ── 3. Asistencia ── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, #3b82f6, #6366f1)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0 }}>📅</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Asistencia</div>
                  <div style={{ fontSize:11, color:sub }}>{child.nombre.split(" ")[0]}</div>
                </div>
              </div>

              {/* Period selector */}
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                {periodBtn("Semana",  "week")}
                {periodBtn("Mensual", "month")}
                {periodBtn("Anual",   "year")}
              </div>

              {loadingAtt ? (
                <div style={{ textAlign:"center", color:sub, padding:"20px 0", fontSize:13 }}>
                  Cargando...
                </div>
              ) : attPeriod === "week" ? (
                <AttendanceWeekView
                  data={childAttData}
                  weekOffset={weekOffset}
                  onPrev={() => setWeekOffset(p => p + 1)}
                  onNext={() => setWeekOffset(p => Math.max(0, p - 1))}
                  primary={primary} txt={txt} sub={sub}
                  navBord={navBord} isDark={isDark}
                />
              ) : attPeriod === "month" ? (
                <AttendanceMonthView
                  data={childAttData}
                  monthOffset={monthOffset}
                  onPrev={() => setMonthOffset(p => p + 1)}
                  onNext={() => setMonthOffset(p => Math.max(0, p - 1))}
                  txt={txt} sub={sub} navBord={navBord} isDark={isDark}
                />
              ) : (
                <AttendanceYearView
                  data={childAttData}
                  txt={txt} sub={sub} navBord={navBord} isDark={isDark}
                />
              )}
            </WCard>

            {/* ── 4. Contacto con el aula (envío + historial unificados) ── */}
            <WCard style={{ marginBottom:14 }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, #7c3aed, #a855f7)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0 }}>📨</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Contacto con el aula</div>
                  <div style={{ fontSize:11, color:sub }}>Diwy lleva tu mensaje sin interrumpir la clase</div>
                </div>
                <div style={{
                  background: msgsLeft > 0 ? "#f59e0b20" : navBord,
                  color: msgsLeft > 0 ? "#d97706" : sub,
                  borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:800, flexShrink:0,
                }}>
                  {todayMsgCount}/2
                </div>
              </div>

              {/* Warning banner — always visible */}
              <div style={{
                background: isDark ? "rgba(239,68,68,.12)" : "#fff1f2",
                border:"1.5px solid #ef444433",
                borderRadius:10, padding:"9px 12px", marginBottom:12,
                display:"flex", gap:8, alignItems:"flex-start",
              }}>
                <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚠️</span>
                <div style={{ fontSize:11, color: isDark?"#f87171":"#b91c1c", lineHeight:1.55 }}>
                  <strong>Usá este canal solo cuando sea realmente necesario.</strong>{" "}
                  Un mensaje innecesario puede interrumpir la clase o demorar uno más urgente.
                  Para temas que no son urgentes, coordiná una reunión con la institución.
                </div>
              </div>

              {/* Rotating tip */}
              <div style={{ background: isDark?"rgba(255,255,255,.05)":"#f8f5ff",
                borderRadius:10, padding:"7px 12px", marginBottom:12,
                border:"1px solid #7c3aed22" }}>
                <div style={{ fontSize:11, color:"#7c3aed", lineHeight:1.5 }}>
                  💡 {CONTACT_TIPS[showTip]}
                </div>
              </div>

              {/* Send form */}
              {msgsLeft === 0 ? (
                <div style={{ background: isDark?"rgba(245,158,11,.1)":"#fef3c7",
                  border:"1px solid #f59e0b44",
                  borderRadius:12, padding:"12px 14px", fontSize:13,
                  color: isDark?"#f59e0b":"#92400e", textAlign:"center", fontWeight:700 }}>
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
                      onKeyDown={e => e.key==="Enter" && handleOrder()}
                      placeholder="¿Qué querés consultarle a la maestra?"
                      style={{ flex:1, border:`1.5px solid ${orderMsg.trim()?"#7c3aed":inputBd}`,
                        borderRadius:12, padding:"10px 12px", fontSize:13,
                        fontFamily:"Nunito,sans-serif", outline:"none",
                        color:txt, background:inputBg,
                        transition:"border-color .2s, background .3s, color .3s" }}/>
                    <button onClick={handleOrder} disabled={ordering||!orderMsg.trim()} style={{
                      background:(!orderMsg.trim()||ordering)?navBord:"linear-gradient(135deg,#7c3aed,#a855f7)",
                      border:"none", borderRadius:12, padding:"0 18px", color:"white",
                      fontWeight:900, fontSize:16,
                      cursor:(!orderMsg.trim()||ordering)?"not-allowed":"pointer",
                      fontFamily:"Nunito,sans-serif", transition:"all .2s", flexShrink:0,
                    }}>{ordering?"·  ·  ·":"→"}</button>
                  </div>
                  {orderRateErr && (
                    <div style={{ marginTop:10, background:"#fef3c7", borderRadius:10,
                      padding:"8px 12px", fontSize:12, color:"#92400e" }}>
                      ⏳ {orderRateErr}
                    </div>
                  )}
                  {orderSent && (
                    <div style={{ marginTop:10, background:"#7c3aed10",
                      border:"1px solid #7c3aed33", borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ fontSize:11, fontWeight:800, color:"#7c3aed", marginBottom:5 }}>
                        ✅ Diwy lo tiene — se lo hará llegar a la maestra
                      </div>
                      <div style={{ fontSize:13, color:txt, lineHeight:1.55, fontStyle:"italic" }}>
                        "{orderSent.formatted_msg}"
                      </div>
                      <div style={{ fontSize:11, color:sub, marginTop:5 }}>
                        Te notificamos cuando la maestra responda.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Message history — inline, below the form */}
              {childMessages.length > 0 && (
                <div style={{ marginTop:16, paddingTop:14, borderTop:`1.5px solid ${navBord}` }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontWeight:800, fontSize:11, color:sub, letterSpacing:".06em" }}>
                      HISTORIAL
                    </div>
                    {childMessages.length > 1 && (
                      <button onClick={() => setShowAllMsgs(p => !p)}
                        style={{ background:"none", border:"none", cursor:"pointer",
                          fontSize:11, fontWeight:800, color:"#7c3aed",
                          fontFamily:"Nunito,sans-serif", padding:"0 4px" }}>
                        {showAllMsgs ? "Ocultar ▲" : `Ver todos (${childMessages.length}) ▼`}
                      </button>
                    )}
                  </div>
                  {(showAllMsgs ? childMessages : childMessages.slice(0,1)).map(m => (
                    <div key={m.id} style={{
                      border:`1.5px solid ${navBord}`,
                      borderLeft:`3px solid #7c3aed`,
                      borderRadius:10, padding:"10px 12px", marginBottom:8,
                      background: isDark?"rgba(255,255,255,.03)":pageBg,
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start", marginBottom:5 }}>
                        <div style={{ fontSize:10, color:sub }}>
                          {fmtDate(m.created_at)} · {fmtTime(m.created_at)}
                        </div>
                        <span style={{
                          background: m.estado==="replied" ? "#10b98120" : "#f59e0b20",
                          color: m.estado==="replied" ? "#10b981" : "#f59e0b",
                          borderRadius:99, padding:"2px 8px", fontSize:9, fontWeight:900,
                        }}>
                          {m.estado==="replied" ? "✓ Respondido" : "⏳ Pendiente"}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:sub, fontStyle:"italic",
                        marginBottom:m.estado==="replied"?6:0, lineHeight:1.5 }}>
                        "{m.formatted_msg || m.original_msg}"
                      </div>
                      {m.estado==="replied" && m.formatted_reply && (
                        <div style={{ background: isDark?"rgba(255,255,255,.06)":"#f0fdf4",
                          border:"1px solid #10b98133",
                          borderRadius:9, padding:"7px 11px", marginTop:2 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:"#10b981", marginBottom:3 }}>
                            🐾 Diwy (de {m.docente_nombre || "la maestra"}):
                          </div>
                          <div style={{ fontSize:13, color:txt, lineHeight:1.55 }}>{m.formatted_reply}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </WCard>

            {/* ── 6. Reportes ── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, #0ea5e9, #6366f1)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0 }}>📊</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt }}>Reportes</div>
                  <div style={{ fontSize:11, color:sub }}>Seguimiento de {child.nombre.split(" ")[0]}</div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {rptTabBtn("Reporte IA",   "ia",          "🤖")}
                {rptTabBtn("Institución",  "institucion", "🏫")}
              </div>

              {/* Tab: IA */}
              {reportTab === "ia" && (
                <div>
                  <div style={{ fontSize:12, color:sub, lineHeight:1.65, marginBottom:10 }}>
                    Diwy analiza el estado emocional, la asistencia, las observaciones del docente
                    y la conducta para generarte un resumen de {child.nombre.split(" ")[0]}.
                  </div>
                  {/* Privacy note */}
                  <div style={{
                    background: isDark?"rgba(99,102,241,.12)":"#eef2ff",
                    border:"1px solid #6366f133",
                    borderRadius:9, padding:"8px 12px", marginBottom:10,
                    fontSize:11, color: isDark?"#a5b4fc":"#4338ca", lineHeight:1.6,
                  }}>
                    🔒 Las calificaciones se mencionan de forma general para preservar y cuidar
                    los derechos de privacidad del estudiante.
                  </div>
                  {/* Disclaimer */}
                  <div style={{
                    background: isDark?"rgba(255,255,255,.04)":"#f9fafb",
                    border:`1px solid ${navBord}`,
                    borderRadius:9, padding:"8px 12px", marginBottom:14,
                    fontSize:10, color:sub, lineHeight:1.65,
                  }}>
                    ⚠️ <strong style={{ color:txt }}>Aviso:</strong>{" "}
                    Los reportes IA se generan a partir de datos provistos por el estudiante,
                    docentes y la administración, pero pueden contener imprecisiones o no reflejar
                    la situación completa. Si tenés dudas o necesitás información oficial,
                    consultá directamente con la institución.
                  </div>
                  {reportRateErr && (
                    <div style={{ background: isDark?"rgba(245,158,11,.15)":"#fef3c7",
                      borderRadius:10, padding:"8px 12px", fontSize:12,
                      color: isDark?"#f59e0b":"#92400e", marginBottom:12 }}>
                      ⏳ {reportRateErr}
                    </div>
                  )}
                  {iaReport ? (
                    <div>
                      <div style={{ background:`${primary}10`, border:`1px solid ${primary}33`,
                        borderRadius:12, padding:"16px", marginBottom:12 }}>
                        <div style={{ fontSize:10, fontWeight:900, color:primary,
                          marginBottom:10, letterSpacing:".04em" }}>🐾 REPORTE DIWY</div>
                        <div style={{ fontSize:13, color:txt, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
                          {iaReport}
                        </div>
                      </div>
                      <button onClick={handleGenerateReport} disabled={generatingReport}
                        style={{ background:"none", border:`1.5px solid ${primary}44`,
                          borderRadius:10, padding:"8px 16px",
                          color:primary, fontSize:12, fontWeight:800,
                          cursor:"pointer", fontFamily:"Nunito,sans-serif" }}>
                        🔄 Regenerar (límite 2/día)
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleGenerateReport} disabled={generatingReport}
                      style={{
                        width:"100%",
                        background: generatingReport ? navBord
                          : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                        border:"none", borderRadius:14, padding:"16px",
                        color:"white", fontWeight:900, fontSize:14,
                        cursor: generatingReport ? "not-allowed" : "pointer",
                        fontFamily:"Nunito,sans-serif", transition:"all .2s",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      }}>
                      {generatingReport ? "⏳  Generando reporte..." : "✨  Generar reporte ahora"}
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Institución */}
              {reportTab === "institucion" && (
                <div>
                  {!latestReport ? (
                    <div style={{ textAlign:"center", padding:"20px 0" }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                      <div style={{ fontSize:13, color:sub, lineHeight:1.65 }}>
                        Todavía no hay reportes aprobados<br/>para {child.nombre.split(" ")[0]}.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:txt }}>
                          {latestReport.periodo_label}
                        </span>
                        <span style={{ fontSize:11, color:sub }}>
                          {fmtDate(latestReport.approved_at)}
                        </span>
                      </div>
                      <div style={{ fontSize:13, color:txt, lineHeight:1.75,
                        position:"relative", overflow:"hidden",
                        maxHeight: expandedRptId===latestReport.id ? "none" : 100 }}>
                        <div style={{ whiteSpace:"pre-wrap" }}>{latestReport.reporte_final}</div>
                        {expandedRptId !== latestReport.id && (
                          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:40,
                            background:`linear-gradient(transparent, ${cardBg})` }}/>
                        )}
                      </div>
                      <button onClick={() => setExpandedRptId(
                          expandedRptId===latestReport.id ? null : latestReport.id)}
                        style={{ background:"none", border:"none", color:primary,
                          fontWeight:800, fontSize:12, cursor:"pointer",
                          fontFamily:"Nunito,sans-serif", padding:"6px 0 0", display:"block" }}>
                        {expandedRptId===latestReport.id ? "Ver menos ▲" : "Ver completo ▼"}
                      </button>
                      {childReports.length > 1 && (
                        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${navBord}` }}>
                          <div style={{ fontSize:11, color:sub, fontWeight:700, marginBottom:8 }}>
                            Reportes anteriores
                          </div>
                          {childReports.slice(1, 5).map(r => (
                            <div key={r.id} style={{ padding:"6px 0",
                              borderBottom:`1px solid ${navBord}`, fontSize:12,
                              display:"flex", justifyContent:"space-between" }}>
                              <span style={{ color:txt, fontWeight:700 }}>{r.periodo_label}</span>
                              <span style={{ color:sub, fontSize:11 }}>{fmtDate(r.approved_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </WCard>

            {/* ── 7. Actividad reciente ── */}
            {child.recent_txns?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                {sectionLabel("ACTIVIDAD RECIENTE")}
                <WCard style={{ padding:"4px 0" }}>
                  {child.recent_txns.map((tx, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"10px 14px",
                      borderBottom: i<child.recent_txns.length-1 ? `1px solid ${navBord}` : "none" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:txt, fontWeight:600 }}>
                          {tx.descripcion || tx.tipo || "Transacción"}
                        </div>
                        <div style={{ fontSize:10, color:sub, marginTop:1 }}>
                          {new Date(tx.created_at).toLocaleDateString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                      <div style={{ fontWeight:900, fontSize:14, flexShrink:0,
                        color: tx.direccion==="ingreso" ? "#10b981" : "#ef4444" }}>
                        {tx.direccion==="ingreso" ? "+" : "−"}{Math.abs(tx.amount)} 🪙
                      </div>
                    </div>
                  ))}
                </WCard>
              </div>
            )}

            {/* ── 8. Alertas de conducta ── */}
            {child.recent_verdicts?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                {sectionLabel("ALERTAS DE CONDUCTA")}
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
