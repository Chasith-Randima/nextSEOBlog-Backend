const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

//app

const app = express();

//bring Routes

const blogRoutes = require("./routes/blog");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const tagRoutes = require("./routes/tag");
const formRoutes = require("./routes/form");

//db

mongoose
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
  })
  .then(() => {
    console.log("Database connected successfully...");
  });

//middlewars

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cookieParser());

//cors
// if (process.env.NODE_ENV == "development") {
// app.use(cors({ origin: `${process.env.CLIENT_URL}` }));
app.use(cors());

app.options("*", cors());
// }
//using routes as a middleware

app.use("/api", blogRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", categoryRoutes);
app.use("/api", tagRoutes);
app.use("/api", formRoutes);

//routes

// app.get("/api", (req, res) => {
//   res.json({
//     time: Date.now().toString(),
//   });
// });

//port

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server running on port ${port}..`);
});
