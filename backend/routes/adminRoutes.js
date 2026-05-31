const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  adminController.getDashboardStats,
);
router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  adminController.listUsers,
);
router.get(
  "/advanced-queries",
  authMiddleware,
  adminMiddleware,
  adminController.advancedQueries,
);

module.exports = router;
