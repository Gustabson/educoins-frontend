import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed:false };
  }

  static getDerivedStateFromError() {
    return { failed:true };
  }

  componentDidCatch(error, info) {
    console.error('Error de interfaz no controlado', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,
        boxSizing:'border-box',background:'#f4f8fb',fontFamily:'Nunito,system-ui,sans-serif'}}>
        <section role="alert" style={{width:'100%',maxWidth:420,background:'white',borderRadius:24,
          padding:28,textAlign:'center',boxShadow:'0 16px 50px rgba(15,23,42,.12)'}}>
          <div aria-hidden="true" style={{fontSize:48}}>🛠️</div>
          <h1 style={{fontSize:22,margin:'12px 0 8px',color:'#172033'}}>Algo no cargó bien</h1>
          <p style={{fontSize:14,lineHeight:1.55,color:'#64748b',margin:'0 0 20px'}}>
            Tus datos están seguros. Recargá la aplicación para volver a intentarlo.
          </p>
          <button onClick={()=>window.location.reload()} style={{width:'100%',border:0,borderRadius:99,
            padding:'13px 18px',background:'#00a9e8',color:'white',fontSize:14,fontWeight:800,
            cursor:'pointer',fontFamily:'inherit'}}>Recargar EduCoins</button>
          <button onClick={()=>{localStorage.removeItem('ec_token');window.location.reload();}}
            style={{marginTop:10,border:0,background:'transparent',color:'#64748b',fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Cerrar sesión y volver al ingreso</button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
