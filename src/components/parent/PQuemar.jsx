import { useState } from "react";
import { api } from "../../api";
import { useTheme } from "../../ThemeContext";
import { WCard } from "../shared/index";

export default function PQuemar({ me, balance, refreshBalance, showToast, setTab }) {
  const { cardBg, pageBg } = useTheme();
  const [amount,  setAmount]  = useState("");
  const [burning, setBurning] = useState(false);
  const accent = "#ef4444";
  const bal = balance ?? 0;

  const quemar = async () => {
    const amt = parseInt(amount);
    if (!amt||amt<=0) { showToast("Ingresá un monto válido","error"); return; }
    if (amt>bal) { showToast(`Saldo insuficiente (tenés ${bal})`, "error"); return; }
    setBurning(true);
    try {
      await api.parentBurn(amt);
      showToast(`Quemaste 🔥 ${amt} monedas`);
      setAmount("");
      refreshBalance();
    } catch(e) { showToast(e.message||"Error al quemar","error"); }
    finally { setBurning(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:pageBg, transition:"background .3s" }}>
      <div style={{ background:accent, color:"white", padding:"52px 20px 28px",
        position:"sticky", top:0, zIndex:50, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(255,255,255,.1)", top:-50, right:-40, pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setTab("home")} style={{ background:"rgba(255,255,255,.2)",
            border:"none", borderRadius:50, color:"white", width:34, height:34,
            cursor:"pointer", fontSize:18, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>←</button>
          <div>
            <div style={{ fontWeight:900, fontSize:22 }}>🔥 Quemar monedas</div>
            <div style={{ fontSize:13, opacity:.85 }}>Eliminar monedas de circulación</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"20px 14px" }}>
        <WCard>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:16 }}>
            <div style={{ fontWeight:800, transition:"color .3s" }}>Saldo actual</div>
            <div style={{ fontWeight:900, fontSize:22, color:accent }}>
              🪙 {bal.toLocaleString("es-AR")}
            </div>
          </div>
          <div style={{ background:"#fee2e2", borderRadius:12, padding:"12px 14px",
            marginBottom:16, border:"1.5px solid #fca5a5" }}>
            <div style={{ fontWeight:800, fontSize:13, color:"#991b1b", marginBottom:4 }}>
              ⚠️ Acción irreversible
            </div>
            <div style={{ fontSize:12, color:"#7f1d1d", lineHeight:1.5 }}>
              Las monedas quemadas no se pueden recuperar.
            </div>
          </div>
          <div style={{ fontWeight:800, fontSize:13, marginBottom:6,
            transition:"color .3s" }}>Cantidad a quemar</div>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            placeholder="0" min="1" max={bal}
            style={{ width:"100%", boxSizing:"border-box",
              border:"1.5px solid #e8e8e8", borderRadius:12,
              padding:"12px 14px", fontSize:20, fontWeight:900, outline:"none",
              color:accent, fontFamily:"Nunito,sans-serif", textAlign:"center",
              marginBottom:10, background:cardBg, transition:"background .3s" }}/>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[5,10,25,50,100].filter(n=>n<=bal).map(n=>(
              <button key={n} onClick={()=>setAmount(String(n))}
                style={{ flex:1, background:amount===String(n)?accent:"#f0f0f0",
                  color:amount===String(n)?"white":"#555",
                  border:"none", borderRadius:10, padding:"8px 4px",
                  fontSize:12, fontWeight:800, cursor:"pointer",
                  fontFamily:"Nunito,sans-serif" }}>{n}</button>
            ))}
          </div>
          <button onClick={quemar} disabled={burning||!amount||parseInt(amount)<=0}
            style={{ width:"100%",
              background:(burning||!amount||parseInt(amount)<=0)?"#ccc":accent,
              border:"none", borderRadius:50, color:"white", padding:"14px",
              fontWeight:800, fontSize:15,
              cursor:(burning||!amount)?"not-allowed":"pointer",
              fontFamily:"Nunito,sans-serif" }}>
            {burning?`Quemando...`:`🔥 Quemar ${amount||"..."} monedas`}
          </button>
        </WCard>
      </div>
    </div>
  );
}
