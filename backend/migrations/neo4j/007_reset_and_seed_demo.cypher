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
// Passwords bcrypt:
// - Admin123!: $2a$10$fgnZn6YwG5mb1kGHJmfuI.L20nGRbpKT.Tf2G3wFIIRFXFfmcLNHS
// - User123!:  $2a$10$zxzzzj5opIsD1LX0hChXFuiLisQr8AceCewarok.DP7p.VsJDa6he
MERGE (admin:Usuario {id_usuario: 99})
SET admin.nombre_completo = 'Admin Sistema',
    admin.correo = 'admin@streaming.local',
    admin.contrasena_hash = '$2a$10$fgnZn6YwG5mb1kGHJmfuI.L20nGRbpKT.Tf2G3wFIIRFXFfmcLNHS',
    admin.pais = 'Colombia',
    admin.fecha_registro = date('2024-02-01'),
    admin.estado_cuenta = 'ACTIVA',
    admin.rol = 'ADMIN';

MERGE (u:Usuario {id_usuario: 1})
SET u.nombre_completo = 'Henry Rivera',
    u.correo = 'henry@email.com',
    u.contrasena_hash = '$2a$10$zxzzzj5opIsD1LX0hChXFuiLisQr8AceCewarok.DP7p.VsJDa6he',
    u.pais = 'Colombia',
    u.fecha_registro = date('2024-01-15'),
    u.estado_cuenta = 'ACTIVA',
    u.rol = 'USER';

MERGE (u2:Usuario {id_usuario: 2})
SET u2.nombre_completo = 'Maria Gomez',
    u2.correo = 'maria@email.com',
    u2.contrasena_hash = '$2a$10$zxzzzj5opIsD1LX0hChXFuiLisQr8AceCewarok.DP7p.VsJDa6he',
    u2.pais = 'Colombia',
    u2.fecha_registro = date('2024-01-20'),
    u2.estado_cuenta = 'ACTIVA',
    u2.rol = 'USER';

MERGE (u3:Usuario {id_usuario: 3})
SET u3.nombre_completo = 'Juan Perez',
    u3.correo = 'juan@email.com',
    u3.contrasena_hash = '$2a$10$zxzzzj5opIsD1LX0hChXFuiLisQr8AceCewarok.DP7p.VsJDa6he',
    u3.pais = 'Mexico',
    u3.fecha_registro = date('2024-01-25'),
    u3.estado_cuenta = 'ACTIVA',
    u3.rol = 'USER';

MERGE (u4:Usuario {id_usuario: 4})
SET u4.nombre_completo = 'Laura Ruiz',
    u4.correo = 'laura@email.com',
    u4.contrasena_hash = '$2a$10$zxzzzj5opIsD1LX0hChXFuiLisQr8AceCewarok.DP7p.VsJDa6he',
    u4.pais = 'Peru',
    u4.fecha_registro = date('2024-02-02'),
    u4.estado_cuenta = 'ACTIVA',
    u4.rol = 'USER';

MERGE (d:Distribuidor {id_distribuidor: 1})
SET d.nombre = 'Netflix';

MERGE (d2:Distribuidor {id_distribuidor: 2})
SET d2.nombre = 'HBO';

MERGE (d3:Distribuidor {id_distribuidor: 3})
SET d3.nombre = 'Universal';

MERGE (g:Genero {id_genero: 1})
SET g.nombre_genero = 'Drama';

MERGE (g2:Genero {id_genero: 2})
SET g2.nombre_genero = 'Accion';

MERGE (g3:Genero {id_genero: 3})
SET g3.nombre_genero = 'Fantasia';

MERGE (pa:Participante {id_participante: 1})
SET pa.nombre_participante = 'Bryan Cranston',
    pa.pais_origen = 'USA',
    pa.fecha_nacimiento = date('1956-03-07');

MERGE (er:EstadoReproduccion {id_estado: 1})
SET er.tipo_estado = 'completado';

MERGE (s:Serie {id_serie: 1})
SET s.id_distribuidor = 1,
    s.titulo = 'Breaking Bad',
    s.sinopsis = 'Un profesor de quimica se convierte en fabricante de metanfetaminas.',
    s.anio_inicio_emision = 2008,
    s.numero_temporadas = 1,
    s.clasificacion_edad = 'TV-MA',
    s.estado_serie = 'FINALIZADA';

MERGE (s2:Serie {id_serie: 2})
SET s2.id_distribuidor = 2,
    s2.titulo = 'Game of Thrones',
    s2.sinopsis = 'Familias nobles luchan por el control del Trono de Hierro.',
    s2.anio_inicio_emision = 2011,
    s2.numero_temporadas = 7,
    s2.clasificacion_edad = 'TV-MA',
    s2.estado_serie = 'FINALIZADA';

MERGE (t:Temporada {id_temporada: 1})
SET t.id_serie = 1,
    t.numero_temporada = 1,
    t.anio_lanzamiento = 2008;

MERGE (t2:Temporada {id_temporada: 2})
SET t2.id_serie = 2,
    t2.numero_temporada = 1,
    t2.anio_lanzamiento = 2011;

MERGE (t3:Temporada {id_temporada: 3})
SET t3.id_serie = 2,
    t3.numero_temporada = 7,
    t3.anio_lanzamiento = 2019;

