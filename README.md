<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Coccole Fit Ops (Nutrifit)

Sistema integral de gestión operativa, punto de venta (POS), bitácora de tareas, control de inventario, asistencia y gamificación de rendimiento para locales comerciales de Coccole Fit.

## Características Principales

- **Punto de Venta (POS) & Ventas Sugeridas**: Registro ágil de ventas, clasificación de métodos de pago (Efectivo, Tarjeta/Datafono, Transferencia/Nequi/Daviplata, Rappi/Domicilio) y sugerencias de venta cruzada (upsell).
- **Bitácora de Tareas Diarias & Productividad**: Asignación y seguimiento de checklists operativos en tiempo real con evidencia fotográfica.
- **Auditoría e Integridad de Base de Datos**: Health check interactivo y verificación de esquemas en Supabase.
- **Ranking y Leaderboard Gamificado**: Ponderación configurable de cumplimiento de tareas, ventas y puntualidad.
- **Cola de Sincronización Fuera de Línea (Offline Sync Queue)**: Resiliencia ante caídas de internet en el local comercial con auto-sincronización en segundo plano.
- **Diagnóstico Inteligente con Gemini AI**: Análisis analítico del rendimiento de trabajadores con Google Gemini 3.7 Flash y protección con rate limiting.

## Arquitectura y Optimizaciones Técnicas

- **Code Splitting & Lazy Loading**: Carga diferida de módulos pesados (`AdminDashboard`, `EmployeeWorkspace`, `AnalyticsPanel`) mediante `React.lazy` y `Suspense`, reduciendo el tiempo de carga inicial en tablets y terminales POS.
- **Memoización con `useMemo` y `React.memo`**: Optimización de cálculos matemáticos y métricas de gamificación para evitar re-renderizados innecesarios.
- **Seguridad en Servidor Express**: Encabezados de seguridad HTTP (`nosniff`, `SAMEORIGIN`), rate limiter para llamadas de IA y timeouts controlados.
- **Exportación CSV con UTF-8 BOM**: Descarga limpia y compatible con Excel de reportes de ventas y finanzas.

## Ejecución Local

**Prerrequisitos:** Node.js (v18+ recomendado)

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar variables de entorno en `.env`:
   ```bash
   GEMINI_API_KEY=tu_api_key_de_gemini
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```
3. Iniciar en modo desarrollo:
   ```bash
   npm run dev
   ```
4. Construir para producción:
   ```bash
   npm run build
   ```

## Pruebas

Para ejecutar las pruebas unitarias de la lógica financiera y operativa:
```bash
npm run test # o npx vitest
```
