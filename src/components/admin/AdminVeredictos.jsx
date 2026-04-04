import { useState, useEffect } from "react";
import { api } from "../../api";
import { WCard } from "../shared/index";

const SEVERITY_CFG = {
  advertencia: { label:"Advertencia",  color:"#f59e0b", icon:"⚠️" },
  sancion:     { label:"Sanción",      color:"#ef4444", icon:"🚔" },
  grave:       { label:"Caso Grave",   color:"#7f1d1d", icon:"⛔" },
};

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" });
}

function AdminVeredictos({ showToast, onBack }) {
  const [students, setStudents]     = useState([]);
  const [history,  setHistory]      = useState([]);
  const [view,     setView]         = useState("send"); // "send" | "ia" | "history"
  const [sending,  setSending]      = useState(false);
  const [loadingH, setLoadingH]     = useState(false);

  // IA state
  const [iaCaso,       setIaCaso]       = useState("");
  const [iaSuggestion, setIaSuggestion] = useState(null);
  const [iaLoading,    setIaLoading]    = useState(false);

  // Formulario
  const [selected,  setSelected]   = useState([]);
  const [mensaje,   setMensaje]    = useState("");
  const [severity,  setSeverity]   = useState("advertencia");
  const [penalty,   setPenalty]    = useState("");
  const [search,    setSearch]     = useState("");

  useEffect(() => {
    api.adminUsers().then(u => {
      const arr = Array.isArray(u) ? u : u.data || [];
      setStudents(arr.filter(x => x.rol === "student" && x.activo));
    }).catch(() => {});
  }, []);

  const loadHistory = () => {
    setLoadingH(true);
    api.allVerdicts().then(d => {
      setHistory(Array.isArray(d) ? d : []);
    }).catch(() => {}).finally(() => setLoadingH(false));
  };

  const handleViewChange = (v) => {
    setView(v);
    if (v === "history") loadHistory();
  };

  const toggleStudent = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filtered = students.filter(s =>
      !search || s.nombre.toLowerCase().includes(search.toLowerCase())
    );
    const filteredIds = filtered.map(s => s.id);
    const allSelected = filteredIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleSend = async () => {
    if (!selected.length) return showToast("Seleccioná al menos un alumno");
    if (!mensaje.trim())  return showToast("Escribí el mensaje del veredicto");
    setSending(true);
    try {
      await api.sendVerdict({
        to_user_ids:  selected,
        mensaje:      mensaje.trim(),
        severity,
        coins_penalty: penalty ? parseInt(penalty) : 0,
      });
      showToast(`Veredicto enviado a ${selected.length} alumno${selected.length>1?"s":""}`);
      setSelected([]);
      setMensaje("");
      setPenalty("");
      setSeverity("advertencia");
      setSearch("");
    } catch (e) {
      showToast(e.message || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const filteredStudents = students.filter(s =>
    !search || s.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const sev = SEVERITY_CFG[severity];

  return (
    <div style={{ minHeight:"100vh", background:"#F0F0F0" }}>
      {/* Header */}
      <div style={{ background:"#7f1d1d", color:"white", padding:"52px 20px 18px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-60, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none",
            borderRadius:50, width:36, height:36, display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", color:"white", fontSize:18,
            fontFamily:"Nunito,sans-serif" }}>‹</button>
          <div>
            <div style={{ fontWeight:900, fontSize:20 }}>⚖️ Veredictos</div>
            <div style={{ fontSize:12, opacity:.8 }}>Canal oficial de la Administración</div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", gap:8 }}>
          {[["send","Enviar"],["ia","✨ IA"],["history","Historial"]].map(([v,lb]) => (
            <button key={v} onClick={()=>handleViewChange(v)} style={{
              background: view===v ? "white" : "rgba(255,255,255,.2)",
              color:      view===v ? "#7f1d1d" : "white",
              border:"none", borderRadius:50, padding:"6px 18px",
              fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"Nunito,sans-serif",
              transition:"all .2s" }}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* ── ENVIAR ── */}
      {view === "send" && (
        <div style={{ padding:"16px 14px 100px" }}>

          {/* Tipo de veredicto */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:10 }}>
              Nivel de severidad
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {Object.entries(SEVERITY_CFG).map(([k, cfg]) => (
                <button key={k} onClick={()=>setSeverity(k)} style={{
                  flex:1, border:`2px solid ${severity===k ? cfg.color : "#e5e7eb"}`,
                  background: severity===k ? cfg.color+"15" : "white",
                  borderRadius:12, padding:"10px 4px", cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"all .2s",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:20 }}>{cfg.icon}</span>
                  <span style={{ fontSize:10, fontWeight:800,
                    color: severity===k ? cfg.color : "#666" }}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </WCard>

          {/* Mensaje */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:10 }}>
              Mensaje del veredicto
            </div>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder={`Redactá el veredicto oficial...`}
              maxLength={600}
              rows={4}
              style={{ width:"100%", border:`1.5px solid ${sev.color}`,
                borderRadius:12, padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", color:"#1a1a1a", background:"#fafafa",
                boxSizing:"border-box" }}
            />
            <div style={{ fontSize:11, color:"#aaa", textAlign:"right", marginTop:4 }}>
              {mensaje.length}/600
            </div>
          </WCard>

          {/* Penalización (opcional) */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:6 }}>
              Penalización en EduCoins <span style={{ fontWeight:600, color:"#aaa", fontSize:11 }}>(opcional)</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🪙</span>
              <input
                type="number" min="0" max="10000"
                value={penalty}
                onChange={e => setPenalty(e.target.value)}
                placeholder="0 (sin penalización)"
                style={{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                  outline:"none", color:"#1a1a1a" }}
              />
            </div>
            {penalty > 0 && (
              <div style={{ fontSize:11, color:"#ef4444", marginTop:6, fontWeight:700 }}>
                Se descontarán {penalty} EduCoins de cada destinatario seleccionado
              </div>
            )}
          </WCard>

          {/* Selector de alumnos */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#333" }}>
                Destinatarios
                {selected.length > 0 && (
                  <span style={{ marginLeft:8, background:sev.color, color:"white",
                    borderRadius:99, fontSize:10, fontWeight:900, padding:"2px 8px" }}>
                    {selected.length}
                  </span>
                )}
              </div>
              <button onClick={selectAll} style={{ background:"none", border:"none",
                color:"#7f1d1d", fontSize:11, fontWeight:800, cursor:"pointer",
                fontFamily:"Nunito,sans-serif" }}>
                {filteredStudents.every(s => selected.includes(s.id)) ? "Quitar todos" : "Todos"}
              </button>
            </div>
            <input
              type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar alumno..."
              style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10,
                padding:"8px 12px", fontSize:12, fontFamily:"Nunito,sans-serif",
                outline:"none", marginBottom:10, boxSizing:"border-box" }}
            />
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {filteredStudents.map(s => {
                const on = selected.includes(s.id);
                return (
                  <div key={s.id} onClick={()=>toggleStudent(s.id)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 4px",
                      cursor:"pointer", borderBottom:"1px solid #f3f4f6",
                      background: on ? sev.color+"10" : "transparent", borderRadius:8,
                      transition:"background .15s" }}>
                    <div style={{ width:22, height:22, borderRadius:6,
                      border:`2px solid ${on ? sev.color : "#ddd"}`,
                      background: on ? sev.color : "white",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, fontSize:12, color:"white", fontWeight:900,
                      transition:"all .15s" }}>
                      {on && "✓"}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#1a1a1a" }}>{s.nombre}</div>
                      <div style={{ fontSize:10, color:"#aaa" }}>{s.email}</div>
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <div style={{ textAlign:"center", color:"#aaa", fontSize:12, padding:16 }}>
                  Sin resultados
                </div>
              )}
            </div>
          </WCard>

          {/* Botón enviar */}
          <button onClick={handleSend} disabled={sending || !selected.length || !mensaje.trim()}
            style={{ width:"100%", background: (!selected.length||!mensaje.trim()) ? "#ccc" : sev.color,
              border:"none", borderRadius:14, padding:"15px", color:"white",
              fontWeight:900, fontSize:15, cursor: sending ? "not-allowed" : "pointer",
              fontFamily:"Nunito,sans-serif", transition:"background .2s",
              boxShadow: selected.length&&mensaje.trim() ? `0 4px 20px ${sev.color}66` : "none" }}>
            {sending ? "Enviando..." : `${sev.icon} Emitir Veredicto${selected.length>1?` (${selected.length})`:""}` }
          </button>
        </div>
      )}

      {/* ── ASISTENTE IA ── */}
      {view === "ia" && (
        <div style={{ padding:"16px 14px 100px" }}>
          <WCard style={{ marginBottom:12, background:"#f0fdf4", border:"1.5px solid #86efac" }}>
            <div style={{ fontSize:12, color:"#15803d", lineHeight:1.6 }}>
              ✨ <strong>Asistente de IA</strong>: describí el caso y la IA sugerirá un veredicto basado en el reglamento.
              Siempre podés editar la sugerencia antes de enviarla.
            </div>
          </WCard>

          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:8 }}>
              Descripción del caso
            </div>
            <textarea
              value={iaCaso}
              onChange={e => setIaCaso(e.target.value)}
              placeholder="Ej: Un alumno insultó reiteradamente a una compañera durante el recreo. Hay tres testigos. Es la segunda vez que ocurre este mes..."
              rows={5}
              style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:12,
                padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:"#1a1a1a", background:"#fafafa" }}
            />
            <button
              onClick={async () => {
                if (!iaCaso.trim()) return showToast("Describí el caso primero");
                setIaLoading(true);
                setIaSuggestion(null);
                try {
                  const d = await api.aiVerdictSuggest(iaCaso.trim());
                  setIaSuggestion(d);
                } catch(e) {
                  showToast(e.message || "Error al consultar la IA");
                } finally { setIaLoading(false); }
              }}
              disabled={iaLoading || !iaCaso.trim()}
              style={{ width:"100%", marginTop:10,
                background: (!iaCaso.trim()||iaLoading) ? "#ccc" : "#10b981",
                border:"none", borderRadius:12, padding:"12px",
                color:"white", fontWeight:800, fontSize:13,
                cursor: iaLoading||!iaCaso.trim() ? "not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
              {iaLoading ? "⏳ Analizando el caso..." : "✨ Sugerir veredicto con IA"}
            </button>
          </WCard>

          {/* Resultado de la IA */}
          {iaSuggestion && (() => {
            const sugCfg = SEVERITY_CFG[iaSuggestion.severity] || SEVERITY_CFG.advertencia;
            return (
              <WCard style={{ marginBottom:12, borderLeft:`4px solid ${sugCfg.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:20 }}>{sugCfg.icon}</span>
                  <div>
                    <div style={{ fontWeight:900, fontSize:14, color:sugCfg.color }}>{sugCfg.label}</div>
                    <div style={{ fontSize:11, color:"#aaa" }}>Sugerencia de la IA — revisá antes de enviar</div>
                  </div>
                </div>

                <div style={{ fontSize:11, fontWeight:700, color:"#aaa", marginBottom:4 }}>FUNDAMENTO LEGAL</div>
                <div style={{ fontSize:12, color:"#555", background:"#f8fafc",
                  borderRadius:8, padding:"8px 10px", marginBottom:12, lineHeight:1.5 }}>
                  {iaSuggestion.fundamento || "No especificado"}
                </div>

                <div style={{ fontSize:11, fontWeight:700, color:"#aaa", marginBottom:4 }}>VEREDICTO SUGERIDO</div>
                <div style={{ fontSize:13, color:"#1a1a1a", lineHeight:1.6, marginBottom:12 }}>
                  {iaSuggestion.veredicto}
                </div>

                {iaSuggestion.coins_sugeridas > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12,
                    background:"#fee2e2", borderRadius:10, padding:"8px 12px" }}>
                    <span style={{ fontSize:16 }}>🪙</span>
                    <span style={{ fontSize:12, fontWeight:800, color:"#dc2626" }}>
                      Penalización sugerida: {iaSuggestion.coins_sugeridas} EduCoins
                    </span>
                  </div>
                )}

                {iaSuggestion.nota_para_admin && (
                  <div style={{ background:"#fef9c3", borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#854d0e", marginBottom:2 }}>NOTA PARA ADMIN</div>
                    <div style={{ fontSize:12, color:"#854d0e" }}>{iaSuggestion.nota_para_admin}</div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSeverity(iaSuggestion.severity || "advertencia");
                    setMensaje(iaSuggestion.veredicto || "");
                    if (iaSuggestion.coins_sugeridas > 0) setPenalty(String(iaSuggestion.coins_sugeridas));
                    setView("send");
                    showToast("Sugerencia cargada — completá los destinatarios");
                  }}
                  style={{ width:"100%", background:"#7f1d1d", border:"none",
                    borderRadius:12, padding:"12px", color:"white",
                    fontWeight:800, fontSize:13, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif",
                    boxShadow:"0 4px 16px rgba(127,29,29,.4)" }}>
                  ⚖️ Usar esta sugerencia → ir a Enviar
                </button>
              </WCard>
            );
          })()}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {view === "history" && (
        <div style={{ padding:"16px 14px 32px" }}>
          {loadingH && (
            <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>Cargando...</div>
          )}
          {!loadingH && history.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>⚖️</div>
              <div style={{ fontWeight:800, fontSize:15, color:"#333" }}>Sin veredictos emitidos</div>
            </div>
          )}
          {history.map(v => {
            const cfg = SEVERITY_CFG[v.severity] || SEVERITY_CFG.advertencia;
            return (
              <WCard key={v.id} style={{ marginBottom:10, borderLeft:`4px solid ${cfg.color}`, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6,
                    fontSize:12, fontWeight:800, color:cfg.color }}>
                    <span>{cfg.icon}</span>{cfg.label}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa" }}>{fmt(v.created_at)}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a1a", marginBottom:4 }}>
                  Para: <span style={{ fontWeight:900 }}>{v.to_nombre}</span>
                </div>
                <div style={{ fontSize:12, color:"#555", lineHeight:1.5 }}>{v.mensaje}</div>
                {v.coins_penalty > 0 && (
                  <div style={{ fontSize:11, color:"#ef4444", fontWeight:700, marginTop:6 }}>
                    🪙 -{v.coins_penalty} EduCoins · {v.read_at ? "✓ Leído" : "⏳ Pendiente de lectura"}
                  </div>
                )}
                {!v.coins_penalty && (
                  <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
                    {v.read_at ? "✓ Leído" : "⏳ Pendiente de lectura"}
                  </div>
                )}
              </WCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminVeredictos;
