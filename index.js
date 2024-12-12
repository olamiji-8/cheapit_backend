
const express = require('express');
const cors = require('cors');

const dbconnect = require('./config/dbconnect');
const requestLogger = require('./middlewares/requestLogger');
const authRoutes = require("./routes/authRoutes");




const app = express();
app.use(cors());
app.use("/api/auth", authRoutes);

const dotenv = require('dotenv').config();

const PORT = process.env.PORT || 4000;
dbconnect();

app.use(express.json());
app.use(requestLogger)


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});