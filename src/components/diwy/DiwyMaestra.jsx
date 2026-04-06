// DiwyMaestra.jsx — Teacher view of Diwy.
// Access: teacher role only (enforced server-side).
// Can: view all students, add/delete own observations, view all observations per student.

import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard, OHdrA } from "../shared/index";

const fmtSemana = iso => iso
  ? new Date(iso).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit" })
  : "";

function estadoBadge(estado) {
  if (estado === "aprobado")            return { label:"Publicado",   bg:"#10b981" };
  if (estado === "pendiente_revision")  return { label:"En revisión", bg:"#f59e0b" };
  if (estado === "draft")               return { label:"Borrador",    bg:"#6b7280" };
  return null;
}

export default function DiwyMaestra({ me }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, inputBg, inputBd } = useTheme();
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [observations, setObservations] = useState([]);
  const [loadingObs,   setLoadingObs]   = useState(false);
  const [obsText,      setObsText]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    api.diwyStudents()
      .then(d => setStudents(Array.isArray(d) ? d : d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const filtered = search.trim()
    ? students.filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()))
    : students;

  // ── Detail: per-student observations ──
  if (selected) {
    return (
      <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
        <OHdrA
          title={selected.nombre}
          onBack={() => { setSelected(null); setObsText(""); setObservations([]); }}
          extra={<div style={{ fontSize:12, opacity:.8, marginTop:2 }}>🐾 Observaciones Diwy</div>}
        />
        <div style={{ padding:"16px 14px 32px" }}>

          {/* Add observation */}
          <WCard style={{ marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8,
              transition:"color .3s" }}>
              Observación — semana actual
            </div>
            <textarea
              value={obsText}
              onChange={e => setObsText(e.target.value)}
              placeholder={`¿Cómo fue la semana de ${selected.nombre}? Participación, actitud, logros, dificultades...`}
              rows={4}
              maxLength={500}
              style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:12,
                padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:txt, background:inputBg,
                transition:"background .3s, color .3s, border-color .3s" }}
            />
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginTop:8 }}>
              <span style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                {obsText.length}/500
              </span>
              <button
                onClick={handleAdd}
                disabled={saving || !obsText.trim()}
                style={{ background: (!obsText.trim() || saving) ? navBord : primary,
                  border:"none", borderRadius:50, padding:"8px 22px",
                  color:"white", fontWeight:800, fontSize:12,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
                {saving ? "Guardando..." : "✓ Guardar"}
              </button>
            </div>
          </WCard>

          {/* Observations list */}
          <div style={{ fontWeight:800, fontSize:11, color:sub, marginBottom:8,
            paddingLeft:4, letterSpacing:".06em", transition:"color .3s" }}>
            HISTORIAL DE OBSERVACIONES
          </div>

          {loadingObs && (
            <div style={{ textAlign:"center", color:sub, padding:24,
              transition:"color .3s" }}>Cargando...</div>
          )}
          {!loadingObs && observations.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
              <div style={{ fontSize:13, color:sub, transition:"color .3s" }}>
                Sin observaciones todavía
              </div>
            </div>
          )}

          {observations.map(o => {
            const isOwn = o.teacher_id === me?.id;
            return (
              <div key={o.id} style={{
                background:cardBg, borderRadius:14, padding:"12px 14px", marginBottom:8,
                border:`1.5px solid ${isOwn ? primary + "44" : navBord}`,
                transition:"background .3s, border .3s" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:primary,
                      transition:"color .3s" }}>
                      Sem. {fmtSemana(o.semana)}
                    </span>
                    <span style={{ fontSize:10, color:sub, transition:"color .3s" }}>
                      · {o.docente_nombre}
                    </span>
                    {isOwn && (
                      <span style={{ fontSize:9, background:`${primary}18`, color:primary,
                        borderRadius:99, padding:"1px 6px", fontWeight:800,
                        transition:"background .3s, color .3s" }}>tuya</span>
                    )}
                  </div>
                  {isOwn && (
                    <button onClick={() => handleDelete(o.id)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        color:sub, fontSize:16, lineHeight:1, padding:"0 2px",
                        fontFamily:"Nunito,sans-serif", transition:"color .3s" }}>×</button>
                  )}
                </div>
                <div style={{ fontSize:13, color:txt, lineHeight:1.55,
                  transition:"color .3s" }}>{o.texto}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Student list ──
  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <OHdrA
        title="🐾 Diwy"
        extra={<div style={{ fontSize:12, opacity:.8, marginTop:2 }}>
          Seguimiento semanal de alumnos
        </div>}
      />
      <div style={{ padding:"16px 14px 32px" }}>
        <div style={{ position:"relative", marginBottom:12 }}>
          <span style={{ position:"absolute", left:13, top:"50%",
            transform:"translateY(-50%)", fontSize:14, pointerEvents:"none" }}>🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar alumno..."
            style={{ width:"100%", border:`1.5px solid ${navBord}`, borderRadius:12,
              padding:"10px 12px 10px 38px", fontSize:13, fontFamily:"Nunito,sans-serif",
              outline:"none", boxSizing:"border-box", color:txt, background:cardBg,
              transition:"background .3s, color .3s, border-color .3s" }}
          />
        </div>

        {loading && (
          <div style={{ textAlign:"center", color:sub, padding:40,
            transition:"color .3s" }}>Cargando...</div>
        )}

        {filtered.map(s => {
          const badge = estadoBadge(s.last_report_estado);
          return (
            <div key={s.id} onClick={() => setSelected(s)}
              style={{ background:cardBg, borderRadius:14, padding:"12px 14px", marginBottom:8,
                border:`1.5px solid ${navBord}`, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                transition:"background .3s, border .3s" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:txt,
                  transition:"color .3s" }}>{s.nombre}</div>
                <div style={{ fontSize:11, color:sub, marginTop:2, transition:"color .3s" }}>
                  {s.last_report_at
                    ? `Último reporte: ${new Date(s.last_report_at).toLocaleDateString("es-AR", {day:"2-digit", month:"2-digit"})}`
                    : "Sin reportes aún"}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {badge && (
                  <span style={{ background:badge.bg, color:"white", borderRadius:99,
                    fontSize:9, fontWeight:900, padding:"2px 8px" }}>
                    {badge.label}
                  </span>
                )}
                <span style={{ color:sub, fontSize:18, transition:"color .3s" }}>›</span>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:44, marginBottom:8 }}>🐾</div>
            <div style={{ fontSize:13, color:sub, transition:"color .3s" }}>
              {search.trim() ? `Sin resultados para "${search}"` : "Sin alumnos registrados"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
