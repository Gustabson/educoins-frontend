// DiwyHub.jsx — Central entry point for Diwy across all roles.
//
// Security model:
//   - Frontend role check is UI-only (to avoid confusing UX).
//   - Real authorization enforced server-side via JWT on every API call.
//   - Each child component only calls endpoints it is authorized for.
//   - No shared state or data flows between role views.
//
// Subscription (parent role):
//   - V1/beta: localStorage `${me.id}_diwy_premium` = "1"
//   - V2: replace with DB field check (GET /api/diwy/subscription)

import { useState } from "react";
import DiwyAdmin   from "./DiwyAdmin";
import DiwyMaestra from "./DiwyMaestra";
import DiwyPadre   from "./DiwyPadre";
import DiwyLanding from "./DiwyLanding";

export default function DiwyHub({ me, onBack, showToast }) {
  const [subscribed, setSubscribed] = useState(
    () => !!localStorage.getItem(`${me?.id}_diwy_premium`)
  );

  if (!me) return null;

  if (me.rol === "admin")   return <DiwyAdmin   showToast={showToast} onBack={onBack} />;
  if (me.rol === "teacher") return <DiwyMaestra me={me} />;

  if (me.rol === "parent") {
    if (!subscribed) {
      return (
        <DiwyLanding
          me={me}
          onBack={onBack}
          onActivate={() => setSubscribed(true)}
        />
      );
    }
    return <DiwyPadre showToast={showToast} onBack={onBack} />;
  }

  return null;
}
