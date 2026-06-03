
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import express from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/db/index.ts
import { Pool } from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTION_STRING,
  port: process.env.PORT,
  jwt_secret: process.env.JWT_SECRET_KEY
};
var config_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: config_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users(
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'contributor',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`
    );
    await pool.query(
      `CREATE TABLE IF NOT EXISTS issues(
                id SERIAL PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                reporter_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`
    );
    console.log("Database initialized successfully");
  } catch (error) {
    console.log("Error initializing database: ", error);
  }
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var createJWTToken = (payload) => {
  return jwt.sign(payload, config_default.jwt_secret, { expiresIn: "1d" });
};
var verifyJWTToken = (token) => {
  return jwt.verify(token, config_default.jwt_secret);
};

// src/modules/auth/auth.service.ts
var createUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  try {
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email
    ]);
    if (user.rows.length > 0) {
      throw new Error("User already exists with this email");
    }
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, hashedPassword, role]
    );
    delete result.rows[0].password;
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};
var loginUserIntoDB = async (payload) => {
  const { email, password } = payload;
  try {
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email
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
    delete user.rows[0].password;
    const jwtPayload = {
      id: user.rows[0].id,
      name: user.rows[0].name,
      role: user.rows[0].role
    };
    const token = createJWTToken(jwtPayload);
    return {
      token,
      user: user.rows[0]
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
var authService = {
  createUserIntoDB,
  loginUserIntoDB
};

// src/modules/auth/auth.controller.ts
var signup = async (req, res) => {
  try {
    const result = await authService.createUserIntoDB(req.body);
    res.status(200).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error
    });
  }
};
var login = async (req, res) => {
  try {
    const result = await authService.loginUserIntoDB(req.body);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error
    });
  }
};
var authController = {
  signup,
  login
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
var authRoute = router;

// src/modules/issues/issues.route.ts
import { Router as Router2 } from "express";

// src/modules/issues/issues.service.ts
var createIssuesIntoDB = async (payload, reporterId) => {
  const { title, description, type } = payload;
  try {
    const result = await pool.query(
      `INSERT INTO issues (title, description, type, reporter_id) VALUES($1, $2, $3, $4) RETURNING *`,
      [title, description, type, reporterId]
    );
    return result.rows[0];
  } catch (error) {
    throw error.message;
  }
};
var getAllIssuesFromDB = async (sort = "newest", type, status) => {
  try {
    let query = `SELECT * FROM issues WHERE 1=1`;
    let values = [];
    if (type) {
      values.push(type);
      query += ` AND type=$${values.length}`;
    }
    if (status) {
      values.push(status);
      query += ` AND status=$${values.length}`;
    }
    query += sort === "oldest" ? ` ORDER BY created_at ASC` : ` ORDER BY created_at DESC`;
    const issues = await pool.query(query, values);
    const reporterIds = [
      ...new Set(issues.rows.map((issue) => issue.reporter_id))
    ];
    const users = await pool.query(
      `SELECT id,name,role FROM users
       WHERE id = ANY($1)`,
      [reporterIds]
    );
    const userMap = new Map(users.rows.map((u) => [u.id, u]));
    return issues.rows.map((issue) => ({
      ...issue,
      reporter: userMap.get(issue.reporter_id)
    }));
  } catch (error) {
    throw error.message;
  }
};
var getSingleIssueFromDB = async (issueId) => {
  try {
    const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
      issueId
    ]);
    if (!issueResult.rows.length) {
      throw new Error("Issue not found");
    }
    const issue = issueResult.rows[0];
    const reporterResult = await pool.query(
      `
          SELECT id,name,role
          FROM users
          WHERE id = $1
        `,
      [issue.reporter_id]
    );
    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporterResult.rows[0],
      created_at: issue.created_at,
      updated_at: issue.updated_at
    };
  } catch (error) {
    throw error.message;
  }
};
var updateIssue = async (issueId, payload, user) => {
  try {
    const issueResult = await pool.query(
      `
          SELECT *
          FROM issues
          WHERE id = $1
        `,
      [issueId]
    );
    if (!issueResult.rows.length) {
      throw new Error("Issue not found");
    }
    const issue = issueResult.rows[0];
    if (user.role === "contributor") {
      if (issue.reporter_id !== user.id) {
        throw new Error("You can update only your own issues");
      }
      if (issue.status !== "open") {
        throw new Error("Open issues only can be updated");
      }
    }
    const title = payload.title || issue.title;
    const description = payload.description || issue.description;
    const type = payload.type || issue.type;
    const result = await pool.query(
      `
          UPDATE issues
          SET
            title = $1,
            description = $2,
            type = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `,
      [title, description, type, issueId]
    );
    return result.rows[0];
  } catch (error) {
    throw error.message;
  }
};
var deleteIssue = async (issueId) => {
  try {
    const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
      issueId
    ]);
    if (!(await issueResult).rows.length) {
      throw new Error("Issue not found");
    }
    await pool.query(`DELETE FROM issues WHERE id = $1`, [issueId]);
    return;
  } catch (error) {
    throw error.message;
  }
};
var issuesService = {
  createIssuesIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssue,
  deleteIssue
};

// src/modules/issues/issues.controller.ts
var createIssue = async (req, res) => {
  try {
    const reporter_id = req.user.id;
    const result = await issuesService.createIssuesIntoDB(
      req.body,
      reporter_id
    );
    console.log(req.user);
    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const result = await issuesService.getAllIssuesFromDB();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};
var getSingleIssue = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await issuesService.getSingleIssueFromDB(id);
    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};
var updateIssue2 = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await issuesService.updateIssue(id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};
var deleteIssue2 = async (req, res) => {
  try {
    await issuesService.deleteIssue(Number(req.params.id));
    res.status(200).json({
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error });
  }
};
var issuesController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue: updateIssue2,
  deleteIssue: deleteIssue2
};

// src/middleware/auth.ts
var auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
  const decodedToken = verifyJWTToken(token);
  req.user = decodedToken;
  next();
};

// src/middleware/authorize.ts
var authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }
    next();
  };
};

// src/modules/issues/issues.route.ts
var router2 = Router2();
router2.post("/", auth, issuesController.createIssue);
router2.get("/", issuesController.getAllIssues);
router2.get("/:id", issuesController.getSingleIssue);
router2.patch("/:id", auth, issuesController.updateIssue);
router2.delete("/:id", auth, authorize("maintainer"), issuesController.deleteIssue);
var issuesRoute = router2;

// src/app.ts
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.status(200).json("Hello World!");
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issuesRoute);
var app_default = app;

// src/server.ts
var port = config_default.port;
var main = () => {
  initDB();
  app_default.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};
main();
//# sourceMappingURL=server.js.map