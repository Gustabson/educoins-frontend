// DiwyHub.jsx — Central entry point for Diwy across all roles.
//
// Security model:
//   - Frontend role check is UI-only (to avoid confusing UX).
//   - Real authorization enforced server-side via JWT on every API call.
//   - Each child component only calls endpoints it is authorized for.
//   - No shared state or data flows between role views.
//
// La suscripción beta de padres se valida en el servidor.

import { useEffect, useState } from "react";
import { api } from "../../api";
import DiwyAdmin   from "./DiwyAdmin";
import DiwyMaestra from "./DiwyMaestra";
import DiwyPadre   from "./DiwyPadre";
import DiwyLanding from "./DiwyLanding";

export default function DiwyHub({ me, onBack, showToast }) {
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(me?.rol === "parent");

  useEffect(() => {
    if (me?.rol !== "parent") return;
    let alive = true;
    api.diwySubscription()
      .then(result => { if (alive) setSubscribed(!!result?.active); })
      .catch(() => { if (alive) setSubscribed(false); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [me?.id, me?.rol]);

  if (!me) return null;

  if (me.rol === "admin")   return <DiwyAdmin   showToast={showToast} onBack={onBack} />;
  if (me.rol === "teacher") return <DiwyMaestra me={me} />;

  if (me.rol === "parent") {
    if (checking) {
      return <div style={{ minHeight:"70vh", display:"grid", placeItems:"center", fontWeight:800 }}>Cargando Diwy…</div>;
    }
    if (!subscribed) {
      return (
        <DiwyLanding
          onBack={onBack}
          onActivate={() => setSubscribed(true)}
        />
      );
    }
    return <DiwyPadre showToast={showToast} onBack={onBack} />;
  }

  return null;
}
