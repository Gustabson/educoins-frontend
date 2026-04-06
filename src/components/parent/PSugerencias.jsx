import { useState } from "react";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";
import { PARENT_SUGGESTIONS, SUGGESTIONS_BY_CATEGORY } from "./data";

export default function PSugerencias({ setTab }) {
  const { txt, sub, cardBg, pageBg, primary } = useTheme();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter suggestions by category
  const filtered = selectedCategory
    ? PARENT_SUGGESTIONS.filter(s => s.category === selectedCategory)
    : PARENT_SUGGESTIONS;

  const categories = Object.keys(SUGGESTIONS_BY_CATEGORY).map(key => ({
    id: key,
    label: SUGGESTIONS_BY_CATEGORY[key]
  }));

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
          <div
            style={{
              display: "flex",
              gap: 8,
              minWidth: "min-content",
              paddingRight: 14
            }}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: "8px 14px",
                borderRadius: 50,
                border: `2px solid ${selectedCategory === null ? primary : "transparent"}`,
                background: selectedCategory === null ? `${primary}15` : `${sub}22`,
                color: selectedCategory === null ? primary : txt,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Nunito,sans-serif",
                flexShrink: 0,
                transition: "all .2s"
              }}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 50,
                  border: `2px solid ${selectedCategory === cat.id ? primary : "transparent"}`,
                  background: selectedCategory === cat.id ? `${primary}15` : `${sub}22`,
                  color: selectedCategory === cat.id ? primary : txt,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Nunito,sans-serif",
                  flexShrink: 0,
                  transition: "all .2s"
                }}
              >
                {cat.label}
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
                  {suggestion.suggestions.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        marginBottom: idx < suggestion.suggestions.length - 1 ? 10 : 0,
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
