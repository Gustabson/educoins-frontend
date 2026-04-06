// DiwyPadre.jsx — Full parent dashboard for Diwy.
// Delivers on every promise made in DiwyLanding:
//   ✅ Reportes IA semanales
//   ✅ Solicitar análisis cuando quieras
//   ✅ Preguntale a Diwy (AI Q&A with child's real data)
//   ✅ Datos únicos en tiempo real (balance, mood, streak, activity)
//   ✅ Alertas de conducta (verdicts)
//   🔜 Preview de clase (marked coming soon)

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"long" }) : "";

const moodEmoji = avg => {
  if (!avg) return "—";
  if (avg >= 4.5) return "🌟";
  if (avg >= 3.5) return "😊";
  if (avg >= 2.5) return "😐";
  return "😟";
};

const SEVERITY_ICON = {
  advertencia:    "⚠️",
  sancion:        "🚔",
  grave:          "⛔",
  absolucion:     "⚖️",
  reconocimiento: "🏅",
};

const SUGGESTIONS = [
  "¿Cómo estuvo esta semana?",
  "¿Está bien emocionalmente?",
  "¿Tiene algo pendiente?",
  "¿Cómo fue su comportamiento?",
];

export default function DiwyPadre({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const [snapshot,       setSnapshot]       = useState([]);
  const [reports,        setReports]        = useState([]);
  const [loadingSnap,    setLoadingSnap]    = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedChild,  setSelectedChild]  = useState(null);

  // Ask Diwy
  const [question,    setQuestion]    = useState("");
  const [asking,      setAsking]      = useState(false);
  const [lastAnswer,  setLastAnswer]  = useState(null);
  const [answerIsErr, setAnswerIsErr] = useState(false);

  // Report actions
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
  }, []);

  const child        = snapshot.find(c => c.id === selectedChild);
  const childReports = reports.filter(r => r.student_id === selectedChild);
  const latestReport = childReports[0] || null;

  const handleAsk = async () => {
    if (!question.trim() || !selectedChild || asking) return;
    setAsking(true);
    setLastAnswer(null);
    setAnswerIsErr(false);
    try {
      const d = await api.diwyParentAsk({ studentId: selectedChild, question: question.trim() });
      setLastAnswer(d?.answer || "");
      setQuestion("");
    } catch (e) {
      setAnswerIsErr(true);
      setLastAnswer(e.message || "Error al consultar Diwy");
    } finally {
      setAsking(false);
    }
  };

  const handleRequest = async () => {
    if (!selectedChild || requesting) return;
    setRequesting(true);
    setRateMsg(null);
    try {
      await api.diwyParentRequest(selectedChild);
      showToast?.("Solicitud enviada. El equipo generará el reporte pronto.");
    } catch (e) {
      if (e.code === "RATE_LIMITED") setRateMsg(e.message);
      else showToast?.(e.message || "Error", "error");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>

      {/* ── Header ─────────────────────────────────────────── */}
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
        {/* Child switcher */}
        {snapshot.length > 1 && (
          <div style={{ display:"flex", gap:8, marginTop:14, overflowX:"auto", paddingBottom:2 }}>
            {snapshot.map(c => (
              <button key={c.id} onClick={() => { setSelectedChild(c.id); setLastAnswer(null); setExpandedId(null); }}
                style={{
                  background: c.id === selectedChild ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.18)",
                  border:"none", borderRadius:99, padding:"5px 16px",
                  color: c.id === selectedChild ? primary : "white",
                  fontWeight:800, fontSize:12, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", whiteSpace:"nowrap", flexShrink:0,
                  transition:"all .2s",
                }}>
                {c.nombre.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"16px 14px 48px" }}>

        {loadingSnap ? (
          <div style={{ textAlign:"center", color:sub, padding:48, transition:"color .3s" }}>
            Cargando...
          </div>
        ) : !child ? (
          <WCard style={{ textAlign:"center", padding:36, marginTop:8 }}>
            <div style={{ fontSize:44, marginBottom:10 }}>🔗</div>
            <div style={{ fontWeight:800, fontSize:16, color:txt, marginBottom:6,
              transition:"color .3s" }}>Sin hijos vinculados</div>
            <div style={{ fontSize:13, color:sub, lineHeight:1.6, transition:"color .3s" }}>
              Vinculá tu cuenta con la de tu hijo/a<br/>desde el menú de inicio → Vincular.
            </div>
          </WCard>
        ) : (
          <>
            {/* ── Quick Stats ─────────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              <WCard style={{ padding:"14px 10px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:3 }}>🪙</div>
                <div style={{ fontWeight:900, fontSize:17, color:primary,
                  transition:"color .3s" }}>
                  {child.balance ?? "—"}
                </div>
                <div style={{ fontSize:10, color:sub, marginTop:2,
                  transition:"color .3s" }}>Balance</div>
              </WCard>
              <WCard style={{ padding:"14px 10px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:3 }}>
                  {moodEmoji(child.mood_avg)}
                </div>
                <div style={{ fontWeight:900, fontSize:17, color:primary,
                  transition:"color .3s" }}>
                  {child.mood_avg ? `${child.mood_avg}/5` : "—"}
                </div>
                <div style={{ fontSize:10, color:sub, marginTop:2,
                  transition:"color .3s" }}>Estado</div>
              </WCard>
              <WCard style={{ padding:"14px 10px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:3 }}>🔥</div>
                <div style={{ fontWeight:900, fontSize:17, color:primary,
                  transition:"color .3s" }}>
                  {child.checkin_streak ?? 0}d
                </div>
                <div style={{ fontSize:10, color:sub, marginTop:2,
                  transition:"color .3s" }}>Racha</div>
              </WCard>
            </div>

            {/* ── Preguntale a Diwy ───────────────────────── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`linear-gradient(135deg, ${primary}, #7c3aed)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0 }}>🤔</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt,
                    transition:"color .3s" }}>Preguntale a Diwy</div>
                  <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                    IA responde con datos reales de {child.nombre.split(" ")[0]}
                  </div>
                </div>
              </div>

              {/* Quick suggestions */}
              <div style={{ display:"flex", gap:6, overflowX:"auto",
                marginBottom:10, paddingBottom:2 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setQuestion(s)}
                    style={{
                      background:`${primary}15`, border:`1px solid ${primary}40`,
                      borderRadius:99, padding:"5px 12px", fontSize:11, fontWeight:700,
                      color:primary, cursor:"pointer", whiteSpace:"nowrap",
                      fontFamily:"Nunito,sans-serif", flexShrink:0,
                      transition:"background .2s, color .3s",
                    }}>{s}</button>
                ))}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAsk()}
                  placeholder="¿Qué querés saber sobre tu hijo/a?"
                  style={{
                    flex:1, border:`1.5px solid ${question.trim() ? primary : inputBd}`,
                    borderRadius:12, padding:"10px 12px", fontSize:13,
                    fontFamily:"Nunito,sans-serif", outline:"none",
                    color:txt, background:inputBg,
                    transition:"border-color .2s, background .3s, color .3s",
                  }}
                />
                <button onClick={handleAsk}
                  disabled={asking || !question.trim()}
                  style={{
                    background: (!question.trim() || asking)
                      ? navBord
                      : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                    border:"none", borderRadius:12, padding:"0 18px",
                    color:"white", fontWeight:900, fontSize:16,
                    cursor:(!question.trim() || asking) ? "not-allowed" : "pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    flexShrink:0,
                  }}>
                  {asking ? "·  ·  ·" : "→"}
                </button>
              </div>

              {lastAnswer && (
                <div style={{
                  marginTop:12,
                  background: answerIsErr
                    ? (isDark ? "#422" : "#fef3c7")
                    : `${primary}12`,
                  border:`1px solid ${answerIsErr ? "#f59e0b55" : primary + "33"}`,
                  borderRadius:12, padding:"12px 14px",
                  transition:"background .3s",
                }}>
                  <div style={{
                    fontSize:11, fontWeight:800, marginBottom:6,
                    color: answerIsErr ? "#92400e" : primary,
                    transition:"color .3s",
                  }}>
                    {answerIsErr ? "⏳ Aviso" : "🐾 Diwy dice:"}
                  </div>
                  <div style={{ fontSize:13, color:txt, lineHeight:1.65,
                    whiteSpace:"pre-wrap", transition:"color .3s" }}>
                    {lastAnswer}
                  </div>
                </div>
              )}
            </WCard>

            {/* ── Último reporte ──────────────────────────── */}
            <WCard style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:12,
                  background:`${primary}18`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0, transition:"background .3s" }}>📊</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:14, color:txt,
                    transition:"color .3s" }}>Último reporte IA</div>
                  <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                    Generado y revisado por el equipo docente
                  </div>
                </div>
              </div>

              {loadingReports ? (
                <div style={{ color:sub, fontSize:13, padding:"4px 0",
                  transition:"color .3s" }}>Cargando...</div>
              ) : !latestReport ? (
                <div style={{ fontSize:13, color:sub, padding:"4px 0",
                  lineHeight:1.55, transition:"color .3s" }}>
                  Todavía no hay reportes publicados para {child.nombre.split(" ")[0]}.<br/>
                  Solicitá uno abajo y el equipo lo generará pronto.
                </div>
              ) : (
                <>
                  <div style={{ fontSize:11, color:sub, marginBottom:8,
                    transition:"color .3s" }}>
                    {latestReport.periodo_label} · Publicado el {fmtDate(latestReport.approved_at)}
                  </div>
                  <div style={{
                    fontSize:13, color:txt, lineHeight:1.65, position:"relative",
                    overflow:"hidden",
                    maxHeight: expandedId === latestReport.id ? "none" : 80,
                    transition:"color .3s",
                  }}>
                    <div style={{ whiteSpace:"pre-wrap" }}>{latestReport.reporte_final}</div>
                    {expandedId !== latestReport.id && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:36,
                        background:`linear-gradient(transparent, ${cardBg})`,
                        transition:"background .3s" }}/>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === latestReport.id ? null : latestReport.id)}
                    style={{ background:"none", border:"none", color:primary, fontWeight:800,
                      fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                      padding:"6px 0 0", display:"block", transition:"color .3s" }}>
                    {expandedId === latestReport.id ? "Ver menos ▲" : "Ver completo ▼"}
                  </button>
                </>
              )}

              <div style={{ marginTop:12, paddingTop:10,
                borderTop:`1px solid ${navBord}`, transition:"border-color .3s" }}>
                {rateMsg && (
                  <div style={{ background:"#fef3c7", borderRadius:10, padding:"8px 12px",
                    fontSize:12, color:"#92400e", marginBottom:8 }}>
                    ⏳ {rateMsg}
                  </div>
                )}
                <button onClick={handleRequest} disabled={requesting}
                  style={{
                    width:"100%",
                    background: requesting ? navBord : `${primary}15`,
                    border:`1.5px dashed ${primary}55`, borderRadius:12, padding:"11px",
                    cursor:requesting ? "not-allowed" : "pointer",
                    fontFamily:"Nunito,sans-serif", color:primary,
                    fontWeight:800, fontSize:13, transition:"all .2s",
                  }}>
                  {requesting ? "Enviando..." : "📨 Solicitar nuevo reporte"}
                </button>
              </div>
            </WCard>

            {/* ── Actividad reciente ──────────────────────── */}
            {child.recent_txns?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:8, paddingLeft:4,
                  transition:"color .3s" }}>
                  ACTIVIDAD RECIENTE
                </div>
                <WCard style={{ padding:"4px 0" }}>
                  {child.recent_txns.map((tx, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"10px 14px",
                      borderBottom: i < child.recent_txns.length - 1
                        ? `1px solid ${navBord}` : "none",
                      transition:"border-color .3s",
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:txt, fontWeight:600,
                          transition:"color .3s" }}>
                          {tx.descripcion || tx.tipo || "Transacción"}
                        </div>
                        <div style={{ fontSize:10, color:sub, marginTop:1,
                          transition:"color .3s" }}>
                          {new Date(tx.created_at).toLocaleDateString("es-AR",{
                            day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"
                          })}
                        </div>
                      </div>
                      <div style={{
                        fontWeight:900, fontSize:14, flexShrink:0,
                        color: tx.direccion === "ingreso" ? "#10b981" : "#ef4444",
                      }}>
                        {tx.direccion === "ingreso" ? "+" : "−"}{Math.abs(tx.amount)} 🪙
                      </div>
                    </div>
                  ))}
                </WCard>
              </div>
            )}

            {/* ── Veredictos ──────────────────────────────── */}
            {child.recent_verdicts?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:11, color:sub,
                  letterSpacing:".07em", marginBottom:8, paddingLeft:4,
                  transition:"color .3s" }}>
                  ALERTAS DE CONDUCTA
                </div>
                {child.recent_verdicts.map((v, i) => (
                  <div key={i} style={{
                    background:cardBg,
                    border:`1.5px solid ${navBord}`,
                    borderLeft:`3px solid ${primary}`,
                    borderRadius:12, padding:"10px 14px", marginBottom:7,
                    display:"flex", gap:10, alignItems:"center",
                    transition:"background .3s, border .3s",
                  }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>
                      {SEVERITY_ICON[v.severity] || "📋"}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:txt,
                        textTransform:"capitalize", transition:"color .3s" }}>
                        {v.severity}
                      </div>
                      <div style={{ fontSize:11, color:sub, marginTop:2,
                        transition:"color .3s" }}>
                        {fmtDate(v.created_at)}
                        {v.coins_penalty ? ` · −${Math.abs(v.coins_penalty)} 🪙` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Preview de clase · Próximamente ─────────── */}
            <div style={{
              border:`1.5px dashed ${navBord}`,
              borderRadius:14, padding:"18px 20px", textAlign:"center",
              opacity:.55, transition:"border-color .3s",
            }}>
              <div style={{ fontSize:30, marginBottom:6 }}>🗓️</div>
              <div style={{ fontWeight:900, fontSize:13, color:txt, marginBottom:4,
                transition:"color .3s" }}>Preview de clase · Próximamente</div>
              <div style={{ fontSize:12, color:sub, transition:"color .3s" }}>
                Sabé de qué se trata la próxima clase antes de que empiece.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
