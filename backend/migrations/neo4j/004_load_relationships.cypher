// Coloca los CSV en Neo4j import directory y define: :param baseUrl => 'file:///streaming/'

// Relaciones base por FK directa
MATCH (s:Serie), (d:Distribuidor)
WHERE s.id_distribuidor = d.id_distribuidor
MERGE (s)-[:DISTRIBUIDA_POR]->(d);

MATCH (p:Pelicula), (d:Distribuidor)
WHERE p.id_distribuidor = d.id_distribuidor
MERGE (p)-[:DISTRIBUIDA_POR]->(d);

MATCH (s:Serie), (t:Temporada)
WHERE t.id_serie = s.id_serie
MERGE (s)-[:TIENE_TEMPORADA]->(t);

MATCH (t:Temporada), (e:Episodio)
WHERE e.id_temporada = t.id_temporada
MERGE (t)-[:TIENE_EPISODIO]->(e);

MATCH (di:Dispositivo), (u:Usuario)
WHERE di.id_usuario = u.id_usuario
MERGE (di)-[:PERTENECE_A]->(u);

MATCH (h:Historial), (u:Usuario)
WHERE h.id_usuario = u.id_usuario
MERGE (u)-[:TIENE_HISTORIAL]->(h);

MATCH (h:Historial), (er:EstadoReproduccion)
WHERE h.id_estado = er.id_estado
MERGE (h)-[:CON_ESTADO]->(er);

MATCH (u:Usuario), (c:Calificacion)
WHERE c.id_usuario = u.id_usuario
MERGE (u)-[:REALIZO_CALIFICACION]->(c);

// Tablas puente desde CSV
LOAD CSV WITH HEADERS FROM $baseUrl + 'pelicula_genero.csv' AS row
MATCH (p:Pelicula {id_pelicula: toInteger(row.id_pelicula)})
MATCH (g:Genero {id_genero: toInteger(row.id_genero)})
MERGE (p)-[r:TIENE_GENERO]->(g)
SET r.genero_principal = row.genero_principal;

LOAD CSV WITH HEADERS FROM $baseUrl + 'episodio_genero.csv' AS row
MATCH (e:Episodio {id_episodio: toInteger(row.id_episodio)})
MATCH (g:Genero {id_genero: toInteger(row.id_genero)})
MERGE (e)-[r:TIENE_GENERO]->(g)
SET r.genero_principal = row.genero_principal;

LOAD CSV WITH HEADERS FROM $baseUrl + 'participante_pelicula.csv' AS row
MATCH (pa:Participante {id_participante: toInteger(row.id_participante)})
MATCH (p:Pelicula {id_pelicula: toInteger(row.id_pelicula)})
MERGE (pa)-[r:PARTICIPA_EN]->(p)
SET r.rol = row.rol;

LOAD CSV WITH HEADERS FROM $baseUrl + 'participante_episodio.csv' AS row
MATCH (pa:Participante {id_participante: toInteger(row.id_participante)})
MATCH (e:Episodio {id_episodio: toInteger(row.id_episodio)})
MERGE (pa)-[r:PARTICIPA_EN]->(e)
SET r.rol = row.rol;

LOAD CSV WITH HEADERS FROM $baseUrl + 'historial_pelicula.csv' AS row
MATCH (h:Historial {id_historial: toInteger(row.id_historial)})
MATCH (p:Pelicula {id_pelicula: toInteger(row.id_pelicula)})
MERGE (h)-[r:REPRODUCIO]->(p)
SET r.ultimo_minuto = CASE WHEN coalesce(row.ultimo_minuto, '') = '' THEN NULL ELSE toInteger(row.ultimo_minuto) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'historial_episodio.csv' AS row
MATCH (h:Historial {id_historial: toInteger(row.id_historial)})
MATCH (e:Episodio {id_episodio: toInteger(row.id_episodio)})
MERGE (h)-[r:REPRODUCIO]->(e)
SET r.ultimo_minuto = CASE WHEN coalesce(row.ultimo_minuto, '') = '' THEN NULL ELSE toInteger(row.ultimo_minuto) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'calificacion_pelicula.csv' AS row
MATCH (c:Calificacion {id_calificacion: toInteger(row.id_calificacion)})
MATCH (p:Pelicula {id_pelicula: toInteger(row.id_pelicula)})
MERGE (c)-[r:CALIFICO]->(p)
SET r.fecha_calificacion = CASE WHEN coalesce(row.fecha_calificacion_p, '') = '' THEN NULL ELSE date(row.fecha_calificacion_p) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'calificacion_episodio.csv' AS row
MATCH (c:Calificacion {id_calificacion: toInteger(row.id_calificacion)})
MATCH (e:Episodio {id_episodio: toInteger(row.id_episodio)})
MERGE (c)-[r:CALIFICO]->(e)
SET r.fecha_calificacion = CASE WHEN coalesce(row.fecha_calificacion_ep, '') = '' THEN NULL ELSE date(row.fecha_calificacion_ep) END;