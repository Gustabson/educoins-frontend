import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdr, OHdrA, Pill, Toast, WCard, displayName, useToast } from "../shared/index";




function AdminAudit(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.auditLog().then(setLogs).finally(()=>setLoading(false));
  },[]);

  const actionColor=(action)=>({
    mint:"#10b981",burn:"#ef4444",reward:"#f59e0b",
    transfer:"#3b82f6",purchase:"#8b5cf6",adjustment:"#f59e0b"
  }[action]||"#94a3b8");

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando audit log...</div>;

  return(
    <div>
      <OHdr title="Audit Log 📋" sub="ADMIN"/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {logs.length===0&&(
          <WCard style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:40}}>📋</div>
            <div style={{fontWeight:800,color:"#1a1a1a",marginTop:8}}>Sin registros aún</div>
          </WCard>
        )}
        {logs.map((log,i)=>(
          <WCard key={i} style={{marginBottom:8,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Pill text={log.action} col={actionColor(log.action)}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:"#1a1a1a"}}>{log.actor_nombre||"Sistema"}</div>
                <div style={{fontSize:11,color:"#bbb"}}>{new Date(log.created_at).toLocaleString("es-AR")}</div>
              </div>
            </div>
            {log.details&&Object.keys(log.details).length>0&&(
              <div style={{marginTop:8,fontSize:11,color:"#888",background:"#f9f9f9",
                borderRadius:8,padding:"6px 10px",fontFamily:"monospace"}}>
                {JSON.stringify(log.details,null,0)}
              </div>
            )}
          </WCard>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — NOTICIAS
// ════════════════════════════════════════════════════════════

export default AdminAudit;
