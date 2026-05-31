// SOLO PARA DESARROLLO LOCAL.
// Limpia el grafo completo y lo deja con constraints + seed demo coherente con la app.
// Ejecuta este archivo solo en una base de pruebas.

MATCH (n)
DETACH DELETE n;

// Constraints base
CREATE CONSTRAINT usuario_id IF NOT EXISTS FOR (u:Usuario) REQUIRE u.id_usuario IS UNIQUE;
CREATE CONSTRAINT usuario_correo IF NOT EXISTS FOR (u:Usuario) REQUIRE u.correo IS UNIQUE;
CREATE CONSTRAINT pelicula_id IF NOT EXISTS FOR (p:Pelicula) REQUIRE p.id_pelicula IS UNIQUE;
CREATE CONSTRAINT serie_id IF NOT EXISTS FOR (s:Serie) REQUIRE s.id_serie IS UNIQUE;
CREATE CONSTRAINT temporada_id IF NOT EXISTS FOR (t:Temporada) REQUIRE t.id_temporada IS UNIQUE;
CREATE CONSTRAINT episodio_id IF NOT EXISTS FOR (e:Episodio) REQUIRE e.id_episodio IS UNIQUE;
CREATE CONSTRAINT participante_id IF NOT EXISTS FOR (p:Participante) REQUIRE p.id_participante IS UNIQUE;
CREATE CONSTRAINT genero_id IF NOT EXISTS FOR (g:Genero) REQUIRE g.id_genero IS UNIQUE;
CREATE CONSTRAINT distribuidor_id IF NOT EXISTS FOR (d:Distribuidor) REQUIRE d.id_distribuidor IS UNIQUE;
CREATE CONSTRAINT dispositivo_id IF NOT EXISTS FOR (d:Dispositivo) REQUIRE d.id_dispositivo IS UNIQUE;
CREATE CONSTRAINT historial_id IF NOT EXISTS FOR (h:Historial) REQUIRE h.id_historial IS UNIQUE;
CREATE CONSTRAINT calificacion_id IF NOT EXISTS FOR (c:Calificacion) REQUIRE c.id_calificacion IS UNIQUE;
CREATE CONSTRAINT estado_reproduccion_id IF NOT EXISTS FOR (e:EstadoReproduccion) REQUIRE e.id_estado IS UNIQUE;

// Seed demo coherente con el modelo actual de la app.
MERGE (u:Usuario {id_usuario: 1})
SET u.nombre_completo = 'Henry Rivera',
    u.correo = 'henry@email.com',
    u.contrasena_hash = '$2a$10$demoHashParaNeo4jBrowserNoLogin',
    u.pais = 'Colombia',
    u.fecha_registro = date('2024-01-15'),
    u.estado_cuenta = 'ACTIVA',
    u.rol = 'USER';

MERGE (d:Distribuidor {id_distribuidor: 1})
SET d.nombre = 'Netflix';

MERGE (g:Genero {id_genero: 1})
SET g.nombre_genero = 'Drama';

MERGE (pa:Participante {id_participante: 1})
SET pa.nombre_participante = 'Bryan Cranston',
    pa.pais_origen = 'USA',
    pa.fecha_nacimiento = date('1956-03-07');

MERGE (er:EstadoReproduccion {id_estado: 1})
SET er.tipo_estado = 'completado';

MERGE (s:Serie {id_serie: 1})
SET s.id_distribuidor = 1,
    s.titulo = 'Breaking Bad',
    s.sinopsis = 'Un profesor de química se convierte en fabricante de metanfetaminas.',
    s.anio_inicio_emision = 2008,
    s.numero_temporadas = 1,
    s.clasificacion_edad = 'TV-MA',
    s.estado_serie = 'FINALIZADA';

MERGE (t:Temporada {id_temporada: 1})
SET t.id_serie = 1,
    t.numero_temporada = 1,
    t.anio_lanzamiento = 2008;

MERGE (e:Episodio {id_episodio: 1})
SET e.id_temporada = 1,
    e.titulo = 'Pilot',
    e.numero_episodio = 1,
    e.duracion_minutos = 58,
    e.sinopsis = 'Walter White recibe un diagnóstico de cáncer.',
    e.url_video = 'https://stream.example.com/bb/s01e01';

