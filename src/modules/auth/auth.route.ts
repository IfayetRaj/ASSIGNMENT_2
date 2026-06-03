import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();
// signup route
router.post("/signup", authController.signup);
// login route
router.post("/login", authController.login);

export const authRoute = router;