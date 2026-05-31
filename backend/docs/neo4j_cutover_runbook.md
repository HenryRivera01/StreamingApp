# Neo4j cutover runbook (fase 3)

Este runbook define activación gradual de flags Neo4j y rollback inmediato.

## 1) Fases de activación

Fases soportadas por el script:

- `sql-only`
- `media`
- `media-users`
- `media-users-admin`
- `all-neo4j`

## 2) Comandos disponibles

```powershell
npm run cutover:status
npm run cutover:list
npm run cutover:apply -- sql-only
npm run cutover:apply -- media
npm run cutover:apply -- media-users
npm run cutover:apply -- media-users-admin
npm run cutover:apply -- all-neo4j
```

El script crea snapshot automático de `.env` en `migrations/neo4j/snapshots/` antes de cada cambio.

## 3) Checklist por fase

Antes de cada fase:

1. Backend sin errores en arranque.
2. `npm run etl:reconcile` en verde.
3. Monitoreo listo (errores API, latencia, logs).

Validaciones por fase:

- `media`: endpoints de catálogo/streaming.
- `media-users`: registro/login y perfil por id.
- `media-users-admin`: dashboard y advanced queries.
- `all-neo4j`: uploads + flujo completo E2E.

Runner automatizado de smoke por fase:

- `npm run smoke:cutover -- --phase media`
- `npm run smoke:cutover -- --phase media-users`
- `npm run smoke:cutover -- --phase media-users-admin`
- `npm run smoke:cutover -- --phase all-neo4j`
- Referencia: `docs/neo4j_smoke_tests.md`

Pipeline integral (aplicar fase + smoke + reconciliación):

```powershell
npm run cutover:pipeline -- --phase media
npm run cutover:pipeline -- --phase media-users
npm run cutover:pipeline -- --phase media-users-admin
npm run cutover:pipeline -- --phase all-neo4j
```

Opciones útiles:

- `--skip-apply`
- `--skip-smoke`
- `--skip-reconcile`
- `--no-rollback-on-fail`

Por defecto, si smoke o reconciliación fallan tras `apply`, el pipeline ejecuta rollback automático usando el snapshot recién creado.

Después de cada fase:

1. Ejecutar smoke tests API.
2. Verificar métricas 10-15 min.
3. Continuar solo si no hay regresiones.

## 4) Rollback inmediato

Lista snapshots disponibles y usa uno:

```powershell
Get-ChildItem .\migrations\neo4j\snapshots
npm run cutover:rollback -- .\migrations\neo4j\snapshots\.env.snapshot.YYYYMMDD-HHMMSS
```

Rollback manual rápido a SQL-only:

```powershell
npm run cutover:apply -- sql-only
```

## 5) Criterio de corte final

Promover a `all-neo4j` solo cuando:

- 3 corridas consecutivas de reconciliación sin diferencias.
- 0 errores críticos en APIs durante ventana de observación.
- Rollback validado al menos una vez en entorno de pruebas.
