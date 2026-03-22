import { useState, useEffect, useRef } from "react";
import { api, connectSocket } from "../../api";
import { useTheme } from "../../ThemeContext";
import { Av, OHdrA, WCard, CircBtn, Toast, useToast, displayName } from "../shared/index";


function AMovimientos(){
  const {primary:accent,isDark:dark,txt,sub,cardBg,pageBg,inputBg,inputBd} = useTheme();
  const [txs,setTxs]       = useState([]);
  const [loading,setLoading]= useState(true);
  const [search,setSearch]  = useState("");

  useEffect(()=>{ api.transactions().then(setTxs).finally(()=>setLoading(false)); },[]);

  const TX_META = {
    reward:    { icon:"⚡", label:"Misión completada",   color:"#10b981" },
    transfer:  { icon:"💸", label:"Transferencia",        color:"#3b82f6" },
    purchase:  { icon:"🛒", label:"Compra en tienda",     color:"#f59e0b" },
    mint:      { icon:"🏦", label:"Acreditación",         color:"#10b981" },
    burn:      { icon:"🔥", label:"Débito",               color:"#ef4444" },
    adjustment:{ icon:"⚙️", label:"Ajuste",               color:"#8b5cf6" },
  };

  // Filtrar por búsqueda
  const filtered = txs.filter(t =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por fecha — solo fechas con movimientos
  const grupos = {};
  filtered.forEach(t => {
    const fecha = new Date(t.created_at).toLocaleDateString("es-AR",{
      weekday:"long", day:"numeric", month:"long"
    });
    const fechaKey = new Date(t.created_at).toDateString();
    if (!grupos[fechaKey]) grupos[fechaKey] = { label: fecha, items: [] };
    grupos[fechaKey].items.push(t);
  });

  if(loading) return(
    <div style={{background:pageBg,minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:sub}}>
        <div style={{fontSize:32,marginBottom:8}}>⏳</div>
        <div style={{fontWeight:700}}>Cargando movimientos...</div>
      </div>
    </div>
  );

  return(
    <div style={{background:pageBg,minHeight:"100vh",transition:"background .3s"}}>
      <OHdrA title="Movimientos 📊"/>

      {/* Buscador sticky */}
      <div style={{position:"sticky",top:0,zIndex:40,background:pageBg,
        padding:"10px 14px 6px"}}>
        <div style={{background:cardBg,borderRadius:14,padding:"9px 14px",
          display:"flex",alignItems:"center",gap:8,
          boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
          <span style={{fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar movimiento..."
            style={{flex:1,background:"none",border:"none",outline:"none",
              fontSize:13,color:txt,fontFamily:"Nunito,sans-serif",fontWeight:600}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",
            color:sub,cursor:"pointer",fontSize:16,padding:0}}>✕</button>}
        </div>
      </div>

      <div style={{padding:"4px 14px 16px"}}>
        {filtered.length===0&&(
          <div style={{background:cardBg,borderRadius:20,padding:32,textAlign:"center",
            boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)",marginTop:8}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontWeight:800,color:txt,marginTop:8}}>
              {search?"Sin resultados":"Sin movimientos aún"}
            </div>
          </div>
        )}

        {Object.entries(grupos).map(([key,grupo])=>(
          <div key={key}>
            {/* Separador de fecha */}
            <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 8px"}}>
              <div style={{flex:1,height:1,background:inputBg}}/>
              <span style={{fontSize:11,fontWeight:800,color:sub,textTransform:"capitalize",
                whiteSpace:"nowrap"}}>
                {grupo.label}
              </span>
              <div style={{flex:1,height:1,background:inputBg}}/>
            </div>

            {/* Movimientos del día en una card */}
            <div style={{background:cardBg,borderRadius:20,overflow:"hidden",
              boxShadow:dark?"0 1px 8px rgba(0,0,0,.4)":"0 1px 8px rgba(0,0,0,.06)"}}>
              {grupo.items.map((t,i)=>{
                const meta = TX_META[t.type] || { icon:"•", label:t.type, color:"#94a3b8" };
                const isPos = t.amount > 0;
                return(
                  <div key={t.id||i} style={{
                    display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                    borderBottom:i<grupo.items.length-1?`1px solid ${inputBg}`:"none"}}>
                    {/* Icono */}
                    <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,
                      background:isPos?dark?"#052e16":"#f0fdf4":dark?"#2d0a0a":"#fef2f2",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>
                      {meta.icon}
                    </div>
                    {/* Descripción */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:txt,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.description||meta.label}
                      </div>
                      <div style={{fontSize:11,color:sub,marginTop:1}}>
                        {new Date(t.created_at).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                      </div>
                    </div>
                    {/* Monto */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:900,fontSize:15,
                        color:isPos?"#10b981":"#ef4444"}}>
                        {isPos?"+":""}{t.amount.toLocaleString("es-AR")} 🪙
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel de Apodo ────────────────────────────────────────────

export default AMovimientos;
