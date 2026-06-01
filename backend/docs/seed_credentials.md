# Credenciales seed (solo desarrollo)

## Admin

- Email: admin@streaming.local
- Password: Admin123!

## Usuarios normales

- Email: henry@email.com
- Password: User123!

- Email: maria@email.com
- Password: User123!  

- Email: juan@email.com
- Password: User123!

- Email: laura@email.com
- Password: User123!

## Ubicacion de trailers

El backend espera archivos en el path definido por `BASE_MEDIA_PATH`.
Por defecto, en este proyecto es:

- backend/backend/media

Estructura usada en el seed:

Peliculas:

- backend/backend/media/peliculas/El Laberinto del Fauno (2006)/Trailer El Laberinto del fauno.mp4
- backend/backend/media/peliculas/Rapidos y Furiosos 9 (2021)/Rapidos y Furiosos 9 Trailer.mp4

Series:

- backend/backend/media/series/Breaking Bad/Season 01/Breaking Bad Trailer 1.mp4
- backend/backend/media/series/Breaking Bad/Season 01/Breaking Bad Trailer 2.mp4
- backend/backend/media/series/Game of Thrones/Season 01/Game of Thrones Trailer.mp4
- backend/backend/media/series/Game of Thrones/Season 07/Game of Thrones Season 7 Trailer.mp4

Si tus archivos tienen nombres distintos, renombrarlos o ajusta los `url_video` en el seed para que coincidan.
