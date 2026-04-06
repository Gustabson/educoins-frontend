import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";
import { VERDICT_SEVERITY as SEVERITY_CFG } from "../../constants";

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" });
}

function AVeredictos({ me, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myVerdicts()
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = list.filter(v => !v.read_at).length;

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <OHdrA
        title="⚖️ Veredictos"
        extra={
          <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>
            {unread > 0 ? `${unread} sin leer` : "Todo al día"}
          </div>
        }
        onBack={onBack}
      />

      <div style={{ padding:"16px 14px 32px" }}>
        {loading && (
          <div style={{ textAlign:"center", color:sub, padding:40, fontSize:14,
            transition:"color .3s" }}>
            Cargando...
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:800, fontSize:16, color:txt, transition:"color .3s" }}>
              Sin veredictos
            </div>
            <div style={{ fontSize:13, color:sub, marginTop:6, transition:"color .3s" }}>
              No tenés ningún veredicto registrado
            </div>
          </div>
        )}

        {list.map(v => {
          const sev = SEVERITY_CFG[v.severity] || SEVERITY_CFG.advertencia;
          const unread = !v.read_at;
          return (
            <div key={v.id} style={{
              background:cardBg, borderRadius:20, marginBottom:12,
              border: unread ? `2px solid ${primary}` : `1.5px solid ${navBord}`,
              overflow:"hidden",
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
                  {fmt(v.created_at)}
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
    </div>
  );
}

export default AVeredictos;
