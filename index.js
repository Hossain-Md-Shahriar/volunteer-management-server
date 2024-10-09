const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());



app.get("/", (req, res) => {
  res.send("Hello from volunteer management server...");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
