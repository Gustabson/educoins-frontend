// DiwyLanding.jsx — Upsell page for parents without Diwy subscription.
// Activation is free (beta). Stores flag in localStorage.
// In V2: replace localStorage check with DB field (diwy_premium on users).

import { useState } from "react";
import { useTheme } from "../../ThemeContext";

const FEATURES = [
  {
    icon: "📊",
    title: "Reportes semanales con IA",
    desc: "Cada semana, Diwy analiza el comportamiento, rendimiento y estado emocional de tu hijo y te lo explica en palabras simples.",
    tag: null, // available now
  },
  {
    icon: "🔍",
    title: "Pedí un análisis cuando quieras",
    desc: "¿Algo te preocupa? Solicitá un nuevo reporte en cualquier momento. Diwy investiga y te responde.",
    tag: null,
  },
  {
    icon: "💬",
    title: "Preguntale a la maestra en tiempo real",
    desc: "Mandá una consulta directa al equipo docente desde Diwy. Sin intermediarios, sin perder el hilo.",
    tag: "pronto",
  },
  {
    icon: "📡",
    title: "Datos únicos de tu hijo en tiempo real",
    desc: "Enterate de cambios en su estado emocional, monedas ganadas, logros y alertas antes de que llegue a casa.",
    tag: "pronto",
  },
  {
    icon: "🗓️",
    title: "Preview de la clase antes de empezar",
    desc: "Sabé de qué se va a tratar la próxima clase, los temas del día y si hay algo especial planeado.",
    tag: "pronto",
  },
  {
    icon: "🚨",
    title: "Alertas de conducta al instante",
    desc: "Si pasa algo importante —bueno o malo— te llega una alerta antes de que te lo cuenten de otra forma.",
    tag: "pronto",
  },
];

