import upload from "../middlewares/multer.middleware.js";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateUserAvatar,
  updateUserDetails,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload, registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/change-password").post(verifyJWT, changePassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/user").patch(verifyJWT, updateUserDetails);

router.route("/avatar").patch(verifyJWT, upload, updateUserAvatar);

router.route("/cover-image").patch(verifyJWT, upload, updateUserCoverImage);

export default router;
