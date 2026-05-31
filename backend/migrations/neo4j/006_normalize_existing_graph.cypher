// Normaliza un grafo ya cargado con nomenclatura vieja.
// Ejecutar sobre la base existente si antes cargaste relaciones ES_DE_GENERO / PARTICIPO_EN
// o usuarios con la propiedad contrasena en lugar de contrasena_hash.

// Usuarios: renombrar el hash a contrasena_hash sin perder compatibilidad
MATCH (u:Usuario)
WHERE u.contrasena_hash IS NULL AND u.contrasena IS NOT NULL
SET u.contrasena_hash = u.contrasena
REMOVE u.contrasena;

// Normalizar tipos numericos usados por la app
MATCH (u:Usuario)
SET u.id_usuario = CASE WHEN u.id_usuario IS NULL THEN NULL ELSE toInteger(u.id_usuario) END;

MATCH (d:Distribuidor)
SET d.id_distribuidor = CASE WHEN d.id_distribuidor IS NULL THEN NULL ELSE toInteger(d.id_distribuidor) END;

MATCH (g:Genero)
SET g.id_genero = CASE WHEN g.id_genero IS NULL THEN NULL ELSE toInteger(g.id_genero) END;

MATCH (p:Participante)
SET p.id_participante = CASE WHEN p.id_participante IS NULL THEN NULL ELSE toInteger(p.id_participante) END;

MATCH (s:Serie)
SET s.id_serie = CASE WHEN s.id_serie IS NULL THEN NULL ELSE toInteger(s.id_serie) END,
	s.id_distribuidor = CASE WHEN s.id_distribuidor IS NULL THEN NULL ELSE toInteger(s.id_distribuidor) END,
	s.anio_inicio_emision = CASE WHEN s.anio_inicio_emision IS NULL THEN NULL ELSE toInteger(s.anio_inicio_emision) END,
	s.numero_temporadas = CASE WHEN s.numero_temporadas IS NULL THEN NULL ELSE toInteger(s.numero_temporadas) END;

MATCH (t:Temporada)
SET t.id_temporada = CASE WHEN t.id_temporada IS NULL THEN NULL ELSE toInteger(t.id_temporada) END,
	t.id_serie = CASE WHEN t.id_serie IS NULL THEN NULL ELSE toInteger(t.id_serie) END,
	t.numero_temporada = CASE WHEN t.numero_temporada IS NULL THEN NULL ELSE toInteger(t.numero_temporada) END,
	t.anio_lanzamiento = CASE WHEN t.anio_lanzamiento IS NULL THEN NULL ELSE toInteger(t.anio_lanzamiento) END;

MATCH (e:Episodio)
SET e.id_episodio = CASE WHEN e.id_episodio IS NULL THEN NULL ELSE toInteger(e.id_episodio) END,
	e.id_temporada = CASE WHEN e.id_temporada IS NULL THEN NULL ELSE toInteger(e.id_temporada) END,
	e.numero_episodio = CASE WHEN e.numero_episodio IS NULL THEN NULL ELSE toInteger(e.numero_episodio) END,
	e.duracion_minutos = CASE WHEN e.duracion_minutos IS NULL THEN NULL ELSE toInteger(e.duracion_minutos) END;

MATCH (p:Pelicula)
SET p.id_pelicula = CASE WHEN p.id_pelicula IS NULL THEN NULL ELSE toInteger(p.id_pelicula) END,
	p.id_distribuidor = CASE WHEN p.id_distribuidor IS NULL THEN NULL ELSE toInteger(p.id_distribuidor) END,
	p.anio_estreno = CASE WHEN p.anio_estreno IS NULL THEN NULL ELSE toInteger(p.anio_estreno) END,
	p.duracion_minutos = CASE WHEN p.duracion_minutos IS NULL THEN NULL ELSE toInteger(p.duracion_minutos) END;

MATCH (h:Historial)
SET h.id_historial = CASE WHEN h.id_historial IS NULL THEN NULL ELSE toInteger(h.id_historial) END,
	h.id_usuario = CASE WHEN h.id_usuario IS NULL THEN NULL ELSE toInteger(h.id_usuario) END,
	h.id_estado = CASE WHEN h.id_estado IS NULL THEN NULL ELSE toInteger(h.id_estado) END,
	h.tiempo_reproducido = CASE WHEN h.tiempo_reproducido IS NULL THEN NULL ELSE toInteger(h.tiempo_reproducido) END;

MATCH (c:Calificacion)
SET c.id_calificacion = CASE WHEN c.id_calificacion IS NULL THEN NULL ELSE toInteger(c.id_calificacion) END,
	c.id_usuario = CASE WHEN c.id_usuario IS NULL THEN NULL ELSE toInteger(c.id_usuario) END,
		c.puntuacion = CASE
			WHEN c.puntuacion IS NULL THEN NULL
			WHEN toInteger(c.puntuacion) > 5 THEN toInteger(round(toFloat(c.puntuacion) / 2))
			ELSE toInteger(c.puntuacion)
		END;

// Generos de peliculas
MATCH (p:Pelicula)-[r:ES_DE_GENERO]->(g:Genero)
MERGE (p)-[:TIENE_GENERO {genero_principal: r.genero_principal}]->(g)
DELETE r;

// Generos de episodios
MATCH (e:Episodio)-[r:ES_DE_GENERO]->(g:Genero)
MERGE (e)-[:TIENE_GENERO {genero_principal: r.genero_principal}]->(g)
DELETE r;

// Participantes en peliculas
MATCH (pa:Participante)-[r:PARTICIPO_EN]->(p:Pelicula)
MERGE (pa)-[:PARTICIPA_EN {rol: r.rol}]->(p)
DELETE r;

// Participantes en episodios
MATCH (pa:Participante)-[r:PARTICIPO_EN]->(e:Episodio)
MERGE (pa)-[:PARTICIPA_EN {rol: r.rol}]->(e)
DELETE r;
