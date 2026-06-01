const express = require("express");
const router = express.Router();
const controller = require("../controllers/mediaController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/movies", authMiddleware, controller.listMovies);
router.get("/series", authMiddleware, controller.listSeries);
router.get("/movies/:id", authMiddleware, controller.getMovie);
router.get("/episodes/:id", authMiddleware, controller.getEpisode);
router.get("/movies/:id/progress", authMiddleware, controller.getMovieProgress);
router.get(
  "/episodes/:id/progress",
  authMiddleware,
  controller.getEpisodeProgress,
);
router.get(
  "/series/:id/episodes",
  authMiddleware,
  controller.getSeriesEpisodes,
);
router.get("/movies/:id/stream", authMiddleware, controller.streamMovie);
router.get("/episodes/:id/stream", authMiddleware, controller.streamEpisode);
router.post(
  "/movies/:id/progress",
  authMiddleware,
  controller.updateMovieProgress,
);
router.post(
  "/episodes/:id/progress",
  authMiddleware,
  controller.updateEpisodeProgress,
);
router.post("/movies/:id/rating", authMiddleware, controller.rateMovie);
router.post("/episodes/:id/rating", authMiddleware, controller.rateEpisode);

module.exports = router;
