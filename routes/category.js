const express = require("express");
// const { requireSignin, adminMiddleware } = require("../contollers/auth");

const router = express.Router();
const { create, list, read, remove } = require("../contollers/category");
const {
  requireSignin,
  authMiddleware,
  adminMiddleware,
} = require("../contollers/auth");

const { runValidation } = require("../validators");

const { categoryCreateValidator } = require("../validators/category");
// const { remove } = require("../models/category");

router.post(
  "/category",
  categoryCreateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  create
);
router.get("/categories", list);
router.get("/category/:slug", read);
router.delete("/category/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;
