import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index.js";




function AdminRanking({onBack}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sec,setSec]=useState("holders");
  const [classrooms,setCl]=useState([]);
  const [selClass,setSelClass]=useState(null); // null = global
  const [clView,setClView]=useState(false); // mostrar selector de aulas

  useEffect(()=>{
    setLoading(true);
    api.adminRanking(selClass?.id||null)
      .then(d=>setData(d.data||d)).catch(()=>{}).finally(()=>setLoading(false));
    api.adminClassrooms().then(d=>setCl(d.data||d||[])).catch(()=>{});
  },[selClass]);

  // Filtrar datos por aula si hay una seleccionada
  const filterByClass=(list,field="id")=>{
    if(!selClass||!list) return list||[];
    // Necesitamos los miembros del aula — simplificado: filtramos por nombre si tenemos los datos
    return list; // se filtra server-side en una mejora futura; por ahora mostramos todo
  };

  const MEDAL=["🥇","🥈","🥉"];
  const COLOR=["#f59e0b","#94a3b8","#cd7c2f"];

  const RankCard=({user,rank,value,sub,maxVal})=>(
    <div style={{background:"white",borderRadius:16,padding:"12px 14px",marginBottom:8,
      boxShadow:"0 1px 8px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12,
      border:rank===0?"1.5px solid #f59e0b22":"none"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:COLOR[rank]+"22",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:rank<3?18:12,fontWeight:900,color:COLOR[rank]||"#94a3b8",flexShrink:0}}>
        {rank<3?MEDAL[rank]:rank+1}
      </div>
      <Av user={user} sz={36}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nombre}</div>
        {sub&&<div style={{fontSize:10,color:"#aaa"}}>{sub}</div>}
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontWeight:900,fontSize:15,color:rank===0?"#f59e0b":"#00c1fc"}}>
          🪙{value.toLocaleString("es-AR")}
        </div>
        {maxVal&&(
          <div style={{width:60,height:4,background:"#f0f0f0",borderRadius:99,marginTop:3}}>
            <div style={{width:Math.round(value/maxVal*100)+"%",height:"100%",borderRadius:99,
              background:rank===0?"#f59e0b":"#00c1fc"}}/>
          </div>
        )}
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#f59e0b",color:"white",padding:"22px 16px 16px",
        position:"sticky",top:0,zIndex:50,textShadow:"0 1px 4px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",
            alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,fontWeight:900,fontSize:20}}>
            🏆 {selClass?selClass.nombre:"Ranking Global"}
          </div>
          <button onClick={()=>setClView(v=>!v)}
            style={{background:"rgba(0,0,0,.2)",border:"none",borderRadius:10,color:"white",
              padding:"6px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            🏫 Aulas
          </button>
        </div>

        {/* Selector de aulas */}
        {clView&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            <button onClick={()=>{setSelClass(null);setClView(false);}}
              style={{background:!selClass?"rgba(255,255,255,.35)":"rgba(255,255,255,.15)",
                border:"1.5px solid "+(selClass?"rgba(255,255,255,.2)":"rgba(255,255,255,.6)"),
                borderRadius:99,padding:"5px 11px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              🌐 Global
            </button>
            {classrooms.map(c=>(
              <button key={c.id} onClick={()=>{setSelClass(c);setClView(false);}}
                style={{background:selClass?.id===c.id?"rgba(255,255,255,.35)":"rgba(255,255,255,.15)",
                  border:"1.5px solid "+(selClass?.id===c.id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                  borderRadius:99,padding:"5px 11px",fontSize:11,fontWeight:800,color:"white",
                  cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                🏫 {c.nombre} ({c.total_miembros||0})
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        {data?.stats&&!clView&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {v:data.stats.total_alumnos,l:"Alumnos"},
              {v:data.stats.total_misiones_completadas,l:"Misiones"},
              {v:data.stats.total_checkins,l:"Check-ins"},
              {v:(data.stats.total_distribuido||0).toLocaleString("es-AR"),l:"Distribuido"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,.2)",borderRadius:10,
                padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontWeight:900,fontSize:16}}>{s.v}</div>
                <div style={{fontSize:9,opacity:.8,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginTop:12}}>
          {[["holders","💰 Top Saldo"],["misiones","⚡ Top Misiones"],["checkin","🔥 Top Racha"]].map(([id,l])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{background:sec===id?"rgba(255,255,255,.3)":"rgba(255,255,255,.12)",
                border:"1.5px solid "+(sec===id?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)"),
                borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:800,color:"white",
                cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 14px"}}>
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Calculando...</div>}

        {/* TOP HOLDERS — saldo actual */}
        {sec==="holders"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MAYOR SALDO ACTUAL
            </div>
            <div style={{background:"#fff7ed",borderRadius:12,padding:"10px 14px",marginBottom:12,
              fontSize:11,color:"#92400e",fontWeight:700,lineHeight:1.5}}>
              💡 Saldo real en cuenta ahora mismo (incluye todo lo recibido menos todo lo gastado)
            </div>
            {(data?.topHolders||[]).map((u,i)=>(
              <RankCard key={u.id} user={u} rank={i} value={u.balance}
                maxVal={data.topHolders[0]?.balance||1}/>
            ))}
          </>
        )}

        {/* TOP MISIONES — solo lo ganado por misiones aprobadas */}
        {sec==="misiones"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MONEDAS GANADAS POR MISIONES
            </div>
            <div style={{background:"#eff6ff",borderRadius:12,padding:"10px 14px",marginBottom:12,
              fontSize:11,color:"#1e40af",fontWeight:700,lineHeight:1.5}}>
              💡 Solo cuenta lo ganado por misiones aprobadas. No descuenta gastos, transferencias ni nada.
            </div>
            {(data?.topMisiones||[]).map((u,i)=>(
              <RankCard key={u.id} user={u} rank={i} value={u.ganado_misiones}
                sub={`${u.misiones_completadas} misiones completadas`}
                maxVal={data.topMisiones[0]?.ganado_misiones||1}/>
            ))}
          </>
        )}

        {/* TOP RACHA CHECK-IN */}
        {sec==="checkin"&&!loading&&(
          <>
            <div style={{fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:".06em",marginBottom:8}}>
              MAYOR RACHA DIARIA
            </div>
            {(data?.topCheckin||[]).map((u,i)=>(
              <div key={u.id} style={{background:"white",borderRadius:16,padding:"12px 14px",
                marginBottom:8,boxShadow:"0 1px 8px rgba(0,0,0,.06)",
                display:"flex",alignItems:"center",gap:12,
                border:i===0?"1.5px solid #f59e0b22":"none"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:COLOR[i]+"22",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:i<3?18:12,fontWeight:900,color:COLOR[i]||"#94a3b8",flexShrink:0}}>
                  {i<3?MEDAL[i]:i+1}
                </div>
                <Av user={u} sz={36}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{u.nombre}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>{u.total_checkins} check-ins totales</div>
                </div>
                <div style={{fontWeight:900,fontSize:16,color:"#f97316"}}>
                  🔥{u.racha_max}
                </div>
              </div>
            ))}
          </>
        )}

        {!loading&&data&&Object.values(data).every(v=>!Array.isArray(v)||v.length===0)&&(
          <div style={{textAlign:"center",color:"#aaa",padding:40}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontWeight:800,marginTop:8}}>Sin datos todavia</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN BANCO — Transferencias directas desde tesorería
// ════════════════════════════════════════════════════════════

export default AdminRanking;
