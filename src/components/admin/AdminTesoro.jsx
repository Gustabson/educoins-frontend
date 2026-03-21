import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index.js";




function AdminTesoro({me,showToast}){
  const [data,setData]=useState(null);
  const [txs,setTxs]=useState([]);
  const [users,setUsers]=useState([]);
  const [mintAmount,setMintAmount]=useState("");
  const [mintDesc,setMintDesc]=useState("");
  const [burnAmount,setBurnAmount]=useState("");
  const [burnReason,setBurnReason]=useState("");
  const [mintSheet,setMintSheet]=useState(false);
  const [burnSheet,setBurnSheet]=useState(false);
  const [loading,setLoading]=useState(true);

  const refresh=async()=>{
    try{
      const [t,u,auditData]=await Promise.all([
        api.treasury(),
        api.adminUsers(),
        api.auditLog(),
      ]);
      setData(t);
      const usArr=Array.isArray(u)?u:u.data||u||[];
      setUsers(usArr.filter(x=>x.rol==="student"&&x.activo));
      // Filtrar solo mint y burn del audit
      const logs=Array.isArray(auditData)?auditData:auditData.data||[];
      setTxs(logs.filter(l=>l.action==="mint"||l.action==="burn").slice(0,10));
    }catch(e){}
    finally{setLoading(false);}
  };
  useEffect(()=>{refresh();},[]);

  const doMint=async()=>{
    if(!mintAmount||!mintDesc){showToast("Completa monto y descripcion","error");return;}
    try{
      await api.mint(parseInt(mintAmount),mintDesc);
      showToast(`Mint exitoso: +${mintAmount} monedas a Tesoreria`);
      refresh();setMintAmount("");setMintDesc("");setMintSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const doBurn=async()=>{
    if(!burnAmount||!burnReason){showToast("Completa monto y motivo","error");return;}
    try{
      await api.burn(parseInt(burnAmount),burnReason);
      showToast(`Burn exitoso: -${burnAmount} monedas destruidas`);
      refresh();setBurnAmount("");setBurnReason("");setBurnSheet(false);
    }catch(e){showToast(e.message||"Error","error");}
  };

  // Calcular coins en circulación (en manos de alumnos)
  const coinsCirculando = users.reduce((s,u)=>s+(u.total_earned||0),0);
  const treasury = data?.balance||0;

  return(
    <div>
      <OHdr title="Tesoreria" sub="ADMIN"/>
      <div style={{padding:"0 14px",marginTop:12}}>

        {/* Balance principal */}
        <WCard style={{textAlign:"center",padding:"24px 20px",marginBottom:12}}>
          <div style={{fontSize:12,color:"#aaa",fontWeight:700,letterSpacing:".1em",marginBottom:6}}>
            BALANCE TESORERIA
          </div>
          <div style={{fontWeight:900,fontSize:44,color:"#00c1fc",letterSpacing:"-2px"}}>
            {loading?"...":treasury.toLocaleString("es-AR")}
          </div>
          <div style={{fontSize:11,color:"#aaa",marginTop:4}}>monedas disponibles para distribuir</div>
        </WCard>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <WCard style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:22,marginBottom:4}}>🎓</div>
            <div style={{fontWeight:900,fontSize:18,color:"#f59e0b"}}>{coinsCirculando.toLocaleString("es-AR")}</div>
            <div style={{fontSize:10,color:"#aaa",fontWeight:700}}>En manos de alumnos</div>
          </WCard>
          <WCard style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:22,marginBottom:4}}>📊</div>
            <div style={{fontWeight:900,fontSize:18,color:"#8b5cf6"}}>{(treasury+coinsCirculando).toLocaleString("es-AR")}</div>
            <div style={{fontSize:10,color:"#aaa",fontWeight:700}}>Total en circulacion</div>
          </WCard>
        </div>

        {/* Acciones */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <button onClick={()=>setMintSheet(true)}
            style={{background:"#10b981",border:"none",borderRadius:16,color:"white",
              padding:"16px",fontWeight:800,fontSize:15,cursor:"pointer",
              fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 14px #10b98133"}}>
            + Mint 🪙
          </button>
          <button onClick={()=>setBurnSheet(true)}
            style={{background:"#ef4444",border:"none",borderRadius:16,color:"white",
              padding:"16px",fontWeight:800,fontSize:15,cursor:"pointer",
              fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 14px #ef444433"}}>
            Burn 🔥
          </button>
        </div>

        {/* Explicacion */}
        <WCard style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#888",fontWeight:700,lineHeight:1.7}}>
            <div><span style={{color:"#10b981"}}>● Mint</span> — Crea monedas y las acredita a la Tesoreria. Estas se distribuyen via misiones y premios.</div>
            <div style={{marginTop:4}}><span style={{color:"#ef4444"}}>● Burn</span> — Destruye monedas de la Tesoreria permanentemente. Reduce la oferta total.</div>
            <div style={{marginTop:4}}><span style={{color:"#f59e0b"}}>● Distribucion</span> — Las monedas pasan de Tesoreria a alumnos via rewards y misiones. El sistema es de doble entrada.</div>
          </div>
        </WCard>

        {/* Historial mint/burn */}
        {txs.length>0&&(
          <>
            <div style={{fontWeight:800,color:"#1a1a1a",fontSize:13,marginBottom:8}}>
              Historial de operaciones
            </div>
            {txs.map((t,i)=>(
              <WCard key={i} style={{marginBottom:6,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{t.action==="mint"?"🪙":"🔥"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a",textTransform:"capitalize"}}>
                      {t.action} — {t.actor_nombre||"Admin"}
                    </div>
                    <div style={{fontSize:11,color:"#aaa"}}>
                      {new Date(t.created_at).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{fontWeight:900,fontSize:14,
                    color:t.action==="mint"?"#10b981":"#ef4444"}}>
                    {t.action==="mint"?"+":"-"}{t.details?.amount?.toLocaleString("es-AR")||"?"}
                  </div>
                </div>
              </WCard>
            ))}
          </>
        )}
      </div>

      {mintSheet&&(
        <Sheet title="Mint — Crear monedas" onClose={()=>setMintSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#f0fdf4",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#10b981",fontWeight:700}}>
              Las monedas se acreditaran a la Tesoreria y podras distribuirlas via misiones y premios.
            </div>
            <Inp val={mintAmount} set={setMintAmount} ph="Cantidad de monedas" type="number" icon="🪙"/>
            <Inp val={mintDesc}   set={setMintDesc}   ph="Descripcion (ej: Inicio de trimestre)" icon="📝"/>
            <PBtn label="Confirmar mint" onClick={doMint} full color="#10b981"/>
          </div>
        </Sheet>
      )}
      {burnSheet&&(
        <Sheet title="Burn — Destruir monedas" onClose={()=>setBurnSheet(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fef2f2",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#ef4444",fontWeight:700}}>
              Esta accion es irreversible. Solo se pueden destruir monedas de la Tesoreria.
            </div>
            <Inp val={burnAmount} set={setBurnAmount} ph="Cantidad a destruir" type="number" icon="🔥"/>
            <Inp val={burnReason} set={setBurnReason} ph="Motivo obligatorio" icon="📝"/>
            <PBtn label="Confirmar burn" onClick={doBurn} full color="#ef4444"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN RANKING — Top holders y top misiones
// ════════════════════════════════════════════════════════════

export default AdminTesoro;
