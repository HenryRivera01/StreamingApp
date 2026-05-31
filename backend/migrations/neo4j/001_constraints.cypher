// Unicidad de entidades principales
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
