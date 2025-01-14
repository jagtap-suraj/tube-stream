import connectDB from "./db/index";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

connectDB();
