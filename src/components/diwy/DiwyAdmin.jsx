// DiwyAdmin.jsx — Admin view of Diwy.
// Access: admin role only (enforced server-side).
// Can: view all students, add/delete observations, generate/review/approve reports.

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" }) : "";

function EstadoBadge({ estado, primary, sub }) {
  if (!estado) return (
    <span style={{ background:`${sub}18`, color:sub, borderRadius:99,
      padding:"2px 10px", fontSize:11, fontWeight:800, transition:"color .3s" }}>
      Sin reporte
    </span>
  );
  const MAP = {
    draft:              { label:"Borrador",    bg:`${sub}15`,     color:sub     },
    pendiente_revision: { label:"En revisión", bg:"#f9730018",    color:"#f97300" },
    aprobado:           { label:"Publicado",   bg:`${primary}18`, color:primary },
  };
  const b = MAP[estado] || { label:estado, bg:`${sub}15`, color:sub };
  return (
    <span style={{ background:b.bg, color:b.color, borderRadius:99,
      padding:"2px 10px", fontSize:11, fontWeight:800, transition:"color .3s, background .3s" }}>
      {b.label}
    </span>
  );
}

// ── Main list ─────────────────────────────────────────────────
export default function DiwyAdmin({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [view,     setView]     = useState("list");
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const loadStudents = () => {
    setLoading(true);
    api.diwyStudents()
      .then(d => setStudents(Array.isArray(d) ? d : d?.data || []))
      .catch(e => showToast?.(e.message || "Error cargando alumnos", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, []); // eslint-disable-line

  if (view === "detail" && selected) {
    return (
      <StudentDetail
        student={selected}
        showToast={showToast}
        onBack={() => { setView("list"); setSelected(null); loadStudents(); }}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-60, right:-50, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
            borderRadius:50, width:36, height:36, display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", color:"white", fontSize:18,
            fontFamily:"Nunito,sans-serif" }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🐾 Diwy</div>
            <div style={{ fontSize:13, opacity:.85 }}>Asistente Preceptor IA</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 14px" }}>
        {loading && (
          <div style={{ textAlign:"center", color:sub, padding:32, transition:"color .3s" }}>
            Cargando alumnos...
          </div>
        )}
        {!loading && students.length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:36 }}>🐾</div>
            <div style={{ fontWeight:800, color:txt, marginTop:8, transition:"color .3s" }}>
              Sin alumnos activos
            </div>
          </WCard>
        )}
        {students.map(s => (
          <WCard key={s.id} onClick={() => { setSelected(s); setView("detail"); }}
            style={{ marginBottom:10, cursor:"pointer", display:"flex",
              alignItems:"center", gap:14, padding:"14px 16px" }}>
            <div style={{ width:46, height:46, borderRadius:13, background:`${primary}18`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, flexShrink:0 }}>👤</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>
                {s.nombre}
              </div>
              <div style={{ fontSize:12, color:sub, marginTop:2, transition:"color .3s" }}>
                🪙 {s.balance} monedas
              </div>
              <div style={{ marginTop:6 }}>
                <EstadoBadge estado={s.last_report_estado} primary={primary} sub={sub} />
                {s.last_report_at && (
                  <span style={{ fontSize:10, color:sub, marginLeft:8, transition:"color .3s" }}>
                    {fmtDate(s.last_report_at)}
                  </span>
                )}
              </div>
            </div>
            <span style={{ color:sub, fontSize:18, transition:"color .3s" }}>›</span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

// ── Student detail (two tabs) ─────────────────────────────────
function StudentDetail({ student, showToast, onBack }) {
  const { primary, txt, sub, pageBg, navBord } = useTheme();
  const [activeTab, setActiveTab] = useState("obs");

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 18px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:180, height:180, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-40, right:-30, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", marginBottom:14 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
            borderRadius:50, width:36, height:36, display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", color:"white", fontSize:18,
            fontFamily:"Nunito,sans-serif" }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:20 }}>🐾 {student.nombre}</div>
            <div style={{ fontSize:12, opacity:.8 }}>🪙 {student.balance} monedas</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[{ id:"obs", label:"📋 Observaciones" }, { id:"reports", label:"📄 Reportes" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ background: activeTab===t.id ? "white" : "rgba(255,255,255,.2)",
                color: activeTab===t.id ? primary : "white",
                border:"none", borderRadius:99, padding:"6px 16px",
                fontSize:12, fontWeight:800, cursor:"pointer",
                fontFamily:"Nunito,sans-serif", transition:"all .2s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 14px 32px" }}>
        {activeTab === "obs"     && <ObsTab     student={student} showToast={showToast} />}
        {activeTab === "reports" && <ReportsTab student={student} showToast={showToast} />}
      </div>
    </div>
  );
}

// ── Observations tab ──────────────────────────────────────────
function ObsTab({ student, showToast }) {
  const { primary, txt, sub, cardBg, navBord, inputBg, inputBd } = useTheme();
  const [obs,     setObs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto,   setTexto]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const loadObs = () => {
    setLoading(true);
    api.diwyObservations(student.id)
      .then(d => setObs(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadObs(); }, [student.id]); // eslint-disable-line

  const addObs = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await api.diwyAddObs({ student_id: student.id, texto: texto.trim() });
      showToast?.("Observación guardada");
      setTexto("");
      loadObs();
    } catch (e) {
      showToast?.(e.message || "Error al guardar", "error");
    } finally { setSaving(false); }
  };

  const deleteObs = async (id) => {
    try {
      await api.diwyDeleteObs(id);
      showToast?.("Observación eliminada");
      setObs(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      showToast?.(e.message || "Error", "error");
    }
  };

  return (
    <div>
      <WCard style={{ marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8,
          transition:"color .3s" }}>Nueva observación</div>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribí tu observación sobre el alumno esta semana..."
          rows={3}
          style={{ width:"100%", boxSizing:"border-box", border:`1.5px solid ${inputBd}`,
            borderRadius:12, padding:"10px 12px", fontSize:13, outline:"none",
            fontFamily:"Nunito,sans-serif", resize:"vertical", marginBottom:10,
            color:txt, background:inputBg,
            transition:"background .3s, color .3s, border-color .3s" }}
        />
        <button onClick={addObs} disabled={saving || !texto.trim()}
          style={{ width:"100%", background: saving || !texto.trim() ? navBord : primary,
            border:"none", borderRadius:50, color:"white", padding:"11px",
            fontWeight:800, fontSize:13, cursor: saving || !texto.trim() ? "not-allowed" : "pointer",
            fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
          {saving ? "Guardando..." : "Guardar observación"}
        </button>
      </WCard>

      {loading && (
        <div style={{ textAlign:"center", color:sub, padding:24, transition:"color .3s" }}>
          Cargando...
        </div>
      )}
      {!loading && obs.length === 0 && (
        <WCard style={{ textAlign:"center", padding:28 }}>
          <div style={{ fontSize:30 }}>📋</div>
          <div style={{ fontWeight:700, color:sub, marginTop:8, transition:"color .3s" }}>
            Sin observaciones aún
          </div>
        </WCard>
      )}
      {obs.map(o => (
        <WCard key={o.id} style={{ marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:6 }}>
            <div>
              <span style={{ fontWeight:800, fontSize:12, color:primary, transition:"color .3s" }}>
                Semana del {o.semana}
              </span>
              <span style={{ fontSize:11, color:sub, marginLeft:8, transition:"color .3s" }}>
                {o.docente_nombre}
              </span>
            </div>
            <button onClick={() => deleteObs(o.id)}
              style={{ background:"none", border:"none", color:sub,
                fontSize:16, cursor:"pointer", fontFamily:"Nunito,sans-serif",
                padding:"0 4px", transition:"color .3s" }}>×</button>
          </div>
          <div style={{ fontSize:13, color:txt, lineHeight:1.55, transition:"color .3s" }}>
            {o.texto}
          </div>
        </WCard>
      ))}
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────
function ReportsTab({ student, showToast }) {
  const { primary, txt, sub, cardBg, navBord, inputBg, inputBd } = useTheme();
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [editTexts,   setEditTexts]   = useState({});
  const [savingId,    setSavingId]    = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const loadReports = () => {
    setLoading(true);
    api.diwyReports(student.id)
      .then(d => setReports(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, [student.id]); // eslint-disable-line

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await api.diwyGenerate(student.id);
      const report = r?.data || r;
      showToast?.("Reporte generado");
      setReports(prev => [report, ...prev]);
      setExpandedId(report.id);
    } catch (e) {
      showToast?.(e.message || "Error al generar reporte", "error");
    } finally { setGenerating(false); }
  };

  const saveReview = async (id) => {
    const text = editTexts[id] || "";
    if (!text.trim()) return;
    setSavingId(id);
    try {
      const r = await api.diwyReview(id, { reporte_final: text.trim() });
      showToast?.("Revisión guardada");
      setReports(prev => prev.map(rep => rep.id === id ? (r?.data || r) : rep));
    } catch (e) {
      showToast?.(e.message || "Error", "error");
    } finally { setSavingId(null); }
  };

  const approve = async (id) => {
    setApprovingId(id);
    try {
      const r = await api.diwyApprove(id);
      showToast?.("Reporte publicado al padre");
      setReports(prev => prev.map(rep => rep.id === id ? (r?.data || r) : rep));
    } catch (e) {
      showToast?.(e.message || "Error", "error");
    } finally { setApprovingId(null); }
  };

  return (
    <div>
      <button onClick={generate} disabled={generating}
        style={{ width:"100%", background: generating ? navBord : primary,
          border:"none", borderRadius:50, color:"white", padding:"13px",
          fontWeight:800, fontSize:14, cursor: generating ? "not-allowed" : "pointer",
          fontFamily:"Nunito,sans-serif", marginBottom:16, transition:"background .2s",
          boxShadow: generating ? "none" : `0 4px 16px ${primary}44` }}>
        {generating ? "Generando reporte..." : "🐾 Generar Reporte IA"}
      </button>

      {loading && (
        <div style={{ textAlign:"center", color:sub, padding:24, transition:"color .3s" }}>
          Cargando...
        </div>
      )}
      {!loading && reports.length === 0 && (
        <WCard style={{ textAlign:"center", padding:28 }}>
          <div style={{ fontSize:30 }}>📄</div>
          <div style={{ fontWeight:700, color:sub, marginTop:8, transition:"color .3s" }}>
            Sin reportes generados
          </div>
          <div style={{ fontSize:12, color:sub, marginTop:4, transition:"color .3s" }}>
            Generá el primer reporte IA para este alumno
          </div>
        </WCard>
      )}

      {reports.map(r => {
        const expanded = expandedId === r.id;
        return (
          <WCard key={r.id} style={{ marginBottom:10 }}>
            {/* Summary row */}
            <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
              onClick={() => setExpandedId(expanded ? null : r.id)}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:13, color:txt, transition:"color .3s" }}>
                  {r.periodo_label}
                </div>
                <div style={{ fontSize:11, color:sub, marginTop:2, transition:"color .3s" }}>
                  {fmtDate(r.created_at)}
                </div>
                <div style={{ marginTop:6 }}>
                  <EstadoBadge estado={r.estado} primary={primary} sub={sub} />
                </div>
              </div>
              <span style={{ color:sub, fontSize:18, transition:"color .3s" }}>
                {expanded ? "▲" : "▼"}
              </span>
            </div>

            {expanded && (
              <div style={{ marginTop:14, paddingTop:14,
                borderTop:`1px solid ${navBord}`, transition:"border-color .3s" }}>

                <div style={{ fontWeight:800, fontSize:12, color:primary, marginBottom:6,
                  transition:"color .3s" }}>
                  Reporte generado por IA:
                </div>
                <div style={{ background:`${primary}10`, borderRadius:12, padding:"12px 14px",
                  fontSize:13, color:txt, lineHeight:1.65, whiteSpace:"pre-wrap", marginBottom:14,
                  transition:"background .3s, color .3s" }}>
                  {r.reporte_ia}
                </div>

                {r.estado === "draft" && (
                  <>
                    <div style={{ fontWeight:800, fontSize:12, color:sub, marginBottom:6,
                      transition:"color .3s" }}>
                      Editar antes de publicar (opcional):
                    </div>
                    <textarea
                      value={editTexts[r.id] !== undefined ? editTexts[r.id] : (r.reporte_final || r.reporte_ia || "")}
                      onChange={e => setEditTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                      rows={6}
                      style={{ width:"100%", boxSizing:"border-box", border:`1.5px solid ${inputBd}`,
                        borderRadius:12, padding:"10px 12px", fontSize:13, outline:"none",
                        fontFamily:"Nunito,sans-serif", resize:"vertical", marginBottom:10,
                        color:txt, background:inputBg,
                        transition:"background .3s, color .3s, border-color .3s" }}
                    />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => saveReview(r.id)} disabled={savingId === r.id}
                        style={{ flex:1, background: savingId===r.id ? navBord : sub,
                          border:"none", borderRadius:50, color:"white", padding:"10px",
                          fontWeight:800, fontSize:12, cursor: savingId===r.id ? "not-allowed" : "pointer",
                          fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                        {savingId === r.id ? "Guardando..." : "Guardar revisión"}
                      </button>
                      <button onClick={() => approve(r.id)} disabled={approvingId === r.id}
                        style={{ flex:1, background: approvingId===r.id ? navBord : primary,
                          border:"none", borderRadius:50, color:"white", padding:"10px",
                          fontWeight:800, fontSize:12, cursor: approvingId===r.id ? "not-allowed" : "pointer",
                          fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                        {approvingId === r.id ? "Aprobando..." : "✅ Aprobar y publicar"}
                      </button>
                    </div>
                  </>
                )}

                {r.estado === "pendiente_revision" && (
                  <>
                    <div style={{ fontWeight:800, fontSize:12, color:"#f97300", marginBottom:6 }}>
                      Texto revisado:
                    </div>
                    <div style={{ background:"#f9730010", borderRadius:12, padding:"12px 14px",
                      fontSize:13, color:txt, lineHeight:1.65, whiteSpace:"pre-wrap",
                      marginBottom:12, transition:"color .3s" }}>
                      {r.reporte_final}
                    </div>
                    <button onClick={() => approve(r.id)} disabled={approvingId === r.id}
                      style={{ width:"100%", background: approvingId===r.id ? navBord : primary,
                        border:"none", borderRadius:50, color:"white", padding:"11px",
                        fontWeight:800, fontSize:13, cursor: approvingId===r.id ? "not-allowed" : "pointer",
                        fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                      {approvingId === r.id ? "Aprobando..." : "✅ Aprobar y publicar"}
                    </button>
                  </>
                )}

                {r.estado === "aprobado" && (
                  <>
                    <div style={{ fontWeight:800, fontSize:12, color:primary, marginBottom:6,
                      transition:"color .3s" }}>
                      Texto publicado al padre:
                    </div>
                    <div style={{ background:`${primary}10`, borderRadius:12, padding:"12px 14px",
                      fontSize:13, color:txt, lineHeight:1.65, whiteSpace:"pre-wrap",
                      marginBottom:10, transition:"background .3s, color .3s" }}>
                      {r.reporte_final}
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ background:`${primary}18`, color:primary, borderRadius:99,
                        padding:"4px 16px", fontSize:12, fontWeight:800,
                        transition:"background .3s, color .3s" }}>
                        ✓ Publicado · {fmtDate(r.approved_at)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </WCard>
        );
      })}
    </div>
  );
}
