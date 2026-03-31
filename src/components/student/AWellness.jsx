import { useState } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";

const MOODS = [
  { v:1, emoji:"😞", label:"Muy mal",   color:"#ef4444" },
  { v:2, emoji:"😟", label:"Mal",       color:"#f97316" },
  { v:3, emoji:"😐", label:"Regular",   color:"#eab308" },
  { v:4, emoji:"😊", label:"Bien",      color:"#22c55e" },
  { v:5, emoji:"😄", label:"Muy bien",  color:"#06b6d4" },
];

const CATS = [
  { id:"presion",   emoji:"😰", label:"Me siento presionado/a" },
  { id:"tristeza",  emoji:"😢", label:"Estoy triste" },
  { id:"enojo",     emoji:"😡", label:"Algo me molestó" },
  { id:"miedo",     emoji:"😨", label:"Tengo miedo" },
  { id:"cansancio", emoji:"😴", label:"Estoy agotado/a" },
  { id:"soledad",   emoji:"🫂", label:"Me siento solo/a" },
];

const REPORT_TIPOS = [
  { id:"bullying",            label:"🚫 Bullying" },
  { id:"violencia_domestica", label:"🏠 Problema en casa" },
  { id:"maltrato_docente",    label:"👨‍🏫 Maltrato de adulto" },
  { id:"acoso",               label:"😰 Acoso o amenazas" },
  { id:"otro",                label:"💬 Otro" },
];

const AFIRMACIONES = {
  1: "Es valiente reconocer cuando no estamos bien. Recordá que podés hablar con alguien de confianza. 💙",
  2: "Los días difíciles también pasan. Estamos acá para escucharte.",
  3: "¿Sabés qué? Los días tranquilos también cuentan. Seguís adelante. 👍",
  4: "¡Qué bueno que estás bien! Ese estado de ánimo se nota en todo lo que hacés. 🌟",
  5: "¡Genial! Ese buen ánimo es contagioso. ¡Seguí así! 🚀",
};

