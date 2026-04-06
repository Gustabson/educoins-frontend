import { useState } from "react";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const SUGGESTIONS = [
  {
    id: "coins-limits",
    icon: "🎯",
    title: "Evitar dar monedas ilimitadamente",
    category: "Estrategia",
    items: [
      "Las monedas ilimitadas eliminan el incentivo para estudiar y comportarse bien",
      "Establecé límites semanales o mensuales según la edad del niño",
      "Usá las monedas como recompensa por logros específicos, no como regalo automático",
      "Ej: '+50 EduCoins por sacar 10 en el examen de Matemáticas'"
    ]
  },
  {
    id: "achievements-focus",
    icon: "🏆",
    title: "Enfocarse en logros académicos y conductuales",
    category: "Enfoque",
    items: [
      "Las EduCoins son más efectivas cuando están vinculadas a resultados concretos",
      "Identificá qué comportamientos o académicos son prioritarios para tu hijo",
      "Usá los veredictos de maestros como referencia para reforzar conductas positivas",
      "Premiá los avances, no los resultados rutinarios de todos los días"
    ]
  },
  {
    id: "exchange-system",
    icon: "💱",
    title: "Aprovechar el exchange P2P",
    category: "Intercambio",
    items: [
      "El intercambio entre alumnos promueve la responsabilidad financiera desde chicos",
      "Incentivá a tu hijo a 'negociar' sus monedas en lugar de usarlas impulsivamente",
      "Esto desarrolla habilidades de toma de decisiones y planificación a futuro",
      "Observá cómo gestiona sus recursos en el exchange como señal de madurez"
    ]
  },
  {
    id: "penalties-follow-up",
    icon: "⚖️",
    title: "Seguimiento de penalizaciones",
    category: "Monitoreo",
    items: [
      "Los veredictos negativos son oportunidades de diálogo, no solo de castigo",
      "Conversá con tu hijo sobre qué pasó y cómo mejorar la próxima vez",
      "Las penalizaciones en EduCoins son naturales y parte del aprendizaje",
      "Usá estos momentos para reforzar valores como responsabilidad y respeto"
    ]
  },
  {
    id: "ranking-motivation",
    icon: "📊",
    title: "Usar el ranking como motivación sana",
    category: "Gamificación",
    items: [
      "El ranking muestra progreso comparativo de forma sana entre compañeros",
      "Incentivá a tu hijo sin presionarlo excesivamente por la posición",
      "Enfatizá el crecimiento personal, no solo la posición en la tabla",
      "Celebrá las mejoras en ranking como logro del esfuerzo sostenido"
    ]
  },
  {
    id: "communication",
    icon: "💬",
    title: "Comunicación constante con maestros",
    category: "Colaboración",
    items: [
      "Los veredictos reflejan la perspectiva de maestros en el día a día",
      "Mantené conversaciones regulares sobre el desempeño escolar fuera de la app",
      "Alineá las recompensas en EduCoins con los objetivos que propone el maestro",
      "Usá la app como herramienta de diálogo familiar, no de control"
    ]
  },
  {
    id: "age-appropriate",
    icon: "👶",
    title: "Adaptar estrategias a la edad",
    category: "Personalización",
    items: [
      "Niños pequeños: recompensas frecuentes por pequeños logros del día",
      "Adolescentes: desafíos mayores con recompensas más valiosas y espaciadas",
      "Involucrá a tu hijo en decidir qué se premia con monedas — eso aumenta el compromiso",
      "Pedí consejo a maestros sobre qué tipo de incentivo funciona mejor en cada edad"
    ]
  }
];

const CATEGORIES = [...new Set(SUGGESTIONS.map(s => s.category))];

export default function PSugerencias({ setTab }) {
  const { primary, txt, sub, cardBg, pageBg, navBord } = useTheme();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filtered = selectedCategory
    ? SUGGESTIONS.filter(s => s.category === selectedCategory)
    : SUGGESTIONS;

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:primary, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden", transition:"background .3s" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.08)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>💡 Sugerencias</div>
            <div style={{ fontSize:13, opacity:.85 }}>Cómo usar EduCoins con tus hijos</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 14px" }}>
        {/* Filtro de categorías */}
        <div style={{ marginBottom:16, overflowX:"auto", paddingBottom:8 }}>
          <div style={{ display:"flex", gap:8, minWidth:"min-content" }}>
            {[null, ...CATEGORIES].map(cat => (
              <button key={cat ?? "_all"} onClick={() => setSelectedCategory(cat)}
                style={{ padding:"8px 14px", borderRadius:50, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif", fontWeight:800, fontSize:12, flexShrink:0,
                  border: selectedCategory === cat ? `2px solid ${primary}` : `2px solid ${navBord}`,
                  background: selectedCategory === cat ? `${primary}18` : "transparent",
                  color: selectedCategory === cat ? primary : sub,
                  transition:"background .3s, color .3s, border-color .3s" }}>
                {cat ?? "Todas"}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {filtered.map(s => (
          <div key={s.id}
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            style={{ marginBottom:10, borderRadius:20, background:cardBg,
              overflow:"hidden", border:`1.5px solid ${navBord}`, cursor:"pointer",
              transition:"background .3s, border-color .3s" }}>
            <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:`${primary}18`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, flexShrink:0 }}>
                {s.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:14, color:txt,
                  transition:"color .3s" }}>{s.title}</div>
                <div style={{ fontSize:11, color:sub, marginTop:2,
                  transition:"color .3s" }}>{s.category}</div>
              </div>
              <span style={{ color:sub, fontSize:18, transition:"color .3s, transform .2s",
                transform: expandedId === s.id ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
            </div>

            {expandedId === s.id && (
              <div style={{ padding:"0 16px 16px", animation:"fadeIn .15s ease" }}>
                <div style={{ height:1, background:navBord, marginBottom:12,
                  transition:"background .3s" }}/>
                {s.items.map((item, idx) => (
                  <div key={idx} style={{ display:"flex", gap:10, marginBottom: idx < s.items.length-1 ? 8 : 0 }}>
                    <span style={{ color:primary, fontWeight:900, flexShrink:0,
                      transition:"color .3s" }}>•</span>
                    <span style={{ fontSize:13, color:sub, lineHeight:1.5,
                      transition:"color .3s" }}>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <WCard style={{ marginTop:20 }}>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ fontSize:28 }}>🎓</div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:txt, marginBottom:4,
                transition:"color .3s" }}>EduCoins es una herramienta</div>
              <div style={{ fontSize:12, color:sub, lineHeight:1.5, transition:"color .3s" }}>
                El verdadero valor está en el diálogo constante y el apoyo emocional.
                La app facilita la comunicación con maestros y el seguimiento del progreso.
              </div>
            </div>
          </div>
        </WCard>
      </div>
    </div>
  );
}
