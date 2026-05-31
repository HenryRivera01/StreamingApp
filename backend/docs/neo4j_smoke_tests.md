# Smoke tests por fase de cutover

Runner: `scripts/neo4j/smoke_cutover.js`

## 1) Variables de entorno

- `SMOKE_BASE_URL` (default `http://localhost:4000`)
- `SMOKE_EMAIL` y `SMOKE_PASSWORD` (opcional para usuario estándar)
- `SMOKE_ADMIN_EMAIL` y `SMOKE_ADMIN_PASSWORD` (requerido para fases con admin)

Si no defines `SMOKE_EMAIL/SMOKE_PASSWORD`, el script crea un usuario temporal con `/api/auth/register`.

## 2) Ejecución

```powershell
npm run smoke:cutover -- --phase media
npm run smoke:cutover -- --phase media-users
npm run smoke:cutover -- --phase media-users-admin
npm run smoke:cutover -- --phase all-neo4j
```

## 3) Cobertura por fase

- `media`
  - `GET /api/media/movies`
  - `GET /api/media/series`
  - `GET /api/media/movies/:id` (si hay datos)
  - `GET /api/media/series/:id/episodes` (si hay datos)

- `media-users`
  - Todo lo anterior
  - Login/register operativo para token de usuario

- `media-users-admin`
  - Todo lo anterior
  - `GET /api/admin/dashboard`
  - `GET /api/admin/advanced-queries`

- `all-neo4j`
  - Todo lo anterior
  - `GET /api/media/upload-form-data`

## 4) Sugerencia operativa

Después de cada `cutover:apply`, ejecutar el smoke de la fase correspondiente y luego `npm run etl:reconcile`.
