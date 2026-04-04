import { useState, useEffect } from "react";
import { api } from "../../api";
import { WCard } from "../shared/index";

const TIPO_CFG = {
  reglamento:    { label:"Reglamento",     icon:"📜", color:"#ef4444" },
  institucional: { label:"Institucional",  icon:"🏫", color:"#3b82f6" },
};

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" });
}

function AdminDocs({ showToast, onBack }) {
  const [docs,    setDocs]    = useState([]);
  const [editing, setEditing] = useState(null);  // doc completo en edición
  const [creating,setCreating]= useState(false);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fTipo,     setFTipo]     = useState("reglamento");
  const [fTitulo,   setFTitulo]   = useState("");
  const [fContenido,setFContenido]= useState("");

  const loadDocs = () => {
    setLoading(true);
    api.aiDocs()
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, []);

  const openEdit = async (doc) => {
    try {
      const full = await api.aiDoc(doc.id);
      setEditing(full);
      setFTitulo(full.titulo);
      setFContenido(full.contenido);
      setFTipo(full.tipo);
    } catch {
      showToast("Error al cargar el documento");
    }
  };

  const openCreate = () => {
    setCreating(true);
    setFTipo("reglamento");
    setFTitulo("");
    setFContenido("");
  };

  const handleSave = async () => {
    if (!fTitulo.trim()) return showToast("El título es requerido");
    setSaving(true);
    try {
      if (editing) {
        await api.aiDocUpdate(editing.id, { titulo:fTitulo.trim(), contenido:fContenido });
        showToast("Documento actualizado");
      } else {
        await api.aiDocCreate({ tipo:fTipo, titulo:fTitulo.trim(), contenido:fContenido });
        showToast("Documento creado");
      }
      setEditing(null);
      setCreating(false);
      loadDocs();
    } catch (e) {
      showToast(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (doc) => {
    try {
      await api.aiDocUpdate(doc.id, { activo: !doc.activo });
      setDocs(prev => prev.map(d => d.id===doc.id ? {...d, activo:!d.activo} : d));
    } catch { showToast("Error al actualizar"); }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.titulo}"?`)) return;
    try {
      await api.aiDocDelete(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      showToast("Documento eliminado");
    } catch { showToast("Error al eliminar"); }
  };

  // ── Vista edición/creación ────────────────────────────────
  if (editing || creating) {
    const cfg = TIPO_CFG[fTipo] || TIPO_CFG.reglamento;
    return (
      <div style={{ minHeight:"100vh", background:"#F0F0F0" }}>
        <div style={{ background:cfg.color, color:"white", padding:"52px 20px 18px",
          position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>{ setEditing(null); setCreating(false); }}
              style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:50,
                width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color:"white", fontSize:18, fontFamily:"Nunito,sans-serif" }}>
              ‹
            </button>
            <div>
              <div style={{ fontWeight:900, fontSize:18 }}>
                {editing ? "Editar documento" : "Nuevo documento"}
              </div>
              <div style={{ fontSize:11, opacity:.8 }}>{cfg.icon} {cfg.label}</div>
            </div>
          </div>
        </div>

        <div style={{ padding:"16px 14px 100px" }}>
          {/* Tipo (solo en creación) */}
          {creating && (
            <WCard style={{ marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:10 }}>Tipo</div>
              <div style={{ display:"flex", gap:8 }}>
                {Object.entries(TIPO_CFG).map(([k, c]) => (
                  <button key={k} onClick={() => setFTipo(k)} style={{
                    flex:1, border:`2px solid ${fTipo===k ? c.color : "#e5e7eb"}`,
                    background: fTipo===k ? c.color+"15" : "white",
                    borderRadius:12, padding:"10px 8px", cursor:"pointer",
                    fontFamily:"Nunito,sans-serif", transition:"all .2s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:20 }}>{c.icon}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:fTipo===k?c.color:"#666" }}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </WCard>
          )}

          {/* Título */}
          <WCard style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#333", marginBottom:8 }}>Título</div>
            <input
              value={fTitulo} onChange={e=>setFTitulo(e.target.value)}
              placeholder="Nombre del documento..."
              style={{ width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10,
                padding:"9px 12px", fontSize:13, fontFamily:"Nunito,sans-serif",
                outline:"none", boxSizing:"border-box" }}
            />
          </WCard>

          {/* Contenido */}
          <WCard style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#333" }}>Contenido</div>
              <div style={{ fontSize:11, color:"#aaa" }}>{fContenido.length} caracteres</div>
            </div>
            <textarea
              value={fContenido} onChange={e=>setFContenido(e.target.value)}
              placeholder="Pegá aquí el contenido del documento..."
              rows={16}
              style={{ width:"100%", border:`1.5px solid ${cfg.color}55`,
                borderRadius:12, padding:"10px 12px", fontSize:12,
                fontFamily:"'Courier New', monospace", lineHeight:1.6,
                resize:"vertical", outline:"none", boxSizing:"border-box",
                background:"#fafafa", color:"#1a1a1a" }}
            />
            <div style={{ fontSize:11, color:"#aaa", marginTop:6 }}>
              💡 Tip: organizá el contenido con artículos numerados para que la IA pueda citarlos con precisión
            </div>
          </WCard>

          <button onClick={handleSave} disabled={saving}
            style={{ width:"100%", background:saving?"#ccc":cfg.color,
              border:"none", borderRadius:14, padding:"15px",
              color:"white", fontWeight:900, fontSize:15,
              cursor:saving?"not-allowed":"pointer",
              fontFamily:"Nunito,sans-serif",
              boxShadow:`0 4px 20px ${cfg.color}66` }}>
            {saving ? "Guardando..." : "💾 Guardar documento"}
          </button>
        </div>
      </div>
    );
  }

  // ── Vista lista ───────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#F0F0F0" }}>
      <div style={{ background:"#1e293b", color:"white", padding:"52px 20px 18px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:180, height:180, borderRadius:"50%",
          background:"rgba(255,255,255,.06)", top:-50, right:-30, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", marginBottom:14 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none",
            borderRadius:50, width:36, height:36, display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", color:"white", fontSize:18,
            fontFamily:"Nunito,sans-serif" }}>‹</button>
          <div>
            <div style={{ fontWeight:900, fontSize:20 }}>📚 Documentos IA</div>
            <div style={{ fontSize:12, opacity:.8 }}>Fuente de verdad del Asistente</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 14px 32px" }}>
        {/* Info */}
        <WCard style={{ marginBottom:12, background:"#eff6ff", border:"1.5px solid #bfdbfe" }}>
          <div style={{ fontSize:12, color:"#1d4ed8", lineHeight:1.6 }}>
            💡 <strong>Cómo funciona:</strong> el Asistente responde usando estos documentos como fuente de verdad.
            Cargá el reglamento real y la info institucional para que las respuestas sean precisas.
          </div>
        </WCard>

        {loading && <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>Cargando...</div>}

        {/* Documentos por tipo */}
        {Object.entries(TIPO_CFG).map(([tipo, cfg]) => {
          const tiposDocs = docs.filter(d => d.tipo === tipo);
          return (
            <div key={tipo} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:cfg.color+"18",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  {cfg.icon}
                </div>
                <div style={{ fontWeight:800, fontSize:14, color:"#1a1a1a" }}>{cfg.label}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>({tiposDocs.length})</div>
              </div>

              {tiposDocs.map(doc => (
                <WCard key={doc.id} style={{ marginBottom:8, padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:"#1a1a1a" }}>{doc.titulo}</div>
                      <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                        Actualizado: {fmt(doc.updated_at)} ·{" "}
                        <span style={{ color: doc.activo?"#10b981":"#ef4444", fontWeight:700 }}>
                          {doc.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => handleToggle(doc)} style={{
                        background: doc.activo?"#dcfce7":"#fee2e2",
                        border:"none", borderRadius:8, padding:"5px 8px",
                        fontSize:11, fontWeight:800, cursor:"pointer",
                        color: doc.activo?"#16a34a":"#dc2626",
                        fontFamily:"Nunito,sans-serif" }}>
                        {doc.activo ? "✓ ON" : "✗ OFF"}
                      </button>
                      <button onClick={() => openEdit(doc)} style={{
                        background:"#eff6ff", border:"none", borderRadius:8,
                        padding:"5px 8px", fontSize:11, fontWeight:800,
                        cursor:"pointer", color:"#3b82f6",
                        fontFamily:"Nunito,sans-serif" }}>
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(doc)} style={{
                        background:"#fee2e2", border:"none", borderRadius:8,
                        padding:"5px 8px", fontSize:14, cursor:"pointer" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </WCard>
              ))}

              {tiposDocs.length === 0 && !loading && (
                <div style={{ textAlign:"center", color:"#aaa", fontSize:12,
                  padding:"16px 0", fontStyle:"italic" }}>
                  Sin documentos de tipo {cfg.label.toLowerCase()}
                </div>
              )}
            </div>
          );
        })}

        {/* Botón agregar */}
        <button onClick={openCreate} style={{
          width:"100%", background:"none", border:"2px dashed #94a3b8",
          borderRadius:14, padding:"14px", marginTop:8,
          cursor:"pointer", fontFamily:"Nunito,sans-serif",
          color:"#475569", fontWeight:800, fontSize:13 }}>
          + Agregar nuevo documento
        </button>
      </div>
    </div>
  );
}

export default AdminDocs;
