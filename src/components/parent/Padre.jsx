import { useState, useEffect } from "react";
import { api } from "../../api";
import { GS } from "../../constants";
import { Av, WCard, Toast, useToast, displayName } from "../shared/index";
import AVotaciones from "../student/AVotaciones";
import AP2P from "../student/AP2P";

// ─────────────────────────────────────────────────────────────
// PORTAL DE PADRES
// ─────────────────────────────────────────────────────────────

function Padre({ me, balance, refreshBalance, logout, setMe }) {
  const [tab, setTab]       = useState("home");
  const [toast, showToast]  = useToast();

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", background: "#F0F0F0",
      fontFamily: "Nunito,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type} />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90, animation: "fadeIn .18s ease" }}>
        {tab === "home"   && <PHome      me={me} balance={balance} refreshBalance={refreshBalance} showToast={showToast} />}
        {tab === "wallet" && <PWallet    me={me} />}
        {tab === "votar"  && <AVotaciones me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "p2p"    && <AP2P       me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "diwy"   && <PDiwy      me={me} showToast={showToast} />}
        {tab === "perfil" && <PPerfil    me={me} logout={logout} />}
      </div>
      {/* Bottom nav — ocultar cuando AVotaciones/AP2P tienen su propio header de back */}
      {tab !== "votar" && tab !== "p2p" && (
        <div style={{ position: "sticky", bottom: 0, width: "100%", background: "white",
          borderTop: "1px solid #EFEFEF", padding: "6px 4px 20px", display: "flex",
          justifyContent: "space-around", boxShadow: "0 -2px 16px rgba(0,0,0,.07)" }}>
          {[
            { id: "home",   icon: "🏠", label: "Inicio"  },
            { id: "wallet", icon: "🪙", label: "Billetera" },
            { id: "votar",  icon: "🗳️", label: "Votar"   },
            { id: "p2p",    icon: "📊", label: "P2P"     },
            { id: "diwy",   icon: "🐾", label: "Diwy"    },
            { id: "perfil", icon: "👤", label: "Perfil"  },
          ].map(item => {
            const on = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1,
                background: "none", border: "none", cursor: "pointer", color: on ? "#00c1fc" : "#777",
                fontFamily: "Nunito,sans-serif", padding: "3px 2px" }}>
                <div style={{ width: 36, height: 30, borderRadius: 10,
                  background: on ? "#e0f7fe" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 19 }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME — hijos + transferir
// ─────────────────────────────────────────────────────────────
function PHome({ me, balance, refreshBalance, showToast }) {
  const [children,   setChildren]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [transferTo, setTransferTo] = useState(null); // child object
  const [amount,     setAmount]     = useState("");
  const [desc,       setDesc]       = useState("");
  const [sending,    setSending]    = useState(false);

  const accent = "#00c1fc";

  useEffect(() => {
    api.parentChildren()
      .then(d => setChildren(Array.isArray(d) ? d : []))
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  const enviar = async () => {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { showToast("Ingresá un monto válido", "error"); return; }
    if (!transferTo) return;
    setSending(true);
    try {
      const r = await api.parentTransfer(transferTo.id, amt, desc.trim() || undefined);
      showToast(`Enviaste 🪙${amt} a ${displayName(transferTo)}`);
      // Actualizar balance del hijo localmente
      setChildren(cs => cs.map(c => c.id === transferTo.id
        ? { ...c, balance: c.balance - amt }  // estimación optimista
        : c
      ));
      setTransferTo(null); setAmount(""); setDesc("");
      refreshBalance();
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
    } finally { setSending(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      {/* Header */}
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
        textShadow: "0 1px 4px rgba(0,60,100,.4)" }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -60, right: -50, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,.25)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26 }}>👨‍👩‍👧</div>
          <div>
            <div style={{ fontSize: 11, opacity: .8, fontWeight: 700 }}>FAMILIA</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Hola, {me.nombre.split(" ")[0]} 👋</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,.18)", borderRadius: 14, padding: "12px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, opacity: .8 }}>Tu saldo</div>
            <div style={{ fontWeight: 900, fontSize: 26 }}>🪙 {balance}</div>
          </div>
          <div style={{ fontSize: 10, opacity: .7, textAlign: "right" }}>
            Usá tus monedas<br/>para votar o enviar<br/>a tus hijos
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 14px" }}>
        {/* Hijos */}
        <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 10 }}>
          👧👦 Tus hijos
        </div>

        {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Cargando...</div>}

        {!loading && children.length === 0 && (
          <WCard style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 36 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight: 800, color: "#1a1a1a", marginTop: 8 }}>Sin hijos vinculados</div>
            <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
              Pedile al administrador de la escuela que vincule tu cuenta a la de tus hijos.
            </div>
          </WCard>
        )}

        {children.map(child => (
          <WCard key={child.id} style={{ marginBottom: 10, cursor: "pointer" }}
            onClick={() => setTransferTo(t => t?.id === child.id ? null : child)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Av user={child} sz={46} avatarBg={child?.avatar_bg || null} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>
                  {displayName(child)}
                </div>
                <div style={{ fontSize: 12, color: "#aaa" }}>Alumno</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: accent }}>🪙 {child.balance}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>saldo</div>
              </div>
            </div>

            {/* Panel de transferencia expandible */}
            {transferTo?.id === child.id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1a1a", marginBottom: 10 }}>
                  Enviar monedas a {displayName(child)}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Cantidad" min="1"
                    style={{ flex: 1, border: "1.5px solid #e8e8e8", borderRadius: 12,
                      padding: "9px 12px", fontSize: 16, fontWeight: 800, outline: "none",
                      color: accent, fontFamily: "Nunito,sans-serif" }} />
                  <div style={{ display: "flex", gap: 4 }}>
                    {[5, 10, 25, 50].map(n => (
                      <button key={n} onClick={e => { e.stopPropagation(); setAmount(String(n)); }}
                        style={{ background: amount === String(n) ? accent : "#f0f0f0",
                          color: amount === String(n) ? "white" : "#555",
                          border: "none", borderRadius: 8, padding: "6px 8px",
                          fontSize: 11, fontWeight: 800, cursor: "pointer",
                          fontFamily: "Nunito,sans-serif" }}>{n}</button>
                    ))}
                  </div>
                </div>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Mensaje (opcional)..."
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8e8e8",
                    borderRadius: 12, padding: "9px 12px", fontSize: 13, outline: "none",
                    fontFamily: "Nunito,sans-serif", marginBottom: 10 }} />
                <button onClick={e => { e.stopPropagation(); enviar(); }} disabled={sending || !amount}
                  style={{ width: "100%", background: sending || !amount ? "#ccc" : accent,
                    border: "none", borderRadius: 50, color: "white", padding: "12px",
                    fontWeight: 800, fontSize: 14, cursor: sending ? "not-allowed" : "pointer",
                    fontFamily: "Nunito,sans-serif" }}>
                  {sending ? "Enviando..." : `Enviar 🪙${amount || "..."}`}
                </button>
              </div>
            )}
          </WCard>
        ))}

        {/* Info DAO */}
        {children.length > 0 && (
          <div style={{ background: "#f59e0b18", borderRadius: 16, padding: "14px 16px",
            marginTop: 8, border: "1.5px solid #f59e0b33" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#b45309", marginBottom: 4 }}>
              🏛️ Tu poder de voto DAO
            </div>
            <div style={{ fontSize: 12, color: "#92400e" }}>
              En las votaciones DAO de la escuela, tu voto vale <strong>🪙{balance}</strong> monedas.
              Cuantas más monedas tengas, más influencia tenés en las decisiones.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WALLET — balance + historial
// ─────────────────────────────────────────────────────────────
function PWallet({ me }) {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const accent = "#00c1fc";

  useEffect(() => {
    Promise.all([api.account(), api.transactions()])
      .then(([acc, txs]) => {
        setBalance(acc?.balance ?? 0);
        setTransactions(Array.isArray(txs) ? txs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const TX_ICON = {
    reward: "🎁", transfer: "↔️", purchase: "🛒", adjustment: "⚙️",
    mint: "🏦", burn: "🔥", subscription: "🔄",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      <div style={{ background: accent, color: "white", padding: "32px 20px 24px",
        textShadow: "0 1px 4px rgba(0,60,100,.4)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, opacity: .8 }}>Tu billetera</div>
        {balance !== null && (
          <div style={{ fontWeight: 900, fontSize: 38, marginTop: 4 }}>🪙 {balance}</div>
        )}
        <div style={{ fontSize: 11, opacity: .7, marginTop: 4 }}>
          Para obtener más monedas, contactá al administrador de la escuela.
        </div>
      </div>

      <div style={{ padding: "14px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 10 }}>Movimientos</div>
        {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Cargando...</div>}
        {!loading && transactions.length === 0 && (
          <WCard style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 32 }}>🪙</div>
            <div style={{ fontWeight: 800, color: "#1a1a1a", marginTop: 8 }}>Sin movimientos</div>
          </WCard>
        )}
        {transactions.map((tx, i) => {
          const positive = tx.amount > 0;
          return (
            <WCard key={tx.id || i} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12,
                background: positive ? "#10b98118" : "#ef444418",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {TX_ICON[tx.type] || "💸"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>
                  {tx.description || tx.type}
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>
                  {new Date(tx.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 16,
                color: positive ? "#10b981" : "#ef4444", flexShrink: 0 }}>
                {positive ? "+" : ""}{tx.amount}🪙
              </div>
            </WCard>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────────
function PPerfil({ me, logout }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      <div style={{ background: "#00c1fc", color: "white", padding: "52px 20px 28px",
        textShadow: "0 1px 4px rgba(0,60,100,.4)" }}>
        <div style={{ fontWeight: 900, fontSize: 22, textAlign: "center" }}>Mi Perfil</div>
      </div>
      <div style={{ padding: "14px 14px" }}>
        <WCard style={{ textAlign: "center", padding: 28, marginBottom: 12 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>👨‍👩‍👧</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1a1a" }}>{me.nombre}</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>{me.email}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4,
            background: "#00c1fc18", borderRadius: 99, padding: "3px 12px", marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#00c1fc" }}>👨‍👩‍👧 Padre / Madre</span>
          </div>
        </WCard>
        <button onClick={logout}
          style={{ width: "100%", background: "white", border: "1.5px solid #E8E8E8",
            borderRadius: 50, color: "#888", padding: "14px", fontWeight: 800,
            fontSize: 14, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIWY — Reportes de seguimiento IA para padres
// ─────────────────────────────────────────────────────────────
function PDiwy({ me, showToast }) {
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [requesting, setRequesting] = useState({}); // studentId -> bool
  const [rateLimited, setRateLimited] = useState({}); // studentId -> message

  const accent = "#7c3aed";

  useEffect(() => {
    api.diwyParentReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by student
  const byStudent = reports.reduce((acc, r) => {
    if (!acc[r.student_id]) acc[r.student_id] = { nombre: r.alumno_nombre, reports: [] };
    acc[r.student_id].reports.push(r);
    return acc;
  }, {});

  const requestReport = async (studentId) => {
    setRequesting(prev => ({ ...prev, [studentId]: true }));
    setRateLimited(prev => ({ ...prev, [studentId]: null }));
    try {
      await api.diwyParentRequest(studentId);
      showToast("Solicitud enviada. El equipo generará el reporte pronto.");
    } catch (e) {
      if (e.code === "RATE_LIMITED") {
        setRateLimited(prev => ({ ...prev, [studentId]: e.message }));
      } else {
        showToast(e.message || "Error al enviar solicitud", "error");
      }
    } finally {
      setRequesting(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      {/* Header */}
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
        textShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -60, right: -50, pointerEvents: "none" }} />
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>🐾 Diwy</div>
        <div style={{ fontSize: 13, opacity: .85 }}>Reportes de seguimiento de tus hijos</div>
      </div>

      <div style={{ padding: "16px 14px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Cargando reportes...</div>
        )}

        {!loading && Object.keys(byStudent).length === 0 && (
          <WCard style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1a1a", marginBottom: 8 }}>
              Bienvenido a Diwy
            </div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 16 }}>
              Diwy es el asistente preceptor IA de la institución. Genera reportes semanales
              personalizados sobre el progreso de tus hijos en la economía educativa.
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>
              Aún no hay reportes aprobados para tus hijos. Podés solicitar uno al equipo docente.
            </div>
          </WCard>
        )}

        {Object.entries(byStudent).map(([studentId, { nombre, reports: studentReports }]) => {
          const latest = studentReports[0]; // already sorted by approved_at DESC
          const isExpanded = expandedId === latest?.id;
          const isRequesting = requesting[studentId];
          const rateLimitMsg = rateLimited[studentId];

          return (
            <div key={studentId} style={{ marginBottom: 16 }}>
              {/* Student header */}
              <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8,
                paddingLeft: 4 }}>
                👧 {nombre}
              </div>

              {latest && (
                <WCard style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a1a" }}>
                        {latest.periodo_label}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                        Publicado el {fmtDate(latest.approved_at)}
                      </div>
                    </div>
                    <span style={{ background: "#7c3aed18", color: "#7c3aed",
                      borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>
                      Aprobado
                    </span>
                  </div>

                  {/* Preview */}
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6,
                    overflow: "hidden", maxHeight: isExpanded ? "none" : 80,
                    position: "relative" }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{latest.reporte_final}</div>
                    {!isExpanded && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                        height: 40, background: "linear-gradient(transparent, white)" }} />
                    )}
                  </div>

                  <button onClick={() => setExpandedId(isExpanded ? null : latest.id)}
                    style={{ background: "none", border: "none", color: accent,
                      fontWeight: 800, fontSize: 12, cursor: "pointer",
                      fontFamily: "Nunito,sans-serif", padding: "8px 0 0", display: "block" }}>
                    {isExpanded ? "Ver menos ▲" : "Ver completo ▼"}
                  </button>
                </WCard>
              )}

              {/* Request new report */}
              {rateLimitMsg && (
                <div style={{ background: "#fef3c718", border: "1.5px solid #f59e0b33",
                  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
                  fontSize: 12, color: "#92400e" }}>
                  ⏳ {rateLimitMsg}
                </div>
              )}
              <button
                onClick={() => requestReport(studentId)}
                disabled={isRequesting}
                style={{ width: "100%", background: isRequesting ? "#ccc" : `${accent}18`,
                  border: `1.5px dashed ${accent}55`,
                  borderRadius: 14, padding: "12px", cursor: isRequesting ? "not-allowed" : "pointer",
                  fontFamily: "Nunito,sans-serif", color: accent, fontWeight: 800, fontSize: 13 }}>
                {isRequesting ? "Enviando solicitud..." : "📨 Solicitar nuevo reporte"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Padre;
