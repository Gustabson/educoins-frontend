import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Av, Inp, OBtn, OHdr, OHdrA, PBtn, Pill, Sheet, Toast, WCard, displayName, useToast } from "../shared/index";




const RARITIES_OPTS = [
  {id:"common",    label:"Común",     color:"#94a3b8"},
  {id:"rare",      label:"Raro",      color:"#3b82f6"},
  {id:"epic",      label:"Épico",     color:"#8b5cf6"},
  {id:"legendary", label:"Legendario",color:"#f59e0b"},
];

function AdminUsuarios({showToast}){
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState(false);
  const [nombre,setNombre]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [rol,setRol]=useState("student");
  const [budget,setBudget]=useState("");
  const [loading,setLoading]=useState(true);
  const [grantModal,setGrantModal]=useState(null);
  const [grantTab,setGrantTab]=useState("title"); // "title" | "loan"
  const [grantForm,setGrantForm]=useState({name:"",rarity:"common",color:"#8b5cf6",glow_color:"",emoji:"",note:""});
  const [loanForm,setLoanForm]=useState({itemName:"Marco Dorado",type:"frame",value:"3px solid #f59e0b",glow:"#f59e0b44",note:"",days:""});
  const [granting,setGranting]=useState(false);
  const [search,setSearch]=useState("");
  const [userTitles,setUserTitles]=useState([]);

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
        <input placeholder="Buscar alumno..." onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:50,
            padding:"10px 16px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif",
            marginBottom:10,boxSizing:"border-box"}}/>
        {users.filter(u=>!search||u.nombre.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase())).map(u=>(
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
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {u.activo&&u.rol!=="admin"&&(
                <OBtn label="Desactivar" onClick={()=>deactivate(u.id)} color="#ef4444"/>
              )}
              {u.rol==="student"&&(
                <button onClick={async()=>{
                  setGrantModal(u);
                  setGrantTab("revocar"); // default to revocar so old titles are visible
                  api.earnedTitlesOf(u.id).then(d=>setUserTitles(Array.isArray(d)?d:(d?.data||[]))).catch(()=>{});
                }}
                  style={{background:"#f59e0b22",border:"none",borderRadius:8,
                    color:"#b45309",padding:"5px 8px",fontSize:10,fontWeight:800,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif",whiteSpace:"nowrap"}}>
                  🏅 Título
                </button>
              )}
            </div>
          </WCard>
        ))}
      </div>
      {/* Modal otorgar título */}
      {grantModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setGrantModal(null);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,
            width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:10}}>
              🎁 Premiar a {grantModal.nombre}
            </div>
            {/* Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["title","🏅 Título"],["loan","🖼️ Marco prestado"],["revocar","🗑️ Revocar"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>{
                  setGrantTab(id);
                  if(id==="revocar"&&grantModal)
                    api.earnedTitlesOf(grantModal.id).then(d=>setUserTitles(Array.isArray(d)?d:(d?.data||[]))).catch(()=>{});
                }}
                  style={{flex:1,background:grantTab===id?"#f59e0b22":"#f7f7f7",
                    border:`1.5px solid ${grantTab===id?"#f59e0b":"#eee"}`,
                    borderRadius:8,padding:"8px",fontSize:12,fontWeight:800,
                    cursor:"pointer",color:grantTab===id?"#b45309":"#555",
                    fontFamily:"Nunito,sans-serif"}}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {grantTab==="title"&&<>
              <input value={grantForm.name} onChange={e=>setGrantForm(v=>({...v,name:e.target.value.slice(0,40)}))}
                placeholder="Nombre del título (ej: El Primero 🥇)"
                style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                  padding:"10px 12px",fontSize:14,fontWeight:700,outline:"none",
                  fontFamily:"Nunito,sans-serif"}}/>
              <input value={grantForm.emoji} onChange={e=>setGrantForm(v=>({...v,emoji:e.target.value.slice(0,4)}))}
                placeholder="Emoji (opcional, ej: 🏆)"
                style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                  padding:"10px 12px",fontSize:14,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
              {/* Rareza */}
              <div style={{display:"flex",gap:6}}>
                {RARITIES_OPTS.map(r=>(
                  <button key={r.id} onClick={()=>setGrantForm(v=>({...v,rarity:r.id,color:r.color,glow_color:r.color}))}
                    style={{flex:1,background:grantForm.rarity===r.id?r.color+"22":"#f7f7f7",
                      border:`1.5px solid ${grantForm.rarity===r.id?r.color:"#eee"}`,
                      borderRadius:8,padding:"7px 4px",fontSize:10,fontWeight:800,
                      cursor:"pointer",color:r.color,fontFamily:"Nunito,sans-serif"}}>
                    {r.label}
                  </button>
                ))}
              </div>
              {/* Color custom */}
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <label style={{fontSize:12,color:"#555",fontWeight:700}}>Color:</label>
                <input type="color" value={grantForm.color}
                  onChange={e=>setGrantForm(v=>({...v,color:e.target.value}))}
                  style={{width:40,height:32,border:"none",borderRadius:8,cursor:"pointer"}}/>
                <label style={{fontSize:12,color:"#555",fontWeight:700}}>Glow:</label>
                <input type="color" value={grantForm.glow_color||grantForm.color}
                  onChange={e=>setGrantForm(v=>({...v,glow_color:e.target.value}))}
                  style={{width:40,height:32,border:"none",borderRadius:8,cursor:"pointer"}}/>
              </div>
              <input value={grantForm.note} onChange={e=>setGrantForm(v=>({...v,note:e.target.value.slice(0,100)}))}
                placeholder="Motivo (opcional, visible al alumno)"
                style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                  padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
              </>}
              {grantTab==="loan"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}>
                  <div style={{fontSize:12,color:"#888"}}>
                    El alumno puede equiparlo. Si ponés días de duración, expira automáticamente.
                  </div>
                  {/* Marcos predefinidos */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[
                      {name:"Marco Dorado",type:"frame",value:"3px solid #f59e0b",glow:"#f59e0b44"},
                      {name:"Marco Épico", type:"frame",value:"3px solid #8b5cf6",glow:"#8b5cf644"},
                      {name:"Fuego",       type:"gradient",value:"linear-gradient(135deg,#f97316,#ef4444)",glow:null},
                      {name:"Aurora",      type:"gradient",value:"linear-gradient(135deg,#a855f7,#ec4899,#f59e0b)",glow:null},
                    ].map(p=>(
                      <button key={p.name} onClick={()=>setLoanForm(v=>({...v,...p,itemName:p.name}))}
                        style={{background:loanForm.itemName===p.name?"#f59e0b22":"#f7f7f7",
                          border:`1.5px solid ${loanForm.itemName===p.name?"#f59e0b":"#eee"}`,
                          borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,
                          cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <input value={loanForm.note} onChange={e=>setLoanForm(v=>({...v,note:e.target.value}))}
                    placeholder="Motivo / mensaje para el alumno (opcional)"
                    style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                  <input value={loanForm.days} onChange={e=>setLoanForm(v=>({...v,days:e.target.value}))}
                    placeholder="Días de duración (vacío = sin límite)" type="number" min="1"
                    style={{background:"#f7f7f7",border:"1.5px solid #eee",borderRadius:10,
                      padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Nunito,sans-serif"}}/>
                </div>
              )}
              {grantTab==="revocar"&&(
                <div>
                  {userTitles.length===0
                    ? <div style={{textAlign:"center",padding:16,color:"#aaa",fontSize:12}}>
                        Sin títulos otorgados
                      </div>
                    : userTitles.map(t=>{
                        const RARITY_COLORS={common:"#94a3b8",rare:"#3b82f6",epic:"#8b5cf6",legendary:"#f59e0b"};
                        const col=RARITY_COLORS[t.rarity]||"#94a3b8";
                        return(
                          <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,
                            padding:"8px 10px",background:"#f9f9f9",borderRadius:10,marginBottom:6}}>
                            <span style={{fontSize:16}}>{t.emoji||"🏅"}</span>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:800,fontSize:12,color:col}}>{t.name}</div>
                              <div style={{fontSize:10,color:"#888"}}>
                                {t.rarity} · {new Date(t.created_at).toLocaleDateString("es-AR")}
                                {t.expires_at&&` · Vence ${new Date(t.expires_at).toLocaleDateString("es-AR")}`}
                              </div>
                              <div style={{fontSize:9,fontWeight:700,
                                color:t.status==="expired"?"#ef4444":t.status==="permanent"?"#10b981":"#f59e0b"}}>
                                {t.status==="expired"?"● Expirado":t.status==="permanent"?"● Permanente":"● Activo"}
                              </div>
                            </div>
                            <button onClick={async()=>{
                              try{
                                await api.revokeTitle(t.id);
                                setUserTitles(prev=>prev.filter(x=>x.id!==t.id));
                                showToast("Título revocado");
                              }catch(e){showToast(e.message||"Error","error");}
                            }} style={{background:"#fee2e2",border:"none",borderRadius:8,
                              color:"#ef4444",padding:"5px 10px",fontSize:11,fontWeight:700,
                              cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                              Revocar
                            </button>
                          </div>
                        );
                      })
                  }
                </div>
              )}
              {grantTab!=="revocar"&&(
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button
                  onClick={grantTab==="title"?grantTitle:grantLoan}
                  disabled={granting||(grantTab==="title"&&!grantForm.name.trim())}
                  style={{flex:1,background:granting?"#ccc":"#f59e0b",
                    border:"none",borderRadius:50,color:"white",padding:"12px",fontWeight:800,
                    fontSize:14,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  {granting?"Otorgando...":grantTab==="title"?"🏅 Otorgar título":"🎁 Prestar marco"}
                </button>
                <button onClick={()=>setGrantModal(null)}
                  style={{background:"#f0f0f0",border:"none",borderRadius:50,
                    color:"#555",padding:"12px 18px",fontWeight:700,
                    cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>
                  Cancelar
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
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
