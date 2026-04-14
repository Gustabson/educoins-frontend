import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

const TIPO_CFG = {
  normal:     { icon:"📋", label:"Tarea",    col:"#3b82f6" },
  limitada:   { icon:"🏆", label:"Limitada", col:"#f59e0b" },
  grupal:     { icon:"👥", label:"Grupal",   col:"#8b5cf6" },
  encadenada: { icon:"🔗", label:"Serie",    col:"#64748b" },
  rol:        { icon:"👑", label:"Rol",      col:"#ec4899" },
  rapida:     { icon:"⚡", label:"Rápida",   col:"#10b981" },
};

const DIFS = {
  facil:   { label:"Fácil",   col:"#10b981" },
  media:   { label:"Media",   col:"#f59e0b" },
  dificil: { label:"Difícil", col:"#ef4444" },
};

function SectionHeader({ title, sub }) {
  const { txt, sub: subClr, navBord } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 12px" }}>
      <div style={{ flex:1, height:1, background:navBord }}/>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontWeight:900, fontSize:13, color:txt, letterSpacing:".04em", transition:"color .3s" }}>{title}</div>
        {sub && <div style={{ fontSize:10, color:subClr, fontWeight:700, transition:"color .3s" }}>{sub}</div>}
      </div>
      <div style={{ flex:1, height:1, background:navBord }}/>
    </div>
  );
}

