import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";
import { VERDICT_SEVERITY as SEVERITY_CFG } from "../../constants";

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" });
}

function AdminVeredictos({ showToast, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, inputBg, inputBd, navBord } = useTheme();

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
  const [selected,          setSelected]          = useState([]);
  const [mensaje,           setMensaje]           = useState("");
  const [severity,          setSeverity]          = useState("advertencia");
  const [penalty,           setPenalty]           = useState("");
  const [reward,            setReward]            = useState("");
  const [search,            setSearch]            = useState("");
  const [classrooms,        setClassrooms]        = useState([]);
  const [allStudents,       setAllStudents]       = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  useEffect(() => {
    api.adminUsers().then(u => {
      const arr = Array.isArray(u) ? u : u.data || [];
      const sts = arr.filter(x => x.rol === "student" && x.activo);
      setStudents(sts);
      setAllStudents(sts);
    }).catch(() => {});
    api.adminClassrooms().then(d => {
      setClassrooms(Array.isArray(d) ? d : []);
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

  const toggleStudent = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectClassroom = (cls) => {
    if (selectedClassroom?.id === cls.id) { setSelectedClassroom(null); }
    else { setSelectedClassroom(cls); setSearch(""); }
  };

  const selectAll = () => {
    const list = shownStudents || [];
    const allSel = list.length > 0 && list.every(s => selected.includes(s.id));
    if (allSel) setSelected(prev => prev.filter(id => !list.map(s=>s.id).includes(id)));
    else        setSelected(prev => [...new Set([...prev, ...list.map(s=>s.id)])]);
  };

  const handleSend = async () => {
    if (!selected.length) return showToast("Seleccioná al menos un alumno");
    if (!mensaje.trim())  return showToast("Escribí el mensaje del veredicto");
    setSending(true);
    try {
      await api.sendVerdict({
        to_user_ids:   selected,
        mensaje:       mensaje.trim(),
        severity,
        coins_penalty: sev.positive ? 0 : (penalty ? parseInt(penalty) : 0),
        coins_reward:  sev.positive ? (reward  ? parseInt(reward)  : 0) : 0,
      });
      showToast(`Veredicto enviado a ${selected.length} alumno${selected.length>1?"s":""}`);
      setSelected([]); setMensaje(""); setPenalty(""); setReward("");
      setSeverity("advertencia"); setSearch(""); setSelectedClassroom(null);
    } catch (e) {
      showToast(e.message || "Error al enviar");
    } finally { setSending(false); }
  };

  const shownStudents = (() => {
    if (search.trim())
      return students.filter(s => s.nombre.toLowerCase().includes(search.toLowerCase()));
    if (selectedClassroom)
      return (selectedClassroom.miembros || [])
        .filter(m => m.user_rol === 'student')
        .map(m => allStudents.find(s => s.id === m.user_id) || { id: m.user_id, nombre: m.nombre, email: '' });
    return null;
  })();

  const sev = SEVERITY_CFG[severity] || SEVERITY_CFG.advertencia;

  const SEND_READY = selected.length > 0 && mensaje.trim().length > 0;

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      {/* Header */}
      <div style={{ background:primary, color:"white", padding:"52px 20px 18px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden", transition:"background .3s" }}>
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
        <div style={{ display:"flex", gap:8 }}>
          {[["send","Enviar"],["ia","✨ IA"],["history","Historial"]].map(([v,lb]) => (
            <button key={v} onClick={()=>handleViewChange(v)} style={{
              background: view===v ? "white" : "rgba(255,255,255,.2)",
              color:      view===v ? primary  : "white",
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

          {/* Tipo */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10,
              transition:"color .3s" }}>Tipo de veredicto</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(SEVERITY_CFG).map(([k, cfg]) => (
                <button key={k} onClick={()=>{ setSeverity(k); setPenalty(""); setReward(""); }}
                  style={{
                    flex:1, minWidth:60,
                    border:`2px solid ${severity===k ? cfg.color : navBord}`,
                    background: severity===k ? `${cfg.color}18` : "transparent",
                    borderRadius:12, padding:"10px 4px", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:20 }}>{cfg.icon}</span>
                  <span style={{ fontSize:10, fontWeight:800,
                    color: severity===k ? cfg.color : sub,
                    transition:"color .3s" }}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </WCard>

          {/* Mensaje */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:10,
              transition:"color .3s" }}>Mensaje del veredicto</div>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Redactá el veredicto oficial..."
              maxLength={600}
              rows={4}
              style={{ width:"100%", border:`1.5px solid ${sev.color}`,
                borderRadius:12, padding:"10px 12px", fontSize:13,
                fontFamily:"Nunito,sans-serif", resize:"none", outline:"none",
                color:txt, background:inputBg, boxSizing:"border-box",
                transition:"background .3s, color .3s, border-color .3s" }}
            />
            <div style={{ fontSize:11, color:sub, textAlign:"right", marginTop:4,
              transition:"color .3s" }}>{mensaje.length}/600</div>
          </WCard>

          {/* Penalización o Recompensa según tipo */}
          <WCard style={{ marginBottom:12 }}>
            {sev.positive ? (
              <>
                <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:6,
                  transition:"color .3s" }}>
                  Recompensa en EduCoins{" "}
                  <span style={{ fontWeight:600, color:sub, fontSize:11 }}>(opcional)</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>🪙</span>
                  <input type="number" min="0" max="10000"
                    value={reward}
                    onChange={e => setReward(e.target.value)}
                    placeholder="0 (sin recompensa)"
                    style={{ flex:1, border:`1.5px solid ${inputBd}`, borderRadius:10,
                      padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                      outline:"none", color:txt, background:inputBg,
                      transition:"background .3s, color .3s, border-color .3s" }}
                  />
                </div>
                {reward > 0 && (
                  <div style={{ fontSize:11, color:"#10b981", marginTop:6, fontWeight:700 }}>
                    Se acreditarán {reward} EduCoins a cada destinatario seleccionado
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:6,
                  transition:"color .3s" }}>
                  Penalización en EduCoins{" "}
                  <span style={{ fontWeight:600, color:sub, fontSize:11 }}>(opcional)</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>🪙</span>
                  <input type="number" min="0" max="10000"
                    value={penalty}
                    onChange={e => setPenalty(e.target.value)}
                    placeholder="0 (sin penalización)"
                    style={{ flex:1, border:`1.5px solid ${inputBd}`, borderRadius:10,
                      padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                      outline:"none", color:txt, background:inputBg,
                      transition:"background .3s, color .3s, border-color .3s" }}
                  />
                </div>
                {penalty > 0 && (
                  <div style={{ fontSize:11, color:sev.color, marginTop:6, fontWeight:700 }}>
                    Se descontarán {penalty} EduCoins de cada destinatario seleccionado
                  </div>
                )}
              </>
            )}
          </WCard>

          {/* Selector de alumnos */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:13, color:txt, transition:"color .3s" }}>
                Destinatarios
                {selected.length > 0 && (
                  <span style={{ marginLeft:8, background:sev.color, color:"white",
                    borderRadius:99, fontSize:10, fontWeight:900, padding:"2px 8px" }}>
                    {selected.length} seleccionado{selected.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {shownStudents && shownStudents.length > 0 && (
                <button onClick={selectAll} style={{ background:"none", border:"none",
                  color:primary, fontSize:11, fontWeight:800, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", transition:"color .3s" }}>
                  {shownStudents.every(s => selected.includes(s.id)) ? "Quitar todos" : "Seleccionar todos"}
                </button>
              )}
            </div>

            {/* Chips de cursos */}
            {classrooms.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                {classrooms.map(cls => {
                  const active = selectedClassroom?.id === cls.id;
                  return (
                    <button key={cls.id} onClick={() => selectClassroom(cls)}
                      style={{ border:`1.5px solid ${active ? sev.color : navBord}`,
                        background: active ? sev.color : "transparent",
                        color: active ? "white" : sub,
                        borderRadius:99, fontSize:10, fontWeight:800,
                        padding:"4px 12px", cursor:"pointer",
                        fontFamily:"Nunito,sans-serif", transition:"all .15s",
                        display:"flex", alignItems:"center", gap:4 }}>
                      🏫 {cls.nombre}
                      {active && <span style={{ opacity:.75, fontSize:9 }}>✕</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Buscador */}
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value.trim()) setSelectedClassroom(null); }}
              placeholder={selectedClassroom ? `Buscar en ${selectedClassroom.nombre}...` : "Buscar alumno por nombre..."}
              style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:10,
                padding:"8px 12px", fontSize:12, fontFamily:"Nunito,sans-serif",
                outline:"none", marginBottom:10, boxSizing:"border-box",
                color:txt, background:inputBg,
                transition:"background .3s, color .3s, border-color .3s" }}
            />

            {shownStudents === null ? (
              <div style={{ textAlign:"center", color:sub, fontSize:12, padding:"20px 0",
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                transition:"color .3s" }}>
                <span style={{ fontSize:30 }}>🏫</span>
                <span>Seleccioná un curso o buscá por nombre</span>
                {selected.length > 0 && (
                  <span style={{ color:sev.color, fontWeight:800, fontSize:11 }}>
                    {selected.length} alumno{selected.length>1?"s":""} confirmado{selected.length>1?"s":""}
                  </span>
                )}
              </div>
            ) : shownStudents.length === 0 ? (
              <div style={{ textAlign:"center", color:sub, fontSize:12, padding:16,
                transition:"color .3s" }}>
                {search.trim() ? `Sin resultados para "${search}"` : "Sin alumnos en este curso"}
              </div>
            ) : (
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {shownStudents.map(s => {
                  const on = selected.includes(s.id);
                  return (
                    <div key={s.id} onClick={() => toggleStudent(s.id)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 4px",
                        cursor:"pointer", borderBottom:`1px solid ${navBord}`,
                        background: on ? `${sev.color}18` : "transparent", borderRadius:8,
                        transition:"background .15s" }}>
                      <div style={{ width:22, height:22, borderRadius:6,
                        border:`2px solid ${on ? sev.color : navBord}`,
                        background: on ? sev.color : "transparent",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0, fontSize:12, color:"white", fontWeight:900,
                        transition:"all .15s" }}>
                        {on && "✓"}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:txt,
                          transition:"color .3s" }}>{s.nombre}</div>
                        {s.email && <div style={{ fontSize:10, color:sub,
                          transition:"color .3s" }}>{s.email}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </WCard>

          {/* Botón enviar */}
          <button onClick={handleSend} disabled={sending || !SEND_READY}
            style={{ width:"100%",
              background: !SEND_READY ? navBord : sev.color,
              border:"none", borderRadius:14, padding:"15px", color:"white",
              fontWeight:900, fontSize:15, cursor: sending ? "not-allowed" : "pointer",
              fontFamily:"Nunito,sans-serif", transition:"background .2s",
              boxShadow: SEND_READY ? `0 4px 20px ${sev.color}55` : "none" }}>
            {sending ? "Enviando..." : `${sev.icon} Emitir Veredicto${selected.length>1?` (${selected.length})`:""}`}
          </button>
        </div>
      )}

      {/* ── ASISTENTE IA ── */}
      {view === "ia" && (
        <div style={{ padding:"16px 14px 100px" }}>
          <WCard style={{ marginBottom:12, background:`${primary}10`,
            border:`1.5px solid ${primary}40` }}>
            <div style={{ fontSize:12, color:txt, lineHeight:1.6, transition:"color .3s" }}>
              ✨ <strong>Asistente de IA</strong>: describí el caso y la IA sugerirá un veredicto
              basado en el reglamento. Siempre podés editar antes de enviar.
            </div>
          </WCard>

          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:txt, marginBottom:8,
              transition:"color .3s" }}>Descripción del caso</div>
            <textarea
              value={iaCaso}
              onChange={e => setIaCaso(e.target.value)}
              placeholder="Ej: Un alumno insultó reiteradamente a una compañera durante el recreo. Hay tres testigos. Es la segunda vez que ocurre este mes..."
              rows={5}
              style={{ width:"100%", border:`1.5px solid ${inputBd}`, borderRadius:12,
                padding:"10px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                resize:"none", outline:"none", boxSizing:"border-box",
                color:txt, background:inputBg,
                transition:"background .3s, color .3s, border-color .3s" }}
            />
            <button
              onClick={async () => {
                if (!iaCaso.trim()) return showToast("Describí el caso primero");
                setIaLoading(true); setIaSuggestion(null);
                try {
                  const d = await api.aiVerdictSuggest(iaCaso.trim());
                  setIaSuggestion(d);
                } catch(e) {
                  showToast(e.message || "Error al consultar la IA");
                } finally { setIaLoading(false); }
              }}
              disabled={iaLoading || !iaCaso.trim()}
              style={{ width:"100%", marginTop:10,
                background: (!iaCaso.trim()||iaLoading) ? navBord : primary,
                border:"none", borderRadius:12, padding:"12px",
                color:"white", fontWeight:800, fontSize:13,
                cursor: iaLoading||!iaCaso.trim() ? "not-allowed":"pointer",
                fontFamily:"Nunito,sans-serif", transition:"background .2s" }}>
              {iaLoading ? "⏳ Analizando el caso..." : "✨ Sugerir veredicto con IA"}
            </button>
          </WCard>

          {iaSuggestion && (() => {
            const sugCfg = SEVERITY_CFG[iaSuggestion.severity] || SEVERITY_CFG.advertencia;
            return (
              <WCard style={{ marginBottom:12, borderLeft:`4px solid ${sugCfg.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:20 }}>{sugCfg.icon}</span>
                  <div>
                    <div style={{ fontWeight:900, fontSize:14, color:sugCfg.color }}>{sugCfg.label}</div>
                    <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                      Sugerencia de la IA — revisá antes de enviar
                    </div>
                  </div>
                </div>

                <div style={{ fontSize:11, fontWeight:700, color:sub, marginBottom:4,
                  transition:"color .3s" }}>FUNDAMENTO LEGAL</div>
                <div style={{ fontSize:12, color:txt, background:inputBg,
                  borderRadius:8, padding:"8px 10px", marginBottom:12, lineHeight:1.5,
                  transition:"background .3s, color .3s" }}>
                  {iaSuggestion.fundamento || "No especificado"}
                </div>

                <div style={{ fontSize:11, fontWeight:700, color:sub, marginBottom:4,
                  transition:"color .3s" }}>VEREDICTO SUGERIDO</div>
                <div style={{ fontSize:13, color:txt, lineHeight:1.6, marginBottom:12,
                  transition:"color .3s" }}>{iaSuggestion.veredicto}</div>

                {iaSuggestion.coins_sugeridas > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12,
                    background:`${sugCfg.color}18`, borderRadius:10, padding:"8px 12px" }}>
                    <span style={{ fontSize:16 }}>🪙</span>
                    <span style={{ fontSize:12, fontWeight:800, color:sugCfg.color }}>
                      Penalización sugerida: {iaSuggestion.coins_sugeridas} EduCoins
                    </span>
                  </div>
                )}

                {iaSuggestion.nota_para_admin && (
                  <div style={{ background:`${primary}10`, borderRadius:10,
                    padding:"8px 12px", marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:primary,
                      marginBottom:2, transition:"color .3s" }}>NOTA PARA ADMIN</div>
                    <div style={{ fontSize:12, color:txt, transition:"color .3s" }}>
                      {iaSuggestion.nota_para_admin}
                    </div>
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
                  style={{ width:"100%", background:primary, border:"none",
                    borderRadius:12, padding:"12px", color:"white",
                    fontWeight:800, fontSize:13, cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"background .3s",
                    boxShadow:`0 4px 16px ${primary}44` }}>
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
            <div style={{ textAlign:"center", color:sub, padding:40,
              transition:"color .3s" }}>Cargando...</div>
          )}
          {!loadingH && history.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>⚖️</div>
              <div style={{ fontWeight:800, fontSize:15, color:txt,
                transition:"color .3s" }}>Sin veredictos emitidos</div>
            </div>
          )}
          {history.map(v => {
            const cfg = SEVERITY_CFG[v.severity] || SEVERITY_CFG.advertencia;
            return (
              <WCard key={v.id} style={{ marginBottom:10, borderLeft:`4px solid ${cfg.color}`,
                padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6,
                    fontSize:12, fontWeight:800, color:cfg.color }}>
                    <span>{cfg.icon}</span>{cfg.label}
                  </div>
                  <div style={{ fontSize:11, color:sub, transition:"color .3s" }}>
                    {fmt(v.created_at)}
                  </div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:txt, marginBottom:4,
                  transition:"color .3s" }}>
                  Para: <span style={{ fontWeight:900 }}>{v.to_nombre}</span>
                </div>
                <div style={{ fontSize:12, color:sub, lineHeight:1.5,
                  transition:"color .3s" }}>{v.mensaje}</div>
                {v.coins_penalty > 0 && (
                  <div style={{ fontSize:11, color:cfg.color, fontWeight:700, marginTop:6 }}>
                    🪙 -{v.coins_penalty} EduCoins · {v.read_at ? "✓ Leído" : "⏳ Sin leer"}
                  </div>
                )}
                {v.coins_reward > 0 && (
                  <div style={{ fontSize:11, color:"#10b981", fontWeight:700, marginTop:6 }}>
                    🪙 +{v.coins_reward} EduCoins · {v.read_at ? "✓ Leído" : "⏳ Sin leer"}
                  </div>
                )}
                {!v.coins_penalty && !v.coins_reward && (
                  <div style={{ fontSize:11, color:sub, marginTop:4, transition:"color .3s" }}>
                    {v.read_at ? "✓ Leído" : "⏳ Sin leer"}
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
