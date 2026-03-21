import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index";




function AdminUsuarios({showToast}){
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [rol,setRol]=useState("student");
  const [budget,setBudget]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.adminUsers().then(setUsers).finally(()=>setLoading(false));
  },[]);

  const crear=async()=>{
    if(!nombre.trim()||!email.trim()||!pass.trim()){showToast("Completá todos los campos","error");return;}
    try{
      const u=await api.createUser({nombre:nombre.trim(),email:email.trim(),password:pass,rol});
      if(rol==="teacher"&&budget){
        await api.setBudget(u.id,parseInt(budget)).catch(()=>{});
      }
      setUsers(prev=>[...prev,{...u,activo:true}]);
      setNombre("");setEmail("");setPass("");setBudget("");setForm(false);
      showToast(`Usuario ${u.nombre} creado ✅`);
    }catch(e){showToast(e.message||"Error","error");}
  };

  const deactivate=async(id)=>{
    try{
      await api.deactivate(id);
      setUsers(prev=>prev.map(u=>u.id===id?{...u,activo:false}:u));
      showToast("Usuario desactivado");
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Cargando...</div>;

  return(
    <div>
      <OHdr title="Usuarios 👥" sub="ADMIN"
        extra={<button onClick={()=>setForm(true)}
          style={{marginTop:14,background:"rgba(255,255,255,.22)",border:"1.5px solid rgba(255,255,255,.35)",
            borderRadius:50,color:"white",padding:"8px 20px",fontWeight:800,fontSize:13,cursor:"pointer"}}>
          + Nuevo usuario
        </button>}/>
      <div style={{padding:"0 14px",marginTop:12}}>
        {users.map(u=>(
          <WCard key={u.id} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:u.activo?1:.5}}>
            <div style={{width:44,height:44,borderRadius:"50%",
              background:u.rol==="admin"?"#ef444418":u.rol==="teacher"?"#f59e0b18":"#6366f118",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              {u.rol==="admin"?"⚙️":u.rol==="teacher"?"👩‍🏫":"🧑‍🎓"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{u.nombre}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{u.email}</div>
              <Pill text={u.rol} col={u.rol==="admin"?"#ef4444":u.rol==="teacher"?"#f59e0b":"#6366f1"}/>
            </div>
            {u.activo&&u.rol!=="admin"&&(
              <OBtn label="Desactivar" onClick={()=>deactivate(u.id)} color="#ef4444"/>
            )}
          </WCard>
        ))}
      </div>
      {form&&(
        <Sheet title="+ Nuevo usuario" onClose={()=>setForm(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Inp val={nombre} set={setNombre} ph="Nombre completo" icon="👤"/>
            <Inp val={email}  set={setEmail}  ph="Email" type="email" icon="📧"/>
            <Inp val={pass}   set={setPass}   ph="Contraseña" type="password" icon="🔒"/>
            <select value={rol} onChange={e=>setRol(e.target.value)}
              style={{background:"#F7F7F7",border:"1.5px solid #E8E8E8",borderRadius:14,
                color:"#1a1a1a",padding:"12px 14px",fontSize:14,outline:"none",fontWeight:700}}>
              <option value="student">🧑‍🎓 Alumno</option>
              <option value="teacher">👩‍🏫 Docente</option>
            </select>
            {rol==="teacher"&&(
              <Inp val={budget} set={setBudget} ph="Presupuesto mensual (monedas)" type="number" icon="🪙"/>
            )}
            <PBtn label="Crear usuario" onClick={crear} full color="#10b981"/>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export default AdminUsuarios;
