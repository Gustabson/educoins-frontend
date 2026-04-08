// TeacherReportes.jsx — Standalone weekly observation reports for teachers.
// NOTE: All sub-components defined at MODULE scope.

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const fmtSemana = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit" })
  : "";

const PRESETS = [
  { emoji:"✅", label:"Sin novedades",       text:"Buena semana, sin inconvenientes. Comportamiento y participación dentro de lo esperado." },
  { emoji:"⭐", label:"Excelente semana",    text:"Semana excelente. Muy buena participación, actitud positiva y gran desempeño académico." },
  { emoji:"📈", label:"Buen progreso",       text:"Se nota un progreso positivo esta semana. Continúa mejorando en su desempeño general." },
  { emoji:"⚠️", label:"Necesita atención",  text:"Esta semana presentó algunas dificultades de atención/comportamiento que requieren seguimiento." },
  { emoji:"📚", label:"Dificultad académica",text:"Muestra dificultades con los contenidos trabajados esta semana. Se recomienda refuerzo en casa." },
  { emoji:"🤝", label:"Mejora conductual",   text:"Se observa una mejora notable en su conducta respecto a semanas anteriores. Sigue adelante." },
];

// ── Header (module scope) ─────────────────────────────────────────────────────
function ReportesHeader({ primary, onBack }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
      padding: "16px 20px 20px", position:"sticky", top:0, zIndex:50,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
          borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div>
          <div style={{ fontWeight:900, fontSize:20, color:"white" }}>🐾 Reportes</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>Observaciones semanales por alumno</div>
        </div>
      </div>
    </div>
  );
}

