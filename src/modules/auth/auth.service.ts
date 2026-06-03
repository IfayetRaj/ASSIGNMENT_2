import { pool } from "../../db";
import bcrypt from "bcrypt";
import { createJWTToken } from "../../utils/jwt";
import type { ILogin, IUser } from "./auth.interface";

// Service function
const createUserIntoDB = async (payload: IUser) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword)

  try {
    // checking if user already exists
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    if (user.rows.length > 0) {
      throw new Error("User already exists with this email");
    }
    // creating new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, hashedPassword, role]
    );
    delete result.rows[0].password;
    return result;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// login function
const loginUserIntoDB = async (payload: ILogin) => {
  const { email, password } = payload;
  try {
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    if (user.rows.length === 0) {
      throw new Error("User not found with this email");
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      user.rows[0].password
    );
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }
    delete user.rows[0].password

    // jwt payload 

    const jwtPayload = {
        id: user.rows[0].id,
        name: user.rows[0].name,
        role: user.rows[0].role,
    }
    const token = createJWTToken(jwtPayload);
    return{
        token,
        user: user.rows[0],
    }
    
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const authService = {
  createUserIntoDB,
  loginUserIntoDB,
};
