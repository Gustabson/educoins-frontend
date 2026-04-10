import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";
import { VERDICT_SEVERITY } from "../../constants";

export default function PVeredictos({ me, showToast, setTab }) {
  const { primary, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [verdicts, setVerdicts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // GET /children-verdicts also marks all as read server-side (fire-and-forget),
    // so the badge will be 0 next time PHome loads. No extra PATCH needed.
    api.parentChildrenVerdicts()
      .then(d => setVerdicts(Array.isArray(d) ? d : []))
      .catch(() => setVerdicts([]))
      .finally(() => setLoading(false));
  }, []);

  const byChild = verdicts.reduce((acc, v) => {
    const key = v.to_user_id || "?";
    if (!acc[key]) acc[key] = { nombre: v.alumno_nombre || "Alumno", verdicts: [] };
    acc[key].verdicts.push(v);
    return acc;
  }, {});

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString("es-AR", { day:"numeric", month:"short" }) : "";

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>⚖️ Veredictos</div>
            <div style={{ fontSize:13, opacity:.85 }}>Conducta de tus hijos</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 14px" }}>
        {loading && (
          <div style={{ textAlign:"center", color:sub, padding:32,
            transition:"color .3s" }}>Cargando...</div>
        )}
        {!loading && verdicts.length === 0 && (
          <WCard style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:40 }}>✅</div>
            <div style={{ fontWeight:800, color:txt, marginTop:8, transition:"color .3s" }}>
              Sin veredictos
            </div>
            <div style={{ color:sub, fontSize:12, marginTop:4, transition:"color .3s" }}>
              Tus hijos no tienen veredictos registrados.
            </div>
          </WCard>
        )}
        {Object.entries(byChild).map(([key, { nombre, verdicts: cv }]) => (
          <div key={key} style={{ marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:13, color:sub, marginBottom:8,
              paddingLeft:4, transition:"color .3s" }}>👧 {nombre}</div>
            {cv.map(v => {
              const sev = VERDICT_SEVERITY[v.severity] || VERDICT_SEVERITY.advertencia;
              const unread = !v.read_at;
              return (
                <div key={v.id} style={{
                  background:cardBg, borderRadius:20, marginBottom:10, overflow:"hidden",
                  border: unread ? `2px solid ${primary}` : `1.5px solid ${navBord}`,
                  boxShadow: unread ? `0 4px 16px ${primary}33` : "none",
                  transition:"background .3s, border .3s, box-shadow .3s",
                }}>
                  {/* Cabecera */}
                  <div style={{ padding:"12px 16px", display:"flex", alignItems:"center",
                    justifyContent:"space-between",
                    borderBottom:`1px solid ${navBord}`, transition:"border-color .3s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8,
                      fontWeight:900, fontSize:13,
                      color: unread ? primary : sub, transition:"color .3s" }}>
                      <span style={{ fontSize:16 }}>{sev.icon}</span>
                      {sev.label}
                      {unread && (
                        <span style={{ background:`${primary}20`, color:primary,
                          borderRadius:99, fontSize:9, fontWeight:900, padding:"2px 7px",
                          transition:"background .3s, color .3s" }}>
                          NUEVO
                        </span>
                      )}
                    </div>
                    <span style={{ color:sub, fontSize:11, transition:"color .3s" }}>
                      {fmtDate(v.created_at)}
                    </span>
                  </div>

                  {/* Cuerpo */}
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{
                      fontSize:14, color:txt, lineHeight:1.5,
                      fontWeight: unread ? 800 : 600,
                      marginBottom: (v.coins_penalty > 0 || v.coins_reward > 0) ? 10 : 0,
                      transition:"color .3s",
                    }}>
                      {v.mensaje}
                    </div>

                    {v.coins_penalty > 0 && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                        background:`${primary}15`, borderRadius:10, padding:"5px 12px",
                        fontSize:12, fontWeight:800, color:primary,
                        transition:"background .3s, color .3s" }}>
                        🪙 Penalización: -{v.coins_penalty} EduCoins descontados
                      </div>
                    )}
                    {v.coins_reward > 0 && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                        background:`${primary}15`, borderRadius:10, padding:"5px 12px",
                        fontSize:12, fontWeight:800, color:primary,
                        transition:"background .3s, color .3s" }}>
                        🪙 +{v.coins_reward} EduCoins acreditados
                      </div>
                    )}

                    <div style={{ fontSize:11, color:sub, marginTop:8, transition:"color .3s" }}>
                      Emitido por la Administración
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
