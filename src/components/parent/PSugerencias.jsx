import { useState } from "react";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

const SUGGESTIONS = [
  {
    id: "coins-limits",
    icon: "🎯",
    title: "Evitar dar monedas ilimitadamente",
    color: "#f59e0b",
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
    color: "#10b981",
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
    color: "#8b5cf6",
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
    color: "#ef4444",
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
    color: "#00c1fc",
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
    color: "#7c3aed",
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
    color: "#f472b6",
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
  const { txt, sub, cardBg, pageBg, primary } = useTheme();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filtered = selectedCategory
    ? SUGGESTIONS.filter(s => s.category === selectedCategory)
    : SUGGESTIONS;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, transition: "background .3s" }}>
      {/* Header */}
      <div
        style={{
          background: primary,
          color: "white",
          padding: "52px 20px 28px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,.08)",
            top: -50,
            right: -40,
            pointerEvents: "none"
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setTab("home")}
            style={{
              background: "rgba(255,255,255,.2)",
              border: "none",
              borderRadius: 50,
              color: "white",
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>💡 Sugerencias</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Cómo usar EduCoins con tus hijos</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 14px" }}>
        {/* Category Filter */}
        <div style={{ marginBottom: 16, overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, minWidth: "min-content", paddingRight: 14 }}>
            {[null, ...CATEGORIES].map(cat => (
              <button
                key={cat ?? "_all"}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 50,
                  border: `2px solid ${selectedCategory === cat ? primary : "transparent"}`,
                  background: selectedCategory === cat ? `${primary}15` : `${sub}22`,
                  color: selectedCategory === cat ? primary : txt,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Nunito,sans-serif",
                  flexShrink: 0,
                  transition: "all .2s"
                }}
              >
                {cat ?? "Todas"}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions List */}
        {filtered.map(suggestion => (
          <div
            key={suggestion.id}
            style={{
              marginBottom: 12,
              borderRadius: 18,
              background: cardBg,
              overflow: "hidden",
              border: `2px solid ${suggestion.color}40`,
              transition: "all .2s",
              cursor: "pointer"
            }}
            onClick={() =>
              setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
            }
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: `${suggestion.color}12`,
                borderBottom:
                  expandedId === suggestion.id ? `2px solid ${suggestion.color}30` : "none"
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${suggestion.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0
                }}
              >
                {suggestion.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 15,
                    color: txt,
                    transition: "color .3s"
                  }}
                >
                  {suggestion.title}
                </div>
              </div>
              <span
                style={{
                  color: sub,
                  fontSize: 20,
                  transition: "transform .2s",
                  transform: expandedId === suggestion.id ? "rotate(180deg)" : "rotate(0deg)"
                }}
              >
                ∨
              </span>
            </div>

            {/* Content (Expanded) */}
            {expandedId === suggestion.id && (
              <div style={{ padding: "14px 16px", animation: "fadeIn .2s ease" }}>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0
                  }}
                >
                  {suggestion.items.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        marginBottom: idx < suggestion.items.length - 1 ? 10 : 0,
                        paddingLeft: 20,
                        position: "relative",
                        fontSize: 13,
                        color: sub,
                        lineHeight: 1.5,
                        transition: "color .3s"
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: suggestion.color,
                          fontWeight: 900
                        }}
                      >
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* Tips Footer */}
        <WCard style={{ marginTop: 24, background: `${primary}08`, border: `2px solid ${primary}30` }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ fontSize: 28 }}>🎓</div>
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 14,
                  color: txt,
                  marginBottom: 6,
                  transition: "color .3s"
                }}
              >
                Recuerda: EduCoins es una herramienta
              </div>
              <div style={{ fontSize: 12, color: sub, lineHeight: 1.5, transition: "color .3s" }}>
                La app facilita la comunicación con maestros y el seguimiento del progreso de tu
                hijo. El verdadero valor está en el diálogo constante y el apoyo emocional.
              </div>
            </div>
          </div>
        </WCard>
      </div>
    </div>
  );
}
