import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
    path: path.join(process.cwd(), '.env'),
})

const config = {
    connection_string : process.env.CONNECTION_STRING,
    port: process.env.PORT,
    jwt_secret: process.env.JWT_SECRET_KEY as string,
}

export default config;