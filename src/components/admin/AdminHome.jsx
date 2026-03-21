import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";




function AdminHome({me,onNav,showToast}){
  const [treasury,setTreasury]=useState(null);
  const [users,setUsers]=useState([]);
  const [stats,setStats]=useState(null);

  useEffect(()=>{
    api.treasury().then(setTreasury).catch(()=>{});
    api.adminUsers().then(u=>{
      const arr=Array.isArray(u)?u:u.data||u||[];
      setUsers(arr);
      // Calcular stats locales
      const students=arr.filter(x=>x.rol==="student"&&x.activo);
      const top5=[...students].sort((a,b)=>(b.total_earned||0)-(a.total_earned||0)).slice(0,5);
      const totalCoins=students.reduce((s,x)=>s+(x.total_earned||0),0);
      setStats({students,top5,totalCoins});
    }).catch(()=>{});
  },[]);

  const students=users.filter(u=>u.rol==="student"&&u.activo).length;
  const teachers=users.filter(u=>u.rol==="teacher"&&u.activo).length;

  return(
    <div>
      <div style={{background:"#00c1fc",color:"white",padding:"52px 20px 28px",
        position:"sticky",top:0,zIndex:50,overflow:"hidden",textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>
        <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",top:-60,right:-50,pointerEvents:"none"}}/>
        <div style={{fontWeight:900,fontSize:22,marginBottom:4}}>Panel Admin ⚙️</div>
        <div style={{fontSize:13,opacity:.8}}>Hola, {me.nombre}</div>
      </div>
      <div style={{padding:"16px 14px",marginTop:-20}}>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[
            {icon:"🏦",val:treasury?treasury.balance.toLocaleString("es-AR"):"...",label:"En Tesorería",col:"#00c1fc"},
            {icon:"👨‍🎓",val:students,label:"Alumnos activos",col:"#10b981"},
            {icon:"👩‍🏫",val:teachers,label:"Docentes",col:"#8b5cf6"},
            {icon:"🪙",val:stats?stats.totalCoins.toLocaleString("es-AR"):"...",label:"Coins circulando",col:"#f59e0b"},
          ].map(s=>(
            <WCard key={s.label} style={{textAlign:"center",padding:"14px 10px"}}>
              <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
              <div style={{fontWeight:900,fontSize:18,color:s.col}}>{s.val}</div>
              <div style={{fontSize:10,color:"#aaa",fontWeight:700,marginTop:2}}>{s.label}</div>
            </WCard>
          ))}
        </div>

        {/* Accesos rápidos */}
        {[
          {icon:"👥",title:"Usuarios",         sub:`${students} alumnos · ${teachers} docentes`,dest:"usuarios",  col:"#3b82f6"},
          {icon:"🏦",title:"Tesorería",         sub:"Mint y burn de monedas",                   dest:"tesoro",    col:"#f59e0b"},
          {icon:"🛒",title:"Tienda",            sub:"Administrar ítems",                         dest:"tienda",    col:"#10b981"},
          {icon:"📰",title:"Noticias",          sub:"Crear y moderar publicaciones",             dest:"noticias",  col:"#00c1fc"},
          {icon:"🗳️",title:"Votaciones",        sub:"Crear encuestas y ver resultados",          dest:"votaciones",col:"#8b5cf6"},
          {icon:"🚩",title:"Reportes",          sub:"Gestionar reportes de alumnos",             dest:"reportes",  col:"#ef4444"},
          {icon:"🏆",title:"Ranking",           sub:"Top holders y top ganancias",               dest:"ranking",   col:"#f59e0b"},
          {icon:"🏛️",title:"Banco",             sub:"Transferir a alumnos y docentes",           dest:"banco",     col:"#10b981"},
          {icon:"🏫",title:"Aulas",             sub:"Crear aulas y asignar miembros",            dest:"aulas",     col:"#f59e0b"},
          {icon:"💹",title:"Economía",           sub:"Temas, precios, premios y suscripciones",  dest:"economia",  col:"#10b981"},
          {icon:"📋",title:"Audit Log",         sub:"Historial de todas las acciones",           dest:"audit",     col:"#64748b"},
        ].map(item=>(
          <WCard key={item.dest} onClick={()=>onNav(item.dest)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",marginBottom:8}}>
            <div style={{width:46,height:46,borderRadius:13,background:item.col+"18",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{item.title}</div>
              <div style={{fontSize:12,color:"#555"}}>{item.sub}</div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </WCard>
        ))}
      </div>
    </div>
  );
}

export default AdminHome;
