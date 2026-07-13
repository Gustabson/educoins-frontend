# EduCoins Frontend

Interfaz React de la economía escolar EduCoins. Incluye portales separados para alumnado, docentes, administración y familias, comunicación en tiempo real y soporte instalable/offline.

## Desarrollo

Requiere Node.js 20.19 o superior.

```bash
npm ci
npm start
```

La aplicación local abre en `http://localhost:3001` y usa `http://localhost:3000` como API cuando no se configura otra URL.

Variables admitidas:

```env
VITE_API_URL=https://tu-backend.up.railway.app
```

Por compatibilidad con el despliegue anterior también se acepta `REACT_APP_API_URL`.

## Controles antes de publicar

```bash
npm test
npm run lint -- --quiet
npm run build
npm audit
```

Vite genera el sitio en `dist/`. Los contenedores de cada rol se cargan de forma diferida para reducir la descarga inicial. Vercel despliega automáticamente cada push a `main`.

## PWA y seguridad

`public/service-worker.js` mantiene un shell básico para ingreso offline y actualiza las navegaciones con estrategia network-first. `vercel.json` aplica headers de seguridad, caché inmutable a los bundles versionados y fallback de SPA.
