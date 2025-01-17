import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // parse json body request
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // parse encoded urls and the extended property parses the nested objects
app.use(express.static("public")); // serve static files from the public directory
app.use(cookieParser()); // access and set the user browser cookies from the server

export default app;
