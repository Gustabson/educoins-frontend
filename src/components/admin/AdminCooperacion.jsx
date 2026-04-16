import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA, WCard, Av } from "../shared/index";

export default function AdminCooperacion({ showToast, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();
  const [tab, setTab] = useState("config"); // config | live | payouts

  // Config state
  const [config, setConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [newPos, setNewPos] = useState("");
  const [newPremio, setNewPremio] = useState("");
  const [saving, setSaving] = useState(false);

  // Live ranking
  const [live, setLive] = useState([]);
  const [liveLabel, setLiveLabel] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Peer eval global config
  const [peerCfg, setPeerCfg] = useState({});
  const [peerCfgLoading, setPeerCfgLoading] = useState(false);

  useEffect(() => {
    api.peerRankingConfig().then(r => setConfig(r.data || [])).catch(() => {}).finally(() => setConfigLoading(false));
    api.peerConfig().then(r => setPeerCfg(r.data || {})).catch(() => {});
  }, []);

  const loadLive = async () => {
    setLiveLoading(true);
    try {
      const r = await api.peerRankingLive();
      setLive(r.data || []);
      setLiveLabel(r.periodo_label || "");
      setAlreadyPaid(!!r.already_paid);
    } catch (e) { showToast("Error cargando ranking", "error"); }
    finally { setLiveLoading(false); }
  };

  const loadPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const r = await api.peerRankingPayouts();
      setPayouts(r.data || []);
    } catch { }
    finally { setPayoutsLoading(false); }
  };

  const savePosition = async () => {
    if (!newPos || !newPremio) { showToast("Completá posición y premio", "error"); return; }
    setSaving(true);
    try {
      const r = await api.peerRankingUpsert({ posicion: parseInt(newPos), premio: parseInt(newPremio) });
      setConfig(prev => {
        const exists = prev.findIndex(c => c.posicion === parseInt(newPos));
        if (exists >= 0) {
          const copy = [...prev];
          copy[exists] = r.data;
          return copy;
        }
        return [...prev, r.data].sort((a, b) => a.posicion - b.posicion);
      });
      setNewPos(""); setNewPremio("");
      showToast("Posición guardada ✅");
    } catch (e) { showToast(e.message || "Error", "error"); }
    finally { setSaving(false); }
  };

  const closeWeek = async () => {
    if (!window.confirm("¿Cerrar la semana y repartir premios de cooperación?")) return;
    setClosing(true);
    try {
      const r = await api.peerRankingClose();
      showToast(`✅ Semana ${r.data?.periodo} cerrada — ${r.data?.count} premios otorgados`);
      setAlreadyPaid(true);
      await loadLive();
    } catch (e) { showToast(e.message || "Error", "error"); }
    finally { setClosing(false); }
  };

  const updatePeerCfg = async (key, value) => {
    const updated = { ...peerCfg, [key]: value };
    setPeerCfg(updated);
    try { await api.peerConfigUpdate({ [key]: value }); }
    catch { showToast("Error guardando", "error"); }
  };

  const inp = {
    background: inputBg, border: `1px solid ${navBord}`, borderRadius: 10,
    padding: "10px 12px", fontFamily: "Nunito,sans-serif", fontSize: 14, fontWeight: 700,
    color: txt, width: "100%", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ background: pageBg, minHeight: "100%", fontFamily: "Nunito,sans-serif" }}>
      <OHdrA title="🤝 Cooperación" onBack={onBack} />

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: cardBg, borderBottom: `1px solid ${navBord}` }}>
        {[["config", "⚙️ Config"], ["live", "📊 Ranking"], ["payouts", "💰 Historial"]].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); if (id === "live") loadLive(); if (id === "payouts") loadPayouts(); }}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 12, border: "none", cursor: "pointer",
              fontFamily: "Nunito,sans-serif", fontSize: 12, fontWeight: 800,
              background: tab === id ? primary : "transparent", color: tab === id ? "white" : sub }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px 100px" }}>

        {/* ── CONFIG TAB ── */}
        {tab === "config" && (
          <>
            {/* Prize positions */}
            <div style={{ fontWeight: 900, fontSize: 15, color: txt, marginBottom: 12 }}>
              Premios por posición
            </div>
            <div style={{ fontSize: 12, color: sub, marginBottom: 12, lineHeight: 1.5 }}>
              Configurá cuántas monedas recibe cada posición del ranking de cooperación cada semana.
            </div>

            {configLoading && <div style={{ textAlign: "center", padding: 20, color: sub }}>Cargando...</div>}

            {config.map(c => (
              <WCard key={c.posicion} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", marginBottom: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: primary, width: 36, textAlign: "center" }}>
                  {c.posicion === 1 ? "🥇" : c.posicion === 2 ? "🥈" : c.posicion === 3 ? "🥉" : `#${c.posicion}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: txt }}>Puesto #{c.posicion}</div>
                  <div style={{ fontSize: 11, color: sub }}>{c.activo ? "Activo" : "Inactivo"}</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 16, color: primary }}>🪙 {c.premio}</div>
              </WCard>
            ))}

            {/* Add new position */}
            <div style={{ background: cardBg, borderRadius: 16, padding: 16, marginTop: 12,
              border: `1.5px dashed ${navBord}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: txt, marginBottom: 10 }}>
                Agregar / modificar posición
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Posición</div>
                  <input type="number" min="1" value={newPos} onChange={e => setNewPos(e.target.value)}
                    placeholder="1, 2, 3..." style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Premio 🪙</div>
                  <input type="number" min="0" value={newPremio} onChange={e => setNewPremio(e.target.value)}
                    placeholder="Monedas" style={inp} />
                </div>
              </div>
              <button onClick={savePosition} disabled={saving}
                style={{ width: "100%", padding: 12, background: primary, color: "white",
                  border: "none", borderRadius: 12, fontFamily: "Nunito,sans-serif",
                  fontSize: 13, fontWeight: 900, cursor: "pointer", opacity: saving ? .6 : 1 }}>
                {saving ? "Guardando..." : "Guardar posición"}
              </button>
            </div>

            {/* Global peer eval settings */}
            <div style={{ fontWeight: 900, fontSize: 15, color: txt, marginTop: 24, marginBottom: 12 }}>
              Configuración general
            </div>

            <WCard style={{ padding: 16, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: txt, marginBottom: 10 }}>🏫 Horario escolar</div>
              <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>
                Los alumnos solo pueden evaluar compañeros fuera del horario escolar.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Inicio</div>
                  <input type="time" value={peerCfg.school_hour_start || "07:00"}
                    onChange={e => updatePeerCfg("school_hour_start", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: sub, marginBottom: 2 }}>Fin</div>
                  <input type="time" value={peerCfg.school_hour_end || "15:00"}
                    onChange={e => updatePeerCfg("school_hour_end", e.target.value)} style={inp} />
                </div>
              </div>
            </WCard>

            <WCard style={{ padding: 16, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: txt, marginBottom: 10 }}>🔄 Rotación forzada</div>
              <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>
                Cuántas veces puede un alumno trabajar con el mismo compañero antes de forzar rotación.
              </div>
              <input type="number" min="2" max="20" value={peerCfg.rotation_lookback || 5}
                onChange={e => updatePeerCfg("rotation_lookback", parseInt(e.target.value) || 5)} style={inp} />
            </WCard>

            <WCard style={{ padding: 16, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: txt, marginBottom: 10 }}>📅 Historial</div>
              <div style={{ fontSize: 11, color: sub, marginBottom: 8 }}>
                Meses de evaluaciones que se consideran para el ranking.
              </div>
              <input type="number" min="1" max="24" value={peerCfg.history_months || 6}
                onChange={e => updatePeerCfg("history_months", parseInt(e.target.value) || 6)} style={inp} />
            </WCard>
          </>
        )}

        {/* ── LIVE RANKING TAB ── */}
        {tab === "live" && (
          <>
            {liveLoading && <div style={{ textAlign: "center", padding: 40, color: sub, fontWeight: 700 }}>Cargando...</div>}

            {!liveLoading && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: txt }}>Semana {liveLabel}</div>
                    <div style={{ fontSize: 11, color: sub }}>
                      {alreadyPaid ? "✅ Ya pagada" : "Pendiente de cierre"}
                    </div>
                  </div>
                  {!alreadyPaid && live.length > 0 && (
                    <button onClick={closeWeek} disabled={closing}
                      style={{ background: "#10b981", color: "white", border: "none", borderRadius: 12,
                        padding: "10px 18px", fontFamily: "Nunito,sans-serif", fontSize: 13,
                        fontWeight: 900, cursor: "pointer", opacity: closing ? .6 : 1 }}>
                      {closing ? "Cerrando..." : "💰 Cerrar semana"}
                    </button>
                  )}
                </div>

                {live.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: sub }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Sin datos de ranking</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Se necesitan al menos 2 evaluaciones por alumno</div>
                  </div>
                )}

                {live.map(s => (
                  <WCard key={s.id} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", marginBottom: 6 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, width: 32, textAlign: "center",
                      color: s.posicion <= 3 ? primary : sub }}>
                      {s.posicion === 1 ? "🥇" : s.posicion === 2 ? "🥈" : s.posicion === 3 ? "🥉" : `#${s.posicion}`}
                    </div>
                    <Av user={s} sz={36} avatarBg={s.avatar_bg} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: txt }}>{s.nombre}</div>
                      <div style={{ fontSize: 10, color: sub }}>
                        {s.total_evals} evaluaciones · ⭐ {s.avg_rating ? parseFloat(s.avg_rating).toFixed(1) : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {s.premio > 0 ? (
                        <div style={{ fontWeight: 900, fontSize: 14, color: primary }}>🪙 {s.premio}</div>
                      ) : (
                        <div style={{ fontSize: 11, color: sub, fontWeight: 700 }}>—</div>
                      )}
                    </div>
                  </WCard>
                ))}
              </>
            )}
          </>
        )}

        {/* ── PAYOUTS HISTORY TAB ── */}
        {tab === "payouts" && (
          <>
            {payoutsLoading && <div style={{ textAlign: "center", padding: 40, color: sub, fontWeight: 700 }}>Cargando...</div>}

            {!payoutsLoading && payouts.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: sub }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Sin pagos aún</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Cerrá una semana en el ranking para ver el historial</div>
              </div>
            )}

            {/* Group by period */}
            {(() => {
              const grouped = {};
              payouts.forEach(p => {
                if (!grouped[p.periodo_label]) grouped[p.periodo_label] = [];
                grouped[p.periodo_label].push(p);
              });
              return Object.entries(grouped).map(([period, items]) => (
                <div key={period} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: txt, marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 8 }}>
                    <span>📅 {period}</span>
                    <span style={{ fontSize: 11, color: sub, fontWeight: 700 }}>
                      ({items.length} premio{items.length > 1 ? "s" : ""} ·
                      🪙 {items.reduce((s, p) => s + p.premio, 0)} total)
                    </span>
                  </div>
                  {items.map(p => (
                    <WCard key={p.id} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", marginBottom: 4 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: primary, width: 28, textAlign: "center" }}>
                        #{p.posicion}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: txt }}>{p.nombre}</div>
                        <div style={{ fontSize: 9, color: sub }}>
                          {new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 14, color: primary }}>🪙 {p.premio}</div>
                    </WCard>
                  ))}
                </div>
              ));
            })()}
          </>
        )}
      </div>
    </div>
  );
}
