/**
 * Parent Role — Constants & Static Data
 * Centralized data for verdict types and educational suggestions
 * No duplication, scalable structure
 */

// ─────────────────────────────────────────────────────────────
// VERDICT SEVERITY CONFIGURATION
// ─────────────────────────────────────────────────────────────
export const VERDICT_SEVERITY = {
  advertencia: {
    label: "Advertencia",
    color: "#f59e0b",
    icon: "⚠️",
    description: "Comportamiento que requiere corrección"
  },
  sancion: {
    label: "Sanción",
    color: "#ef4444",
    icon: "🚔",
    description: "Comportamiento que viola las normas"
  },
  grave: {
    label: "Caso Grave",
    color: "#7f1d1d",
    icon: "⛔",
    description: "Conducta grave que requiere intervención"
  }
};

// ─────────────────────────────────────────────────────────────
// PARENT EDUCATIONAL SUGGESTIONS
// ─────────────────────────────────────────────────────────────
// These suggestions are shown to parents to guide them on how
// to use EduCoins effectively for their children's motivation
export const PARENT_SUGGESTIONS = [
  {
    id: "coins-limits",
    icon: "🎯",
    title: "Evitar dar monedas ilimitadamente",
    color: "#f59e0b",
    category: "estrategia",
    suggestions: [
      "Las monedas ilimitadas eliminan el incentivo para estudiar y comportarse bien",
      "Establece límites semanales o mensuales según la edad del niño",
      "Usa las monedas como recompensa por logros específicos, no como regalo automático",
      "Ej: '+50 EduCoins por sacar 10 en el examen de Matemáticas'"
    ]
  },
  {
    id: "achievements-focus",
    icon: "🏆",
    title: "Enfocarse en logros académicos y conductuales",
    color: "#10b981",
    category: "enfoque",
    suggestions: [
      "Las EduCoins son mejores cuando están vinculadas a resultados concretos",
      "Identifica qué comportamientos o académicos son prioritarios para tu hijo",
      "Usa los veredictos de maestros como referencia para reforzar conductas positivas",
      "Celebra con monedas los avances, no los mantiene rutinarios"
    ]
  },
  {
    id: "exchange-system",
    icon: "🛍️",
    title: "Aprovechar el exchange P2P",
    color: "#8b5cf6",
    category: "intercambio",
    suggestions: [
      "El intercambio entre alumnos promueve la responsabilidad financiera",
      "Incentiva a tu hijo a 'negociar' sus monedas en lugar de usarlas impulsivamente",
      "Esto desarrolla habilidades de toma de decisiones y planificación",
      "Observa cómo tu hijo gestiona sus recursos en el exchange"
    ]
  },
  {
    id: "penalties-follow-up",
    icon: "⚖️",
    title: "Seguimiento de penalizaciones",
    color: "#ef4444",
    category: "monitoreo",
    suggestions: [
      "Los veredictos negativos son oportunidades de diálogo, no castigos",
      "Conversa con tu hijo sobre qué pasó y cómo mejorar",
      "Las penalizaciones en EduCoins son naturales y educativas",
      "Usa estos momentos para reforzar valores y responsabilidad"
    ]
  },
  {
    id: "ranking-motivation",
    icon: "📊",
    title: "Usar el ranking como motivación sana",
    color: "#00c1fc",
    category: "gamificacion",
    suggestions: [
      "El ranking muestra progreso comparativo de forma sana",
      "Incentiva a tu hijo sin presionar excesivamente",
      "Enfatiza el crecimiento personal, no solo la posición",
      "Celebra mejoras en ranking como logro del esfuerzo"
    ]
  },
  {
    id: "communication",
    icon: "💬",
    title: "Comunicación constante con maestros",
    color: "#7c3aed",
    category: "colaboracion",
    suggestions: [
      "Los veredictos reflejan la perspectiva de maestros en clase",
      "Mantén conversaciones regulares sobre el desempeño escolar",
      "Alinea las recompensas en EduCoins con los objetivos escolares",
      "Usa la app como herramienta de diálogo, no de control"
    ]
  },
  {
    id: "age-appropriate",
    icon: "👶",
    title: "Adaptar estrategias a la edad del hijo",
    color: "#f472b6",
    category: "personalizacion",
    suggestions: [
      "Niños pequeños: recompensas frecuentes por pequeños logros",
      "Adolescentes: desafíos mayores con recompensas más valiosas",
      "Involucra a tu hijo en decidir qué se premia con monedas",
      "Solicita consejo a maestros sobre qué incentiva a cada edad"
    ]
  }
];

// ─────────────────────────────────────────────────────────────
// SUGGESTIONS GROUPED BY CATEGORY
// ─────────────────────────────────────────────────────────────
export const SUGGESTIONS_BY_CATEGORY = {
  estrategia: "💡 Estrategia",
  enfoque: "🎯 Enfoque",
  intercambio: "💱 Intercambio",
  monitoreo: "👁️ Monitoreo",
  gamificacion: "🎮 Gamificación",
  colaboracion: "🤝 Colaboración",
  personalizacion: "⚙️ Personalización"
};
