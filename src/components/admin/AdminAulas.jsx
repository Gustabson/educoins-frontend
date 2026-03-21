import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";
import { Av, OHdrA, WCard, Toast, useToast, displayName } from "../shared/index.js";




function AdminAulas({showToast, onBack}){
  const [aulas,setAulas]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [desc,setDesc]=useState("");
  const [saving,setSaving]=useState(false);
  const [selAula,setSelAula]=useState(null);
  const [addUser,setAddUser]=useState("");
  const [addRol,setAddRol]=useState("student");

  const load=()=>{
    Promise.all([api.adminClassrooms(),api.adminUsers()])
      .then(([cl,us])=>{
        setAulas(Array.isArray(cl)?cl:cl.data||[]);
        setUsers(Array.isArray(us)?us:us.data||us||[]);
      }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const crear=async()=>{
    if(!nombre.trim()){showToast("Escribí el nombre del aula","error");return;}
    setSaving(true);
    try{
      await api.createClassroom({nombre:nombre.trim(),descripcion:desc.trim()||null});
      showToast("Aula creada ✅");setForm(false);setNombre("");setDesc("");load();
    }catch(e){showToast(e.message||"Error","error");}
    finally{setSaving(false);}
  };

  const agregarMiembro=async()=>{
    if(!addUser){showToast("Seleccioná un usuario","error");return;}
    try{
      await api.addClassroomMember(selAula.id,{user_id:addUser,rol:addRol});
      showToast("Miembro agregado ✅");
      setAddUser("");
      // Refrescar el aula seleccionada
      const updated=await api.adminClassrooms();
      const aulsArr=Array.isArray(updated)?updated:updated.data||[];
      setAulas(aulsArr);
      setSelAula(aulsArr.find(a=>a.id===selAula.id)||selAula);
    }catch(e){showToast(e.message||"Error","error");}
  };

  if(selAula) return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSelAula(null)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:50,color:"white",width:34,height:34,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🏫 {selAula.nombre}</div>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
          boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a",marginBottom:10}}>Agregar miembro</div>
          <select value={addUser} onChange={e=>setAddUser(e.target.value)}
            style={{width:"100%",border:"1.5px solid #e8e8e8",borderRadius:12,padding:"10px 14px",
              fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif",background:"white"}}>
            <option value="">Seleccionar usuario...</option>
            {users.filter(u=>u.activo).map(u=>(
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
            ))}
          </select>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["student","teacher"].map(r=>(
              <button key={r} onClick={()=>setAddRol(r)} style={{
                flex:1,background:addRol===r?"#00c1fc":"#f0f0f0",
                color:addRol===r?"white":"#555",border:"none",borderRadius:12,
                padding:"9px",fontWeight:800,fontSize:12,cursor:"pointer",
                fontFamily:"Nunito,sans-serif"}}>
                {r==="student"?"👨‍🎓 Alumno":"👩‍🏫 Docente"}
              </button>
            ))}
          </div>
          <button onClick={agregarMiembro} style={{width:"100%",background:"#00c1fc",border:"none",
            borderRadius:50,color:"white",padding:"12px",fontWeight:800,fontSize:14,
            cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
            Agregar al aula
          </button>
        </div>
        <div style={{fontWeight:800,color:"#1a1a1a",fontSize:13,marginBottom:8}}>
          Miembros ({selAula.miembros?.length||selAula.total_miembros||0})
        </div>
        {(selAula.miembros||[]).map(m=>(
          <div key={m.user_id} style={{background:"white",borderRadius:14,padding:"11px 14px",
            marginBottom:6,display:"flex",alignItems:"center",gap:10,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <Av user={{nombre:m.nombre,skin:"s1",border:"b1"}} sz={34}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a1a1a"}}>{m.nombre}</div>
            </div>
            <span style={{background:m.rol==="teacher"?"#00c1fc22":"#10b98122",
              color:m.rol==="teacher"?"#00c1fc":"#10b981",borderRadius:99,
              padding:"3px 9px",fontSize:10,fontWeight:800}}>
              {m.rol==="teacher"?"Docente":"Alumno"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F0F0F0"}}>
      <div style={{background:"#00c1fc",color:"white",padding:"22px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(0,0,0,.15)",border:"none",borderRadius:50,
            color:"white",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
          <div style={{flex:1,textAlign:"center",fontWeight:900,fontSize:20,
            textShadow:"0 1px 4px rgba(0,60,100,.4)"}}>🏫 Aulas</div>
          <button onClick={()=>setForm(f=>!f)} style={{background:"rgba(0,0,0,.15)",border:"none",
            borderRadius:99,color:"white",padding:"7px 14px",fontWeight:800,fontSize:12,cursor:"pointer"}}>
            {form?"✕ Cerrar":"+ Nueva"}
          </button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {form&&(
          <div style={{background:"white",borderRadius:20,padding:16,marginBottom:12,
            boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del aula (ej: 3° B)..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:8,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Descripción (opcional)..."
              style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #e8e8e8",borderRadius:12,
                padding:"10px 14px",fontSize:13,marginBottom:10,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
            <button onClick={crear} disabled={saving} style={{width:"100%",background:saving?"#ccc":"#00c1fc",
              border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
              fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"Nunito,sans-serif"}}>
              {saving?"Creando...":"Crear aula"}
            </button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Cargando...</div>}
        {aulas.map(a=>(
          <div key={a.id} onClick={()=>setSelAula(a)} style={{background:"white",borderRadius:16,
            padding:"14px 16px",marginBottom:8,cursor:"pointer",
            boxShadow:"0 1px 8px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:"#00c1fc22",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏫</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a1a1a"}}>{a.nombre}</div>
              <div style={{fontSize:11,color:"#555",marginTop:2}}>
                {a.total_miembros||a.miembros?.length||0} miembros
                {a.descripcion&&` · ${a.descripcion}`}
              </div>
            </div>
            <span style={{color:"#ddd",fontSize:18}}>›</span>
          </div>
        ))}
        {!loading&&aulas.length===0&&(
          <div style={{textAlign:"center",color:"#aaa",padding:32,background:"white",borderRadius:16}}>
            No hay aulas creadas aún
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADMIN — CONFIGURACIÓN
// ════════════════════════════════════════════════════════════

export default AdminAulas;
