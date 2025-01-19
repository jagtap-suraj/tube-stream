import multer from "multer"; //  multer package to handle file uploads.

/**
- The `multer.diskStorage()` method is used to configure how uploaded files will be stored on the server.

- It takes an object with two functions:

    **a) `destination`:* Defines where the uploaded file will be stored.
    - `cb(null, "./public/temp");` → Saves the file inside the `./public/temp` directory.

    **b) `filename`:* Defines the name of the uploaded file.
    - `cb(null, file.originalname);` → Keeps the original file name.
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },

  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

/**
 * - Creates a **Multer instance** with the defined `storage` settings.
 * - This instance (`upload`) can now be used as middleware in routes to handle file uploads.
 */
export const upload = multer({
  storage,
});

