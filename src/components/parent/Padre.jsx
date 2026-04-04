import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { GS } from "../../constants";
import { Av, WCard, Toast, useToast, displayName } from "../shared/index";
import AVotaciones from "../student/AVotaciones";
import AP2P from "../student/AP2P";
import AAsistente from "../student/AAsistente";
import ATiendaCustom from "../student/personalizar/ATiendaCustom";
import ANoticias from "../student/ANoticias";
import ARanking from "../student/ARanking";

// ─────────────────────────────────────────────────────────────
// PORTAL DE PADRES
// ─────────────────────────────────────────────────────────────

// Tabs that hide the bottom nav (full-screen sub-pages)
const HIDE_NAV_TABS = ["diwy","veredictos-hijo","noticias","asistente","personalizar","vincular","exchange","quemar"];

function Padre({ me, balance, refreshBalance, logout, setMe }) {
  const [tab, setTab]       = useState("home");
  const [toast, showToast]  = useToast();
  const [chatUnread, setChatUnread] = useState(0);

  const showNav = !HIDE_NAV_TABS.includes(tab);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", background: "#F0F0F0",
      fontFamily: "Nunito,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{GS}</style>
      <Toast msg={toast?.msg} type={toast?.type} />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: showNav ? 90 : 0, animation: "fadeIn .18s ease" }}>
        {tab === "home"            && <PHome me={me} balance={balance} refreshBalance={refreshBalance} showToast={showToast} setTab={setTab} />}
        {tab === "chat"            && <PChat me={me} showToast={showToast} unread={chatUnread} clearUnread={() => setChatUnread(0)} />}
        {tab === "ranking"         && <ARanking me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "votar"           && <AVotaciones me={me} showToast={showToast} onBack={() => setTab("home")} parentMode={true} />}
        {tab === "perfil"          && <PPerfil me={me} logout={logout} />}
        {tab === "wallet"          && <PWallet me={me} />}
        {tab === "diwy"            && <PDiwy me={me} showToast={showToast} setTab={setTab} />}
        {tab === "veredictos-hijo" && <PVeredictos me={me} showToast={showToast} setTab={setTab} />}
        {tab === "noticias"        && <ANoticias me={me} onBack={() => setTab("home")} readOnly={true} />}
        {tab === "asistente"       && <AAsistente me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "personalizar"    && <ATiendaCustom me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "vincular"        && <PVinculacion me={me} showToast={showToast} setTab={setTab} />}
        {tab === "exchange"        && <AP2P me={me} showToast={showToast} onBack={() => setTab("home")} />}
        {tab === "quemar"          && <PQuemar me={me} balance={balance} refreshBalance={refreshBalance} showToast={showToast} setTab={setTab} />}
      </div>

      {/* Bottom nav — 5 tabs */}
      {showNav && (
        <div style={{ position: "sticky", bottom: 0, width: "100%", background: "white",
          borderTop: "1px solid #EFEFEF", padding: "6px 4px 20px", display: "flex",
          justifyContent: "space-around", boxShadow: "0 -2px 16px rgba(0,0,0,.07)" }}>
          {[
            { id: "home",   icon: "🏠", label: "Inicio"  },
            { id: "chat",   icon: "💬", label: "Chat", badge: chatUnread },
            { id: "ranking",icon: "🏆", label: "Ranking" },
            { id: "votar",  icon: "🗳️", label: "Votar"   },
            { id: "perfil", icon: "👤", label: "Perfil"  },
          ].map(item => {
            const on = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1,
                background: "none", border: "none", cursor: "pointer", color: on ? "#00c1fc" : "#777",
                fontFamily: "Nunito,sans-serif", padding: "3px 2px", position: "relative" }}>
                <div style={{ width: 36, height: 30, borderRadius: 10,
                  background: on ? "#e0f7fe" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <span style={{ fontSize: 19 }}>{item.icon}</span>
                  {item.badge > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -2, background: "#ef4444",
                      color: "white", borderRadius: 99, fontSize: 9, fontWeight: 900,
                      minWidth: 16, height: 16, display: "flex", alignItems: "center",
                      justifyContent: "center", padding: "0 3px" }}>{item.badge}</span>
                  )}
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
// HOME — hijos + transferir + accesos rápidos
// ─────────────────────────────────────────────────────────────
function PHome({ me, balance, refreshBalance, showToast, setTab }) {
  const [children,   setChildren]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [transferTo, setTransferTo] = useState(null);
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
      await api.parentTransfer(transferTo.id, amt, desc.trim() || undefined);
      showToast(`Enviaste 🪙${amt} a ${displayName(transferTo)}`);
      setChildren(cs => cs.map(c => c.id === transferTo.id
        ? { ...c, balance: (c.balance || 0) + amt }
        : c
      ));
      setTransferTo(null); setAmount(""); setDesc("");
      refreshBalance();
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
    } finally { setSending(false); }
  };

  const QUICK = [
    { icon: "🐾", label: "Diwy",        color: "#7c3aed", tab: "diwy"            },
    { icon: "⚖️", label: "Veredictos",  color: "#7f1d1d", tab: "veredictos-hijo" },
    { icon: "📰", label: "Noticias",    color: "#00c1fc", tab: "noticias"        },
    { icon: "🤖", label: "Asistente IA",color: "#10b981", tab: "asistente"       },
    { icon: "🎨", label: "Personalizar",color: "#f59e0b", tab: "personalizar"    },
    { icon: "🔗", label: "Vincular hijo",color:"#3b82f6", tab: "vincular"        },
    { icon: "💱", label: "Exchange",    color: "#8b5cf6", tab: "exchange"        },
    { icon: "🔥", label: "Quemar",      color: "#ef4444", tab: "quemar"          },
  ];

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
          <WCard style={{ textAlign: "center", padding: 32, marginBottom: 12 }}>
            <div style={{ fontSize: 36 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight: 800, color: "#1a1a1a", marginTop: 8 }}>Sin hijos vinculados</div>
            <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
              Usá "Vincular hijo" para solicitar la conexión con la cuenta de tu hijo/a.
            </div>
            <button onClick={() => setTab("vincular")} style={{
              marginTop: 14, background: "#3b82f6", border: "none", borderRadius: 50,
              color: "white", padding: "10px 22px", fontWeight: 800, fontSize: 13,
              cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              🔗 Vincular hijo
            </button>
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

        {/* DAO info */}
        {children.length > 0 && (
          <div style={{ background: "#f59e0b18", borderRadius: 16, padding: "14px 16px",
            marginTop: 4, marginBottom: 14, border: "1.5px solid #f59e0b33" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#b45309", marginBottom: 4 }}>
              🏛️ Tu poder de voto DAO
            </div>
            <div style={{ fontSize: 12, color: "#92400e" }}>
              En las votaciones DAO, tu voto vale <strong>🪙{balance}</strong> monedas.
              Cuantas más monedas tengas, más influencia tenés.
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 10, marginTop: 4 }}>
          Accesos rápidos
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {QUICK.map(q => (
            <button key={q.tab} onClick={() => setTab(q.tab)} style={{
              background: "white", border: "none", borderRadius: 18, padding: "16px 12px",
              cursor: "pointer", fontFamily: "Nunito,sans-serif",
              boxShadow: "0 1px 8px rgba(0,0,0,.06)", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12,
                background: q.color + "18", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22 }}>{q.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1a1a" }}>{q.label}</div>
            </button>
          ))}
        </div>
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
function PDiwy({ me, showToast, setTab }) {
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [requesting, setRequesting] = useState({});
  const [rateLimited, setRateLimited] = useState({});

  const accent = "#7c3aed";

  useEffect(() => {
    api.diwyParentReports()
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

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
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden",
        textShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -60, right: -50, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button onClick={() => setTab("home")} style={{ background: "rgba(255,255,255,.2)",
            border: "none", borderRadius: 50, color: "white", width: 34, height: 34,
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0 }}>←</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>🐾 Diwy</div>
            <div style={{ fontSize: 13, opacity: .85 }}>Reportes de seguimiento de tus hijos</div>
          </div>
        </div>
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
          const latest = studentReports[0];
          const isExpanded = expandedId === latest?.id;
          const isRequesting = requesting[studentId];
          const rateLimitMsg = rateLimited[studentId];

          return (
            <div key={studentId} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8, paddingLeft: 4 }}>
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

                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6,
                    overflow: "hidden", maxHeight: isExpanded ? "none" : 80, position: "relative" }}>
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

// ─────────────────────────────────────────────────────────────
// VEREDICTOS — veredictos de los hijos
// ─────────────────────────────────────────────────────────────
function PVeredictos({ me, showToast, setTab }) {
  const [verdicts, setVerdicts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const accent = "#7f1d1d";

  useEffect(() => {
    api.parentChildrenVerdicts()
      .then(d => setVerdicts(Array.isArray(d) ? d : []))
      .catch(() => setVerdicts([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by child
  const byChild = verdicts.reduce((acc, v) => {
    const key = v.to_user_id || v.alumno_nombre || "?";
    if (!acc[key]) acc[key] = { nombre: v.alumno_nombre || v.alumno_apodo || "Alumno", verdicts: [] };
    acc[key].verdicts.push(v);
    return acc;
  }, {});

  const SEVERITY_COLOR = { alta: "#ef4444", media: "#f59e0b", baja: "#10b981" };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%",
          background: "rgba(255,255,255,.08)", top: -50, right: -40, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setTab("home")} style={{ background: "rgba(255,255,255,.2)",
            border: "none", borderRadius: 50, color: "white", width: 34, height: 34,
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0 }}>←</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>⚖️ Veredictos</div>
            <div style={{ fontSize: 13, opacity: .85 }}>Conducta de tus hijos</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 14px" }}>
        {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Cargando...</div>}

        {!loading && verdicts.length === 0 && (
          <WCard style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 40 }}>⚖️</div>
            <div style={{ fontWeight: 800, color: "#1a1a1a", marginTop: 8 }}>Sin veredictos</div>
            <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
              Tus hijos no tienen veredictos registrados.
            </div>
          </WCard>
        )}

        {Object.entries(byChild).map(([key, { nombre, verdicts: cv }]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8, paddingLeft: 4 }}>
              👧 {nombre}
            </div>
            {cv.map(v => {
              const sevColor = SEVERITY_COLOR[v.severidad] || "#64748b";
              return (
                <WCard key={v.id} style={{ marginBottom: 8, overflow: "hidden", padding: 0 }}>
                  <div style={{ height: 4, background: sevColor }} />
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ background: sevColor + "20", color: sevColor,
                        borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>
                        {v.severidad || "media"}
                      </span>
                      <span style={{ fontSize: 11, color: "#aaa" }}>{fmtDate(v.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 700, marginBottom: 4 }}>
                      {v.motivo || v.descripcion || "Veredicto"}
                    </div>
                    {v.penalizacion && (
                      <div style={{ fontSize: 12, color: "#ef4444" }}>
                        💸 Penalización: {v.penalizacion} monedas
                      </div>
                    )}
                    {v.from_nombre && (
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                        Por: {v.from_nombre}
                      </div>
                    )}
                  </div>
                </WCard>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VINCULACION — solicitar vinculación con hijo
// ─────────────────────────────────────────────────────────────
function PVinculacion({ me, showToast, setTab }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [confirming,  setConfirming]  = useState(null); // studentId
  const [requests,    setRequests]    = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [linked,      setLinked]      = useState([]);

  const accent = "#3b82f6";

  useEffect(() => {
    Promise.all([
      api.parentLinkRequests().catch(() => []),
      api.parentChildren().catch(() => []),
    ]).then(([reqs, children]) => {
      setRequests(Array.isArray(reqs) ? reqs : []);
      setLinked(Array.isArray(children) ? children : []);
    }).finally(() => setLoadingReqs(false));
  }, []);

  const search = async () => {
    if (!query.trim() || query.trim().length < 2) {
      showToast("Escribí al menos 2 caracteres", "error"); return;
    }
    setSearching(true);
    setResults([]);
    try {
      const d = await api.parentLinkSearch(query.trim());
      setResults(Array.isArray(d) ? d : []);
      if ((!Array.isArray(d) || d.length === 0)) showToast("No se encontraron alumnos", "error");
    } catch (e) {
      showToast(e.message || "Error al buscar", "error");
    } finally { setSearching(false); }
  };

  const confirm = async (studentId) => {
    setConfirming(studentId);
    try {
      await api.parentLinkConfirm(studentId);
      showToast("Solicitud enviada. El admin la revisará pronto.");
      setResults([]);
      setQuery("");
      const reqs = await api.parentLinkRequests().catch(() => []);
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch (e) {
      showToast(e.message || "Error al enviar solicitud", "error");
    } finally { setConfirming(null); }
  };

  const cancel = async (id) => {
    try {
      await api.parentLinkCancel(id);
      setRequests(rs => rs.filter(r => r.id !== id));
      showToast("Solicitud cancelada");
    } catch (e) {
      showToast(e.message || "Error al cancelar", "error");
    }
  };

  const ESTADO_STYLE = {
    pendiente: { bg: "#fef3c7", color: "#b45309", label: "Pendiente" },
    aprobado:  { bg: "#d1fae5", color: "#065f46", label: "Aprobado"  },
    rechazado: { bg: "#fee2e2", color: "#991b1b", label: "Rechazado" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -50, right: -40, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setTab("home")} style={{ background: "rgba(255,255,255,.2)",
            border: "none", borderRadius: 50, color: "white", width: 34, height: 34,
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0 }}>←</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>🔗 Vincular hijo</div>
            <div style={{ fontSize: 13, opacity: .85 }}>Conectá tu cuenta con la de tu hijo/a</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 14px" }}>
        {/* Hijos ya vinculados */}
        {linked.length > 0 && (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8 }}>
              ✅ Hijos vinculados
            </div>
            {linked.map(c => (
              <WCard key={c.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <Av user={c} sz={40} avatarBg={c.avatar_bg} />
                <div style={{ fontWeight: 800, color: "#1a1a1a" }}>{displayName(c)}</div>
                <span style={{ marginLeft: "auto", background: "#d1fae5", color: "#065f46",
                  borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>
                  Vinculado
                </span>
              </WCard>
            ))}
            <div style={{ height: 12 }} />
          </>
        )}

        {/* Buscador */}
        <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8 }}>
          🔍 Buscar alumno
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Nombre del alumno..."
            style={{ flex: 1, border: "1.5px solid #e8e8e8", borderRadius: 12,
              padding: "10px 14px", fontSize: 14, outline: "none",
              fontFamily: "Nunito,sans-serif" }} />
          <button onClick={search} disabled={searching}
            style={{ background: searching ? "#ccc" : accent, border: "none", borderRadius: 12,
              color: "white", padding: "10px 18px", fontWeight: 800, fontSize: 14,
              cursor: searching ? "not-allowed" : "pointer", fontFamily: "Nunito,sans-serif" }}>
            {searching ? "..." : "Buscar"}
          </button>
        </div>

        {results.map(s => (
          <WCard key={s.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <Av user={s} sz={40} avatarBg={s.avatar_bg} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#1a1a1a" }}>{displayName(s)}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Alumno</div>
            </div>
            <button onClick={() => confirm(s.id)} disabled={confirming === s.id}
              style={{ background: confirming === s.id ? "#ccc" : accent, border: "none",
                borderRadius: 50, color: "white", padding: "8px 16px", fontWeight: 800,
                fontSize: 12, cursor: confirming === s.id ? "not-allowed" : "pointer",
                fontFamily: "Nunito,sans-serif" }}>
              {confirming === s.id ? "..." : "Solicitar"}
            </button>
          </WCard>
        ))}

        {/* Solicitudes existentes */}
        {!loadingReqs && requests.length > 0 && (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 8, marginTop: 16 }}>
              📋 Mis solicitudes
            </div>
            {requests.map(r => {
              const est = ESTADO_STYLE[r.estado] || ESTADO_STYLE.pendiente;
              return (
                <WCard key={r.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#1a1a1a" }}>
                      {r.student_nombre || r.student_name || "Alumno"}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>
                      {new Date(r.created_at).toLocaleDateString("es-AR")}
                    </div>
                  </div>
                  <span style={{ background: est.bg, color: est.color,
                    borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>
                    {est.label}
                  </span>
                  {r.estado === "pendiente" && (
                    <button onClick={() => cancel(r.id)}
                      style={{ background: "#fee2e2", border: "none", borderRadius: 50,
                        color: "#991b1b", padding: "6px 12px", fontWeight: 800,
                        fontSize: 11, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                      Cancelar
                    </button>
                  )}
                </WCard>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QUEMAR — quemar monedas propias
// ─────────────────────────────────────────────────────────────
function PQuemar({ me, balance, refreshBalance, showToast, setTab }) {
  const [amount,  setAmount]  = useState("");
  const [burning, setBurning] = useState(false);

  const accent = "#ef4444";

  const quemar = async () => {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { showToast("Ingresá un monto válido", "error"); return; }
    if (amt > balance) { showToast(`No tenés suficientes monedas (saldo: ${balance})`, "error"); return; }
    setBurning(true);
    try {
      await api.parentBurn(amt);
      showToast(`Quemaste 🔥 ${amt} monedas`);
      setAmount("");
      refreshBalance();
    } catch (e) {
      showToast(e.message || "Error al quemar", "error");
    } finally { setBurning(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0" }}>
      <div style={{ background: accent, color: "white", padding: "52px 20px 28px",
        position: "sticky", top: 0, zIndex: 50, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%",
          background: "rgba(255,255,255,.1)", top: -50, right: -40, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setTab("home")} style={{ background: "rgba(255,255,255,.2)",
            border: "none", borderRadius: 50, color: "white", width: 34, height: 34,
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0 }}>←</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>🔥 Quemar monedas</div>
            <div style={{ fontSize: 13, opacity: .85 }}>Eliminar monedas de circulación</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 14px" }}>
        <WCard style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: "#1a1a1a" }}>Tu saldo actual</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: accent }}>🪙 {balance}</div>
          </div>

          <div style={{ background: "#fee2e2", borderRadius: 12, padding: "12px 14px", marginBottom: 16,
            border: "1.5px solid #fca5a5" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#991b1b", marginBottom: 4 }}>
              ⚠️ Acción irreversible
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.5 }}>
              Las monedas quemadas no se pueden recuperar. Esta acción es permanente.
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#555", marginBottom: 6 }}>
              Cantidad a quemar
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" min="1" max={balance}
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8e8e8",
                borderRadius: 12, padding: "12px 14px", fontSize: 20, fontWeight: 900, outline: "none",
                color: accent, fontFamily: "Nunito,sans-serif", textAlign: "center" }} />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[5, 10, 25, 50, 100].filter(n => n <= balance).map(n => (
              <button key={n} onClick={() => setAmount(String(n))}
                style={{ flex: 1, background: amount === String(n) ? accent : "#f0f0f0",
                  color: amount === String(n) ? "white" : "#555",
                  border: "none", borderRadius: 10, padding: "8px 4px",
                  fontSize: 12, fontWeight: 800, cursor: "pointer",
                  fontFamily: "Nunito,sans-serif" }}>{n}</button>
            ))}
          </div>

          <button onClick={quemar} disabled={burning || !amount || parseInt(amount) <= 0}
            style={{ width: "100%", background: (burning || !amount || parseInt(amount) <= 0) ? "#ccc" : accent,
              border: "none", borderRadius: 50, color: "white", padding: "14px",
              fontWeight: 800, fontSize: 15, cursor: (burning || !amount) ? "not-allowed" : "pointer",
              fontFamily: "Nunito,sans-serif" }}>
            {burning ? "Quemando..." : `🔥 Quemar ${amount || "..."} monedas`}
          </button>
        </WCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHAT DE PADRES
// ─────────────────────────────────────────────────────────────
function PChat({ me, showToast }) {
  const [messages, setMessages] = useState([]);
  const [texto,    setTexto]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  const accent = "#00c1fc";

  const loadMessages = async (silent = false) => {
    try {
      const d = await api.parentChatMessages();
      setMessages(Array.isArray(d) ? d : []);
    } catch (e) {
      if (!silent) showToast("Error al cargar mensajes", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(() => loadMessages(true), 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!texto.trim()) return;
    setSending(true);
    const txt = texto.trim();
    setTexto("");
    try {
      await api.parentChatSend(txt);
      await loadMessages(true);
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
      setTexto(txt);
    } finally { setSending(false); }
  };

  const fmtTime = (d) => new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  let lastDate = null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F0F0F0" }}>
      {/* Header */}
      <div style={{ background: accent, color: "white", padding: "52px 20px 20px",
        flexShrink: 0, textShadow: "0 1px 4px rgba(0,60,100,.4)" }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>💬 Chat de Padres</div>
        <div style={{ fontSize: 12, opacity: .8 }}>Canal para toda la comunidad de padres</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {loading && <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Cargando...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#aaa", padding: 40, fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            ¡Sé el primero en escribir!
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user_id === me.id;
          const dateStr = fmtDate(msg.created_at);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;

          return (
            <div key={msg.id || i}>
              {showDate && (
                <div style={{ textAlign: "center", fontSize: 11, color: "#aaa",
                  margin: "10px 0", fontWeight: 700 }}>{dateStr}</div>
              )}
              <div style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row",
                alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
                {!isMe && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%",
                    background: "#e0e0e0", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    👨‍👩‍👧
                  </div>
                )}
                <div style={{ maxWidth: "72%" }}>
                  {!isMe && (
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 2, fontWeight: 800 }}>
                      {msg.apodo || msg.nombre}
                    </div>
                  )}
                  <div style={{
                    background: isMe ? accent : "white",
                    color: isMe ? "white" : "#1a1a1a",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    fontSize: 14, lineHeight: 1.4,
                    boxShadow: "0 1px 4px rgba(0,0,0,.08)"
                  }}>
                    {msg.texto}
                  </div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2,
                    textAlign: isMe ? "right" : "left" }}>
                    {fmtTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: "white", padding: "10px 14px 24px",
        borderTop: "1px solid #EFEFEF", display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escribí un mensaje..."
          style={{ flex: 1, border: "1.5px solid #e8e8e8", borderRadius: 22,
            padding: "10px 16px", fontSize: 14, outline: "none",
            fontFamily: "Nunito,sans-serif" }} />
        <button onClick={send} disabled={sending || !texto.trim()}
          style={{ background: (sending || !texto.trim()) ? "#ccc" : accent, border: "none",
            borderRadius: "50%", width: 44, height: 44, color: "white", fontSize: 18,
            cursor: (sending || !texto.trim()) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default Padre;