MERGE (e:Episodio {id_episodio: 1})
SET e.id_temporada = 1,
    e.titulo = 'Breaking Bad Trailer 1',
    e.numero_episodio = 1,
    e.duracion_minutos = 1,
    e.sinopsis = 'Trailer de la serie Breaking Bad.',
    e.url_video = 'backend/media/series/Breaking Bad/Season 01/Breaking Bad Trailer 1.mp4';

MERGE (e2:Episodio {id_episodio: 2})
SET e2.id_temporada = 1,
    e2.titulo = 'Breaking Bad Trailer 2',
    e2.numero_episodio = 2,
    e2.duracion_minutos = 1,
    e2.sinopsis = 'Segundo trailer de la serie Breaking Bad.',
    e2.url_video = 'backend/media/series/Breaking Bad/Season 01/Breaking Bad Trailer 2.mp4';

MERGE (e3:Episodio {id_episodio: 3})
SET e3.id_temporada = 2,
    e3.titulo = 'Game of Thrones Trailer',
    e3.numero_episodio = 1,
    e3.duracion_minutos = 2,
    e3.sinopsis = 'Trailer de la serie Game of Thrones.',
    e3.url_video = 'backend/media/series/Game of Thrones/Season 01/Game of Thrones Trailer.mp4';

MERGE (e4:Episodio {id_episodio: 4})
SET e4.id_temporada = 3,
    e4.titulo = 'Game of Thrones Season 7 Trailer',
    e4.numero_episodio = 1,
    e4.duracion_minutos = 2,
    e4.sinopsis = 'Trailer de la temporada 7 de Game of Thrones.',
    e4.url_video = 'backend/media/series/Game of Thrones/Season 07/Game of Thrones Season 7 Trailer.mp4';

MERGE (p:Pelicula {id_pelicula: 1})
SET p.id_distribuidor = 1,
    p.titulo = 'El Laberinto del Fauno',
    p.sinopsis = 'Una nina descubre un mundo de fantasia en la Espana de posguerra.',
    p.anio_estreno = 2006,
    p.duracion_minutos = 118,
    p.clasificacion_edad = 'R',
    p.idioma_original = 'Espanol',
    p.url_video = 'backend/media/peliculas/El Laberinto del Fauno (2006)/Trailer El Laberinto del fauno.mp4';

MERGE (p2:Pelicula {id_pelicula: 2})
SET p2.id_distribuidor = 3,
    p2.titulo = 'Rapidos y Furiosos 9',
    p2.sinopsis = 'Dom y su equipo enfrentan una nueva amenaza.',
    p2.anio_estreno = 2021,
    p2.duracion_minutos = 143,
    p2.clasificacion_edad = 'PG-13',
    p2.idioma_original = 'Ingles',
    p2.url_video = 'backend/media/peliculas/Rapidos y Furiosos 9 (2021)/Rapidos y Furiosos 9 Trailer.mp4';

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

MATCH (s2:Serie {id_serie: 2}), (d2:Distribuidor {id_distribuidor: 2})
MERGE (s2)-[:DISTRIBUIDA_POR]->(d2);

MATCH (p:Pelicula {id_pelicula: 1}), (d:Distribuidor {id_distribuidor: 1})
MERGE (p)-[:DISTRIBUIDA_POR]->(d);

MATCH (p2:Pelicula {id_pelicula: 2}), (d3:Distribuidor {id_distribuidor: 3})
MERGE (p2)-[:DISTRIBUIDA_POR]->(d3);

MATCH (s:Serie {id_serie: 1}), (t:Temporada {id_temporada: 1})
MERGE (s)-[:TIENE_TEMPORADA]->(t);

MATCH (s2:Serie {id_serie: 2}), (t2:Temporada {id_temporada: 2})
MERGE (s2)-[:TIENE_TEMPORADA]->(t2);

MATCH (s2:Serie {id_serie: 2}), (t3:Temporada {id_temporada: 3})
MERGE (s2)-[:TIENE_TEMPORADA]->(t3);

MATCH (t:Temporada {id_temporada: 1}), (e:Episodio {id_episodio: 1})
MERGE (t)-[:TIENE_EPISODIO]->(e);

MATCH (t:Temporada {id_temporada: 1}), (e2:Episodio {id_episodio: 2})
MERGE (t)-[:TIENE_EPISODIO]->(e2);

MATCH (t2:Temporada {id_temporada: 2}), (e3:Episodio {id_episodio: 3})
MERGE (t2)-[:TIENE_EPISODIO]->(e3);

MATCH (t3:Temporada {id_temporada: 3}), (e4:Episodio {id_episodio: 4})
MERGE (t3)-[:TIENE_EPISODIO]->(e4);

MATCH (e:Episodio {id_episodio: 1}), (g:Genero {id_genero: 1})
MERGE (e)-[:TIENE_GENERO {genero_principal: 'Drama'}]->(g);

MATCH (e3:Episodio {id_episodio: 3}), (g:Genero {id_genero: 1})
MERGE (e3)-[:TIENE_GENERO {genero_principal: 'Drama'}]->(g);

MATCH (e4:Episodio {id_episodio: 4}), (g:Genero {id_genero: 1})
MERGE (e4)-[:TIENE_GENERO {genero_principal: 'Drama'}]->(g);

MATCH (p:Pelicula {id_pelicula: 1}), (g3:Genero {id_genero: 3})
MERGE (p)-[:TIENE_GENERO {genero_principal: 'Fantasia'}]->(g3);

MATCH (p2:Pelicula {id_pelicula: 2}), (g2:Genero {id_genero: 2})
MERGE (p2)-[:TIENE_GENERO {genero_principal: 'Accion'}]->(g2);

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
