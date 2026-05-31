# Neo4j migration start (fases 1 y 2)

Este documento describe el primer corte implementado para habilitar migracion gradual.

## 1. Variables de entorno

En `.env` se agregaron flags y conexion Neo4j:

- `NEO4J_USERS_ENABLED=false`
- `NEO4J_MEDIA_ENABLED=false`
- `NEO4J_ADMIN_ENABLED=false`
- `NEO4J_UPLOADS_ENABLED=false`
- `NEO4J_URI=bolt://localhost:7687`
- `NEO4J_USER=neo4j`
- `NEO4J_PASSWORD=neo4j_password`
- `NEO4J_DATABASE=neo4j`

Con los flags en `false`, todo sigue usando PostgreSQL.

## 2. Modulos con dual stack

Se habilito ruta SQL/Neo4j en:

- `models/userModel.js`
- `models/mediaModel.js`
- `controllers/adminController.js` (dashboard y advanced-queries)
- `routes/uploadFormDataRoutes.js`
- `routes/uploadRoutes.js`

Cuando el flag correspondiente esta en `true`, esas consultas usan Cypher.

## 3. Scripts Cypher iniciales

- `migrations/neo4j/001_constraints.cypher`
- `migrations/neo4j/002_base_relationships.cypher`
- `migrations/neo4j/005_demo_seed.cypher` (seed de prueba coherente con la app)

Orden recomendado:

1. Crear constraints.
2. Cargar nodos desde CSV (pendiente en siguiente fase).
3. Ejecutar relaciones base.

Nota: en el modelo actual de la app, las relaciones de catálogo usan `TIENE_GENERO` y `PARTICIPA_EN`, mientras que las calificaciones se modelan con nodo `Calificacion` + `REALIZO_CALIFICACION` + `CALIFICO`.

## 4. Prueba incremental sugerida

1. Dejar ambos flags en `false` y validar backend normal.
2. Cargar Neo4j con un subconjunto de datos.
3. Activar `NEO4J_MEDIA_ENABLED=true` y probar:
   - `/api/media/movies`
   - `/api/media/series`
   - `/api/media/series/:id/episodes`
4. Luego activar `NEO4J_USERS_ENABLED=true` y probar:
   - `/api/auth/register`
   - `/api/auth/login`
5. Activar `NEO4J_ADMIN_ENABLED=true` y probar:
   - `/api/admin/dashboard`
   - `/api/admin/advanced-queries`
6. Activar `NEO4J_UPLOADS_ENABLED=true` y probar:
   - `/api/media/upload-form-data`
   - `/api/media/upload-movie`
   - `/api/media/upload-series-episode`

## 4.1 Limpiar y volver a cargar para pruebas

Si quieres ver el grafo limpio y consistente desde cero en una base local de desarrollo:

1. Abre Neo4j Browser o `cypher-shell`.
2. Ejecuta `migrations/neo4j/007_reset_and_seed_demo.cypher`.
3. Comprueba que exista el seed demo:

```cypher
MATCH (u:Usuario {correo: 'henry@email.com'}) RETURN u;
MATCH (u:Usuario)-[:TIENE_HISTORIAL]->(h:Historial) RETURN u, h;
MATCH (u:Usuario)-[:REALIZO_CALIFICACION]->(c:Calificacion) RETURN u, c;
```

4. Luego levanta el backend con `NEO4J_USERS_ENABLED=true` y registra un nuevo usuario desde la UI o con `npm run test:auth`.
5. Para ver el nuevo usuario en Browser:

```cypher
MATCH (u:Usuario)
RETURN u
ORDER BY u.id_usuario DESC
LIMIT 10;
```

6. Para mostrar el correo en el nodo:

```cypher
:style
node.Usuario { caption: '{correo}' }
```

## 5. Fase 2 ETL (implementada)

Se agregaron archivos para migración masiva de datos históricos.

### 5.1 Exportación SQL -> CSV

- Script: `scripts/neo4j/export_pg_to_csv.js`
- Comando: `npm run etl:export:csv`
- Salida por defecto: `migrations/neo4j/csv/`

CSV incluidos:

- Maestros: `usuario`, `estado_reproduccion`, `distribuidor`, `genero`, `participante`, `dispositivo`, `calificacion`, `historial`, `serie`, `temporada`, `episodio`, `pelicula`
- Puentes: `pelicula_genero`, `episodio_genero`, `participante_pelicula`, `participante_episodio`, `historial_pelicula`, `historial_episodio`, `calificacion_pelicula`, `calificacion_episodio`

### 5.2 Carga en Neo4j

- `migrations/neo4j/003_load_nodes.cypher` (nodos)
- `migrations/neo4j/004_load_relationships.cypher` (relaciones)
- `migrations/neo4j/005_demo_seed.cypher` (seed manual de ejemplo)
- `migrations/neo4j/006_normalize_existing_graph.cypher` (normaliza un grafo ya cargado)

Orden recomendado:

1. Ejecutar `001_constraints.cypher`
2. Copiar CSV al `import` de Neo4j
3. Ejecutar `003_load_nodes.cypher`
4. Ejecutar `004_load_relationships.cypher`

Si ya habías cargado datos con nombres viejos (`ES_DE_GENERO`, `PARTICIPO_EN` o `contrasena`), ejecuta después `006_normalize_existing_graph.cypher` para convertir el grafo a la nomenclatura actual sin rehacer todo desde cero.

Nota: en `cypher-shell`, define `:param baseUrl => 'file:///streaming/'` para que `LOAD CSV` encuentre los archivos.

### 5.3 Reconciliación PG vs Neo4j

- Script: `scripts/neo4j/reconcile_pg_neo4j.js`
- Comando: `npm run etl:reconcile`

Este chequeo compara conteos de nodos y relaciones contra PostgreSQL y retorna código de error si detecta diferencias.

## 6. Qué vas a ver en Neo4j Browser

Si un `Usuario` tiene un hash de contraseña, Browser lo va a mostrar como propiedad del nodo. Eso es normal porque la app necesita guardar ese hash para poder validar el login.

Para que el nodo se vea con correo o nombre en el grafo, ejecuta en Browser:

```cypher
:style
node.Usuario { caption: '{correo}' }
```

Si prefieres mostrar el nombre completo:

```cypher
:style
node.Usuario { caption: '{nombre_completo}' }
```

## 7. Fase 3 cutover controlado (implementada)

Se agregó utilitario para activar flags por fase y rollback con snapshots.

- Script: `scripts/neo4j/cutover_flags.js`
- Comandos:
  - `npm run cutover:status`
  - `npm run cutover:list`
  - `npm run cutover:apply -- <fase>`
  - `npm run cutover:rollback -- <ruta_snapshot>`

Runbook completo:

- `docs/neo4j_cutover_runbook.md`
- `docs/neo4j_smoke_tests.md`

## 8. Siguiente fase

- Ejecutar prueba de cutover en staging (incluyendo rollback real).
- Automatizar smoke tests API por fase de activación.
- Preparar ventana de cambio para producción.