function DetailHeader({ primary, onBack, nombre, classroom }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 100%)`,
      padding: "16px 20px 20px", position:"sticky", top:0, zIndex:50,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none",
          borderRadius:50, color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
          display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:"white" }}>{nombre}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)" }}>
            Reporte Diwy{classroom ? ` · ${classroom}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TeacherReportes({ me, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd, isDark } = useTheme();

  const [students,        setStudents]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [loadErr,         setLoadErr]         = useState(null);
  const [selected,        setSelected]        = useState(null);
  const [observations,    setObservations]    = useState([]);
  const [loadingObs,      setLoadingObs]      = useState(false);
  const [obsText,         setObsText]         = useState("");
  const [saving,          setSaving]          = useState(false);
  const [search,          setSearch]          = useState("");
  const [expandedCourses, setExpandedCourses] = useState({});

  // Load students on mount
  useEffect(() => {
    api.diwyStudents()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.data || [];
        setStudents(list);
        setLoadErr(null);
        const courses = {};
        list.forEach(s => { courses[s.classroom_id || "__none__"] = true; });
        setExpandedCourses(courses);
      })
      .catch(e => setLoadErr(e?.message || "Error al cargar alumnos"))
      .finally(() => setLoading(false));
  }, []);

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
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.diwyDeleteObs(id);
      setObservations(prev => prev.filter(o => o.id !== id));
    } catch {}
  };

  // Group by classroom
  const searchedStudents = search.trim()
    ? students.filter(s => (s.nombre || "").toLowerCase().includes(search.toLowerCase()))
    : students;

  const courseGroups = searchedStudents.reduce((acc, s) => {
    const key   = s.classroom_id   || "__none__";
    const label = s.classroom_nombre || "Sin curso asignado";
    if (!acc[key]) acc[key] = { label, students: [] };
    acc[key].students.push(s);
    return acc;
  }, {});

  // ── Detail view ──
  if (selected) {
    return (
      <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
        <DetailHeader
          primary={primary}
          onBack={() => { setSelected(null); setObsText(""); setObservations([]); }}
          nombre={selected.nombre}
          classroom={selected.classroom_nombre}
        />
        <div style={{ padding:"16px 14px 32px" }}>

          {/* Presets */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:800, color:sub, letterSpacing:".06em", marginBottom:8 }}>
              PLANTILLAS RÁPIDAS
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setObsText(p.text)}
                  style={{ background: obsText === p.text ? primary : `${primary}12`,
                    border:`1px solid ${obsText === p.text ? primary : primary+"30"}`,
                    borderRadius:99, padding:"5px 11px", fontSize:11, fontWeight:800,
                    color: obsText === p.text ? "white" : primary,
                    cursor:"pointer", fontFamily:"Nunito,sans-serif", transition:"all .18s",
                    display:"flex", alignItems:"center", gap:4 }}>
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observation form */}
          <WCard style={{ marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8 }}>
              Observación — semana actual
            </div>
            <textarea
              value={obsText}
              onChange={e => setObsText(e.target.value)}
              placeholder={`¿Cómo fue la semana de ${selected.nombre}? Podés usar una plantilla o escribir algo personalizado...`}
              rows={4} maxLength={500}
              style={{ width:"100%", border:`1.5px solid ${obsText.trim() ? primary : inputBd}`,
                borderRadius:12, padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:txt, background:inputBg, transition:"border-color .2s, background .3s, color .3s" }}
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

          {/* History */}
          <div style={{ fontWeight:800, fontSize:11, color:sub, marginBottom:8,
            paddingLeft:4, letterSpacing:".06em" }}>HISTORIAL</div>
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
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:6 }}>
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

  // ── List view ──
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <ReportesHeader primary={primary} onBack={onBack} />
      <div style={{ padding:"16px 14px 32px" }}>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:16 }}>
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

        {loading && <div style={{ textAlign:"center", color:sub, padding:40 }}>Cargando...</div>}

        {!loading && loadErr && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5",
            borderRadius:12, padding:"14px 16px", marginBottom:12,
            color:"#dc2626", fontSize:12, fontWeight:700 }}>
            ⚠️ {loadErr}
          </div>
        )}

        {/* Grouped by course */}
        {!loading && !loadErr && Object.entries(courseGroups).map(([key, group]) => {
          const isExpanded = expandedCourses[key] !== false;
          return (
            <div key={key} style={{ marginBottom:16 }}>
              <button
                onClick={() => setExpandedCourses(p => ({ ...p, [key]: !isExpanded }))}
                style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"6px 4px 8px", fontFamily:"Nunito,sans-serif" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:900, color:primary,
                    textTransform:"uppercase", letterSpacing:".07em" }}>
                    🏫 {group.label}
                  </span>
                  <span style={{ fontSize:10, background:`${primary}18`, color:primary,
                    borderRadius:99, padding:"1px 8px", fontWeight:800 }}>
                    {group.students.length}
                  </span>
                </div>
                <span style={{ fontSize:14, color:sub, transition:"transform .2s",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
              </button>

              {isExpanded && group.students.map(s => {
                const weekAgo = s.last_report_at
                  ? (Date.now() - new Date(s.last_report_at)) < 7 * 24 * 3600 * 1000
                  : false;
                return (
                  <div key={s.id} onClick={() => setSelected(s)}
                    style={{ background:cardBg, borderRadius:14, padding:"12px 14px",
                      marginBottom:6, border:`1.5px solid ${weekAgo ? "#10b98133" : navBord}`,
                      cursor:"pointer", display:"flex", alignItems:"center",
                      justifyContent:"space-between", transition:"background .3s" }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:txt }}>{s.nombre}</div>
                      <div style={{ fontSize:11, color: weekAgo ? "#10b981" : sub, marginTop:2 }}>
                        {s.last_report_at
                          ? `${weekAgo ? "✓ " : ""}Último reporte: ${new Date(s.last_report_at).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"})}`
                          : "Sin reportes aún"}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {!s.last_report_at && (
                        <span style={{ background:"#f59e0b20", color:"#f59e0b",
                          borderRadius:99, fontSize:9, fontWeight:900, padding:"2px 8px" }}>
                          Pendiente
                        </span>
                      )}
                      <span style={{ color:sub, fontSize:18 }}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {!loading && !loadErr && Object.keys(courseGroups).length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:44, marginBottom:8 }}>🐾</div>
            <div style={{ fontSize:13, color:sub }}>
              {search.trim() ? `Sin resultados para "${search}"` : "Sin alumnos registrados"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
