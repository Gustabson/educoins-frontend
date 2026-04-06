// DiwyHub.jsx — Central entry point for Diwy across all roles.
//
// Security model:
//   - Frontend role check is UI-only (to avoid confusing UX).
//   - Real authorization enforced server-side via JWT on every API call.
//   - Each child component only calls endpoints it is authorized for.
//   - No shared state or data flows between role views.

import DiwyAdmin   from "./DiwyAdmin";
import DiwyMaestra from "./DiwyMaestra";
import DiwyPadre   from "./DiwyPadre";

export default function DiwyHub({ me, onBack, showToast }) {
  if (!me) return null;

  if (me.rol === "admin")   return <DiwyAdmin   showToast={showToast} onBack={onBack} />;
  if (me.rol === "teacher") return <DiwyMaestra me={me} />;
  if (me.rol === "parent")  return <DiwyPadre   showToast={showToast} onBack={onBack} />;

  // Unknown role — render nothing (backend would reject any API call anyway)
  return null;
}
