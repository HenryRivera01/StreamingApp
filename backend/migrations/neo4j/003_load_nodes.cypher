// Coloca los CSV en Neo4j import directory. Ejemplo: <NEO4J_HOME>/import/streaming/
// Luego ejecuta con :param baseUrl => 'file:///streaming/';

LOAD CSV WITH HEADERS FROM $baseUrl + 'usuario.csv' AS row
MERGE (u:Usuario {id_usuario: toInteger(row.id_usuario)})
SET u.nombre_completo = row.nombre_completo,
    u.correo = row.correo,
    u.contrasena_hash = coalesce(row.contrasena_hash, row.contrasena),
    u.pais = row.pais,
    u.fecha_registro = CASE WHEN coalesce(row.fecha_registro, '') = '' THEN NULL ELSE date(row.fecha_registro) END,
    u.estado_cuenta = row.estado_cuenta,
    u.rol = coalesce(nullif(row.rol, ''), 'USER');

LOAD CSV WITH HEADERS FROM $baseUrl + 'estado_reproduccion.csv' AS row
MERGE (er:EstadoReproduccion {id_estado: toInteger(row.id_estado)})
SET er.tipo_estado = row.tipo_estado;

LOAD CSV WITH HEADERS FROM $baseUrl + 'distribuidor.csv' AS row
MERGE (d:Distribuidor {id_distribuidor: toInteger(row.id_distribuidor)})
SET d.nombre = row.nombre;

LOAD CSV WITH HEADERS FROM $baseUrl + 'genero.csv' AS row
MERGE (g:Genero {id_genero: toInteger(row.id_genero)})
SET g.nombre_genero = row.nombre_genero;

LOAD CSV WITH HEADERS FROM $baseUrl + 'participante.csv' AS row
MERGE (p:Participante {id_participante: toInteger(row.id_participante)})
SET p.nombre_participante = row.nombre_participante,
    p.pais_origen = row.pais_origen,
    p.fecha_nacimiento = CASE WHEN coalesce(row.fecha_nacimiento, '') = '' THEN NULL ELSE date(row.fecha_nacimiento) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'dispositivo.csv' AS row
MERGE (d:Dispositivo {id_dispositivo: toInteger(row.id_dispositivo)})
SET d.id_usuario = CASE WHEN coalesce(row.id_usuario, '') = '' THEN NULL ELSE toInteger(row.id_usuario) END,
    d.tipo_dispositivo = row.tipo_dispositivo,
    d.sistema_operativo = row.sistema_operativo,
    d.fecha_registro_dispositivo = CASE WHEN coalesce(row.fecha_registro_dispositivo, '') = '' THEN NULL ELSE date(row.fecha_registro_dispositivo) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'calificacion.csv' AS row
MERGE (c:Calificacion {id_calificacion: toInteger(row.id_calificacion)})
SET c.id_usuario = toInteger(row.id_usuario),
        c.puntuacion = CASE
            WHEN coalesce(row.puntuacion, '') = '' THEN NULL
            WHEN toInteger(row.puntuacion) > 5 THEN toInteger(round(toFloat(row.puntuacion) / 2))
            ELSE toInteger(row.puntuacion)
        END,
    c.fecha_calificacion = CASE WHEN coalesce(row.fecha_calificacion, '') = '' THEN NULL ELSE date(row.fecha_calificacion) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'historial.csv' AS row
MERGE (h:Historial {id_historial: toInteger(row.id_historial)})
SET h.id_usuario = CASE WHEN coalesce(row.id_usuario, '') = '' THEN NULL ELSE toInteger(row.id_usuario) END,
    h.fecha_reproduccion = CASE WHEN coalesce(row.fecha_reproduccion, '') = '' THEN NULL ELSE date(row.fecha_reproduccion) END,
    h.tiempo_reproducido = CASE WHEN coalesce(row.tiempo_reproducido, '') = '' THEN NULL ELSE toInteger(row.tiempo_reproducido) END,
    h.id_estado = CASE WHEN coalesce(row.id_estado, '') = '' THEN NULL ELSE toInteger(row.id_estado) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'serie.csv' AS row
MERGE (s:Serie {id_serie: toInteger(row.id_serie)})
SET s.id_distribuidor = CASE WHEN coalesce(row.id_distribuidor, '') = '' THEN NULL ELSE toInteger(row.id_distribuidor) END,
    s.titulo = row.titulo,
    s.sinopsis = row.sinopsis,
    s.anio_inicio_emision = CASE WHEN coalesce(row.anio_inicio_emision, '') = '' THEN NULL ELSE toInteger(row.anio_inicio_emision) END,
    s.numero_temporadas = CASE WHEN coalesce(row.numero_temporadas, '') = '' THEN NULL ELSE toInteger(row.numero_temporadas) END,
    s.clasificacion_edad = row.clasificacion_edad,
    s.estado_serie = row.estado_serie;

LOAD CSV WITH HEADERS FROM $baseUrl + 'temporada.csv' AS row
MERGE (t:Temporada {id_temporada: toInteger(row.id_temporada)})
SET t.id_serie = CASE WHEN coalesce(row.id_serie, '') = '' THEN NULL ELSE toInteger(row.id_serie) END,
    t.numero_temporada = CASE WHEN coalesce(row.numero_temporada, '') = '' THEN NULL ELSE toInteger(row.numero_temporada) END,
    t.anio_lanzamiento = CASE WHEN coalesce(row.anio_lanzamiento, '') = '' THEN NULL ELSE toInteger(row.anio_lanzamiento) END;

LOAD CSV WITH HEADERS FROM $baseUrl + 'episodio.csv' AS row
MERGE (e:Episodio {id_episodio: toInteger(row.id_episodio)})
SET e.id_temporada = CASE WHEN coalesce(row.id_temporada, '') = '' THEN NULL ELSE toInteger(row.id_temporada) END,
    e.titulo = row.titulo,
    e.numero_episodio = CASE WHEN coalesce(row.numero_episodio, '') = '' THEN NULL ELSE toInteger(row.numero_episodio) END,
    e.duracion_minutos = CASE WHEN coalesce(row.duracion_minutos, '') = '' THEN NULL ELSE toInteger(row.duracion_minutos) END,
    e.sinopsis = row.sinopsis,
    e.url_video = row.url_video;

LOAD CSV WITH HEADERS FROM $baseUrl + 'pelicula.csv' AS row
MERGE (p:Pelicula {id_pelicula: toInteger(row.id_pelicula)})
SET p.id_distribuidor = CASE WHEN coalesce(row.id_distribuidor, '') = '' THEN NULL ELSE toInteger(row.id_distribuidor) END,
    p.titulo = row.titulo,
    p.sinopsis = row.sinopsis,
    p.anio_estreno = CASE WHEN coalesce(row.anio_estreno, '') = '' THEN NULL ELSE toInteger(row.anio_estreno) END,
    p.duracion_minutos = CASE WHEN coalesce(row.duracion_minutos, '') = '' THEN NULL ELSE toInteger(row.duracion_minutos) END,
    p.clasificacion_edad = row.clasificacion_edad,
    p.idioma_original = row.idioma_original,
    p.url_video = row.url_video;