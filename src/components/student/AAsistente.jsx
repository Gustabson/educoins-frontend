import { useState, useRef, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA } from "../shared/index";

const SUGERENCIAS = [
  "¿Cuántas llegadas tarde puedo tener?",
  "¿Qué pasa si uso el celular en clase?",
  "¿Cómo gano EduCoins?",
  "¿Cuál es la misión de la escuela?",
  "¿Qué sanciones hay por mal comportamiento?",
];

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center", padding:"10px 14px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:"50%", background:"#aaa",
          animation:`typingBounce 1.2s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
      <style>{`
        @keyframes typingBounce {
          0%,80%,100% { transform:translateY(0); opacity:.4; }
          40% { transform:translateY(-6px); opacity:1; }
        }
      `}</style>
    </div>
  );
}

function AAsistente({ me, onBack }) {
  const { primary, isDark:dark, txt, sub, cardBg, pageBg, inputBg, inputBd } = useTheme();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "¡Hola! 👋 Soy el Asistente de la escuela. Puedo responder tus preguntas sobre las reglas, sanciones y cómo funciona todo.\n\n¿En qué te puedo ayudar?",
      escalado: false,
    }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const pregunta = (text || input).trim();
    if (!pregunta || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role:"user", text:pregunta }]);
    setLoading(true);
    try {
      const data = await api.aiQuery(pregunta);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.respuesta,
        escalado: data.escalado,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Ocurrió un error al consultar. Intentá de nuevo. 🔄",
        escalado: false,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh",
      background:pageBg, transition:"background .3s" }}>

      <OHdrA
        title="🤖 Asistente"
        sub="Preguntas sobre reglas e institución"
        onBack={onBack}
        color={primary}
      />

      {/* Mensajes */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px 8px" }}>

        {/* Sugerencias — solo si hay 1 mensaje (bienvenida) */}
        {messages.length === 1 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:sub, fontWeight:700,
              marginBottom:8, textAlign:"center", transition:"color .3s" }}>
              Preguntas frecuentes
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: dark?"rgba(255,255,255,.08)":primary+"15",
                  border:`1px solid ${primary}44`,
                  borderRadius:20, padding:"6px 12px",
                  fontSize:11, fontWeight:700, color:primary,
                  cursor:"pointer", fontFamily:"Nunito,sans-serif",
                  transition:"background .2s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display:"flex",
            justifyContent: m.role==="user" ? "flex-end" : "flex-start",
            marginBottom:10,
          }}>
            {m.role === "assistant" && (
              <div style={{ width:28, height:28, borderRadius:"50%",
                background:primary+"22", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:14, flexShrink:0,
                marginRight:8, marginTop:2 }}>
                🤖
              </div>
            )}
            <div style={{ maxWidth:"78%" }}>
              <div style={{
                background: m.role==="user"
                  ? primary
                  : m.escalado
                    ? (dark?"#7f1d1d":"#fee2e2")
                    : cardBg,
                color: m.role==="user"
                  ? "white"
                  : m.escalado ? "#dc2626" : txt,
                borderRadius: m.role==="user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
                padding:"10px 14px",
                fontSize:13, lineHeight:1.55,
                fontWeight: m.role==="user" ? 700 : 600,
                boxShadow: dark
                  ? "0 1px 8px rgba(0,0,0,.3)"
                  : "0 1px 6px rgba(0,0,0,.08)",
                whiteSpace:"pre-wrap",
                border: m.escalado ? "1.5px solid #ef4444" : "none",
                transition:"background .3s, color .3s",
              }}>
                {m.text}
              </div>

              {/* Botón hablar con admin — si es escalado o dice "administración" */}
              {m.role==="assistant" && (m.escalado || m.text.includes("administración")) && (
                <div style={{ marginTop:6, display:"flex", gap:6 }}>
                  <div style={{ fontSize:10, color:sub, fontStyle:"italic",
                    display:"flex", alignItems:"center", gap:4, transition:"color .3s" }}>
                    📋 Podés ir a <strong>Reportes</strong> para contactar a la administración
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Indicador de escritura */}
        {loading && (
          <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:10 }}>
            <div style={{ width:28, height:28, borderRadius:"50%",
              background:primary+"22", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:14, flexShrink:0,
              marginRight:8, marginTop:2 }}>🤖</div>
            <div style={{ background:cardBg, borderRadius:"18px 18px 18px 4px",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.3)":"0 1px 6px rgba(0,0,0,.08)",
              transition:"background .3s" }}>
              <TypingDots/>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:"10px 14px 28px", background:pageBg,
        borderTop:`1px solid ${dark?"#333":"#eee"}`,
        transition:"background .3s, border .3s" }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribí tu pregunta..."
            rows={1}
            disabled={loading}
            style={{
              flex:1, border:`1.5px solid ${inputBd||"#e5e7eb"}`,
              borderRadius:18, padding:"10px 14px",
              fontSize:13, fontFamily:"Nunito,sans-serif",
              resize:"none", outline:"none",
              background:inputBg||"white", color:txt,
              maxHeight:100, lineHeight:1.4,
              transition:"background .3s, color .3s, border .3s",
            }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{
              width:42, height:42, borderRadius:"50%",
              background: (!input.trim()||loading) ? "#ccc" : primary,
              border:"none", cursor: loading||!input.trim() ? "not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, flexShrink:0, transition:"background .2s",
            }}>
            ➤
          </button>
        </div>
        <div style={{ fontSize:10, color:sub, textAlign:"center", marginTop:6,
          transition:"color .3s" }}>
          Las respuestas se basan en los documentos oficiales de la escuela
        </div>
      </div>
    </div>
  );
}

export default AAsistente;
