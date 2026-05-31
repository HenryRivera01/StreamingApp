const fs = require("fs");
const path = require("path");
const Media = require("../models/mediaModel");

async function listMovies(req, res) {
  try {
    const movies = await Media.getAllMovies();
    return res.json(movies);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error obteniendo películas" });
  }
}

async function listSeries(req, res) {
  try {
    const series = await Media.getAllSeries();
    return res.json(series);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error obteniendo series" });
  }
}

async function getMovie(req, res) {
  try {
    const movie = await Media.getMovieById(req.params.id, req.user?.id_usuario);
    if (!movie)
      return res.status(404).json({ message: "Película no encontrada" });
    return res.json(movie);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error obteniendo película" });
  }
}

async function getEpisode(req, res) {
  try {
    const episode = await Media.getEpisodeById(
      req.params.id,
      req.user?.id_usuario,
    );
    if (!episode)
      return res.status(404).json({ message: "Episodio no encontrado" });
    return res.json(episode);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error obteniendo episodio" });
  }
}

async function getSeriesEpisodes(req, res) {
  try {
    const episodes = await Media.getEpisodesBySeries(req.params.id);
    return res.json(episodes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error obteniendo episodios" });
  }
}

function streamFile(filePath, req, res) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: "Archivo no encontrado" });
  }
  const stat = fs.statSync(fullPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(fullPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(fullPath).pipe(res);
  }
}

async function streamMovie(req, res) {
  try {
    const movie = await Media.getMovieById(req.params.id);
    if (!movie || !movie.url_video) {
      return res.status(404).json({ message: "URL de video no configurada" });
    }
    return streamFile(movie.url_video, req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en streaming" });
  }
}

async function streamEpisode(req, res) {
  try {
    const ep = await Media.getEpisodeById(req.params.id);
    if (!ep || !ep.url_video) {
      return res.status(404).json({ message: "URL de video no configurada" });
    }
    return streamFile(ep.url_video, req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en streaming" });
  }
}

async function rateMovie(req, res) {
  try {
    const puntuacion = Number(req.body?.puntuacion);
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      return res
        .status(400)
        .json({ message: "La calificación debe estar entre 1 y 5" });
    }

    await Media.saveMovieRating({
      userId: req.user.id_usuario,
      movieId: req.params.id,
      puntuacion,
    });

    const movie = await Media.getMovieById(req.params.id, req.user.id_usuario);
    return res.json(movie);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error guardando calificación" });
  }
}

async function rateEpisode(req, res) {
  try {
    const puntuacion = Number(req.body?.puntuacion);
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      return res
        .status(400)
        .json({ message: "La calificación debe estar entre 1 y 5" });
    }

    await Media.saveEpisodeRating({
      userId: req.user.id_usuario,
      episodeId: req.params.id,
      puntuacion,
    });

    const episode = await Media.getEpisodeById(
      req.params.id,
      req.user.id_usuario,
    );
    return res.json(episode);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error guardando calificación" });
  }
}

module.exports = {
  listMovies,
  listSeries,
  getMovie,
  getEpisode,
  getSeriesEpisodes,
  streamMovie,
  streamEpisode,
  rateMovie,
  rateEpisode,
};
