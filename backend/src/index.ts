// import dotenv from "dotenv";
// dotenv.config({
//   path: "./.env",
// });
// Even tho dotenv is at top of the index.ts file, it runs after all the imported modules have been initialized, because imports are hoisted and processed first. make the env file unavailable to the rest of the code
// thus we will move it to another file config.ts

import config from "./config/index.js";
import app from "./app.js";
import connectDB from "./db/index.js";

connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`⚙️ Server is running at port : ${config.port}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });