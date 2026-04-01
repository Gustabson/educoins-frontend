import { useState, useEffect, useRef } from "react";
import { ESTADO_COL, ESTADO_LABEL2, REPORTE_TIPOS, REPORTE_GRUPOS } from "../../constants";
import { api } from "../../api";

const ESTADOS  = ["recibido","en_revision","resuelto","descartado"];
const DOMINIOS = [
  { id:"psicologia",    label:"Psicología",    icon:"🧠", col:"#8b5cf6" },
  { id:"economia",      label:"Economía",      icon:"💰", col:"#f59e0b" },
  { id:"administracion",label:"Administración",icon:"📋", col:"#3b82f6" },
];

function CompartirPanel({ sel, onShared, showToast }) {
  const [guardando, setGuardando] = useState(false);
  const [local, setLocal] = useState(sel.compartido_con || []);

  const toggle = (id) =>
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.shareReport(sel.id, local);
      showToast("Compartido actualizado ✅");
      onShared(local);
    } catch (e) { showToast(e.message || "Error", "error"); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ background:"white", borderRadius:16, overflow:"hidden",
      boxShadow:"0 1px 8px rgba(0,0,0,.08)", marginBottom:8 }}>
      <div style={{ background:"#f8f9fa", padding:"10px 16px",
        borderBottom:"1px solid #e8e8e8", fontSize:11, fontWeight:800, color:"#555" }}>
        🔗 COMPARTIR CON DOMINIO
      </div>
      <div style={{ padding:"12px 16px" }}>
        <div style={{ fontSize:11, color:"#777", marginBottom:10 }}>
          Elegí con qué área compartir este reporte. Ellos podrán verlo y responder.
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {DOMINIOS.map(d => (
            <button key={d.id} onClick={() => toggle(d.id)}
              style={{ display:"flex", alignItems:"center", gap:6,
                padding:"7px 14px", borderRadius:99, cursor:"pointer",
                fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:12,
                border: "1.5px solid " + (local.includes(d.id) ? d.col : "#e8e8e8"),
                background: local.includes(d.id) ? d.col + "18" : "white",
                color: local.includes(d.id) ? d.col : "#555",
                transition:"all .15s" }}>
              {d.icon} {d.label}
              {local.includes(d.id) && <span style={{ marginLeft:2 }}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={guardar} disabled={guardando}
          style={{ background:guardando?"#ccc":"#00c1fc", border:"none", borderRadius:99,
            color:"white", padding:"8px 20px", fontWeight:800, fontSize:12,
            cursor:guardando?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif" }}>
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function AdjuntosView({ adjuntos }) {
  if (!adjuntos || adjuntos.length === 0) return null;
  return (
    <div style={{ background:"white", borderRadius:16, overflow:"hidden",
      boxShadow:"0 1px 8px rgba(0,0,0,.08)", marginBottom:8 }}>
      <div style={{ background:"#f8f9fa", padding:"10px 16px",
        borderBottom:"1px solid #e8e8e8", fontSize:11, fontWeight:800, color:"#555" }}>
        📎 ARCHIVOS ADJUNTOS ({adjuntos.length})
      </div>
      <div style={{ padding:"12px 16px", display:"flex", flexWrap:"wrap", gap:8 }}>
        {adjuntos.map((a, i) => {
          const esImagen = a.tipo?.startsWith("image/");
          return (
            <a key={i} href={a.data} download={a.nombre} target="_blank" rel="noreferrer"
              style={{ textDecoration:"none" }}>
              {esImagen ? (
                <div style={{ width:80, height:80, borderRadius:10, overflow:"hidden",
                  border:"1.5px solid #e8e8e8", cursor:"pointer" }}>
                  <img src={a.data} alt={a.nombre}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px",
                  borderRadius:10, border:"1.5px solid #e8e8e8", background:"#f8f9fa",
                  cursor:"pointer", maxWidth:160 }}>
                  <span style={{ fontSize:18 }}>📄</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#333",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.nombre}
                  </span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function AdminReportes({ me, showToast, onBack }) {
  const isSuperAdmin = me?.rol === "admin";

  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtroE,  setFiltroE]  = useState("todos");   // estado
  const [filtroG,  setFiltroG]  = useState("todos");   // grupo
  const [sel,      setSel]      = useState(null);
  const [msgs,     setMsgs]     = useState([]);
  const [newMsg,   setNewMsg]   = useState("");
  const [resol,    setResol]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [tabDetalle, setTabDetalle] = useState("chat"); // chat | compartir
  const bottomRef = useRef(null);

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filtroE !== "todos") p.set("estado", filtroE);
    if (filtroG !== "todos") p.set("grupo",  filtroG);
    const q = p.toString();
    return q ? "?" + q : "";
  };

  const load = () => {
    setLoading(true);
    api.allReports(buildQuery())
      .then(d => setReports(d.reports || d.data?.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filtroE, filtroG]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const openSel = async (r) => {
    setSel(r); setMsgs([]); setResol(""); setTabDetalle("chat");
    try {
      const d = await api.reportMessages(r.id);
      setMsgs(d.data || d || []);
    } catch(e) {}
  };

  const cambiarEstado = async (id, estado) => {
    setSaving(true);
    try {
      await api.updateReport(id, { estado, resolucion: resol.trim() || null });
      showToast("Estado actualizado ✅");
      setSel(prev => ({ ...prev, estado }));
      setResol(""); load();
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSaving(false); }
  };

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    setSaving(true);
    try {
      const d = await api.sendReportMsg(sel.id, newMsg.trim());
      setMsgs(prev => [...prev, d.data || d]);
      setNewMsg("");
      if (sel.estado === "recibido") setSel(prev => ({ ...prev, estado:"en_revision" }));
      load();
    } catch(e) { showToast("Error al enviar", "error"); }
    finally { setSaving(false); }
  };

  // ── Detalle ────────────────────────────────────────────────────
  if (sel) {
    const tipoInfo = REPORTE_TIPOS.find(t => t.id === sel.tipo) || { icon:"📋", label:sel.tipo, col:"#64748b" };
    const abierto  = sel.estado !== "resuelto" && sel.estado !== "descartado";
    const grupoInfo = REPORTE_GRUPOS[tipoInfo.grupo];
    const shared   = sel.compartido_con || [];

    return (
      <div style={{ minHeight:"100vh", background:"#eef2f7" }}>
        {/* Header */}
        <div style={{ background:"#00c1fc", color:"white", padding:"18px 16px 22px",
          position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => { setSel(null); load(); }}
              style={{ background:"rgba(0,0,0,.15)", border:"none", borderRadius:50,
                color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:15 }}>
                {tipoInfo.icon} Caso #{sel.id?.slice(0,8).toUpperCase()}
              </div>
              <div style={{ fontSize:11, opacity:.85 }}>
                {tipoInfo.label} · {sel.reporter_nombre || "Anónimo"}
              </div>
            </div>
            <span style={{ background: ESTADO_COL[sel.estado] || "#aaa",
              borderRadius:99, padding:"4px 10px", fontSize:10, fontWeight:800 }}>
              {ESTADO_LABEL2[sel.estado]}
            </span>
          </div>
        </div>

        <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>

          {/* Badges de dominio compartido */}
          {shared.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {shared.map(d => {
                const dom = DOMINIOS.find(x => x.id === d);
                return dom ? (
                  <span key={d} style={{ background:dom.col+"18", color:dom.col,
                    border:"1px solid "+dom.col+"40", borderRadius:99,
                    padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                    {dom.icon} {dom.label}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Controles de estado */}
          {isSuperAdmin && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ESTADOS.map(e => (
                <button key={e} onClick={() => cambiarEstado(sel.id, e)}
                  disabled={saving || sel.estado === e}
                  style={{ background: sel.estado===e ? ESTADO_COL[e] : "white",
                    color: sel.estado===e ? "white" : "#555",
                    border:"1.5px solid "+(sel.estado===e ? ESTADO_COL[e] : "#e8e8e8"),
                    borderRadius:99, padding:"5px 13px", fontSize:11, fontWeight:800,
                    cursor: sel.estado===e ? "default" : "pointer",
                    fontFamily:"Nunito,sans-serif" }}>
                  {ESTADO_LABEL2[e]}
                </button>
              ))}
            </div>
          )}

          {/* Resolución */}
          {isSuperAdmin && abierto && (
            <div>
              <input value={resol} onChange={e => setResol(e.target.value)}
                placeholder="Resolución/nota interna (opcional)..."
                style={{ width:"100%", boxSizing:"border-box", background:"white",
                  border:"1.5px solid #e8e8e8", borderRadius:10, padding:"8px 12px",
                  fontSize:12, outline:"none", fontFamily:"Nunito,sans-serif", color:"#333" }}/>
            </div>
          )}

          {/* Tabs: Chat / Compartir */}
          {isSuperAdmin && (
            <div style={{ display:"flex", gap:0, background:"white",
              borderRadius:12, border:"1.5px solid #e8e8e8", overflow:"hidden" }}>
              {[["chat","💬 Chat"],["compartir","🔗 Compartir"]].map(([k, l]) => (
                <button key={k} onClick={() => setTabDetalle(k)}
                  style={{ flex:1, padding:"9px", border:"none", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:12,
                    background: tabDetalle===k ? "#00c1fc" : "white",
                    color: tabDetalle===k ? "white" : "#777",
                    borderRight: k==="chat" ? "1px solid #e8e8e8" : "none",
                    transition:"all .15s" }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {tabDetalle === "compartir" && isSuperAdmin ? (
            <CompartirPanel
              sel={sel}
              showToast={showToast}
              onShared={(c) => setSel(prev => ({ ...prev, compartido_con: c }))}
            />
          ) : (
            <>
              {/* Descripción original */}
              <div style={{ background:"white", borderRadius:16, overflow:"hidden",
                boxShadow:"0 1px 8px rgba(0,0,0,.08)" }}>
                <div style={{ background:"#f8f9fa", padding:"12px 16px",
                  borderBottom:"1px solid #e8e8e8" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%",
                      background:tipoInfo.col+"22", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:16, flexShrink:0 }}>
                      {tipoInfo.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>
                        {sel.reporter_nombre || "Anónimo"}
                      </div>
                      <div style={{ fontSize:10, color:"#777" }}>
                        {grupoInfo?.label || "Reporte"} · {new Date(sel.created_at).toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#777" }}>
                    Tipo: <span style={{ color:tipoInfo.col }}>
                      [{tipoInfo.label.toUpperCase()}]
                    </span>
                  </div>
                </div>
                <div style={{ padding:"14px 16px", fontSize:13, color:"#333", lineHeight:1.7 }}>
                  {sel.descripcion}
                </div>
              </div>

              {/* Adjuntos */}
              <AdjuntosView adjuntos={sel.adjuntos}/>

              {/* Mensajes */}
              {msgs.length === 0 && (
                <div style={{ background:"white", borderRadius:16, padding:"20px",
                  textAlign:"center", boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
                  <div style={{ fontSize:11, color:"#aaa" }}>
                    Sin mensajes — respondé abajo para iniciar el diálogo
                  </div>
                </div>
              )}
              {msgs.map((m, i) => {
                const esAdmin = m.sender_rol === "admin" || m.sender_rol === "teacher" || m.sender_rol === "staff";
                return (
                  <div key={m.id || i} style={{ background:"white", borderRadius:16,
                    overflow:"hidden", boxShadow:"0 1px 8px rgba(0,0,0,.06)",
                    borderLeft:"4px solid "+(esAdmin?"#00c1fc":"#e0e0e0") }}>
                    <div style={{ background:"#f8f9fa", padding:"10px 16px",
                      borderBottom:"1px solid #e8e8e8", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                        background:esAdmin?"#00c1fc22":"#e8e8e8",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                        {esAdmin ? "👨‍💼" : "👤"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:12,
                          color:esAdmin?"#00c1fc":"#1a1a1a" }}>
                          {esAdmin ? "Administración" : m.sender_nombre}
                        </div>
                        <div style={{ fontSize:10, color:"#aaa" }}>
                          {new Date(m.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short" })}
                          {" · "}{new Date(m.created_at).toLocaleTimeString("es-AR",{ hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 16px", fontSize:13, color:"#333", lineHeight:1.7 }}>
                      {m.texto}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>

              {/* Responder */}
              {abierto && (
                <div style={{ background:"white", borderRadius:16, overflow:"hidden",
                  boxShadow:"0 1px 8px rgba(0,0,0,.08)" }}>
                  <div style={{ background:"#f8f9fa", padding:"10px 16px",
                    borderBottom:"1px solid #e8e8e8", fontSize:11, fontWeight:800, color:"#777" }}>
                    ↩ RESPONDER COMO ADMINISTRACIÓN
                  </div>
                  <div style={{ padding:"12px 16px" }}>
                    <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                      placeholder="Escribí tu respuesta oficial..."
                      rows={3} style={{ width:"100%", boxSizing:"border-box",
                        background:"#f7f7f7", border:"1.5px solid #e8e8e8",
                        borderRadius:12, padding:"10px 14px", fontSize:13,
                        outline:"none", resize:"none", color:"#1a1a1a",
                        fontFamily:"Nunito,sans-serif", fontWeight:600, marginBottom:10 }}/>
                    <button onClick={sendMsg} disabled={saving || !newMsg.trim()}
                      style={{ width:"100%", background:saving?"#ccc":"#00c1fc",
                        border:"none", borderRadius:50, color:"white", padding:"11px",
                        fontWeight:800, fontSize:13,
                        cursor:saving?"not-allowed":"pointer",
                        fontFamily:"Nunito,sans-serif" }}>
                      {saving ? "Enviando..." : "Enviar respuesta ↩"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ height:16 }}/>
        </div>
      </div>
    );
  }

  // ── Lista ──────────────────────────────────────────────────────
  const grupoOpts = [["todos","Todos"],...Object.entries(REPORTE_GRUPOS).map(([k,g])=>[k,g.label])];

  return (
    <div style={{ minHeight:"100vh", background:"#F0F0F0" }}>
      {/* Header */}
      <div style={{ background:"#00c1fc", color:"white", padding:"18px 16px 14px",
        position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
          <button onClick={onBack}
            style={{ background:"rgba(0,0,0,.15)", border:"none", borderRadius:50,
              color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div style={{ flex:1, textAlign:"center", fontWeight:900, fontSize:18 }}>
            🚩 Reportes ciudadanos
          </div>
        </div>

        {/* Filtro estado */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {[["todos","Todos"], ...ESTADOS.map(e=>[e,ESTADO_LABEL2[e]])].map(([val,label]) => (
            <button key={val} onClick={() => setFiltroE(val)}
              style={{ background: filtroE===val?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:"1.5px solid "+(filtroE===val?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"),
                borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:800,
                color:"white", cursor:"pointer", whiteSpace:"nowrap",
                fontFamily:"Nunito,sans-serif", flexShrink:0 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtro grupo */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", marginTop:6 }}>
          {grupoOpts.map(([val, label]) => (
            <button key={val} onClick={() => setFiltroG(val)}
              style={{ background: filtroG===val?"rgba(255,255,255,.25)":"rgba(255,255,255,.08)",
                border:"1.5px solid "+(filtroG===val?"rgba(255,255,255,.6)":"rgba(255,255,255,.15)"),
                borderRadius:99, padding:"3px 10px", fontSize:10, fontWeight:800,
                color:"white", cursor:"pointer", whiteSpace:"nowrap",
                fontFamily:"Nunito,sans-serif", flexShrink:0 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"12px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:"#aaa", padding:32 }}>Cargando...</div>}
        {!loading && reports.length === 0 && (
          <div style={{ textAlign:"center", color:"#aaa", padding:32, background:"white",
            borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,.06)" }}>
            Sin reportes{filtroE!=="todos" ? ` con estado "${ESTADO_LABEL2[filtroE]}"` : ""}
            {filtroG!=="todos" ? ` en "${REPORTE_GRUPOS[filtroG]?.label||filtroG}"` : ""}
          </div>
        )}

        {reports.map(r => {
          const tipoInfo = REPORTE_TIPOS.find(t => t.id === r.tipo) || { icon:"📋", label:r.tipo, col:"#64748b" };
          const estCol   = ESTADO_COL[r.estado] || "#94a3b8";
          const shared   = r.compartido_con || [];
          return (
            <div key={r.id} onClick={() => openSel(r)}
              style={{ background:"white", borderRadius:16, marginBottom:8, cursor:"pointer",
                boxShadow:"0 1px 8px rgba(0,0,0,.06)", overflow:"hidden",
                borderLeft:"4px solid "+estCol }}>
              <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:42, height:42, borderRadius:12,
                  background:tipoInfo.col+"20", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:21, flexShrink:0 }}>
                  {tipoInfo.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>{tipoInfo.label}</span>
                    <span style={{ background:estCol+"22", color:estCol, borderRadius:99,
                      padding:"1px 7px", fontSize:10, fontWeight:800 }}>{ESTADO_LABEL2[r.estado]}</span>
                    {(r.adjuntos?.length > 0) && (
                      <span style={{ background:"#e8e8e8", color:"#555", borderRadius:99,
                        padding:"1px 6px", fontSize:9, fontWeight:800 }}>
                        📎{r.adjuntos.length}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:"#555", overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.descripcion}</div>
                  <div style={{ fontSize:10, color:"#aaa", marginTop:2, display:"flex", gap:8 }}>
                    <span>{r.reporter_nombre || "Anónimo"}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short" })}</span>
                    {shared.length > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color:"#00c1fc" }}>
                          {shared.map(d => DOMINIOS.find(x=>x.id===d)?.icon || d).join(" ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span style={{ color:"#ddd", fontSize:18, flexShrink:0 }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminReportes;
