import { useState, useEffect, useRef } from "react";
import { ESTADO_COL, ESTADO_LABEL2, REPORTE_TIPOS, REPORTE_GRUPOS } from "../../constants";
import { api } from "../../api";

const ESTADOS = ["recibido","en_revision","resuelto","descartado"];
const ESTADO_ICON = { recibido:"📬", en_revision:"🔍", resuelto:"✅", descartado:"🗑️" };

const DOMINIOS = [
  { id:"psicologia",     label:"Psicología",     icon:"🧠", col:"#8b5cf6" },
  { id:"economia",       label:"Economía",       icon:"💰", col:"#f59e0b" },
  { id:"administracion", label:"Administración", icon:"📋", col:"#3b82f6" },
];

// ── Adjuntos ────────────────────────────────────────────────────
function AdjuntosView({ adjuntos }) {
  if (!adjuntos?.length) return null;
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ fontSize:11, fontWeight:800, color:"#888", marginBottom:6, letterSpacing:".5px" }}>
        📎 ADJUNTOS ({adjuntos.length})
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {adjuntos.map((a, i) => {
          const esImg = a.tipo?.startsWith("image/");
          return (
            <a key={i} href={a.data} download={a.nombre} target="_blank" rel="noreferrer"
              style={{ textDecoration:"none" }}>
              {esImg ? (
                <div style={{ width:72, height:72, borderRadius:10, overflow:"hidden",
                  border:"2px solid #e8e8e8", cursor:"pointer",
                  boxShadow:"0 2px 8px rgba(0,0,0,.1)" }}>
                  <img src={a.data} alt={a.nombre}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                  borderRadius:10, border:"1.5px solid #e8e8e8", background:"#f8f9fa",
                  cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>📄</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#444",
                    maxWidth:120, overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap" }}>{a.nombre}</span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel compartir ─────────────────────────────────────────────
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
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setGuardando(false); }
  };

  return (
    <div>
      <div style={{ fontSize:12, color:"#666", lineHeight:1.6, marginBottom:14 }}>
        Elegí con qué área de la administración compartir este reporte.
        Podrán verlo, analizarlo y responder al alumno.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {DOMINIOS.map(d => (
          <button key={d.id} onClick={() => toggle(d.id)}
            style={{ display:"flex", alignItems:"center", gap:14,
              padding:"12px 16px", borderRadius:14, cursor:"pointer",
              fontFamily:"Nunito,sans-serif", textAlign:"left",
              border: "2px solid " + (local.includes(d.id) ? d.col : "#e8e8e8"),
              background: local.includes(d.id) ? d.col + "12" : "#fafafa",
              transition:"all .15s" }}>
            <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
              background: local.includes(d.id) ? d.col + "25" : "#efefef",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              {d.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13,
                color: local.includes(d.id) ? d.col : "#333" }}>{d.label}</div>
              <div style={{ fontSize:11, color:"#888", marginTop:1 }}>
                {local.includes(d.id) ? "Tiene acceso a este reporte" : "Sin acceso actualmente"}
              </div>
            </div>
            <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0,
              border:"2px solid "+(local.includes(d.id)?d.col:"#ddd"),
              background:local.includes(d.id)?d.col:"transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all .2s" }}>
              {local.includes(d.id) && <span style={{ color:"white", fontSize:11, fontWeight:900 }}>✓</span>}
            </div>
          </button>
        ))}
      </div>
      <button onClick={guardar} disabled={guardando}
        style={{ width:"100%", background:guardando?"#ccc":"#1a1a2e",
          border:"none", borderRadius:12, color:"white", padding:"12px",
          fontWeight:800, fontSize:13, cursor:guardando?"not-allowed":"pointer",
          fontFamily:"Nunito,sans-serif", transition:"opacity .15s" }}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

// ── Detalle de reporte ──────────────────────────────────────────
function DetalleReporte({ sel, me, showToast, onBack, onUpdate }) {
  const isSuperAdmin = me?.rol === "admin";
  const [msgs,     setMsgs]     = useState([]);
  const [newMsg,   setNewMsg]   = useState("");
  const [resol,    setResol]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState("info"); // info | chat | compartir
  const [selLocal, setSelLocal] = useState(sel);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.reportMessages(sel.id)
      .then(d => setMsgs(d.data || d || []))
      .catch(() => {});
  }, [sel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  const cambiarEstado = async (estado) => {
    setSaving(true);
    try {
      await api.updateReport(sel.id, { estado, resolucion: resol.trim() || null });
      showToast("Estado actualizado ✅");
      const updated = { ...selLocal, estado };
      setSelLocal(updated);
      onUpdate(updated);
      setResol("");
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setSaving(false); }
  };

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    setSaving(true);
    try {
      const d = await api.sendReportMsg(sel.id, newMsg.trim());
      const nuevoMsg = d.data || d;
      setMsgs(prev => [...prev, nuevoMsg]);
      setNewMsg("");
      if (selLocal.estado === "recibido") {
        const updated = { ...selLocal, estado:"en_revision" };
        setSelLocal(updated);
        onUpdate(updated);
      }
    } catch(e) { showToast("Error al enviar", "error"); }
    finally { setSaving(false); }
  };

  const tipoInfo = REPORTE_TIPOS.find(t => t.id === selLocal.tipo) || { icon:"📋", label:selLocal.tipo, col:"#64748b", grupo:"otro" };
  const abierto  = !["resuelto","descartado"].includes(selLocal.estado);
  const estCol   = ESTADO_COL[selLocal.estado] || "#aaa";
  const shared   = selLocal.compartido_con || [];
  const grupoInfo = REPORTE_GRUPOS[tipoInfo.grupo];
  const sinLeer  = msgs.filter(m => m.sender_rol === "student" || m.sender_rol === "parent").length;

  const TABS = [
    { id:"info",      label:"📄 Caso",    always:true },
    { id:"chat",      label: msgs.length ? "💬 Chat (" + msgs.length + ")" : "💬 Chat",  always:true },
    ...(isSuperAdmin ? [
      { id:"estado",    label:"🔄 Estado",  always:false },
      { id:"compartir", label:"🔗 Compartir" + (shared.length ? " (" + shared.length + ")" : ""), always:false },
    ] : []),
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f4f6f9" }}>

      {/* Header fijo */}
      <div style={{ background:"white", borderBottom:"1.5px solid #e8e8e8",
        padding:"14px 16px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack}
            style={{ background:"#f0f0f0", border:"none", borderRadius:10,
              width:36, height:36, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:20 }}>{tipoInfo.icon}</span>
              <div style={{ fontWeight:900, fontSize:15, color:"#1a1a1a" }}>
                {tipoInfo.label}
              </div>
              <span style={{ background:estCol+"22", color:estCol,
                borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:800 }}>
                {ESTADO_LABEL2[selLocal.estado]}
              </span>
            </div>
            <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
              Caso #{sel.id?.slice(0,8).toUpperCase()} · {selLocal.reporter_nombre || "Anónimo"}
              {" · "}{new Date(selLocal.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short", year:"numeric" })}
              {shared.length > 0 && (
                <span style={{ marginLeft:8 }}>
                  {shared.map(d => DOMINIOS.find(x=>x.id===d)?.icon).join(" ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"white",
        borderBottom:"1.5px solid #e8e8e8", flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"11px 4px", border:"none", cursor:"pointer",
              fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:12,
              background:"white", color: tab===t.id ? "#1a1a2e" : "#aaa",
              borderBottom: tab===t.id ? "2.5px solid #1a1a2e" : "2.5px solid transparent",
              transition:"all .15s", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido scrollable */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 32px" }}>

        {/* ── Tab: Caso ── */}
        {tab === "info" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Tipo + Grupo */}
            <div style={{ background:"white", borderRadius:16,
              boxShadow:"0 2px 10px rgba(0,0,0,.06)", overflow:"hidden" }}>
              <div style={{ background:tipoInfo.col, height:4 }}/>
              <div style={{ padding:"16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:48, height:48, borderRadius:14,
                    background:tipoInfo.col+"20", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
                    {tipoInfo.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight:900, fontSize:16, color:"#1a1a1a" }}>{tipoInfo.label}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:1 }}>{grupoInfo?.label}</div>
                  </div>
                </div>
                <div style={{ background:"#f8f9fa", borderRadius:12, padding:"12px 14px",
                  fontSize:13, color:"#333", lineHeight:1.8 }}>
                  {selLocal.descripcion}
                </div>
                <AdjuntosView adjuntos={selLocal.adjuntos}/>
              </div>
            </div>

            {/* Reportante */}
            <div style={{ background:"white", borderRadius:16,
              boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"14px 16px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#888",
                letterSpacing:".5px", marginBottom:10 }}>REPORTANTE</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:"50%",
                  background:selLocal.anonimo?"#f3e8ff":"#e0f2fe",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                  {selLocal.anonimo ? "🔒" : "👤"}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>
                    {selLocal.anonimo ? "Reporte anónimo" : selLocal.reporter_nombre}
                  </div>
                  <div style={{ fontSize:11, color:"#888" }}>
                    {selLocal.anonimo
                      ? "El alumno eligió permanecer anónimo"
                      : "No anónimo — puede recibir respuesta directa"}
                  </div>
                </div>
              </div>
            </div>

            {/* Compartido con */}
            {shared.length > 0 && (
              <div style={{ background:"white", borderRadius:16,
                boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"14px 16px" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#888",
                  letterSpacing:".5px", marginBottom:10 }}>COMPARTIDO CON</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {shared.map(d => {
                    const dom = DOMINIOS.find(x => x.id === d);
                    return dom ? (
                      <span key={d} style={{ background:dom.col+"18", color:dom.col,
                        border:"1.5px solid "+dom.col+"40", borderRadius:99,
                        padding:"5px 14px", fontSize:12, fontWeight:800 }}>
                        {dom.icon} {dom.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Chat ── */}
        {tab === "chat" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {msgs.length === 0 && (
              <div style={{ background:"white", borderRadius:16, padding:"32px 20px",
                textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📬</div>
                <div style={{ fontWeight:800, fontSize:14, color:"#333" }}>Sin mensajes aún</div>
                <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>
                  Respondé abajo para iniciar el diálogo con el alumno
                </div>
              </div>
            )}
            {msgs.map((m, i) => {
              const esStaff = m.sender_rol === "admin" || m.sender_rol === "teacher" || m.sender_rol === "staff";
              return (
                <div key={m.id||i} style={{ display:"flex",
                  justifyContent: esStaff ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth:"80%", borderRadius:14, overflow:"hidden",
                    boxShadow:"0 2px 8px rgba(0,0,0,.08)",
                    background: esStaff ? "#1a1a2e" : "white" }}>
                    <div style={{ padding:"10px 14px 8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:13 }}>{esStaff ? "👨‍💼" : "👤"}</span>
                        <span style={{ fontWeight:800, fontSize:11,
                          color: esStaff ? "rgba(255,255,255,.7)" : "#888" }}>
                          {esStaff ? "Administración" : m.sender_nombre}
                        </span>
                        <span style={{ fontSize:10,
                          color: esStaff ? "rgba(255,255,255,.5)" : "#bbb", marginLeft:"auto" }}>
                          {new Date(m.created_at).toLocaleTimeString("es-AR",{ hour:"2-digit", minute:"2-digit" })}
                        </span>
                      </div>
                      <div style={{ fontSize:13, lineHeight:1.7,
                        color: esStaff ? "white" : "#333" }}>
                        {m.texto}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>

            {/* Input de respuesta */}
            {abierto && (
              <div style={{ background:"white", borderRadius:16,
                boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"14px" }}>
                <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta oficial..."
                  rows={3} style={{ width:"100%", boxSizing:"border-box", background:"#f7f8fa",
                    border:"1.5px solid #e8e8e8", borderRadius:10, padding:"10px 14px",
                    fontSize:13, outline:"none", resize:"none", color:"#1a1a1a",
                    fontFamily:"Nunito,sans-serif", fontWeight:600, marginBottom:10 }}/>
                <button onClick={sendMsg} disabled={saving || !newMsg.trim()}
                  style={{ width:"100%", background:saving||!newMsg.trim()?"#e8e8e8":"#1a1a2e",
                    border:"none", borderRadius:12, color:saving||!newMsg.trim()?"#aaa":"white",
                    padding:"12px", fontWeight:800, fontSize:13,
                    cursor:saving||!newMsg.trim()?"default":"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .15s" }}>
                  {saving ? "Enviando..." : "Enviar respuesta oficial ↩"}
                </button>
              </div>
            )}
            {!abierto && (
              <div style={{ background:"white", borderRadius:16, padding:"16px",
                textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
                <span style={{ background:estCol+"22", color:estCol, borderRadius:99,
                  padding:"6px 16px", fontSize:12, fontWeight:800 }}>
                  Caso {ESTADO_LABEL2[selLocal.estado]} — cerrado
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Estado ── */}
        {tab === "estado" && isSuperAdmin && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"white", borderRadius:16,
              boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#888",
                letterSpacing:".5px", marginBottom:12 }}>CAMBIAR ESTADO</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {ESTADOS.map(e => (
                  <button key={e} onClick={() => cambiarEstado(e)}
                    disabled={saving || selLocal.estado === e}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center",
                      gap:6, padding:"14px 8px", borderRadius:14, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif",
                      border:"2px solid "+(selLocal.estado===e ? ESTADO_COL[e] : "#e8e8e8"),
                      background: selLocal.estado===e ? ESTADO_COL[e]+"18" : "#fafafa",
                      opacity: saving ? .6 : 1, transition:"all .15s" }}>
                    <span style={{ fontSize:22 }}>{ESTADO_ICON[e]}</span>
                    <span style={{ fontWeight:800, fontSize:12,
                      color: selLocal.estado===e ? ESTADO_COL[e] : "#555" }}>
                      {ESTADO_LABEL2[e]}
                    </span>
                    {selLocal.estado===e && (
                      <span style={{ fontSize:9, color:ESTADO_COL[e], fontWeight:700 }}>ACTUAL</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:"white", borderRadius:16,
              boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"16px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#888",
                letterSpacing:".5px", marginBottom:8 }}>RESOLUCIÓN / NOTA INTERNA</div>
              <textarea value={resol} onChange={e => setResol(e.target.value)}
                placeholder="Agregá una nota o resolución visible solo internamente..."
                rows={4} style={{ width:"100%", boxSizing:"border-box", background:"#f7f8fa",
                  border:"1.5px solid #e8e8e8", borderRadius:10, padding:"10px 14px",
                  fontSize:13, outline:"none", resize:"none", color:"#1a1a1a",
                  fontFamily:"Nunito,sans-serif", fontWeight:600 }}/>
            </div>
          </div>
        )}

        {/* ── Tab: Compartir ── */}
        {tab === "compartir" && isSuperAdmin && (
          <div style={{ background:"white", borderRadius:16,
            boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:"16px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#888",
              letterSpacing:".5px", marginBottom:16 }}>COMPARTIR CON DOMINIO</div>
            <CompartirPanel
              sel={selLocal}
              showToast={showToast}
              onShared={(c) => {
                const updated = { ...selLocal, compartido_con: c };
                setSelLocal(updated);
                onUpdate(updated);
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}

// ── Lista principal ─────────────────────────────────────────────
function AdminReportes({ me, showToast, onBack }) {
  const [reports,  setReports]  = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [filtroE,  setFiltroE]  = useState("todos");
  const [filtroG,  setFiltroG]  = useState("todos");
  const [sel,      setSel]      = useState(null);

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
      .then(d => {
        setReports(d.reports || d.data?.reports || []);
        setSummary(d.summary  || d.data?.summary  || {});
      })
      .catch(() => { setReports([]); setSummary({}); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtroE, filtroG]);

  if (sel) {
    return (
      <DetalleReporte
        sel={sel}
        me={me}
        showToast={showToast}
        onBack={() => { setSel(null); load(); }}
        onUpdate={(updated) => {
          setReports(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
          setSel(updated);
        }}
      />
    );
  }

  const totalPendientes = (summary.recibido || 0) + (summary.en_revision || 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f4f6f9" }}>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1.5px solid #e8e8e8",
        padding:"14px 16px 12px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <button onClick={onBack}
            style={{ background:"#f0f0f0", border:"none", borderRadius:10,
              width:36, height:36, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:18, color:"#1a1a1a" }}>🚩 Reportes ciudadanos</div>
            {totalPendientes > 0 && (
              <div style={{ fontSize:11, color:"#ef4444", fontWeight:700, marginTop:1 }}>
                {totalPendientes} {totalPendientes === 1 ? "reporte pendiente" : "reportes pendientes"}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {ESTADOS.map(e => (
            <div key={e} onClick={() => setFiltroE(filtroE===e?"todos":e)}
              style={{ background:filtroE===e?ESTADO_COL[e]+"18":"#f8f9fa",
                border:"1.5px solid "+(filtroE===e?ESTADO_COL[e]:"#e8e8e8"),
                borderRadius:12, padding:"10px 6px", textAlign:"center",
                cursor:"pointer", transition:"all .15s" }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{ESTADO_ICON[e]}</div>
              <div style={{ fontWeight:900, fontSize:18,
                color:filtroE===e?ESTADO_COL[e]:"#1a1a1a" }}>{summary[e] || 0}</div>
              <div style={{ fontSize:9, fontWeight:800,
                color:filtroE===e?ESTADO_COL[e]:"#aaa", letterSpacing:".3px" }}>
                {ESTADO_LABEL2[e].toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Filtro grupo */}
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {[["todos","🗂️ Todos"], ...Object.entries(REPORTE_GRUPOS).map(([k,g])=>[k,g.label])].map(([val,label]) => (
            <button key={val} onClick={() => setFiltroG(val)}
              style={{ background:filtroG===val?"#1a1a2e":"#f0f0f0",
                border:"none", borderRadius:99, padding:"5px 12px",
                fontSize:10, fontWeight:800,
                color:filtroG===val?"white":"#666",
                cursor:"pointer", whiteSpace:"nowrap",
                fontFamily:"Nunito,sans-serif", flexShrink:0,
                transition:"all .15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {loading && (
          <div style={{ textAlign:"center", color:"#aaa", padding:48 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
            Cargando reportes...
          </div>
        )}
        {!loading && reports.length === 0 && (
          <div style={{ background:"white", borderRadius:20, padding:"40px 24px",
            textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
            <div style={{ fontWeight:800, fontSize:15, color:"#333", marginBottom:4 }}>Sin reportes</div>
            <div style={{ fontSize:12, color:"#aaa" }}>
              {filtroE!=="todos" ? `Estado: "${ESTADO_LABEL2[filtroE]}"` : ""}
              {filtroG!=="todos" ? ` · ${REPORTE_GRUPOS[filtroG]?.label}` : ""}
            </div>
          </div>
        )}

        {reports.map(r => {
          const tipoInfo = REPORTE_TIPOS.find(t => t.id === r.tipo) || { icon:"📋", label:r.tipo, col:"#64748b" };
          const estCol   = ESTADO_COL[r.estado] || "#94a3b8";
          const shared   = r.compartido_con || [];
          const urgente  = r.tipo === "bullying" || r.tipo === "acoso" || r.tipo === "violencia" || r.tipo === "maltrato_docente";
          return (
            <div key={r.id} onClick={() => setSel(r)}
              style={{ background:"white", borderRadius:16, marginBottom:10, cursor:"pointer",
                boxShadow:"0 2px 10px rgba(0,0,0,.06)", overflow:"hidden",
                border:"1.5px solid "+(urgente && r.estado==="recibido"?"#fca5a5":"transparent"),
                transition:"transform .1s, box-shadow .1s" }}>
              {/* Barra de color del tipo */}
              <div style={{ height:3, background:tipoInfo.col }}/>
              <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:12,
                  background:tipoInfo.col+"20", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                  {tipoInfo.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>{tipoInfo.label}</span>
                    <span style={{ background:estCol+"20", color:estCol,
                      borderRadius:99, padding:"2px 8px", fontSize:10, fontWeight:800 }}>
                      {ESTADO_LABEL2[r.estado]}
                    </span>
                    {urgente && r.estado==="recibido" && (
                      <span style={{ background:"#fef2f2", color:"#ef4444",
                        borderRadius:99, padding:"2px 8px", fontSize:10, fontWeight:800 }}>
                        ⚡ URGENTE
                      </span>
                    )}
                    {(r.adjuntos?.length > 0) && (
                      <span style={{ background:"#f0f0f0", color:"#666",
                        borderRadius:99, padding:"2px 7px", fontSize:9, fontWeight:800 }}>
                        📎 {r.adjuntos.length}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:"#666", overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.descripcion}</div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:3,
                    display:"flex", gap:8, alignItems:"center" }}>
                    <span>{r.anonimo ? "🔒 Anónimo" : r.reporter_nombre}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short" })}</span>
                    {shared.length > 0 && (
                      <span style={{ color:"#00c1fc" }}>
                        · {shared.map(d => DOMINIOS.find(x=>x.id===d)?.icon).join("")}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color:"#ccc", fontSize:20, flexShrink:0 }}>›</span>
              </div>
            </div>
          );
        })}
        <div style={{ height:20 }}/>
      </div>
    </div>
  );
}

export default AdminReportes;
