// Estas sentencias asumen que los nodos ya existen cargados por ID.

// Jerarquia de catalogo
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

// Dispositivo -> Usuario
MATCH (di:Dispositivo), (u:Usuario)
WHERE di.id_usuario = u.id_usuario
MERGE (di)-[:PERTENECE_A]->(u);

// Historial -> Usuario y Estado
MATCH (h:Historial), (u:Usuario)
WHERE h.id_usuario = u.id_usuario
MERGE (u)-[:TIENE_HISTORIAL]->(h);

MATCH (h:Historial), (er:EstadoReproduccion)
WHERE h.id_estado = er.id_estado
MERGE (h)-[:CON_ESTADO]->(er);
