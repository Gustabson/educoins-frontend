import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { DIFCOL } from "../../constants";
import { OHdrA, Inp, PBtn, Pill, WCard } from "../shared/index";

const TIPO_COL  = { normal:"#3b82f6", limitada:"#ef4444", grupal:"#10b981", encadenada:"#8b5cf6", rol:"#ec4899", rapida:"#10b981" };
const TIPO_ICON = { normal:"📋", limitada:"⏱", grupal:"👥", encadenada:"🔗", rol:"👑", rapida:"⚡" };

function toLocalDT(iso){ if(!iso) return ""; const d=new Date(iso),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

function compressImg(file,maxWidth=600,quality=0.75){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>{ const img=new Image(); img.onload=()=>{ const c=document.createElement("canvas"),ratio=Math.min(maxWidth/img.width,1); c.width=Math.round(img.width*ratio); c.height=Math.round(img.height*ratio); c.getContext("2d").drawImage(img,0,0,c.width,c.height); res(c.toDataURL("image/jpeg",quality)); }; img.onerror=rej; img.src=e.target.result; };
    r.onerror=rej; r.readAsDataURL(file);
  });
}

export default function AdminMisiones({ me, showToast, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();
  const [missions, setMissions]         = useState([]);
  const [loading,  setLoading]          = useState(true);
  const [form,     setForm]             = useState(false);   // false | "new" | mission_obj
  const [deleting, setDeleting]         = useState(null);

  // form fields
  const [titulo,          setTitulo]          = useState("");
  const [desc,            setDesc]            = useState("");
  const [rec,             setRec]             = useState("");
  const [dif,             setDif]             = useState("facil");
  const [tipo,            setTipo]            = useState("normal");
  const [durVal,          setDurVal]          = useState("24");
  const [durUnidad,       setDurUnidad]       = useState("horas");
  const [maxSub,          setMaxSub]          = useState("");
  const [imgUrl,          setImgUrl]          = useState("");
  const [imgLoading,      setImgLoading]      = useState(false);
  const [misionIcon,      setMisionIcon]      = useState("⚡");
  const [autoApprove,     setAutoApprove]     = useState(false);
  const [activarTarde,    setActivarTarde]    = useState(false);
  const [fechaInicio,     setFechaInicio]     = useState("");
  const [grupoMin,        setGrupoMin]        = useState("2");
  const [grupoMax,        setGrupoMax]        = useState("2");
  const [peerEval,        setPeerEval]        = useState(true);
  const fileRef = useRef(null);

  const reload = () =>
    api.teacherMissions()
      .then(d => setMissions(Array.isArray(d) ? d : d.data || []))
      .catch(() => {});

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const resetForm = () => {
    setTitulo(""); setDesc(""); setRec(""); setDif("facil"); setTipo("normal");
    setDurVal("24"); setDurUnidad("horas"); setMaxSub(""); setImgUrl("");
    setMisionIcon("⚡"); setAutoApprove(false); setActivarTarde(false); setFechaInicio("");
    setGrupoMin("2"); setGrupoMax("2"); setPeerEval(true);
  };

  const openEdit = (m) => {
    setTitulo(m.titulo||""); setDesc(m.descripcion||""); setRec(String(m.recompensa||""));
    setDif(m.dificultad||"facil"); setTipo(m.tipo||"normal");
    setMaxSub(m.max_submissions ? String(m.max_submissions) : "");
    setImgUrl(m.imagen_url||""); setMisionIcon(m.icon||"⚡"); setAutoApprove(!!m.auto_approve);
    if (m.fecha_inicio) { setActivarTarde(true); setFechaInicio(toLocalDT(m.fecha_inicio)); }
    else { setActivarTarde(false); setFechaInicio(""); }
    setGrupoMin(String(m.grupo_min_size || 2)); setGrupoMax(String(m.grupo_max_size || 2));
    setPeerEval(m.requires_peer_eval !== false);
    setForm(m);
  };

  const calcFin = () => {
    if (tipo !== "limitada" || !durVal) return null;
    const d = new Date(), v = parseInt(durVal) || 1;
    if (durUnidad === "minutos") d.setMinutes(d.getMinutes() + v);
    else if (durUnidad === "horas") d.setHours(d.getHours() + v);
    else d.setDate(d.getDate() + v);
    return d.toISOString();
  };

  const guardar = async () => {
    if (!titulo.trim() || !rec) { showToast("Completá título y recompensa", "error"); return; }
    const isEdit = form && typeof form === "object" && form.id;
    const payload = {
      titulo: titulo.trim(), descripcion: desc.trim(), recompensa: parseInt(rec),
      dificultad: dif, tipo,
      max_submissions: (tipo === "grupal" || tipo === "rol") && maxSub ? parseInt(maxSub)
        : tipo === "rol" ? 1 : null,
      imagen_url: imgUrl || null, icon: misionIcon || "⚡",
      auto_approve: autoApprove || tipo === "rapida",
      fecha_inicio: activarTarde && fechaInicio ? new Date(fechaInicio).toISOString() : null,
      grupo_min_size: tipo === "grupal" ? parseInt(grupoMin) || 2 : 2,
      grupo_max_size: tipo === "grupal" ? parseInt(grupoMax) || 2 : 2,
      requires_peer_eval: tipo === "grupal" ? peerEval : false,
    };
    if (!isEdit) payload.fecha_fin = calcFin();
    try {
      if (isEdit) {
        const d = await api.updateMission(form.id, payload);
        setMissions(prev => prev.map(m => m.id === form.id ? { ...m, ...(d.data || d) } : m));
        showToast("Misión actualizada");
      } else {
        const d = await api.createMission(payload);
        setMissions(prev => [d.data || d, ...prev]);
        showToast("Misión creada ✅");
      }
      resetForm(); setForm(false);
    } catch (e) { showToast(e.message || "Error", "error"); }
  };

  const eliminar = async (m, ev) => {
    ev.stopPropagation();
    if (!window.confirm(`¿Eliminar "${m.titulo}"?`)) return;
    setDeleting(m.id);
    try {
      await api.deleteMission(m.id);
      setMissions(prev => prev.filter(x => x.id !== m.id));
      showToast("Misión eliminada");
    } catch (e) { showToast(e.message || "Error", "error"); }
    finally { setDeleting(null); }
  };

  const premiarTodos = async (m, ev) => {
    ev.stopPropagation();
    try {
      const r = await api.missionRewardAll(m.id);
      showToast(`✅ Premiaste a ${r.count ?? r.data?.count ?? 0} alumno(s)`);
      reload();
    } catch (e) { showToast(e.message || "Error", "error"); }
  };

  const isEdit = form && typeof form === "object" && form.id;

  const inp = {
    background: inputBg, border: `1px solid ${navBord}`, borderRadius: 10,
    padding: "10px 12px", fontFamily: "Nunito,sans-serif", fontSize: 14, fontWeight: 700,
    color: txt, width: "100%", boxSizing: "border-box", outline: "none", transition: "all .3s",
  };
  const selStyle = { ...inp, appearance: "auto" };

  return (
    <div style={{ background: pageBg, minHeight: "100%", fontFamily: "Nunito,sans-serif", transition: "background .3s" }}>
      <OHdrA title="⚡ Misiones" onBack={onBack}
        extra={
          <button onClick={() => { resetForm(); setForm("new"); }}
            style={{ background: "rgba(255,255,255,.22)", border: "1.5px solid rgba(255,255,255,.35)",
              borderRadius: 99, color: "white", padding: "6px 16px", fontWeight: 800,
              fontSize: 12, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
            + Nueva
          </button>
        }/>

      <div style={{ padding: "12px 14px 100px" }}>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", color: sub }}>Cargando...</div>}
        {!loading && missions.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: sub }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 800 }}>Sin misiones. Creá la primera.</div>
          </div>
        )}

        {missions.map(m => {
          const programada = m.fecha_inicio && new Date(m.fecha_inicio) > new Date();
          const esMia      = m.created_by === me?.id;
          return (
            <WCard key={m.id} style={{ marginBottom: 10, borderLeft: `4px solid ${TIPO_COL[m.tipo] || primary}`, opacity: !m.activa ? .55 : 1, transition: "background .3s" }}>
              {/* Fila badges */}
              <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Pill text={m.dificultad} col={DIFCOL[m.dificultad]}/>
                <span style={{ background: TIPO_COL[m.tipo||"normal"] + "22", color: TIPO_COL[m.tipo||"normal"],
                  borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>
                  {TIPO_ICON[m.tipo||"normal"]} {m.tipo||"normal"}
                </span>
                {m.auto_approve && <span style={{ background: "#10b98118", color: "#10b981", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>⚡ auto</span>}
                {m.tipo === "grupal" && <span style={{ background: "#8b5cf618", color: "#8b5cf6", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>{m.grupo_min_size||2}-{m.grupo_max_size||2} miembros{m.requires_peer_eval ? " · 🤝" : ""}</span>}
                {!esMia && <span style={{ background: primary + "18", color: primary, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>por {m.creador_nombre?.split(" ")[0]}</span>}
                {programada && (
                  <span style={{ background: "#f59e0b18", color: "#f59e0b", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>
                    🕐 {new Date(m.fecha_inicio).toLocaleString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                )}
                {m.fecha_fin && !programada && (
                  <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>
                    ⏰ {new Date(m.fecha_fin).toLocaleString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                )}
              </div>

              {/* Título + acciones */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: txt, transition: "color .3s" }}>
                    {m.icon || "⚡"} {m.titulo}
                  </div>
                  {m.descripcion && <div style={{ fontSize: 12, color: sub, marginTop: 2, transition: "color .3s" }}>{m.descripcion}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(m)}
                    style={{ background: primary + "18", color: primary, border: "none", borderRadius: 8,
                      padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    ✏️
                  </button>
                  <button onClick={e => eliminar(m, e)} disabled={deleting === m.id}
                    style={{ background: "#ef444418", color: "#ef4444", border: "none", borderRadius: 8,
                      padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    🗑️
                  </button>
                </div>
              </div>

              {/* Stats + premiar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                <div style={{ fontWeight: 800, color: primary, transition: "color .3s" }}>🪙 {m.recompensa}</div>
                <div style={{ fontSize: 11, color: sub, transition: "color .3s" }}>
                  {m.pendientes || 0} pendientes · {m.aprobadas || 0} aprobadas
                </div>
                {(m.pendientes || 0) > 0 && (
                  <button onClick={e => premiarTodos(m, e)}
                    style={{ background: "#10b98118", color: "#10b981", border: "none", borderRadius: 8,
                      padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    ✅ Premiar todos ({m.pendientes})
                  </button>
                )}
              </div>
            </WCard>
          );
        })}
      </div>

      {/* ── Sheet crear/editar ─────────────────────────────── */}
      {form && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => { setForm(false); resetForm(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }}/>
          <div style={{ position: "relative", background: cardBg, borderRadius: "28px 28px 0 0",
            maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 -8px 40px rgba(0,0,0,.25)", transition: "background .3s", animation: "slideUp .25s ease" }}>
            <div style={{ width: 40, height: 4, background: navBord, borderRadius: 99, margin: "12px auto 0", flexShrink: 0 }}/>
            <div style={{ padding: "16px 20px 6px", flexShrink: 0, fontWeight: 900, fontSize: 17, color: txt, transition: "color .3s" }}>
              {isEdit ? "Editar misión" : "Nueva misión"}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>

              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título *" style={inp}/>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción (opcional)" rows={2}
                style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}/>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input type="number" value={rec} onChange={e => setRec(e.target.value)} placeholder="🪙 Recompensa *" style={inp}/>
                <select value={dif} onChange={e => setDif(e.target.value)} style={selStyle}>
                  <option value="facil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              {/* Tipo — solo en creación */}
              {!isEdit && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: sub, transition: "color .3s" }}>TIPO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[["normal","📋 Normal"],["limitada","⏱ Tiempo"],["grupal","👥 Grupal"],["rol","👑 Rol"],["rapida","⚡ Rápida"]].map(([v, l]) => (
                      <button key={v} onClick={() => { setTipo(v); setAutoApprove(v === "rapida"); }}
                        style={{ background: tipo === v ? TIPO_COL[v] : (isDark ? "rgba(255,255,255,.08)" : "#f0f0f0"),
                          color: tipo === v ? "white" : sub, border: "none", borderRadius: 10,
                          padding: "9px 6px", fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif", transition: "all .2s" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Duración para limitada */}
              {tipo === "limitada" && !isEdit && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" value={durVal} min="1" onChange={e => setDurVal(e.target.value)}
                    style={{ ...inp, width: 64, textAlign: "center" }}/>
                  <select value={durUnidad} onChange={e => setDurUnidad(e.target.value)} style={{ ...selStyle, flex: 1 }}>
                    <option value="minutos">minutos</option>
                    <option value="horas">horas</option>
                    <option value="dias">días</option>
                  </select>
                </div>
              )}

              {/* Cupos */}
              {(tipo === "grupal" || tipo === "rol") && (
                <input type="number" value={maxSub} onChange={e => setMaxSub(e.target.value)}
                  placeholder={tipo === "rol" ? "Cupos (por defecto 1)" : "Máx. participantes (vacío = ilimitado)"}
                  style={inp}/>
              )}

              {/* Grupal config */}
              {tipo === "grupal" && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: sub, transition: "color .3s" }}>TAMAÑO DEL GRUPO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Mínimo</div>
                      <input type="number" min="2" max="10" value={grupoMin} onChange={e => setGrupoMin(e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Máximo</div>
                      <input type="number" min="2" max="10" value={grupoMax} onChange={e => setGrupoMax(e.target.value)} style={inp}/>
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={peerEval} onChange={e => setPeerEval(e.target.checked)}
                      style={{ accentColor: "#8b5cf6", width: 18, height: 18 }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: sub, transition: "color .3s" }}>🤝 Evaluación entre pares al completar</span>
                  </label>
                </>
              )}

              {/* Auto-approve */}
              {tipo !== "rapida" && (
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={autoApprove} onChange={e => setAutoApprove(e.target.checked)}
                    style={{ accentColor: "#10b981", width: 18, height: 18 }}/>
                  <span style={{ fontSize: 13, fontWeight: 700, color: sub, transition: "color .3s" }}>⚡ Aprobación automática</span>
                </label>
              )}

              {/* Programar activación */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={activarTarde} onChange={e => setActivarTarde(e.target.checked)}
                  style={{ accentColor: primary, width: 18, height: 18 }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: sub, transition: "color .3s" }}>🕐 Programar activación</span>
              </label>
              {activarTarde && (
                <input type="datetime-local" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inp}/>
              )}

              {/* Ícono + imagen */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={misionIcon} onChange={e => setMisionIcon(e.target.value)} maxLength={4}
                  placeholder="⚡" style={{ ...inp, width: 56, textAlign: "center", fontSize: 22, padding: "8px" }}/>
                <span style={{ fontSize: 12, color: sub, fontWeight: 700, transition: "color .3s" }}>Emoji ícono</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                setImgLoading(true);
                try { setImgUrl(await compressImg(f)); }
                catch { showToast("Error al procesar imagen", "error"); }
                finally { setImgLoading(false); }
              }} style={{ display: "none" }}/>
              {imgUrl ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 100 }}>
                  <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  <button onClick={() => setImgUrl("")}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)",
                      border: "none", borderRadius: "50%", color: "white", width: 26, height: 26, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={imgLoading}
                  style={{ width: "100%", padding: "10px", background: isDark ? "rgba(255,255,255,.06)" : "#f0f0f0",
                    color: sub, border: `1.5px dashed ${navBord}`, borderRadius: 12, cursor: "pointer",
                    fontFamily: "Nunito,sans-serif", fontSize: 13, fontWeight: 800, transition: "all .3s" }}>
                  {imgLoading ? "Procesando..." : "📷 Agregar imagen (opcional)"}
                </button>
              )}

              <button onClick={guardar}
                style={{ width: "100%", padding: "14px", background: primary, color: "white",
                  border: "none", borderRadius: 16, fontFamily: "Nunito,sans-serif",
                  fontSize: 15, fontWeight: 900, cursor: "pointer", transition: "background .3s" }}>
                {isEdit ? "Guardar cambios" : "Crear misión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
