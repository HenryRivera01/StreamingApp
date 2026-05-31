
const axios = require('axios');

async function searchMovieInTmdb(title, year) {
  if (!process.env.TMDB_API_KEY) return null;
  const res = await axios.get('https://api.themoviedb.org/3/search/movie', {
    params: {
      api_key: process.env.TMDB_API_KEY,
      query: title,
      year,
      language: 'es-ES',
    },
  });
  const movie = res.data.results[0];
  if (!movie) return null;
  return {
    titulo: movie.title,
    anio: movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : year,
    descripcion: movie.overview,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
  };
}

module.exports = { searchMovieInTmdb };
