import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";
import { REPORTE_TIPOS, REPORTE_GRUPOS, ESTADO_LABEL, ESTADO_COLOR } from "../../constants";

function AReportes({ me, showToast, onBack }) {
  const { primary:accent, isDark:dark, txt, sub, cardBg, pageBg:bg, inputBg, inputBd, navBord } = useTheme();
  const [vista,      setVista]    = useState("lista"); // lista | nuevo | chat
  const [reporteSel, setRepSel]   = useState(null);
  const [tipo,       setTipo]     = useState(null);
  const [desc,       setDesc]     = useState("");
  const [anon,       setAnon]     = useState(true);
  const [enviados,   setEnviados] = useState([]);
  const [msgs,       setMsgs]     = useState([]);
  const [newMsg,     setNewMsg]   = useState("");
  const [loading,    setLoading]  = useState(true);
  const [enviando,   setEnviando] = useState(false);
  const [sending,    setSending]  = useState(false);
  const [grupoSel,   setGrupoSel] = useState(null); // seleccion de grupo en formulario
  const [adjuntos,   setAdjuntos] = useState([]);   // archivos adjuntos
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const loadList = () => {
    api.myReports()
      .then(d => setEnviados(d.data || d || []))
      .catch(() => setEnviados([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadList(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const openChat = async (r) => {
    setRepSel(r); setMsgs([]); setVista("chat");
    try {
      const d = await api.reportMessages(r.id);
      setMsgs(d.data || d || []);
    } catch(e) { showToast("Error al cargar mensajes", "error"); }
  };

  // Convertir archivos a base64
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - adjuntos.length);
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) { showToast("Archivo muy grande (máx 3 MB)", "error"); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAdjuntos(prev => [...prev, { nombre: file.name, tipo: file.type, data: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const quitarAdj = (i) => setAdjuntos(prev => prev.filter((_, idx) => idx !== i));

  const enviar = async () => {
    if (!tipo)                          { showToast("Elegí un tipo", "error"); return; }
    if (!desc.trim() || desc.length<10) { showToast("Describí qué pasó (mín. 10 caracteres)", "error"); return; }
    setEnviando(true);
    try {
      await api.createReport({ tipo: tipo.id, descripcion: desc.trim(), anonimo: anon, adjuntos });
      showToast("Reporte enviado 🔒");
      setTipo(null); setDesc(""); setAnon(true); setGrupoSel(null); setAdjuntos([]);
      setVista("lista");
      loadList();
    } catch(e) { showToast(e.message || "Error", "error"); }
    finally { setEnviando(false); }
  };

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const d = await api.sendReportMsg(reporteSel.id, newMsg.trim());
      setMsgs(prev => [...prev, d.data || d]);
      setNewMsg("");
      const lista = await api.myReports().catch(() => ({ data:[] }));
      const todos = lista.data || lista || [];
      setEnviados(todos);
      const act = todos.find(r => r.id === reporteSel.id);
      if (act) setRepSel(act);
    } catch(e) { showToast("Error al enviar", "error"); }
    finally { setSending(false); }
  };

  // ── Vista: chat de un reporte ────────────────────────────────
  if (vista === "chat" && reporteSel) {
    const tipoInfo = REPORTE_TIPOS.find(t => t.id === reporteSel.tipo) || REPORTE_TIPOS.at(-1);
    const estCol   = ESTADO_COLOR[reporteSel.estado] || "#94a3b8";
    const abierto  = !["resuelto","descartado"].includes(reporteSel.estado);
    return (
      <div style={{ background:bg, }}>
        <div style={{ background:accent, position:"sticky", top:0, zIndex:50,
          padding:"16px 16px 20px", color:"white" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => { setVista("lista"); loadList(); }}
              style={{ background:"rgba(0,0,0,.15)", border:"none", borderRadius:50,
                color:"white", width:34, height:34, cursor:"pointer", fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:15 }}>
                {tipoInfo.icon} Caso #{reporteSel.id?.slice(0,8).toUpperCase()}
              </div>
              <div style={{ fontSize:11, opacity:.85 }}>{tipoInfo.label}</div>
            </div>
            <span style={{ background:"rgba(255,255,255,.2)", borderRadius:99,
              padding:"3px 10px", fontSize:10, fontWeight:800 }}>
              {ESTADO_LABEL[reporteSel.estado]}
            </span>
          </div>
        </div>

        <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
          {/* Reporte original */}
          <div style={{ background:cardBg, borderRadius:16, overflow:"hidden",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)" }}>
            <div style={{ background:inputBg, padding:"12px 16px", borderBottom:`1px solid ${navBord}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:tipoInfo.col+"22",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {tipoInfo.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:txt }}>
                    {reporteSel.anonimo ? "🔒 Anónimo" : "Tú"}
                  </div>
                  <div style={{ fontSize:10, color:sub }}>Para: Administración escolar</div>
                </div>
                <div style={{ fontSize:10, color:sub, textAlign:"right" }}>
                  {new Date(reporteSel.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short" })}
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 16px", fontSize:13, color:txt, lineHeight:1.7 }}>
              {reporteSel.descripcion}
            </div>
          </div>

          {/* Mensajes */}
          {msgs.length === 0 && (
            <div style={{ background:cardBg, borderRadius:16, padding:"20px 16px", textAlign:"center",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
              <div style={{ fontSize:24, marginBottom:6 }}>📬</div>
              <div style={{ fontSize:13, fontWeight:700, color:txt }}>Esperando respuesta</div>
              <div style={{ fontSize:11, color:sub, marginTop:3 }}>El equipo revisará tu reporte pronto</div>
            </div>
          )}
          {msgs.map((m, i) => {
            const esAdmin = m.sender_rol === "admin" || m.sender_rol === "teacher" || m.sender_rol === "staff";
            return (
              <div key={m.id||i} style={{ background:cardBg, borderRadius:16, overflow:"hidden",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)",
                borderLeft:esAdmin ? `4px solid ${accent}` : `4px solid ${navBord}` }}>
                <div style={{ background:inputBg, padding:"10px 16px", borderBottom:`1px solid ${navBord}`,
                  display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                    background:esAdmin?accent+"22":navBord,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                    {esAdmin?"👨‍💼":"👤"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:12, color:esAdmin?accent:txt }}>
                      {esAdmin ? "Administración escolar" : "Tú"}
                    </div>
                    <div style={{ fontSize:10, color:sub }}>
                      {new Date(m.created_at).toLocaleDateString("es-AR",{ day:"numeric", month:"short" })}
                      {" · "}{new Date(m.created_at).toLocaleTimeString("es-AR",{ hour:"2-digit", minute:"2-digit" })}
                    </div>
                  </div>
                </div>
                <div style={{ padding:"12px 16px", fontSize:13, color:txt, lineHeight:1.7 }}>{m.texto}</div>
              </div>
            );
          })}
          <div ref={bottomRef}/>

          {/* Responder */}
          {abierto ? (
            <div style={{ background:cardBg, borderRadius:16, overflow:"hidden",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.08)" }}>
              <div style={{ background:inputBg, padding:"10px 16px", borderBottom:`1px solid ${navBord}`,
                fontSize:11, fontWeight:800, color:sub }}>↩ RESPONDER</div>
              <div style={{ padding:"12px 16px" }}>
                <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                  placeholder="Escribí tu respuesta..." rows={3}
                  style={{ width:"100%", boxSizing:"border-box", background:inputBg,
                    border:`1.5px solid ${inputBd}`, borderRadius:12, padding:"10px 14px",
                    fontSize:13, outline:"none", resize:"none", color:txt,
                    fontFamily:"Nunito,sans-serif", fontWeight:600, marginBottom:10 }}/>
                <button onClick={sendMsg} disabled={sending || !newMsg.trim()}
                  style={{ width:"100%", background:sending?"#ccc":accent, border:"none",
                    borderRadius:50, color:"white", padding:"11px", fontWeight:800, fontSize:13,
                    cursor:sending?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif" }}>
                  {sending ? "Enviando..." : "Enviar respuesta ↩"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background:cardBg, borderRadius:16, padding:"16px", textAlign:"center" }}>
              <span style={{ background:estCol+"22", color:estCol, borderRadius:99,
                padding:"5px 14px", fontSize:12, fontWeight:800 }}>
                Caso {ESTADO_LABEL[reporteSel.estado]} — cerrado
              </span>
            </div>
          )}
          <div style={{ height:20 }}/>
        </div>
      </div>
    );
  }

  // ── Vista: formulario nuevo reporte ─────────────────────────
  if (vista === "nuevo") {
    const tiposDelGrupo = grupoSel ? REPORTE_TIPOS.filter(t => t.grupo === grupoSel) : REPORTE_TIPOS;
    const grupoInfo     = grupoSel ? REPORTE_GRUPOS[grupoSel] : null;
    return (
      <div style={{ background:bg, }}>
        <OHdrA title="🚩 Nuevo Reporte" onBack={() => { setGrupoSel(null); setTipo(null); setVista("lista"); }}/>
        <div style={{ padding:"12px 14px 40px" }}>

          {/* Banner de confidencialidad + recompensa */}
          <div style={{ background:dark?"rgba(139,92,246,.15)":"#f3e8ff",
            border:"1.5px solid #c4b5fd", borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#7c3aed", marginBottom:4 }}>
              🔒 Confidencial & Seguro
            </div>
            <div style={{ fontSize:11, color:dark?"#c4b5fd":"#6d28d9", lineHeight:1.6 }}>
              Tu reporte es confidencial. Si elegís ser anónimo, nadie sabrá que fuiste vos.
              Las propuestas de mejora que generan cambios reales pueden recibir hasta{" "}
              <strong>🪙500 monedas</strong> de recompensa.
            </div>
          </div>

          {/* Selección de grupo */}
          {!grupoSel ? (
            <div style={{ background:cardBg, borderRadius:20, padding:16,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
              <div style={{ fontWeight:800, color:txt, marginBottom:12, fontSize:14 }}>
                ¿Qué tipo de situación querés reportar?
              </div>
              {Object.entries(REPORTE_GRUPOS).map(([key, g]) => (
                <button key={key} onClick={() => setGrupoSel(key)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                    padding:"14px 16px", borderRadius:14, marginBottom:8, cursor:"pointer",
                    border:`1.5px solid ${dark?"rgba(255,255,255,.1)":navBord}`,
                    background:inputBg, textAlign:"left", fontFamily:"Nunito,sans-serif" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:txt }}>{g.label}</div>
                    <div style={{ fontSize:11, color:sub, marginTop:2 }}>{g.hint}</div>
                  </div>
                  <span style={{ color:sub, fontSize:18 }}>›</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background:cardBg, borderRadius:20, padding:16,
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>

              {/* Volver a grupos */}
              <button onClick={() => { setGrupoSel(null); setTipo(null); }}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:sub, fontSize:11, fontWeight:700, fontFamily:"Nunito,sans-serif",
                  padding:0, marginBottom:12, display:"flex", alignItems:"center", gap:4 }}>
                ← {grupoInfo?.label}
              </button>

              <div style={{ fontWeight:800, color:txt, marginBottom:10, fontSize:13 }}>
                ¿Cuál es el tipo específico?
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {tiposDelGrupo.map(t => (
                  <div key={t.id} onClick={() => setTipo(t)}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                      borderRadius:14, cursor:"pointer",
                      background: tipo?.id===t.id ? t.col+"22" : inputBg,
                      border:`1.5px solid ${tipo?.id===t.id ? t.col : navBord}` }}>
                    <span style={{ fontSize:18 }}>{t.icon}</span>
                    <span style={{ fontSize:12, fontWeight:800,
                      color: tipo?.id===t.id ? t.col : txt }}>{t.label}</span>
                  </div>
                ))}
              </div>

              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Describí lo que pasó con el mayor detalle posible..."
                rows={5} style={{ width:"100%", boxSizing:"border-box", background:inputBg,
                  border:`1.5px solid ${inputBd}`, borderRadius:14, padding:"11px 14px",
                  fontSize:13, outline:"none", color:txt, fontFamily:"Nunito,sans-serif",
                  resize:"none", fontWeight:600, marginBottom:12 }}/>

              {/* Adjuntos */}
              <input ref={fileRef} type="file" multiple
                accept="image/*,.pdf,.doc,.docx"
                style={{ display:"none" }} onChange={handleFiles}/>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:sub, marginBottom:6 }}>
                  📎 Adjuntos <span style={{ fontWeight:400 }}>(opcional, máx 3 · 3 MB c/u)</span>
                </div>
                {adjuntos.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                    {adjuntos.map((a, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6,
                        background:inputBg, border:"1.5px solid "+inputBd,
                        borderRadius:10, padding:"5px 10px", fontSize:11, fontWeight:700,
                        color:txt, maxWidth:150 }}>
                        <span>{a.tipo?.startsWith("image/") ? "🖼️" : "📄"}</span>
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                          {a.nombre}
                        </span>
                        <button onClick={() => quitarAdj(i)}
                          style={{ background:"none", border:"none", cursor:"pointer",
                            color:sub, padding:0, fontSize:14, lineHeight:1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {adjuntos.length < 3 && (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ background:"none", border:"1.5px dashed "+inputBd,
                      borderRadius:10, padding:"7px 14px", cursor:"pointer",
                      fontSize:11, fontWeight:700, color:sub, fontFamily:"Nunito,sans-serif",
                      display:"flex", alignItems:"center", gap:6 }}>
                    <span>📎</span> Agregar archivo
                  </button>
                )}
              </div>

              {/* Colectivo info */}
              <div style={{ background:dark?"rgba(255,255,255,.05)":"#f8fafc",
                borderRadius:12, padding:"10px 14px", marginBottom:12,
                border:`1px dashed ${dark?"rgba(255,255,255,.15)":navBord}`,
                fontSize:11, color:sub, lineHeight:1.6 }}>
                💡 <strong style={{ color:txt }}>Reporte colectivo:</strong> si varios alumnos reportan la misma situación de forma independiente, el caso se escala automáticamente como urgente.
              </div>

              {/* Anónimo toggle */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
                cursor:"pointer" }} onClick={() => setAnon(a => !a)}>
                <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                  border:`2px solid ${anon?"#7c3aed":navBord}`,
                  background:anon?"#7c3aed":"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .2s" }}>
                  {anon && <span style={{ color:"white", fontSize:12, fontWeight:900 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:txt }}>
                    {anon ? "🔒 Anónimo" : "👤 No anónimo"}
                  </div>
                  <div style={{ fontSize:10, color:sub }}>
                    {anon ? "No van a saber quién sos. No podrás recibir respuesta directa." : "Podrás recibir respuesta y seguir el caso."}
                  </div>
                </div>
              </div>

              <button onClick={enviar} disabled={enviando}
                style={{ width:"100%", background:enviando?"#ccc":accent, border:"none",
                  borderRadius:50, color:"white", padding:"13px", fontWeight:800, fontSize:14,
                  cursor:enviando?"not-allowed":"pointer", fontFamily:"Nunito,sans-serif",
                  boxShadow:enviando?"none":`0 4px 16px ${accent}44` }}>
                {enviando ? "Enviando..." : "Enviar reporte 🔒"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: lista de reportes ─────────────────────────────────
  return (
    <div style={{ background:bg, }}>
      <OHdrA title="🚩 Reportes" onBack={onBack}/>
      <div style={{ padding:"12px 14px 32px" }}>

        {/* Botón nuevo */}
        <button onClick={() => setVista("nuevo")}
          style={{ width:"100%", background:accent, border:"none", borderRadius:16,
            color:"white", padding:"13px", fontWeight:800, fontSize:14, cursor:"pointer",
            fontFamily:"Nunito,sans-serif", marginBottom:8,
            boxShadow:`0 4px 16px ${accent}44` }}>
          + Nuevo reporte
        </button>

        {/* Info recompensa */}
        <div style={{ background:dark?"rgba(16,185,129,.1)":"#f0fdf4",
          border:"1px solid #86efac", borderRadius:12, padding:"10px 14px",
          marginBottom:14, display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:20 }}>🪙</span>
          <div style={{ fontSize:11, color:dark?"#86efac":"#166534", lineHeight:1.5 }}>
            <strong>Recompensa de hasta 500 monedas</strong> si tu propuesta de mejora genera un cambio real en la escuela.
            Tus reportes de situaciones urgentes son confidenciales y ayudan a todos.
          </div>
        </div>

        {/* Lista */}
        <div style={{ fontWeight:800, color:txt, fontSize:13, marginBottom:8 }}>Mis reportes</div>
        {loading && <div style={{ textAlign:"center", color:sub, padding:20 }}>Cargando...</div>}
        {!loading && enviados.length === 0 && (
          <div style={{ background:cardBg, borderRadius:16, padding:24, textAlign:"center",
            color:sub, fontSize:13,
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
            No enviaste ningún reporte aún.<br/>
            <span style={{ fontSize:11, marginTop:4, display:"block" }}>
              Tus reportes son confidenciales y ayudan a mejorar la escuela.
            </span>
          </div>
        )}
        {enviados.map((r, i) => {
          const t      = REPORTE_TIPOS.find(x => x.id === r.tipo) || REPORTE_TIPOS.at(-1);
          const estCol = ESTADO_COLOR[r.estado] || "#94a3b8";
          return (
            <div key={i} onClick={() => !r.anonimo && openChat(r)}
              style={{ background:cardBg, borderRadius:16, padding:"12px 14px", marginBottom:8,
                cursor: r.anonimo ? "default" : "pointer",
                boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",
                border:`1.5px solid ${dark?"transparent":navBord}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:t.col+"22",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, flexShrink:0 }}>{t.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:13, color:txt }}>{t.label}</div>
                  <div style={{ fontSize:11, color:sub, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.descripcion}</div>
                  {r.anonimo && (
                    <span style={{ fontSize:9, fontWeight:800, color:"#7c3aed",
                      background:"#f3e8ff", borderRadius:99, padding:"1px 7px", marginTop:2,
                      display:"inline-block" }}>🔒 Anónimo</span>
                  )}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <span style={{ background:estCol+"22", color:estCol, borderRadius:99,
                    padding:"3px 8px", fontSize:10, fontWeight:800, display:"block", marginBottom:4 }}>
                    {ESTADO_LABEL[r.estado] || r.estado}
                  </span>
                  {!r.anonimo && (
                    <span style={{ fontSize:10, color:accent }}>Ver chat →</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AReportes;
