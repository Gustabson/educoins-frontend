import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";

const SEVERITY_CFG = {
  advertencia: { label:"Advertencia",  color:"#f59e0b", icon:"⚠️" },
  sancion:     { label:"Sanción",      color:"#ef4444", icon:"🚔" },
  grave:       { label:"Caso Grave",   color:"#7f1d1d", icon:"⛔" },
};

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })
    + " " + d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" });
}

function AVeredictos({ me, onBack }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg } = useTheme();
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
        sub={unread > 0 ? `${unread} sin leer` : "Todo al día"}
        onBack={onBack}
        color="#7f1d1d"
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
          return (
            <div key={v.id} style={{
              background:cardBg, borderRadius:20, marginBottom:12,
              border: v.read_at
                ? `1.5px solid ${dark ? "#333" : "#eee"}`
                : `2px solid ${sev.color}`,
              overflow:"hidden",
              boxShadow: v.read_at
                ? (dark ? "0 1px 8px rgba(0,0,0,.4)" : "0 1px 8px rgba(0,0,0,.06)")
                : `0 4px 20px ${sev.color}44`,
              transition:"background .3s, border .3s, box-shadow .3s",
            }}>
              {/* Franja de severidad */}
              <div style={{ background:sev.color, padding:"8px 16px",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  fontWeight:900, color:"white", fontSize:13 }}>
                  <span style={{ fontSize:16 }}>{sev.icon}</span>
                  {sev.label}
                  {!v.read_at && (
                    <span style={{ background:"white", color:sev.color, borderRadius:99,
                      fontSize:9, fontWeight:900, padding:"2px 7px" }}>
                      NUEVO
                    </span>
                  )}
                </div>
                <span style={{ color:"rgba(255,255,255,.75)", fontSize:11 }}>
                  {fmt(v.created_at)}
                </span>
              </div>

              {/* Cuerpo */}
              <div style={{ padding:"14px 16px" }}>
                <div style={{
                  fontSize:14, color:txt, lineHeight:1.5,
                  fontWeight: v.read_at ? 600 : 800,
                  marginBottom: v.coins_penalty > 0 ? 10 : 0,
                  transition:"color .3s",
                }}>
                  {v.mensaje}
                </div>

                {v.coins_penalty > 0 && (
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    background: dark ? "rgba(239,68,68,.18)" : "#fee2e2",
                    borderRadius:10, padding:"5px 12px",
                    fontSize:12, fontWeight:800, color:"#dc2626",
                  }}>
                    🪙 Penalización: -{v.coins_penalty} EduCoins descontados
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
