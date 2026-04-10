import { useState, useEffect } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { OHdrA, WCard } from "../shared/index";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SLOTS = [
  { key: "manana", label: "Mañana", emoji: "🌅" },
  { key: "tarde",  label: "Tarde",  emoji: "☀️"  },
  { key: "noche",  label: "Noche",  emoji: "🌙"  },
  { key: "extra",  label: "Extra",  emoji: "⭐"  },
];
const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#64748b",
];

function todayDow() {
  // JS getDay(): 0=Sun,1=Mon,...,6=Sat → convert to Mon=0…Sun=6
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function AHorarios({ me, showToast, onBack }) {
  const { primary, isDark, txt, sub, cardBg, pageBg, navBord, inputBg } = useTheme();

  const [schedule, setSchedule] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => todayDow());
  const [editSlot, setEditSlot] = useState(null); // {day_of_week, slot}
  const [form,     setForm]     = useState({ subject: "", time_from: "", time_to: "", color: PRESET_COLORS[0] });
  const [saving,   setSaving]   = useState(false);

  // ── Data ────────────────────────────────────────────────────
  useEffect(() => {
    api.getSchedule()
      .then(d => setSchedule(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getEntry(day, slot) {
    return schedule.find(e => e.day_of_week === day && e.slot === slot) || null;
  }

  function openEdit(day, slot) {
    const entry = getEntry(day, slot);
    setForm({
      subject:   entry?.subject   || "",
      time_from: entry?.time_from || "",
      time_to:   entry?.time_to   || "",
      color:     entry?.color     || PRESET_COLORS[0],
    });
    setEditSlot({ day_of_week: day, slot });
  }

  function closeEdit() {
    setEditSlot(null);
  }

  async function handleSave() {
    if (!editSlot) return;
    setSaving(true);
    try {
      const payload = {
        day_of_week: editSlot.day_of_week,
        slot:        editSlot.slot,
        subject:     form.subject.trim(),
        time_from:   form.time_from.trim(),
        time_to:     form.time_to.trim(),
        color:       form.color,
      };
      const saved = await api.putSchedule(payload);
      setSchedule(prev => {
        const filtered = prev.filter(
          e => !(e.day_of_week === editSlot.day_of_week && e.slot === editSlot.slot)
        );
        return [...filtered, saved];
      });
      showToast && showToast("Horario guardado", "ok");
      closeEdit();
    } catch (e) {
      showToast && showToast(e?.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editSlot) return;
    const entry = getEntry(editSlot.day_of_week, editSlot.slot);
    if (!entry) { closeEdit(); return; }
    setSaving(true);
    try {
      await api.deleteSchedule(entry.id);
      setSchedule(prev => prev.filter(e => e.id !== entry.id));
      showToast && showToast("Horario eliminado", "ok");
      closeEdit();
    } catch (e) {
      showToast && showToast(e?.message || "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────
  const editingEntry = editSlot
    ? getEntry(editSlot.day_of_week, editSlot.slot)
    : null;
  const editingSlotCfg = editSlot
    ? SLOTS.find(s => s.key === editSlot.slot)
    : null;

  // ── Input style helper ───────────────────────────────────────
  const inputStyle = {
    background:   inputBg || (isDark ? "#1e1e2e" : "#f4f4f8"),
    border:       `1.5px solid ${navBord}`,
    borderRadius: 14,
    color:        txt,
    padding:      "11px 14px",
    fontSize:     14,
    outline:      "none",
    width:        "100%",
    fontWeight:   600,
    fontFamily:   "Nunito,sans-serif",
    boxSizing:    "border-box",
    transition:   "background .3s, color .3s, border .3s",
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:   "100vh",
      background:  pageBg,
      fontFamily:  "Nunito,sans-serif",
      transition:  "background .3s",
      paddingBottom: editSlot ? 340 : 32,
    }}>
      {/* ── Header ── */}
      <OHdrA
        title="📅 Horarios"
        extra={
          <div style={{ fontSize: 12, opacity: .8, marginTop: 2, transition: "color .3s" }}>
            Tu calendario semanal
          </div>
        }
        onBack={onBack}
      />

      {/* ── Day selector (sticky below header) ── */}
      <div style={{
        position:        "sticky",
        top:             80,        // below OHdrA (~80px tall)
        zIndex:          40,
        background:      primary,
        transition:      "background .3s",
        overflowX:       "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth:  "none",
        display:         "flex",
        gap:             8,
        padding:         "8px 14px 12px",
      }}>
        {DAYS.map((d, i) => {
          const active = i === selectedDay;
          return (
            <button
              key={i}
              onClick={() => { setSelectedDay(i); closeEdit(); }}
              style={{
                flexShrink:   0,
                background:   active ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.18)",
                border:       "none",
                borderRadius: 99,
                color:        active ? primary : "rgba(255,255,255,.85)",
                fontWeight:   900,
                fontSize:     13,
                padding:      "6px 15px",
                cursor:       "pointer",
                fontFamily:   "Nunito,sans-serif",
                transition:   "background .3s, color .3s",
                opacity:      active ? 1 : .75,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "14px 14px 0" }}>
        {loading && (
          <div style={{ textAlign: "center", color: sub, padding: 40, fontSize: 14,
            transition: "color .3s" }}>
            Cargando...
          </div>
        )}

        {!loading && SLOTS.map(slot => {
          const entry  = getEntry(selectedDay, slot.key);
          const isOpen = editSlot?.slot === slot.key && editSlot?.day_of_week === selectedDay;

          return (
            <div key={slot.key} style={{ marginBottom: 10 }}>
              <WCard
                onClick={() => openEdit(selectedDay, slot.key)}
                style={{
                  cursor:      "pointer",
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  padding:     "13px 16px",
                  borderLeft:  entry ? `3px solid ${entry.color}` : `3px solid transparent`,
                  border:      isOpen
                    ? `2px solid ${primary}`
                    : entry
                      ? `1.5px solid ${navBord}`
                      : `1.5px solid ${navBord}`,
                  borderLeft:  entry ? `3px solid ${entry.color}` : `3px solid transparent`,
                  boxShadow:   isOpen ? `0 4px 16px ${primary}33` : "none",
                  transition:  "background .3s, border .3s, box-shadow .3s",
                }}
              >
                {/* Left icon */}
                <div style={{
                  width:           40,
                  height:          40,
                  borderRadius:    12,
                  background:      entry
                    ? entry.color + "22"
                    : isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.05)",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  fontSize:        entry ? 17 : 18,
                  fontWeight:      900,
                  color:           entry ? entry.color : sub,
                  flexShrink:      0,
                  transition:      "background .3s, color .3s",
                }}>
                  {entry
                    ? entry.subject.trim().charAt(0).toUpperCase() || slot.emoji
                    : slot.emoji}
                </div>

                {/* Center */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight:  entry ? 800 : 700,
                    fontSize:    13,
                    color:       entry ? txt : sub,
                    letterSpacing: "-.2px",
                    transition:  "color .3s",
                    whiteSpace:  "nowrap",
                    overflow:    "hidden",
                    textOverflow:"ellipsis",
                  }}>
                    {entry ? entry.subject : slot.label.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize:   12,
                    color:      sub,
                    marginTop:  2,
                    fontWeight: 600,
                    transition: "color .3s",
                  }}>
                    {entry
                      ? (entry.time_from && entry.time_to)
                        ? `${entry.time_from} — ${entry.time_to}`
                        : slot.label
                      : "Toca para agregar"}
                  </div>
                </div>

                {/* Right action */}
                <div style={{
                  width:           32,
                  height:          32,
                  borderRadius:    99,
                  background:      entry
                    ? isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)"
                    : primary + "18",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  fontSize:        15,
                  color:           entry ? sub : primary,
                  flexShrink:      0,
                  transition:      "background .3s, color .3s",
                }}>
                  {entry ? "✏️" : "+"}
                </div>
              </WCard>
            </div>
          );
        })}
      </div>

      {/* ── Edit panel overlay ── */}
      {editSlot && (
        <>
          {/* Dark overlay */}
          <div
            onClick={closeEdit}
            style={{
              position:   "fixed",
              inset:      0,
              background: "rgba(0,0,0,.45)",
              zIndex:     190,
              transition: "background .3s",
            }}
          />

          {/* Bottom drawer */}
          <div style={{
            position:     "fixed",
            bottom:       0,
            left:         0,
            right:        0,
            maxWidth:     480,
            margin:       "0 auto",
            zIndex:       200,
            background:   cardBg,
            borderRadius: "24px 24px 0 0",
            padding:      "0 20px 44px",
            boxShadow:    "0 -8px 40px rgba(0,0,0,.22)",
            transition:   "background .3s",
            maxHeight:    "90vh",
            overflowY:    "auto",
          }}>
            {/* Handle */}
            <div style={{
              width:        36,
              height:       4,
              background:   navBord,
              borderRadius: 2,
              margin:       "12px auto 0",
            }} />

            {/* Title row */}
            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              padding:        "14px 0 12px",
            }}>
              <div style={{
                fontWeight:  900,
                fontSize:    17,
                color:       txt,
                transition:  "color .3s",
              }}>
                {editingSlotCfg?.emoji} Editando: {editingSlotCfg?.label}
              </div>
              <button
                onClick={closeEdit}
                style={{
                  background:      isDark ? "rgba(255,255,255,.1)" : "#f0f0f0",
                  border:          "none",
                  borderRadius:    50,
                  color:           sub,
                  width:           30,
                  height:          30,
                  cursor:          "pointer",
                  fontSize:        18,
                  fontWeight:      700,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  transition:      "background .3s, color .3s",
                }}
              >
                ×
              </button>
            </div>

            {/* Subject input */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 6,
                transition: "color .3s" }}>
                Materia o actividad
              </div>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Materia o actividad..."
                style={inputStyle}
              />
            </div>

            {/* Time inputs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 6,
                  transition: "color .3s" }}>
                  Desde
                </div>
                <input
                  type="time"
                  value={form.time_from}
                  onChange={e => setForm(f => ({ ...f, time_from: e.target.value }))}
                  placeholder="08:00"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 6,
                  transition: "color .3s" }}>
                  Hasta
                </div>
                <input
                  type="time"
                  value={form.time_to}
                  onChange={e => setForm(f => ({ ...f, time_to: e.target.value }))}
                  placeholder="09:30"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sub, marginBottom: 8,
                transition: "color .3s" }}>
                Color
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width:       32,
                      height:      32,
                      borderRadius:"50%",
                      background:  c,
                      border:      form.color === c
                        ? `3px solid ${txt}`
                        : "3px solid transparent",
                      cursor:      "pointer",
                      padding:     0,
                      flexShrink:  0,
                      boxShadow:   form.color === c ? `0 0 0 2px ${c}55` : "none",
                      transition:  "border .2s, box-shadow .2s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background:   saving ? navBord : primary,
                border:       "none",
                borderRadius: 14,
                color:        "white",
                padding:      "14px 0",
                fontWeight:   900,
                fontSize:     15,
                cursor:       saving ? "not-allowed" : "pointer",
                width:        "100%",
                fontFamily:   "Nunito,sans-serif",
                boxShadow:    saving ? "none" : `0 4px 16px ${primary}44`,
                marginBottom: 10,
                transition:   "background .3s",
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {/* Delete button (only if entry exists) */}
            {editingEntry && (
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  background:   "transparent",
                  border:       `1.5px solid #ef444455`,
                  borderRadius: 14,
                  color:        "#ef4444",
                  padding:      "12px 0",
                  fontWeight:   800,
                  fontSize:     14,
                  cursor:       saving ? "not-allowed" : "pointer",
                  width:        "100%",
                  fontFamily:   "Nunito,sans-serif",
                  transition:   "background .3s, border .3s",
                }}
              >
                Eliminar horario
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AHorarios;
