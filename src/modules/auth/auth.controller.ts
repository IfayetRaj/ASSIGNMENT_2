import type { Request, Response } from "express";
import { authService } from "./auth.service";

// signup controller
const signup = async (req: Request, res: Response) => {
  try {
    const result = await authService.createUserIntoDB(req.body);
    res.status(200).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

// login controller
const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUserIntoDB(req.body);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
      error: error,
    });
  }
};

// exporting auth controller
export const authController = {
  signup,
  login,
};