MERGE (p:Pelicula {id_pelicula: 1})
SET p.id_distribuidor = 1,
    p.titulo = 'El Laberinto del Fauno',
    p.sinopsis = 'Una niña descubre un mundo de fantasía en la España de posguerra.',
    p.anio_estreno = 2006,
    p.duracion_minutos = 118,
    p.clasificacion_edad = 'R',
    p.idioma_original = 'Español',
    p.url_video = 'https://stream.example.com/laberinto';

MERGE (di:Dispositivo {id_dispositivo: 1})
SET di.id_usuario = 1,
    di.tipo_dispositivo = 'Smart TV',
    di.sistema_operativo = 'Tizen',
    di.fecha_registro_dispositivo = date('2024-03-01');

MERGE (h:Historial {id_historial: 1})
SET h.id_usuario = 1,
    h.id_estado = 1,
    h.fecha_reproduccion = date('2025-11-20'),
    h.tiempo_reproducido = 45;

MERGE (c1:Calificacion {id_calificacion: 1})
SET c1.id_usuario = 1,
    c1.puntuacion = 4,
    c1.fecha_calificacion = date('2025-11-21');

MERGE (c2:Calificacion {id_calificacion: 2})
SET c2.id_usuario = 1,
    c2.puntuacion = 5,
    c2.fecha_calificacion = date('2025-11-20');

MATCH (s:Serie {id_serie: 1}), (d:Distribuidor {id_distribuidor: 1})
MERGE (s)-[:DISTRIBUIDA_POR]->(d);

MATCH (p:Pelicula {id_pelicula: 1}), (d:Distribuidor {id_distribuidor: 1})
MERGE (p)-[:DISTRIBUIDA_POR]->(d);

MATCH (s:Serie {id_serie: 1}), (t:Temporada {id_temporada: 1})
MERGE (s)-[:TIENE_TEMPORADA]->(t);

MATCH (t:Temporada {id_temporada: 1}), (e:Episodio {id_episodio: 1})
MERGE (t)-[:TIENE_EPISODIO]->(e);

MATCH (e:Episodio {id_episodio: 1}), (g:Genero {id_genero: 1})
MERGE (e)-[:TIENE_GENERO {genero_principal: 'Drama'}]->(g);

MATCH (p:Pelicula {id_pelicula: 1}), (g:Genero {id_genero: 1})
MERGE (p)-[:TIENE_GENERO {genero_principal: 'Fantasía'}]->(g);

MATCH (pa:Participante {id_participante: 1}), (e:Episodio {id_episodio: 1})
MERGE (pa)-[:PARTICIPA_EN {rol: 'Actor Principal'}]->(e);

MATCH (pa:Participante {id_participante: 1}), (p:Pelicula {id_pelicula: 1})
MERGE (pa)-[:PARTICIPA_EN {rol: 'Director'}]->(p);

MATCH (di:Dispositivo {id_dispositivo: 1}), (u:Usuario {id_usuario: 1})
MERGE (di)-[:PERTENECE_A]->(u);

MATCH (u:Usuario {id_usuario: 1}), (h:Historial {id_historial: 1})
MERGE (u)-[:TIENE_HISTORIAL]->(h);

MATCH (h:Historial {id_historial: 1}), (er:EstadoReproduccion {id_estado: 1})
MERGE (h)-[:CON_ESTADO]->(er);

MATCH (h:Historial {id_historial: 1}), (e:Episodio {id_episodio: 1})
MERGE (h)-[:REPRODUCIO {ultimo_minuto: 45}]->(e);

MATCH (h:Historial {id_historial: 1}), (p:Pelicula {id_pelicula: 1})
MERGE (h)-[:REPRODUCIO {ultimo_minuto: 90}]->(p);

MATCH (u:Usuario {id_usuario: 1}), (c1:Calificacion {id_calificacion: 1})
MERGE (u)-[:REALIZO_CALIFICACION]->(c1);

MATCH (u:Usuario {id_usuario: 1}), (c2:Calificacion {id_calificacion: 2})
MERGE (u)-[:REALIZO_CALIFICACION]->(c2);

MATCH (c1:Calificacion {id_calificacion: 1}), (p:Pelicula {id_pelicula: 1})
MERGE (c1)-[:CALIFICO]->(p);

MATCH (c2:Calificacion {id_calificacion: 2}), (e:Episodio {id_episodio: 1})
MERGE (c2)-[:CALIFICO]->(e);
