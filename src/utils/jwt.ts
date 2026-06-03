import jwt from "jsonwebtoken";
import config from "../config";

export const createJWTToken = (payload: object) =>{
    return jwt.sign(payload, config.jwt_secret, { expiresIn: "1d" });
};

export const verifyJWTToken = (token: string) =>{
    return jwt.verify(token, config.jwt_secret);
}