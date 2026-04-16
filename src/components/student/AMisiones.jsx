import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av } from "../shared/index";

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

function MisionCard({ m, onClick, pendingEvals }) {
  const { primary, isDark, txt, sub, cardBg, inputBg } = useTheme();
  const tipo = TIPO_CFG[m.tipo] || TIPO_CFG.normal;
  const expirado = m.fecha_fin && new Date(m.fecha_fin) < new Date() && m.mi_estado !== "aprobada";
  const lleno = m.max_submissions && m.total_completadas >= m.max_submissions && !m.mi_estado;
  const hasPendingEval = pendingEvals?.some(pe => pe.mission_id === m.id);

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
      position:"relative",
    }}>
      {hasPendingEval && (
        <div style={{ position:"absolute", top:8, right:8, zIndex:2, background:"#8b5cf6",
          color:"white", borderRadius:99, padding:"2px 8px", fontSize:9, fontWeight:900 }}>
          EVALUAR
        </div>
      )}
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
        {/* Group status badge for grupal missions */}
        {m.tipo === "grupal" && m.mi_group_status && (
          <div style={{ fontSize:10, fontWeight:800,
            color: m.mi_group_status === "ready" ? "#10b981"
              : m.mi_group_status === "approved" ? "#10b981"
              : m.mi_group_status === "submitted" ? "#f59e0b"
              : "#8b5cf6" }}>
            {m.mi_group_status === "forming" ? "👥 Esperando grupo"
              : m.mi_group_status === "ready" ? "✅ Grupo listo"
              : m.mi_group_status === "submitted" ? "⏳ Entregada"
              : m.mi_group_status === "approved" ? "✅ Aprobada"
              : "👥 " + m.mi_group_status}
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

// ═════════════════════════════════════════════════════════════════
// GroupFormSheet — select classmates to form a group for grupal mission
// ═════════════════════════════════════════════════════════════════
function GroupFormSheet({ mission, onClose, onCreated, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [classmates, setClassmates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const minSize = mission.grupo_min_size || 2;
  const maxSize = mission.grupo_max_size || 2;
  const maxPartners = maxSize - 1; // minus the creator

  useEffect(() => {
    api.peerClassmates(mission.id).then(r => {
      setClassmates(r.data || []);
    }).catch(() => showToast("Error cargando compañeros", "error"))
      .finally(() => setLoading(false));
  }, [mission.id]);

  const toggle = (uid) => {
    setSelected(prev => {
      if (prev.includes(uid)) return prev.filter(x => x !== uid);
      if (prev.length >= maxPartners) return prev;
      return [...prev, uid];
    });
  };

  const canCreate = selected.length >= (minSize - 1) && selected.length <= maxPartners;

  const create = async () => {
    setCreating(true);
    try {
      const r = await api.peerCreateGroup({ mission_id: mission.id, partner_ids: selected });
      showToast("Grupo creado — esperando aceptación");
      onCreated(r.data);
    } catch (e) {
      showToast(e.message || "Error al crear grupo", "error");
    } finally { setCreating(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
      <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
        maxHeight:"85vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s", animation:"slideUp .25s ease" }}>
        <div style={{ width:40, height:4, background:navBord, borderRadius:99, margin:"12px auto 0", flexShrink:0 }}/>
        <div style={{ padding:"16px 20px 8px" }}>
          <div style={{ fontWeight:900, fontSize:18, color:txt, transition:"color .3s" }}>👥 Formar grupo</div>
          <div style={{ fontSize:12, color:sub, marginTop:2, fontWeight:700, transition:"color .3s" }}>
            {mission.titulo} — elegí {minSize === maxSize ? `${minSize - 1}` : `${minSize - 1} a ${maxPartners}`} compañero{maxPartners > 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"8px 20px 20px" }}>
          {loading && <div style={{ textAlign:"center", padding:40, color:sub, fontWeight:700 }}>Cargando...</div>}
          {!loading && classmates.length === 0 && (
            <div style={{ textAlign:"center", padding:40, color:sub }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🤷</div>
              <div style={{ fontWeight:800, fontSize:13 }}>No hay compañeros disponibles</div>
              <div style={{ fontSize:11, marginTop:4 }}>Puede que todos ya estén en un grupo para esta misión</div>
            </div>
          )}
          {classmates.map(c => {
            const isSel = selected.includes(c.id);
            const isDisabled = !isSel && selected.length >= maxPartners;
            return (
              <div key={c.id} onClick={() => !isDisabled && toggle(c.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                  background: isSel ? primary + "18" : "transparent",
                  borderRadius:16, marginBottom:4, cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled ? .4 : 1, border: isSel ? `1.5px solid ${primary}44` : "1.5px solid transparent",
                  transition:"all .2s" }}>
                <Av user={c} sz={40}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:txt, transition:"color .3s" }}>{c.nombre}</div>
                  {c.rotation_warning && (
                    <div style={{ fontSize:10, color:"#f59e0b", fontWeight:800 }}>
                      ⚠️ Trabajaste juntos {c.times_paired} veces
                    </div>
                  )}
                </div>
                <div style={{ width:26, height:26, borderRadius:99,
                  border: isSel ? "none" : `2px solid ${navBord}`,
                  background: isSel ? primary : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"white", fontSize:14, fontWeight:900, flexShrink:0, transition:"all .2s" }}>
                  {isSel && "✓"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"12px 20px 28px", borderTop:`1px solid ${navBord}` }}>
          <div style={{ fontSize:11, color:sub, fontWeight:700, textAlign:"center", marginBottom:8 }}>
            {selected.length} de {minSize === maxSize ? minSize - 1 : `${minSize - 1}-${maxPartners}`} seleccionados
          </div>
          <button onClick={create} disabled={!canCreate || creating}
            style={{ width:"100%", padding:15,
              background: !canCreate || creating ? (isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)") : primary,
              color: !canCreate || creating ? sub : "white",
              border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
              fontSize:15, fontWeight:900, cursor: !canCreate || creating ? "not-allowed" : "pointer",
              opacity: !canCreate || creating ? .6 : 1, transition:"all .2s" }}>
            {creating ? "Creando..." : "👥 Invitar y crear grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PeerEvalSheet — rate teammates after a grupal mission (outside school hours)
// ═════════════════════════════════════════════════════════════════
function PeerEvalSheet({ evalData, schoolHours, onClose, onDone, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [sending, setSending] = useState(false);

  const teammates = evalData.teammates || [];
  const allRated = teammates.every(t => ratings[t.user_id] && ratings[t.user_id] > 0);

  const setRating = (uid, val) => setRatings(p => ({ ...p, [uid]: val }));
  const setComment = (uid, val) => setComments(p => ({ ...p, [uid]: val }));

  const STAR_LABELS = ["", "Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];

  const submit = async () => {
    if (schoolHours) {
      showToast("Solo podés evaluar fuera del horario escolar", "error");
      return;
    }
    setSending(true);
    try {
      const evaluations = teammates.map(t => ({
        evaluatee_id: t.user_id,
        rating: ratings[t.user_id],
        comment: comments[t.user_id] || "",
      }));
      await api.peerEvaluate({ group_id: evalData.group_id, evaluations });
      showToast("Evaluación enviada — ¡Gracias!");
      onDone();
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
    } finally { setSending(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)" }}/>
      <div style={{ position:"relative", background:cardBg, borderRadius:"28px 28px 0 0",
        maxHeight:"88vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,.25)", transition:"background .3s", animation:"slideUp .25s ease" }}>
        <div style={{ width:40, height:4, background:navBord, borderRadius:99, margin:"12px auto 0", flexShrink:0 }}/>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 20px" }}>

          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:36, marginBottom:4 }}>🤝</div>
            <div style={{ fontWeight:900, fontSize:18, color:txt, transition:"color .3s" }}>Evaluar compañeros</div>
            <div style={{ fontSize:12, color:sub, fontWeight:700, marginTop:2, transition:"color .3s" }}>
              {evalData.mision_titulo}
            </div>
            <div style={{ fontSize:10, color:sub, marginTop:4, lineHeight:1.5, fontWeight:600 }}>
              Tu evaluación es 100% anónima y confidencial. Solo la ven los docentes.
            </div>
          </div>

          {schoolHours && (
            <div style={{ background:"#f59e0b18", border:"1.5px solid #f59e0b33", borderRadius:14,
              padding:"12px 14px", marginBottom:16, textAlign:"center" }}>
              <div style={{ fontWeight:900, color:"#f59e0b", fontSize:13 }}>🏫 Horario escolar</div>
              <div style={{ fontSize:11, color:sub, marginTop:2 }}>
                Las evaluaciones solo se pueden hacer fuera del horario de clase
              </div>
            </div>
          )}

          {teammates.map(t => (
            <div key={t.user_id} style={{ background: isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.02)",
              borderRadius:18, padding:"14px 16px", marginBottom:10, border:`1px solid ${navBord}`,
              transition:"background .3s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <Av user={t} sz={36}/>
                <div style={{ fontWeight:800, fontSize:14, color:txt, transition:"color .3s" }}>{t.nombre}</div>
              </div>

              {/* Star rating */}
              <div style={{ display:"flex", gap:4, marginBottom:6, justifyContent:"center" }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => !schoolHours && setRating(t.user_id, star)}
                    style={{ background:"none", border:"none", cursor: schoolHours ? "default" : "pointer",
                      fontSize:28, padding:2, opacity: schoolHours ? .4 : 1,
                      filter: ratings[t.user_id] >= star ? "none" : "grayscale(1) opacity(.3)",
                      transform: ratings[t.user_id] === star ? "scale(1.2)" : "scale(1)",
                      transition:"all .15s" }}>
                    ⭐
                  </button>
                ))}
              </div>
              {ratings[t.user_id] > 0 && (
                <div style={{ textAlign:"center", fontSize:11, color: primary, fontWeight:800, marginBottom:6 }}>
                  {STAR_LABELS[ratings[t.user_id]]}
                </div>
              )}

              {/* Optional comment */}
              <textarea value={comments[t.user_id] || ""} onChange={e => setComment(t.user_id, e.target.value)}
                placeholder="Comentario anónimo (opcional)..."
                disabled={schoolHours}
                rows={2} style={{ width:"100%", boxSizing:"border-box",
                  background: isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.04)",
                  border:`1px solid ${navBord}`, borderRadius:12, padding:"8px 12px",
                  fontFamily:"Nunito,sans-serif", fontSize:12, fontWeight:700,
                  color:txt, resize:"none", lineHeight:1.4, outline:"none", transition:"all .3s",
                  opacity: schoolHours ? .4 : 1 }}/>
            </div>
          ))}
        </div>

        <div style={{ padding:"12px 20px 28px", borderTop:`1px solid ${navBord}` }}>
          <button onClick={submit} disabled={!allRated || sending || schoolHours}
            style={{ width:"100%", padding:15,
              background: !allRated || sending || schoolHours ? (isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)") : "#8b5cf6",
              color: !allRated || sending || schoolHours ? sub : "white",
              border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
              fontSize:15, fontWeight:900,
              cursor: !allRated || sending || schoolHours ? "not-allowed" : "pointer",
              opacity: !allRated || sending || schoolHours ? .6 : 1, transition:"all .2s" }}>
            {sending ? "Enviando..." : schoolHours ? "🏫 Disponible fuera de clase" : "🤝 Enviar evaluación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DetailSheet — mission detail with grupal flow
// ═════════════════════════════════════════════════════════════════
function DetailSheet({ m, myGroups, pendingEvals, onClose, onSubmit, onFormGroup, onEvaluate, submitting, showToast }) {
  const { primary, isDark, txt, sub, cardBg, navBord, inputBg } = useTheme();
  const [comentario, setComentario] = useState("");
  const [lightbox, setLightbox] = useState(false);
  const tipo = TIPO_CFG[m.tipo] || TIPO_CFG.normal;
  const expirado = m.fecha_fin && new Date(m.fecha_fin) < new Date();
  const lleno = m.max_submissions && m.total_completadas >= m.max_submissions;
  const canSubmit = !m.mi_estado || m.mi_estado === "rechazada";
  const isAutoApprove = m.auto_approve;
  const isGrupal = m.tipo === "grupal";

  // Find my group for this mission
  const myGroup = myGroups.find(g => g.mission_id === m.id);
  const myGroupStatus = myGroup?.status || m.mi_group_status;
  const groupMembers = myGroup?.members || [];
  const pendingEval = pendingEvals.find(pe => pe.mission_id === m.id);

  // For grupal: can submit only if group is ready
  const grupalCanSubmit = isGrupal && myGroupStatus === "ready" && canSubmit;
  const individualCanSubmit = !isGrupal && canSubmit;
  const showSubmitArea = (grupalCanSubmit || individualCanSubmit) && !expirado && !(lleno && !m.mi_estado);

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
              {isGrupal && (
                <span style={{ background:"#8b5cf622", color:"#8b5cf6", borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:900 }}>
                  {m.grupo_min_size || 2}-{m.grupo_max_size || 2} miembros
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

            {/* ── Grupal: group status area ── */}
            {isGrupal && (
              <div style={{ marginBottom:14 }}>
                {/* No group yet → form group button */}
                {!myGroup && !m.mi_estado && !expirado && (
                  <button onClick={() => onFormGroup(m)}
                    style={{ width:"100%", padding:14,
                      background:"#8b5cf6", color:"white", border:"none", borderRadius:16,
                      fontFamily:"Nunito,sans-serif", fontSize:14, fontWeight:900, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    👥 Formar grupo
                  </button>
                )}

                {/* Group forming — waiting for partners */}
                {myGroup && myGroupStatus === "forming" && (
                  <div style={{ background:"#8b5cf618", border:"1.5px solid #8b5cf633", borderRadius:16, padding:"14px 16px" }}>
                    <div style={{ fontWeight:900, fontSize:13, color:"#8b5cf6", marginBottom:8 }}>
                      👥 Grupo en formación
                    </div>
                    {groupMembers.map(mem => (
                      <div key={mem.user_id} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
                        <Av user={mem} sz={28}/>
                        <div style={{ fontSize:12, fontWeight:700, color:txt, flex:1, transition:"color .3s" }}>
                          {mem.nombre}
                        </div>
                        <div style={{ fontSize:10, fontWeight:800,
                          color: mem.accepted ? "#10b981" : "#f59e0b" }}>
                          {mem.accepted ? "✅ Aceptó" : "⏳ Pendiente"}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize:10, color:sub, marginTop:8, fontWeight:700 }}>
                      Esperando a que todos acepten la invitación...
                    </div>
                  </div>
                )}

                {/* Group ready — show members */}
                {myGroup && myGroupStatus === "ready" && canSubmit && (
                  <div style={{ background:"#10b98118", border:"1.5px solid #10b98133", borderRadius:16, padding:"14px 16px" }}>
                    <div style={{ fontWeight:900, fontSize:13, color:"#10b981", marginBottom:8 }}>
                      ✅ Grupo listo
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                      {groupMembers.map(mem => (
                        <div key={mem.user_id} style={{ display:"flex", alignItems:"center", gap:4,
                          background: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.04)",
                          borderRadius:99, padding:"4px 10px 4px 4px" }}>
                          <Av user={mem} sz={22}/>
                          <span style={{ fontSize:11, fontWeight:700, color:txt }}>{mem.nombre?.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group submitted */}
                {myGroup && myGroupStatus === "submitted" && (
                  <div style={{ background:"#f59e0b18", border:"1.5px solid #f59e0b33", borderRadius:16, padding:"14px 16px",
                    textAlign:"center" }}>
                    <div style={{ fontWeight:900, fontSize:13, color:"#f59e0b" }}>
                      ⏳ Entregada — esperando aprobación
                    </div>
                    <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginTop:8 }}>
                      {groupMembers.map(mem => (
                        <div key={mem.user_id} style={{ display:"flex", alignItems:"center", gap:4,
                          background: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.04)",
                          borderRadius:99, padding:"4px 10px 4px 4px" }}>
                          <Av user={mem} sz={20}/>
                          <span style={{ fontSize:10, fontWeight:700, color:txt }}>{mem.nombre?.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group approved — show peer eval prompt if pending */}
                {myGroup && myGroupStatus === "approved" && (
                  <div style={{ background:"#10b98118", border:"1.5px solid #10b98133", borderRadius:16, padding:"14px 16px" }}>
                    <div style={{ fontWeight:900, fontSize:13, color:"#10b981", textAlign:"center" }}>
                      ✅ ¡Misión aprobada!
                    </div>
                    {pendingEval && (
                      <button onClick={() => onEvaluate(pendingEval)}
                        style={{ width:"100%", marginTop:10, padding:12,
                          background:"#8b5cf6", color:"white", border:"none", borderRadius:14,
                          fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:900, cursor:"pointer" }}>
                        🤝 Evaluar compañeros
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Standard status banners ── */}
            {m.mi_estado === "rechazada" && m.mi_feedback && (
              <div style={{ background:"#ef444418", border:"1.5px solid #ef444433", borderRadius:14, padding:"12px 14px", marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#ef4444", fontWeight:900, marginBottom:4 }}>❌ Motivo del rechazo</div>
                <div style={{ fontSize:13, color:txt, fontWeight:700, lineHeight:1.5, transition:"color .3s" }}>{m.mi_feedback}</div>
              </div>
            )}

            {!isGrupal && m.mi_estado === "pendiente" && (
              <div style={{ background:"#f59e0b18", border:"1.5px solid #f59e0b33", borderRadius:14, padding:"12px 14px", marginBottom:16,
                textAlign:"center", fontWeight:900, color:"#f59e0b", fontSize:14 }}>
                ⏳ En revisión — esperá la aprobación de tu docente
              </div>
            )}
            {!isGrupal && m.mi_estado === "aprobada" && (
              <div style={{ background:"#10b98118", border:"1.5px solid #10b98133", borderRadius:14, padding:"12px 14px", marginBottom:16,
                textAlign:"center", fontWeight:900, color:"#10b981", fontSize:14 }}>
                ✅ ¡Completada! Recibiste 🪙{m.recompensa.toLocaleString("es-AR")}
              </div>
            )}

            {/* ── Submit area ── */}
            {showSubmitArea && (
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
                <button onClick={() => onSubmit(m, comentario, myGroup?.id)} disabled={submitting}
                  style={{ width:"100%", padding:"15px",
                    background: submitting ? (isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.06)") : primary,
                    color: submitting ? sub : "white",
                    border:"none", borderRadius:18, fontFamily:"Nunito,sans-serif",
                    fontSize:15, fontWeight:900, cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? .6 : 1, transition:"all .2s" }}>
                  {submitting ? "Enviando..." :
                   isAutoApprove ? `⚡ Completar ahora · 🪙${m.recompensa}` :
                   m.tipo === "rol" ? `👑 Reclamar este rol` :
                   isGrupal ? "📬 Entregar misión grupal" :
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

// ═════════════════════════════════════════════════════════════════
// GroupInviteBanner — shown when user has pending group invitations
// ═════════════════════════════════════════════════════════════════
function GroupInviteBanner({ groups, onAccept, onDecline }) {
  const { primary, isDark, txt, sub, cardBg, navBord } = useTheme();
  const pending = groups.filter(g => g.status === "forming" && g.members?.some(m => m.user_id === "me" && !m.accepted));
  // We check from the caller side, groups already come filtered
  if (!groups.length) return null;

  return groups.map(g => (
    <div key={g.id} style={{ background: isDark ? cardBg : "#f5f3ff", border:"1.5px solid #8b5cf633",
      borderRadius:18, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ fontWeight:900, fontSize:13, color:"#8b5cf6", marginBottom:4 }}>
        👥 Invitación a grupo
      </div>
      <div style={{ fontSize:12, color:txt, fontWeight:700, marginBottom:6, transition:"color .3s" }}>
        {g.mision_titulo}
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {g.members?.map(mem => (
          <div key={mem.user_id} style={{ display:"flex", alignItems:"center", gap:4,
            background: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)",
            borderRadius:99, padding:"3px 10px 3px 3px" }}>
            <Av user={mem} sz={20}/>
            <span style={{ fontSize:10, fontWeight:700, color:txt }}>
              {mem.nombre?.split(" ")[0]}
              {mem.accepted ? "" : " ⏳"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onAccept(g.id)}
          style={{ flex:1, padding:10, background:"#10b981", color:"white", border:"none",
            borderRadius:12, fontFamily:"Nunito,sans-serif", fontSize:13, fontWeight:900, cursor:"pointer" }}>
          ✅ Aceptar
        </button>
        <button onClick={() => onDecline(g.id)}
          style={{ flex:1, padding:10, background: isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.06)",
            color:sub, border:"none", borderRadius:12, fontFamily:"Nunito,sans-serif",
            fontSize:13, fontWeight:900, cursor:"pointer" }}>
          Rechazar
        </button>
      </div>
    </div>
  ));
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function AMisiones({ me, balance, showToast, refreshBalance, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState("todas");
  const [submitting, setSubmitting] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [pendingEvals, setPendingEvals] = useState([]);
  const [schoolHours, setSchoolHours] = useState(false);
  const [groupFormMission, setGroupFormMission] = useState(null);
  const [evalSheet, setEvalSheet] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);

  const load = async () => {
    const ms = await api.missions();
    const arr = Array.isArray(ms) ? ms : ms.data || [];
    setMissions(arr);
    return arr;
  };

  const loadGroups = async () => {
    try {
      const r = await api.peerMyGroups();
      const groups = r.data || [];
      setMyGroups(groups);
      // Find invitations where I haven't accepted yet
      const invites = groups.filter(g =>
        g.status === "forming" &&
        g.members?.some(m => m.user_id === me?.id && !m.accepted)
      );
      setPendingInvites(invites);
    } catch {}
  };

  const loadPendingEvals = async () => {
    try {
      const r = await api.peerPending();
      setPendingEvals(r.data || []);
      setSchoolHours(!!r.school_hours);
    } catch {}
  };

  useEffect(() => {
    Promise.all([load(), loadGroups(), loadPendingEvals()])
      .finally(() => setLoading(false));
  }, []);

  const submit = async (mission, comentario, groupId) => {
    setSubmitting(true);
    try {
      const body = {};
      if (comentario) body.comentario = comentario;
      if (groupId) body.group_id = groupId;
      await api.submitMission(mission.id, Object.keys(body).length ? body : undefined);
      showToast(mission.auto_approve ? "⚡ ¡Completada! Recompensa recibida" : "📬 Enviada, esperá la aprobación");
      if (mission.auto_approve) refreshBalance();
      const arr = await load();
      await loadGroups();
      await loadPendingEvals();
      const fresh = arr.find(x => x.id === mission.id);
      setDetail(fresh || null);
    } catch(e) {
      showToast(e.message || "Error al entregar", "error");
    } finally { setSubmitting(false); }
  };

  const acceptInvite = async (groupId) => {
    try {
      await api.peerAcceptGroup(groupId);
      showToast("¡Te uniste al grupo!");
      await loadGroups();
      await load();
    } catch (e) {
      showToast(e.message || "Error", "error");
    }
  };

  const declineInvite = async (groupId) => {
    try {
      await api.peerLeaveGroup(groupId);
      showToast("Rechazaste la invitación");
      await loadGroups();
    } catch (e) {
      showToast(e.message || "Error", "error");
    }
  };

  const disponibles = missions.filter(m => !m.mi_estado || m.mi_estado === "rechazada");
  const mias = missions.filter(m => !!m.mi_estado);

  const filtered = filter === "disponibles" ? disponibles
    : filter === "mias" ? mias
    : missions;

  const destacadas  = disponibles.filter(m => m.creador_rol === "admin");
  const rolMissions = disponibles.filter(m => m.tipo === "rol" && m.creador_rol !== "admin");
  const rapidas     = disponibles.filter(m => (m.tipo === "rapida" || m.auto_approve) && m.tipo !== "rol" && m.creador_rol !== "admin");
  const grupales    = disponibles.filter(m => m.tipo === "grupal" && m.creador_rol !== "admin");
  const tareas      = disponibles.filter(m => !["rol","rapida","grupal"].includes(m.tipo) && !m.auto_approve && m.creador_rol !== "admin");

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
            {pendingEvals.length > 0 && (
              <div style={{ position:"absolute", right:0, zIndex:1 }}>
                <div style={{ background:"#8b5cf6", borderRadius:99, padding:"5px 12px",
                  fontSize:11, fontWeight:900, color:"white", display:"flex", alignItems:"center", gap:4 }}>
                  🤝 {pendingEvals.length}
                </div>
              </div>
            )}
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

        {!loading && filtered.length === 0 && pendingInvites.length === 0 && pendingEvals.length === 0 && (
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
            {/* Pending group invitations */}
            {pendingInvites.length > 0 && (
              <>
                <SectionHeader title="👥 Invitaciones a grupo" sub="Aceptá para participar"/>
                <GroupInviteBanner groups={pendingInvites} onAccept={acceptInvite} onDecline={declineInvite}/>
              </>
            )}

            {/* Pending peer evaluations banner */}
            {pendingEvals.length > 0 && (
              <>
                <SectionHeader title="🤝 Evaluaciones pendientes" sub="Evaluá a tus compañeros"/>
                {pendingEvals.map(pe => (
                  <div key={pe.group_id} onClick={() => setEvalSheet(pe)}
                    style={{ background: isDark ? cardBg : "#f5f3ff", border:"1.5px solid #8b5cf633",
                      borderRadius:18, padding:"14px 16px", marginBottom:10, cursor:"pointer",
                      display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:46, height:46, borderRadius:14, background:"#8b5cf622",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                      🤝
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900, fontSize:13, color:txt, transition:"color .3s" }}>{pe.mision_titulo}</div>
                      <div style={{ fontSize:11, color:sub, marginTop:2 }}>
                        Evaluá a {pe.teammates?.length} compañero{pe.teammates?.length > 1 ? "s" : ""}
                      </div>
                      {schoolHours && (
                        <div style={{ fontSize:10, color:"#f59e0b", fontWeight:800, marginTop:2 }}>
                          🏫 Disponible fuera de clase
                        </div>
                      )}
                    </div>
                    <span style={{ color:"#8b5cf6", fontSize:20, fontWeight:900 }}>›</span>
                  </div>
                ))}
              </>
            )}

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

            {/* Grupal missions */}
            {grupales.length > 0 && (
              <>
                <SectionHeader title="👥 Misiones grupales" sub="Formá equipo con compañeros"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {grupales.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
                </div>
              </>
            )}

            {rapidas.length > 0 && (
              <>
                <SectionHeader title="⚡ Rápidas" sub="Se aprueban automáticamente"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {rapidas.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
                </div>
              </>
            )}
            {rolMissions.length > 0 && (
              <>
                <SectionHeader title="👑 Roles del aula" sub="Reclamá un rol disponible"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {rolMissions.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
                </div>
              </>
            )}
            {tareas.length > 0 && (
              <>
                <SectionHeader title="📋 Tareas y desafíos"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {tareas.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
                </div>
              </>
            )}
            {mias.length > 0 && (
              <>
                <SectionHeader title="📬 Mis entregas" sub="Tu historial de misiones"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
                  {mias.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
                </div>
              </>
            )}
          </>
        )}

        {!loading && filter !== "todas" && filtered.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {filtered.map(m => <MisionCard key={m.id} m={m} onClick={setDetail} pendingEvals={pendingEvals}/>)}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      {detail && (
        <DetailSheet
          m={detail}
          myGroups={myGroups}
          pendingEvals={pendingEvals}
          onClose={() => setDetail(null)}
          onSubmit={submit}
          onFormGroup={(m) => { setDetail(null); setGroupFormMission(m); }}
          onEvaluate={(pe) => { setDetail(null); setEvalSheet(pe); }}
          submitting={submitting}
          showToast={showToast}/>
      )}

      {/* Group Formation Sheet */}
      {groupFormMission && (
        <GroupFormSheet
          mission={groupFormMission}
          onClose={() => setGroupFormMission(null)}
          onCreated={async () => {
            setGroupFormMission(null);
            await loadGroups();
            await load();
          }}
          showToast={showToast}/>
      )}

      {/* Peer Evaluation Sheet */}
      {evalSheet && (
        <PeerEvalSheet
          evalData={evalSheet}
          schoolHours={schoolHours}
          onClose={() => setEvalSheet(null)}
          onDone={async () => {
            setEvalSheet(null);
            await loadPendingEvals();
          }}
          showToast={showToast}/>
      )}
    </div>
  );
}