function MisionCard({ m, onClick }) {
  const { primary, isDark, txt, sub, cardBg, inputBg } = useTheme();
  const tipo = TIPO_CFG[m.tipo] || TIPO_CFG.normal;
  const expirado = m.fecha_fin && new Date(m.fecha_fin) < new Date() && m.mi_estado !== "aprobada";
  const lleno = m.max_submissions && m.total_completadas >= m.max_submissions && !m.mi_estado;

  const estadoBg = m.mi_estado === "aprobada" ? "#10b98122"
    : m.mi_estado === "rechazada" ? "#ef444418"
    : m.mi_estado === "pendiente" ? "#f59e0b18"
    : null;
  const estadoCol = m.mi_estado === "aprobada" ? "#10b981"
    : m.mi_estado === "rechazada" ? "#ef4444"
    : m.mi_estado === "pendiente" ? "#f59e0b"
    : null;
  const estadoIcon = m.mi_estado === "aprobada" ? "✅"
    : m.mi_estado === "rechazada" ? "❌"
    : m.mi_estado === "pendiente" ? "⏳"
    : null;

  return (
    <div onClick={() => onClick(m)} style={{
      background: estadoBg || cardBg, borderRadius:18, overflow:"hidden",
      cursor:"pointer", opacity:(expirado || lleno) && !m.mi_estado ? .55 : 1,
      boxShadow: isDark ? "0 2px 10px rgba(0,0,0,.45)" : "0 2px 10px rgba(0,0,0,.08)",
      transition:"background .3s", display:"flex", flexDirection:"column",
      border: estadoCol ? `1.5px solid ${estadoCol}33` : "1.5px solid transparent",
    }}>
      {m.imagen_url ? (
        <div style={{ position:"relative", paddingBottom:"65%", overflow:"hidden", background:inputBg, flexShrink:0 }}>
          <img src={m.imagen_url} alt={m.titulo} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
          <div style={{ position:"absolute", top:8, left:8,
            background: tipo.col + "ee", color:"white", borderRadius:99,
            padding:"3px 8px", fontSize:10, fontWeight:900 }}>
            {tipo.icon} {tipo.label}
          </div>
        </div>
      ) : (
        <div style={{ position:"relative", paddingBottom:"65%", background: tipo.col + "18", flexShrink:0 }}>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:36 }}>{m.icon || tipo.icon}</span>
            <span style={{ fontSize:10, color: tipo.col, fontWeight:900, background: tipo.col+"18", borderRadius:99, padding:"2px 8px" }}>
              {tipo.label}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding:"10px 11px 12px", flex:1, display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontWeight:800, fontSize:13, color: estadoCol || txt, lineHeight:1.25, transition:"color .3s",
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {estadoIcon && `${estadoIcon} `}{m.titulo}
        </div>
        {m.creador_nombre && (
          <div style={{ fontSize:10, color:sub, fontWeight:700, transition:"color .3s" }}>
            {m.creador_nombre.split(" ")[0]}
          </div>
        )}
        <div style={{ marginTop:"auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:4 }}>
          <div style={{ fontWeight:900, fontSize:14, color: primary, transition:"color .3s" }}>
            🪙 {m.recompensa.toLocaleString("es-AR")}
          </div>
          {m.max_submissions && (
            <div style={{ fontSize:10, color:sub, fontWeight:700 }}>
              {m.total_completadas}/{m.max_submissions}
            </div>
          )}
        </div>
        {m.fecha_fin && (
          <div style={{ fontSize:10, color: expirado ? "#ef4444" : "#f59e0b", fontWeight:700 }}>
            {expirado ? "⏰ Vencida" : `⏰ ${new Date(m.fecha_fin).toLocaleDateString("es-AR", { day:"numeric", month:"short" })}`}
          </div>
        )}
        {lleno && <div style={{ fontSize:10, color:"#ef4444", fontWeight:800 }}>Sin cupos</div>}
      </div>
    </div>
  );
}

function DetailSheet({ m, onClose, onSubmit, submitting, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [comentario, setComentario] = useState("");
  const [lightbox, setLightbox] = useState(false);
  const tipo = TIPO_CFG[m.tipo] || TIPO_CFG.normal;
  const expirado = m.fecha_fin && new Date(m.fecha_fin) < new Date();
  const lleno = m.max_submissions && m.total_completadas >= m.max_submissions;
  const canSubmit = !m.mi_estado || m.mi_estado === "rechazada";
  const isAutoApprove = m.auto_approve;

  return (
    <>
      {lightbox && m.imagen_url && (
        <div onClick={() => setLightbox(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.93)", zIndex:700,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <img src={m.imagen_url} alt="" style={{ maxWidth:"100%", maxHeight:"85vh", borderRadius:16, objectFit:"contain" }}/>
          <button onClick={() => setLightbox(false)} style={{ position:"absolute", top:20, right:20,
            background:"rgba(255,255,255,.2)", border:"none", borderRadius:"50%", color:"white",
            width:40, height:40, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center",
            justifyContent:"center" }}>✕</button>
        </div>
      )}
      <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
        <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
        <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
          maxHeight:"88vh", display:"flex", flexDirection:"column",
          boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s", animation:"slideUp .25s ease" }}>
          <div style={{ width:40, height:4, background:navBord, borderRadius:99, margin:"12px auto 0", flexShrink:0 }}/>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 40px" }}>

            {m.imagen_url ? (
              <div onClick={() => setLightbox(true)} style={{ position:"relative", paddingBottom:"52%", overflow:"hidden",
                borderRadius:18, background:inputBg, marginBottom:16, cursor:"pointer" }}>
                <img src={m.imagen_url} alt={m.titulo} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                <div style={{ position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,.45)",
                  borderRadius:99, padding:"4px 10px", fontSize:10, color:"white", fontWeight:700 }}>🔍 Ver</div>
              </div>
            ) : (
              <div style={{ textAlign:"center", fontSize:56, marginBottom:12 }}>{m.icon || tipo.icon}</div>
            )}

            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
              <span style={{ background: tipo.col + "22", color: tipo.col, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:900 }}>
                {tipo.icon} {tipo.label}
              </span>
              {m.dificultad && DIFS[m.dificultad] && (
                <span style={{ background: DIFS[m.dificultad].col+"22", color: DIFS[m.dificultad].col,
                  borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:900 }}>
                  {DIFS[m.dificultad].label}
                </span>
              )}
              {m.auto_approve && (
                <span style={{ background:"#10b98122", color:"#10b981", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:900 }}>
                  ⚡ Auto-aprueba
                </span>
              )}
              {m.max_submissions && (
                <span style={{ background: primary+"18", color:primary, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:900 }}>
                  {m.total_completadas}/{m.max_submissions} cupos
                </span>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:8 }}>
              <div style={{ fontWeight:900, fontSize:18, color:txt, flex:1, lineHeight:1.3, transition:"color .3s" }}>{m.titulo}</div>
              <div style={{ fontWeight:900, fontSize:22, color:primary, flexShrink:0, transition:"color .3s" }}>
                🪙 {m.recompensa.toLocaleString("es-AR")}
              </div>
            </div>

            {m.creador_nombre && (
              <div style={{ fontSize:12, color:sub, fontWeight:700, marginBottom:12, transition:"color .3s" }}>
                Creado por {m.creador_nombre}
              </div>
            )}

            {m.descripcion && (
              <div style={{ fontSize:14, color:sub, lineHeight:1.6, marginBottom:16, transition:"color .3s" }}>{m.descripcion}</div>
            )}

            {m.fecha_fin && (
              <div style={{ background: expirado?"#ef444418":"#f59e0b18", borderRadius:12, padding:"10px 14px",
                marginBottom:14, fontSize:13, color: expirado?"#ef4444":"#f59e0b", fontWeight:800 }}>
                {expirado ? "⏰ Esta misión venció" : `⏰ Vence ${new Date(m.fecha_fin).toLocaleString("es-AR", { day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" })}`}
              </div>
            )}

            {m.mi_estado === "rechazada" && m.mi_feedback && (
              <div style={{ background:"#ef444418", border:"1.5px solid #ef444433", borderRadius:14, padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#ef4444", fontWeight:900, marginBottom:4 }}>❌ Motivo del rechazo</div>
                <div style={{ fontSize:13, color:txt, fontWeight:700, lineHeight:1.5, transition:"color .3s" }}>{m.mi_feedback}</div>
              </div>
            )}

            {m.mi_estado === "pendiente" && (
              <div style={{ background:"#f59e0b18", border:"1.5px solid #f59e0b33", borderRadius:14, padding:"12px 14px", marginBottom:16,
                textAlign:"center", fontWeight:900, color:"#f59e0b", fontSize:14 }}>
                ⏳ En revisión — esperá la aprobación de tu docente
              </div>
            )}
            {m.mi_estado === "aprobada" && (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98133", borderRadius:14, padding:"12px 14px", marginBottom:16,
                textAlign:"center", fontWeight:900, color:"#10b981", fontSize:14 }}>
                ✅ ¡Completada! Recibiste 🪙{m.recompensa.toLocaleString("es-AR")}
              </div>
            )}

            {canSubmit && !expirado && !(lleno && !m.mi_estado) && (
              <div style={{ marginTop:4 }}>
                {!isAutoApprove && m.tipo !== "rol" && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:sub, marginBottom:6, transition:"color .3s" }}>
                      COMENTARIO (OPCIONAL)
                    </div>
                    <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                      placeholder="Dejá un comentario para tu docente..."
                      rows={3} style={{ width:"100%", boxSizing:"border-box",
                        background:isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.04)",
                        border:`1px solid ${navBord}`, borderRadius:12, padding:"10px 12px",
                        fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:700,
                        color:txt, resize:"vertical", lineHeight:1.5, outline:"none", transition:"all .3s" }}/>
                  </div>
                )}
                <button onClick={() => onSubmit(m, comentario)} disabled={submitting}
                  style={{ width:"100%", padding:"15px",
                    background: submitting ? (isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)") : primary,
                    color: submitting ? sub : "white",
                    border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
                    fontSize:15, fontWeight:900, cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? .6 : 1, transition:"all .2s" }}>
                  {submitting ? "Enviando..." :
                   isAutoApprove ? `⚡ Completar ahora · 🪙${m.recompensa}` :
                   m.tipo === "rol" ? `👑 Reclamar este rol` :
                   "📬 Entregar misión"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AMisiones({ me, balance, showToast, refreshBalance, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState("todas");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const ms = await api.missions();
    const arr = Array.isArray(ms) ? ms : ms.data || [];
    setMissions(arr);
    return arr;
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const submit = async (mission, comentario) => {
    setSubmitting(true);
    try {
      await api.submitMission(mission.id);
      showToast(mission.auto_approve ? "⚡ ¡Completada! Recompensa recibida" : "📬 Enviada, esperá la aprobación");
      if (mission.auto_approve) refreshBalance();
      const arr = await load();
      const fresh = arr.find(x => x.id === mission.id);
      setDetail(fresh || null);
    } catch(e) {
      showToast(e.message || "Error al entregar", "error");
    } finally { setSubmitting(false); }
  };

  const disponibles = missions.filter(m => !m.mi_estado || m.mi_estado === "rechazada");
  const mias = missions.filter(m => !!m.mi_estado);

  const filtered = filter === "disponibles" ? disponibles
    : filter === "mias" ? mias
    : missions;

  const destacadas  = disponibles.filter(m => m.creador_rol === "admin");
  const rolMissions = disponibles.filter(m => m.tipo === "rol" && m.creador_rol !== "admin");
  const rapidas     = disponibles.filter(m => (m.tipo === "rapida" || m.auto_approve) && m.tipo !== "rol" && m.creador_rol !== "admin");
  const tareas      = disponibles.filter(m => !["rol","rapida"].includes(m.tipo) && !m.auto_approve && m.creador_rol !== "admin");

  const FILTERS = [
    { id:"todas",      label:"Todas" },
    { id:"disponibles",label:`Disponibles${disponibles.length ? ` (${disponibles.length})` : ""}` },
    { id:"mias",       label:`Mis entregas${mias.length ? ` (${mias.length})` : ""}` },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:pageBg, fontFamily:"Nunito,sans-serif", transition:"background .3s" }}>

      <div style={{ background:primary, position:"sticky", top:0, zIndex:50, overflow:"hidden", color:"white", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.1)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ padding:"22px 20px 18px", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", position:"relative", minHeight:32 }}>
            {onBack && (
              <div style={{ position:"absolute", left:0, zIndex:1 }}>
                <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:99,
                  color:"white", padding:"6px 14px", cursor:"pointer", fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:900 }}>‹</button>
              </div>
            )}
            <div style={{ position:"absolute", left:0, right:0, textAlign:"center", pointerEvents:"none", fontWeight:900, fontSize:20, color:"white" }}>
              Misiones
            </div>
          </div>
        </div>
      </div>

      <div style={{ background:cardBg, padding:"10px 14px", display:"flex", gap:8, overflowX:"auto", flexShrink:0, borderBottom:`1px solid ${navBord}`, transition:"background .3s" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ flexShrink:0, padding:"7px 16px", borderRadius:99, border:"none", cursor:"pointer",
              fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:800,
              background: filter === f.id ? primary : "transparent",
              color: filter === f.id ? "white" : sub,
              transition:"all .2s" }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 100px" }}>
        {loading && <div style={{ textAlign:"center", padding:"60px 0", color:sub, fontWeight:700 }}>Cargando misiones...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
            <div style={{ fontWeight:800, fontSize:15 }}>
              {filter === "disponibles" ? "No hay misiones disponibles" :
               filter === "mias" ? "No entregaste ninguna misión" :
               "No hay misiones activas"}
            </div>
          </div>
        )}

        {!loading && filter === "todas" && (
          <>
            {/* Admin missions — destacadas full-width */}
            {destacadas.length > 0 && (
              <>
                <SectionHeader title="📢 De la escuela" sub="Publicado por la administración"/>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:8 }}>
                  {destacadas.map(m => (
                    <div key={m.id} onClick={() => setDetail(m)}
                      style={{ background: isDark ? cardBg : "#fffbeb",
                        border: `2px solid #f59e0b55`, borderRadius: 20,
                        padding: "16px", cursor: "pointer",
                        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,.4)" : "0 2px 12px rgba(245,158,11,.15)",
                        display: "flex", gap: 14, alignItems: "center", transition: "background .3s" }}>
                      {m.imagen_url
                        ? <img src={m.imagen_url} alt="" style={{ width:72, height:72, borderRadius:14, objectFit:"cover", flexShrink:0 }}/>
                        : <div style={{ width:72, height:72, borderRadius:14, background:"#f59e0b18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, flexShrink:0 }}>{m.icon||"⚡"}</div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                          <span style={{ background:"#f59e0b", color:"white", borderRadius:99, padding:"2px 10px", fontSize:10, fontWeight:900 }}>📢 OFICIAL</span>
                          {m.auto_approve && <span style={{ background:"#10b98122", color:"#10b981", borderRadius:99, padding:"2px 8px", fontSize:10, fontWeight:800 }}>⚡ Auto</span>}
                        </div>
                        <div style={{ fontWeight:900, fontSize:15, color:txt, transition:"color .3s", marginBottom:2 }}>{m.titulo}</div>
                        {m.descripcion && <div style={{ fontSize:12, color:sub, transition:"color .3s", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{m.descripcion}</div>}
                        <div style={{ fontWeight:900, color:"#f59e0b", fontSize:14, marginTop:6 }}>🪙 {m.recompensa.toLocaleString("es-AR")}</div>
                      </div>
                      <span style={{ color: sub, fontSize: 20, flexShrink:0 }}>›</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {rapidas.length > 0 && (
              <>
                <SectionHeader title="⚡ Rápidas" sub="Se aprueban automáticamente"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {rapidas.map(m => <MisionCard key={m.id} m={m} onClick={setDetail}/>)}
                </div>
              </>
            )}
            {rolMissions.length > 0 && (
              <>
                <SectionHeader title="👑 Roles del aula" sub="Reclamá un rol disponible"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {rolMissions.map(m => <MisionCard key={m.id} m={m} onClick={setDetail}/>)}
                </div>
              </>
            )}
            {tareas.length > 0 && (
              <>
                <SectionHeader title="📋 Tareas y desafíos"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {tareas.map(m => <MisionCard key={m.id} m={m} onClick={setDetail}/>)}
                </div>
              </>
            )}
            {mias.length > 0 && (
              <>
                <SectionHeader title="📬 Mis entregas" sub="Tu historial de misiones"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {mias.map(m => <MisionCard key={m.id} m={m} onClick={setDetail}/>)}
                </div>
              </>
            )}
          </>
        )}

        {!loading && filter !== "todas" && filtered.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {filtered.map(m => <MisionCard key={m.id} m={m} onClick={setDetail}/>)}
          </div>
        )}
      </div>

      {detail && (
        <DetailSheet
          m={detail}
          onClose={() => setDetail(null)}
          onSubmit={submit}
          submitting={submitting}
          showToast={showToast}/>
      )}
    </div>
  );
}
