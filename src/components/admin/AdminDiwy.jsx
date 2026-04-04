import { useState, useEffect } from "react";
import { api } from "../../api";
import { WCard } from "../shared/index";

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "";

const ESTADO_BADGE = {
  draft:               { label: "Borrador",           bg: "#64748b18", color: "#64748b" },
  pendiente_revision:  { label: "En revisión",        bg: "#f9730018", color: "#f97300" },
  aprobado:            { label: "Publicado al padre",  bg: "#10b98118", color: "#10b981" },
};

function EstadoBadge({ estado }) {
  if (!estado) return (
    <span style={{ background: "#f0f0f0", color: "#aaa", borderRadius: 99,
      padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>Sin reporte</span>
  );
  const b = ESTADO_BADGE[estado] || { label: estado, bg: "#f0f0f0", color: "#888" };
  return (
    <span style={{ background: b.bg, color: b.color, borderRadius: 99,
      padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>{b.label}</span>
  );
}

// ── AdminDiwy ─────────────────────────────────────────────────
function AdminDiwy({ showToast, onBack }) {
  const [view, setView]         = useState("list"); // "list" | "detail"
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const loadStudents = () => {
    setLoading(true);
    api.diwyStudents()
      .then(d => setStudents(Array.isArray(d) ? d : []))
      .catch(e => showToast(e.message || "Error cargando alumnos", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, []); // eslint-disable-line

  const openDetail = (student) => {
    setSelected(student);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelected(null);
    loadStudents(); // refresh after returning
  };

  if (view === "detail" && selected) {
    return (
      <StudentDetail
        student={selected}
        showToast={showToast}
        onBack={goBack}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      {/* Header */}
      <div style={{ background: "#7c3aed", color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
        textShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -60, right: -50, pointerEvents: "none" }} />
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.2)", border: "none",
          borderRadius: 99, color: "white", padding: "5px 14px", fontSize: 12, fontWeight: 800,
          cursor: "pointer", fontFamily: "Nunito,sans-serif", marginBottom: 12 }}>← Volver</button>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>🐾 Diwy</div>
        <div style={{ fontSize: 13, opacity: .85 }}>Asistente Preceptor IA</div>
      </div>

      <div style={{ padding: "16px 14px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Cargando alumnos...</div>
        )}
        {!loading && students.length === 0 && (
          <WCard style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 36 }}>🐾</div>
            <div style={{ fontWeight: 800, color: "#1a1a1a", marginTop: 8 }}>Sin alumnos activos</div>
          </WCard>
        )}
        {students.map(s => (
          <WCard key={s.id} onClick={() => openDetail(s)}
            style={{ marginBottom: 10, cursor: "pointer", display: "flex",
              alignItems: "center", gap: 14, padding: "14px 16px" }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "#7c3aed18",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a1a" }}>{s.nombre}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>🪙 {s.balance} monedas</div>
              <div style={{ marginTop: 6 }}>
                <EstadoBadge estado={s.last_report_estado} />
                {s.last_report_at && (
                  <span style={{ fontSize: 10, color: "#bbb", marginLeft: 8 }}>
                    {fmtDate(s.last_report_at)}
                  </span>
                )}
              </div>
            </div>
            <span style={{ color: "#ddd", fontSize: 18 }}>›</span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

// ── StudentDetail ─────────────────────────────────────────────
function StudentDetail({ student, showToast, onBack }) {
  const [activeTab, setActiveTab] = useState("obs"); // "obs" | "reports"

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      {/* Header */}
      <div style={{ background: "#7c3aed", color: "white", padding: "52px 20px 20px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
        textShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%",
          background: "rgba(255,255,255,.08)", top: -40, right: -30, pointerEvents: "none" }} />
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.2)", border: "none",
          borderRadius: 99, color: "white", padding: "5px 14px", fontSize: 12, fontWeight: 800,
          cursor: "pointer", fontFamily: "Nunito,sans-serif", marginBottom: 12 }}>← Alumnos</button>
        <div style={{ fontWeight: 900, fontSize: 20 }}>🐾 {student.nombre}</div>
        <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>🪙 {student.balance} monedas</div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {[{ id: "obs", label: "📋 Observaciones" }, { id: "reports", label: "📄 Reportes" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ background: activeTab === t.id ? "white" : "rgba(255,255,255,.2)",
                color: activeTab === t.id ? "#7c3aed" : "white",
                border: "none", borderRadius: 99, padding: "6px 16px",
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                fontFamily: "Nunito,sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 14px" }}>
        {activeTab === "obs" && (
          <ObservationsTab student={student} showToast={showToast} />
        )}
        {activeTab === "reports" && (
          <ReportsTab student={student} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

// ── ObservationsTab ───────────────────────────────────────────
function ObservationsTab({ student, showToast }) {
  const [obs, setObs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto]     = useState("");
  const [saving, setSaving]   = useState(false);

  const loadObs = () => {
    setLoading(true);
    api.diwyObservations(student.id)
      .then(d => setObs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadObs(); }, [student.id]); // eslint-disable-line

  const addObs = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await api.diwyAddObs({ student_id: student.id, texto: texto.trim() });
      showToast("Observación guardada");
      setTexto("");
      loadObs();
    } catch (e) {
      showToast(e.message || "Error al guardar", "error");
    } finally { setSaving(false); }
  };

  const deleteObs = async (id) => {
    try {
      await api.diwyDeleteObs(id);
      showToast("Observación eliminada");
      setObs(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      showToast(e.message || "Error al eliminar", "error");
    }
  };

  return (
    <div>
      {/* Add observation */}
      <WCard style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1a1a", marginBottom: 10 }}>
          Nueva observación
        </div>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribí tu observación sobre el alumno esta semana..."
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8e8e8",
            borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none",
            fontFamily: "Nunito,sans-serif", resize: "vertical", marginBottom: 10 }}
        />
        <button onClick={addObs} disabled={saving || !texto.trim()}
          style={{ width: "100%", background: saving || !texto.trim() ? "#ccc" : "#7c3aed",
            border: "none", borderRadius: 50, color: "white", padding: "11px",
            fontWeight: 800, fontSize: 13, cursor: saving || !texto.trim() ? "not-allowed" : "pointer",
            fontFamily: "Nunito,sans-serif" }}>
          {saving ? "Guardando..." : "Guardar observación"}
        </button>
      </WCard>

      {/* List */}
      {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Cargando...</div>}
      {!loading && obs.length === 0 && (
        <WCard style={{ textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 30 }}>📋</div>
          <div style={{ fontWeight: 700, color: "#aaa", marginTop: 8 }}>Sin observaciones aún</div>
        </WCard>
      )}
      {obs.map(o => (
        <WCard key={o.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 12, color: "#7c3aed" }}>
                Semana del {o.semana}
              </span>
              <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>
                {o.docente_nombre}
              </span>
            </div>
            <button onClick={() => deleteObs(o.id)}
              style={{ background: "#ef444418", border: "none", borderRadius: 8,
                color: "#ef4444", padding: "3px 10px", fontSize: 11, fontWeight: 800,
                cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{o.texto}</div>
        </WCard>
      ))}
    </div>
  );
}

// ── ReportsTab ────────────────────────────────────────────────
function ReportsTab({ student, showToast }) {
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [editTexts, setEditTexts]     = useState({}); // id -> string
  const [savingId, setSavingId]       = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const loadReports = () => {
    setLoading(true);
    api.diwyReports(student.id)
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, [student.id]); // eslint-disable-line

  const generate = async () => {
    setGenerating(true);
    try {
      const report = await api.diwyGenerate(student.id);
      showToast("Reporte generado");
      setReports(prev => [report, ...prev]);
      setExpandedId(report.id);
    } catch (e) {
      showToast(e.message || "Error al generar reporte", "error");
    } finally { setGenerating(false); }
  };

  const saveReview = async (id) => {
    const text = editTexts[id] || "";
    if (!text.trim()) return;
    setSavingId(id);
    try {
      const updated = await api.diwyReview(id, { reporte_final: text.trim() });
      showToast("Revisión guardada");
      setReports(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) {
      showToast(e.message || "Error al guardar revisión", "error");
    } finally { setSavingId(null); }
  };

  const approve = async (id) => {
    setApprovingId(id);
    try {
      const updated = await api.diwyApprove(id);
      showToast("Reporte aprobado y publicado al padre");
      setReports(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) {
      showToast(e.message || "Error al aprobar", "error");
    } finally { setApprovingId(null); }
  };

  return (
    <div>
      {/* Generate button */}
      <button onClick={generate} disabled={generating}
        style={{ width: "100%", background: generating ? "#ccc" : "#7c3aed",
          border: "none", borderRadius: 50, color: "white", padding: "13px",
          fontWeight: 800, fontSize: 14, cursor: generating ? "not-allowed" : "pointer",
          fontFamily: "Nunito,sans-serif", marginBottom: 16 }}>
        {generating ? "Generando reporte..." : "🐾 Generar Reporte IA"}
      </button>

      {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Cargando...</div>}
      {!loading && reports.length === 0 && (
        <WCard style={{ textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 30 }}>📄</div>
          <div style={{ fontWeight: 700, color: "#aaa", marginTop: 8 }}>Sin reportes generados</div>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
            Generá el primer reporte IA para este alumno
          </div>
        </WCard>
      )}
      {reports.map(r => {
        const expanded = expandedId === r.id;
        return (
          <WCard key={r.id} style={{ marginBottom: 10 }}>
            {/* Summary row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : r.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1a1a" }}>{r.periodo_label}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{fmtDate(r.created_at)}</div>
                <div style={{ marginTop: 6 }}><EstadoBadge estado={r.estado} /></div>
              </div>
              <span style={{ color: "#ccc", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
            </div>

            {/* Expanded content */}
            {expanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
                {/* AI report text */}
                <div style={{ fontWeight: 800, fontSize: 12, color: "#7c3aed", marginBottom: 6 }}>
                  Reporte generado por IA:
                </div>
                <div style={{ background: "#f8f4ff", borderRadius: 12, padding: "12px 14px",
                  fontSize: 13, color: "#333", lineHeight: 1.65, whiteSpace: "pre-wrap",
                  marginBottom: 14 }}>
                  {r.reporte_ia}
                </div>

                {/* Draft: edit + approve */}
                {r.estado === "draft" && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                      Editar antes de publicar (opcional):
                    </div>
                    <textarea
                      value={editTexts[r.id] !== undefined ? editTexts[r.id] : (r.reporte_final || r.reporte_ia || "")}
                      onChange={e => setEditTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                      rows={6}
                      style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8e8e8",
                        borderRadius: 12, padding: "10px 12px", fontSize: 13, outline: "none",
                        fontFamily: "Nunito,sans-serif", resize: "vertical", marginBottom: 10 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveReview(r.id)}
                        disabled={savingId === r.id}
                        style={{ flex: 1, background: savingId === r.id ? "#ccc" : "#64748b",
                          border: "none", borderRadius: 50, color: "white", padding: "10px",
                          fontWeight: 800, fontSize: 12, cursor: savingId === r.id ? "not-allowed" : "pointer",
                          fontFamily: "Nunito,sans-serif" }}>
                        {savingId === r.id ? "Guardando..." : "Guardar revisión"}
                      </button>
                      <button onClick={() => approve(r.id)}
                        disabled={approvingId === r.id}
                        style={{ flex: 1, background: approvingId === r.id ? "#ccc" : "#10b981",
                          border: "none", borderRadius: 50, color: "white", padding: "10px",
                          fontWeight: 800, fontSize: 12, cursor: approvingId === r.id ? "not-allowed" : "pointer",
                          fontFamily: "Nunito,sans-serif" }}>
                        {approvingId === r.id ? "Aprobando..." : "✅ Aprobar y liberar"}
                      </button>
                    </div>
                  </div>
                )}

                {/* pendiente_revision: show final text + approve */}
                {r.estado === "pendiente_revision" && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#f97300", marginBottom: 6 }}>
                      Texto revisado:
                    </div>
                    <div style={{ background: "#fff7ed", borderRadius: 12, padding: "12px 14px",
                      fontSize: 13, color: "#333", lineHeight: 1.65, whiteSpace: "pre-wrap",
                      marginBottom: 12 }}>
                      {r.reporte_final}
                    </div>
                    <button onClick={() => approve(r.id)}
                      disabled={approvingId === r.id}
                      style={{ width: "100%", background: approvingId === r.id ? "#ccc" : "#10b981",
                        border: "none", borderRadius: 50, color: "white", padding: "11px",
                        fontWeight: 800, fontSize: 13, cursor: approvingId === r.id ? "not-allowed" : "pointer",
                        fontFamily: "Nunito,sans-serif" }}>
                      {approvingId === r.id ? "Aprobando..." : "✅ Aprobar y liberar"}
                    </button>
                  </div>
                )}

                {/* aprobado: show final text + badge */}
                {r.estado === "aprobado" && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#10b981", marginBottom: 6 }}>
                      Texto publicado al padre:
                    </div>
                    <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px",
                      fontSize: 13, color: "#333", lineHeight: 1.65, whiteSpace: "pre-wrap",
                      marginBottom: 10 }}>
                      {r.reporte_final}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ background: "#10b98118", color: "#10b981", borderRadius: 99,
                        padding: "4px 16px", fontSize: 12, fontWeight: 800 }}>
                        ✓ Publicado al padre · {fmtDate(r.approved_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </WCard>
        );
      })}
    </div>
  );
}

export default AdminDiwy;