export default function DiwyLanding({ me, onActivate, onBack }) {
  const { primary, txt, sub, cardBg, pageBg, navBord, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const activate = () => {
    setLoading(true);
    // TODO V2: POST /api/diwy/subscribe with real payment/activation
    setTimeout(() => {
      localStorage.setItem(`${me.id}_diwy_premium`, "1");
      setDone(true);
      setLoading(false);
      setTimeout(() => onActivate(), 1200);
    }, 900);
  };

  return (
    <div style={{ minHeight:"100vh", background: pageBg, transition:"background .3s" }}>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(145deg, ${primary} 0%, #7c3aed 100%)`,
        padding: "60px 24px 48px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position:"absolute", width:280, height:280, borderRadius:"50%",
          background:"rgba(255,255,255,.07)", top:-80, right:-60, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", width:180, height:180, borderRadius:"50%",
          background:"rgba(255,255,255,.05)", bottom:-60, left:-40, pointerEvents:"none" }}/>

        {onBack && (
          <button onClick={onBack} style={{
            position:"absolute", top:16, left:16, background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", zIndex:10 }}>←</button>
        )}
        <div style={{ fontSize:56, marginBottom:12, position:"relative" }}>🐾</div>
        <div style={{ fontWeight:900, fontSize:28, color:"white",
          lineHeight:1.15, marginBottom:10, position:"relative" }}>
          Diwy investiga<br/>por vos.
        </div>
        <div style={{ fontSize:15, color:"rgba(255,255,255,.85)", lineHeight:1.6,
          maxWidth:320, margin:"0 auto 24px", position:"relative" }}>
          Mientras tu hijo está en clase, Diwy está mirando.<br/>
          <strong style={{ color:"white" }}>Vos te enterás de todo, antes que nadie.</strong>
        </div>

        {/* Beta badge */}
        <div style={{ display:"inline-block", background:"rgba(255,255,255,.15)",
          border:"1.5px solid rgba(255,255,255,.3)", borderRadius:99,
          padding:"4px 14px", fontSize:11, fontWeight:800, color:"white",
          letterSpacing:".08em", marginBottom:8 }}>
          BETA ABIERTA — GRATIS POR TIEMPO LIMITADO
        </div>
      </div>

      {/* ── Value prop strip ── */}
      <div style={{ background: isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)",
        borderBottom:`1px solid ${navBord}`, padding:"14px 24px",
        display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:8,
        transition:"background .3s" }}>
        {["🤖 IA propia", "📈 Sin tecnicismos", "🔒 100% privado", "⚡ En tiempo real"].map(t => (
          <div key={t} style={{ fontSize:11, fontWeight:800, color:sub,
            transition:"color .3s" }}>{t}</div>
        ))}
      </div>

      {/* ── Features ── */}
      <div style={{ padding:"20px 16px 32px" }}>

        <div style={{ fontWeight:900, fontSize:13, color:sub, letterSpacing:".08em",
          marginBottom:14, paddingLeft:4, transition:"color .3s" }}>
          ¿QUÉ HACE DIWY POR VOS?
        </div>

        {FEATURES.map((f, i) => (
          <div key={i} style={{
            background: cardBg,
            border: `1.5px solid ${f.tag ? navBord : primary + "55"}`,
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 10,
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            opacity: f.tag ? 0.75 : 1,
            transition: "background .3s, border .3s",
          }}>
            <div style={{ fontSize:28, flexShrink:0, marginTop:2 }}>{f.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ fontWeight:800, fontSize:14, color:txt,
                  transition:"color .3s" }}>{f.title}</div>
                {f.tag && (
                  <span style={{ background: isDark ? "rgba(255,255,255,.1)" : "#f3f4f6",
                    color:sub, borderRadius:99, fontSize:9, fontWeight:900,
                    padding:"2px 8px", letterSpacing:".06em",
                    transition:"background .3s, color .3s" }}>
                    PRONTO
                  </span>
                )}
                {!f.tag && (
                  <span style={{ background:`${primary}20`, color:primary,
                    borderRadius:99, fontSize:9, fontWeight:900,
                    padding:"2px 8px", letterSpacing:".06em",
                    transition:"background .3s, color .3s" }}>
                    ACTIVO
                  </span>
                )}
              </div>
              <div style={{ fontSize:13, color:sub, lineHeight:1.55,
                transition:"color .3s" }}>{f.desc}</div>
            </div>
          </div>
        ))}

        {/* ── Tagline ── */}
        <div style={{ background: `linear-gradient(135deg, ${primary}18, #7c3aed18)`,
          border: `1.5px solid ${primary}33`,
          borderRadius:16, padding:"18px 20px", margin:"16px 0",
          textAlign:"center", transition:"background .3s" }}>
          <div style={{ fontSize:22, marginBottom:8 }}>🕵️</div>
          <div style={{ fontWeight:900, fontSize:16, color:txt, marginBottom:6,
            transition:"color .3s" }}>
            Un espía personal para cada hijo.
          </div>
          <div style={{ fontSize:13, color:sub, lineHeight:1.6, transition:"color .3s" }}>
            No espera a la reunión de padres.<br/>
            No espera a que tu hijo te cuente.<br/>
            <strong style={{ color:txt }}>Diwy te avisa primero.</strong>
          </div>
        </div>

        {/* ── CTA ── */}
        {done ? (
          <div style={{ textAlign:"center", padding:"28px 0" }}>
            <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
            <div style={{ fontWeight:900, fontSize:18, color:txt, marginBottom:4,
              transition:"color .3s" }}>¡Diwy activado!</div>
            <div style={{ fontSize:13, color:sub, transition:"color .3s" }}>
              Ya podés ver los reportes de tus hijos.
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={activate}
              disabled={loading}
              style={{
                width:"100%",
                background: loading
                  ? navBord
                  : `linear-gradient(135deg, ${primary}, #7c3aed)`,
                border:"none", borderRadius:50, padding:"16px",
                color:"white", fontWeight:900, fontSize:16,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily:"Nunito,sans-serif",
                boxShadow: loading ? "none" : `0 6px 24px ${primary}55`,
                transition:"all .25s",
                marginBottom:10,
              }}>
              {loading ? "Activando..." : "🐾 Activar Diwy — GRATIS"}
            </button>
            <div style={{ textAlign:"center", fontSize:11, color:sub,
              lineHeight:1.6, transition:"color .3s" }}>
              Sin costo. Sin tarjeta. Durante la beta, Diwy es completamente gratuito.<br/>
              <span style={{ opacity:.7 }}>El precio de lanzamiento se anunciará en la V2.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
