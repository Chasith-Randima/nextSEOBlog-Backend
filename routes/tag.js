const express = require("express");
// const { requireSignin, adminMiddleware } = require("../contollers/auth");

const router = express.Router();
const { create, list, read, remove } = require("../contollers/tag");
const {
  requireSignin,
  authMiddleware,
  adminMiddleware,
} = require("../contollers/auth");
// const { read } = require("../contollers/user");

const { runValidation } = require("../validators");

const { tagCreateValidator } = require("../validators/tag");
// const { remove } = require("../models/category");

// tag routes
router.post(
  "/tag",
  tagCreateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  create
);
router.get("/tags", list);
router.get("/tag/:slug", read);
router.delete("/tag/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;
