import express, { type Request, type Response } from 'express'
import { authRoute } from './modules/auth/auth.route';
import { issuesRoute } from './modules/issues/issues.route';
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ------------------------------------------
app.get('/', (req: Request, res: Response) => {
  res.status(200).json('Hello World!')
});
// ------------------------------------------


// auth route
app.use("/api/auth", authRoute);

// issues route
app.use("/api/issues", issuesRoute);




export default app;