function AWellness({ onClose, showToast, refreshBalance, onCheckinDone }) {
  const { primary: accent, isDark: dark, txt, sub, cardBg, pageBg: bg, inputBg, inputBd } = useTheme();

  const [mood,          setMood]         = useState(null);
  const [cats,          setCats]         = useState([]);
  const [nota,          setNota]         = useState("");
  const [saving,        setSaving]       = useState(false);
  const [done,          setDone]         = useState(false);
  const [coinsEarned,   setCoinsEarned]  = useState(0);

  // Reporte formal
  const [reportOpen,    setReportOpen]   = useState(false);
  const [rTipo,         setRTipo]        = useState(null);
  const [rDesc,         setRDesc]        = useState("");
  const [rAnon,         setRAnon]        = useState(true);
  const [savingReport,  setSavingReport] = useState(false);
  const [reportDone,    setReportDone]   = useState(false);

  const toggleCat = (id) =>
    setCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const submit = async () => {
    setSaving(true);
    try {
      const d = await api.wellnessCheckin({
        mood:       mood || 3,
        categories: cats,
        nota:       nota.trim() || undefined,
      });
      const coins = d.data?.coins_earned ?? 3;
      setCoinsEarned(coins);
      setDone(true);
      if (refreshBalance) refreshBalance();
      // Actualizar carita en header sin cerrar el modal todavía
      if (onCheckinDone) onCheckinDone(mood || 3, false);
    } catch (e) {
      if (e.message?.includes('ALREADY_DONE')) {
        showToast("Ya registraste tu estado hoy", "error");
        onClose();
      } else {
        showToast(e.message || "Error al guardar", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    if (!rTipo) { showToast("Elegí el tipo de situación", "error"); return; }
    if (rDesc.trim().length < 10) { showToast("Describí brevemente qué pasó", "error"); return; }
    setSavingReport(true);
    try {
      await api.wellnessReport({ tipo: rTipo, descripcion: rDesc.trim(), is_anonymous: rAnon });
      setReportDone(true);
      showToast("Reporte enviado. El equipo lo revisará 🔒");
    } catch (e) {
      showToast(e.message || "Error al enviar", "error");
    } finally {
      setSavingReport(false);
    }
  };

  const selectedMood = MOODS.find(m => m.v === mood);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,.55)", display:"flex",
      alignItems:"flex-end", justifyContent:"center",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width:"100%", maxWidth:480,
        background: bg,
        borderRadius:"24px 24px 0 0",
        maxHeight:"92vh", overflowY:"auto",
        animation:"slideUp .25s ease",
        fontFamily:"Nunito,sans-serif",
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:dark?"#555":"#ddd",borderRadius:2,margin:"12px auto 0"}}/>

        {/* ── Pantalla de éxito ──────────────────────────────── */}
        {done ? (
          <div style={{padding:"32px 24px 48px", textAlign:"center"}}>
            <div style={{fontSize:72, marginBottom:12, lineHeight:1}}>
              {selectedMood?.emoji || "😐"}
            </div>
            <div style={{
              fontSize:28, fontWeight:900, color: selectedMood?.color || accent,
              marginBottom:4,
            }}>
              +{coinsEarned} 🪙
            </div>
            <div style={{fontSize:14, fontWeight:700, color: txt, marginBottom:8}}>
              ¡Gracias por compartir cómo te sentís!
            </div>
            <div style={{
              fontSize:13, color: sub, lineHeight:1.6,
              background: dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)",
              borderRadius:14, padding:"12px 16px", marginBottom:24,
            }}>
              {AFIRMACIONES[mood || 3]}
            </div>
            <button onClick={onClose} style={{
              background: accent, border:"none", borderRadius:50,
              color:"white", padding:"13px 32px",
              fontWeight:800, fontSize:14, cursor:"pointer",
              fontFamily:"Nunito,sans-serif",
            }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div style={{padding:"20px 20px 40px"}}>

            {/* Header */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
              <div style={{fontWeight:900, fontSize:17, color: txt}}>
                ¿Cómo te sentís hoy?
              </div>
              <button onClick={onClose} style={{
                background:"none", border:"none", fontSize:20,
                color: sub, cursor:"pointer", padding:4,
              }}>✕</button>
            </div>

            {/* ── Selector de estado ──────────────────────────── */}
            <div style={{display:"flex", justifyContent:"space-between", gap:6, marginBottom:20}}>
              {MOODS.map(m => (
                <button key={m.v} onClick={() => setMood(m.v === mood ? null : m.v)}
                  style={{
                    flex:1, padding:"10px 0", border:"none", cursor:"pointer",
                    borderRadius:14, fontFamily:"Nunito,sans-serif",
                    background: mood === m.v
                      ? `${m.color}22`
                      : dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.05)",
                    outline: mood === m.v ? `2px solid ${m.color}` : "2px solid transparent",
                    transition:"all .15s",
                  }}>
                  <div style={{fontSize:28}}>{m.emoji}</div>
                  <div style={{fontSize:9, fontWeight:700, color: mood === m.v ? m.color : sub, marginTop:2}}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>

            {/* ── Categorías (si mood 1-3) ──────────────────────── */}
            {mood !== null && mood <= 3 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12, fontWeight:700, color: sub, marginBottom:8}}>
                  ¿Qué está pasando? (opcional)
                </div>
                <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                  {CATS.map(c => (
                    <button key={c.id} onClick={() => toggleCat(c.id)}
                      style={{
                        border:"none", cursor:"pointer", borderRadius:50,
                        padding:"6px 12px", fontSize:12, fontWeight:700,
                        fontFamily:"Nunito,sans-serif",
                        background: cats.includes(c.id)
                          ? `${accent}22`
                          : dark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.06)",
                        color: cats.includes(c.id) ? accent : sub,
                        outline: cats.includes(c.id) ? `1.5px solid ${accent}` : "1.5px solid transparent",
                        transition:"all .12s",
                      }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Texto libre ──────────────────────────────────── */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12, fontWeight:700, color: sub, marginBottom:6}}>
                ¿Querés contarnos algo? (opcional)
              </div>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                maxLength={500}
                placeholder="Escribí lo que quieras, nadie más lo verá..."
                rows={3}
                style={{
                  width:"100%", boxSizing:"border-box",
                  background: inputBg, border:`1.5px solid ${inputBd}`,
                  borderRadius:14, padding:"10px 14px",
                  fontSize:13, color: txt, fontFamily:"Nunito,sans-serif",
                  resize:"none", outline:"none", lineHeight:1.5,
                }}
              />
              {nota.length > 400 && (
                <div style={{fontSize:10, color: sub, textAlign:"right"}}>
                  {nota.length}/500
                </div>
              )}
            </div>

            {/* ── Botón principal ──────────────────────────────── */}
            <button onClick={submit} disabled={saving} style={{
              width:"100%", background: accent, border:"none", borderRadius:50,
              color:"white", padding:"14px", fontWeight:800, fontSize:15,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
              fontFamily:"Nunito,sans-serif", marginBottom:20,
            }}>
              {saving ? "Enviando..." : `Enviar y ganar +${3} 🪙`}
            </button>

            {/* ── Separador reporte formal ─────────────────────── */}
            <div style={{
              borderTop:`1px solid ${dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.08)"}`,
              paddingTop:16,
            }}>
              {!reportOpen && !reportDone && (
                <button onClick={() => setReportOpen(true)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  color: sub, fontSize:12, fontWeight:700,
                  fontFamily:"Nunito,sans-serif", padding:0,
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <span style={{fontSize:16}}>🚨</span>
                  ¿Algo serio que reportar? Podés hacerlo de forma anónima →
                </button>
              )}

              {reportDone && (
                <div style={{
                  background: dark?"rgba(16,185,129,.15)":"rgba(16,185,129,.1)",
                  border:"1.5px solid #10b981", borderRadius:12,
                  padding:"10px 14px", fontSize:12, fontWeight:700, color:"#10b981",
                  display:"flex", gap:8, alignItems:"center",
                }}>
                  <span style={{fontSize:18}}>✅</span>
                  Reporte enviado de forma segura. El equipo lo revisará pronto.
                </div>
              )}

              {/* ── Formulario de reporte ────────────────────────── */}
              {reportOpen && !reportDone && (
                <div style={{animation:"fadeIn .2s ease"}}>
                  <div style={{fontWeight:800, fontSize:13, color: txt, marginBottom:10}}>
                    🔒 Reporte confidencial
                  </div>

                  {/* Tipo */}
                  <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:12}}>
                    {REPORT_TIPOS.map(t => (
                      <button key={t.id} onClick={() => setRTipo(t.id)}
                        style={{
                          border:"none", cursor:"pointer", borderRadius:50,
                          padding:"6px 12px", fontSize:11, fontWeight:700,
                          fontFamily:"Nunito,sans-serif",
                          background: rTipo === t.id
                            ? `${accent}22`
                            : dark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.06)",
                          color: rTipo === t.id ? accent : sub,
                          outline: rTipo === t.id ? `1.5px solid ${accent}` : "1.5px solid transparent",
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Descripción */}
                  <textarea
                    value={rDesc}
                    onChange={e => setRDesc(e.target.value)}
                    maxLength={1000}
                    placeholder="Contanos qué pasó, sin importar si son detalles pequeños..."
                    rows={4}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background: inputBg, border:`1.5px solid ${inputBd}`,
                      borderRadius:14, padding:"10px 14px", marginBottom:10,
                      fontSize:13, color: txt, fontFamily:"Nunito,sans-serif",
                      resize:"none", outline:"none", lineHeight:1.5,
                    }}
                  />

                  {/* Toggle anónimo */}
                  <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
                    <button onClick={() => setRAnon(!rAnon)}
                      style={{
                        width:42, height:24, borderRadius:50, border:"none",
                        cursor:"pointer", padding:0, position:"relative",
                        background: rAnon ? accent : (dark?"#444":"#ccc"),
                        transition:"background .2s",
                      }}>
                      <span style={{
                        position:"absolute", top:3,
                        left: rAnon ? "calc(100% - 21px)" : 3,
                        width:18, height:18, borderRadius:"50%",
                        background:"white", transition:"left .2s",
                      }}/>
                    </button>
                    <span style={{fontSize:12, fontWeight:700, color: sub}}>
                      {rAnon ? "🔒 Anónimo — no sabrán quién sos" : "👤 No anónimo — verán tu nombre"}
                    </span>
                  </div>

                  <div style={{display:"flex", gap:8}}>
                    <button onClick={() => setReportOpen(false)} style={{
                      flex:1, background:"none",
                      border:`1.5px solid ${dark?"rgba(255,255,255,.2)":"rgba(0,0,0,.15)"}`,
                      borderRadius:50, color: sub, padding:"10px",
                      fontWeight:700, fontSize:13, cursor:"pointer",
                      fontFamily:"Nunito,sans-serif",
                    }}>
                      Cancelar
                    </button>
                    <button onClick={submitReport} disabled={savingReport} style={{
                      flex:2, background: accent, border:"none", borderRadius:50,
                      color:"white", padding:"10px",
                      fontWeight:800, fontSize:13, cursor: savingReport ? "not-allowed" : "pointer",
                      opacity: savingReport ? .7 : 1, fontFamily:"Nunito,sans-serif",
                    }}>
                      {savingReport ? "Enviando..." : "Enviar reporte 🔒"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AWellness;
