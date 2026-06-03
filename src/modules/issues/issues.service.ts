import { pool } from "../../db";

const createIssuesIntoDB = async (payload: any, reporterId: number) => {
  const { title, description, type } = payload;
  try {
    // create new issues in DB
    const result = await pool.query(
      `INSERT INTO issues (title, description, type, reporter_id) VALUES($1, $2, $3, $4) RETURNING *`,
      [title, description, type, reporterId]
    );
    return result.rows[0];
  } catch (error: any) {
    throw error.message;
  }
};

//  getting all issues from DB
const getAllIssuesFromDB = async (
  sort = "newest",
  type?: string,
  status?: string
) => {
  try {
    let query = `SELECT * FROM issues WHERE 1=1`;
    let values: any[] = [];
    if (type) {
      values.push(type);
      query += ` AND type=$${values.length}`;
    }
    if (status) {
      values.push(status);
      query += ` AND status=$${values.length}`;
    }
    query +=
      sort === "oldest"
        ? ` ORDER BY created_at ASC`
        : ` ORDER BY created_at DESC`;
    const issues = await pool.query(query, values);
    const reporterIds = [
      ...new Set(issues.rows.map((issue: any) => issue.reporter_id)),
    ];
    const users = await pool.query(
      `SELECT id,name,role FROM users
       WHERE id = ANY($1)`,
      [reporterIds]
    );
    const userMap = new Map(users.rows.map((u) => [u.id, u]));
    return issues.rows.map((issue) => ({
      ...issue,
      reporter: userMap.get(issue.reporter_id),
    }));
  } catch (error: any) {
    throw error.message;
  }
};

// getting single user from DB
const getSingleIssueFromDB = async (issueId: number) => {
  try {
    const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
      issueId,
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
      updated_at: issue.updated_at,
    };
  } catch (error: any) {
    throw error.message;
  }
};

// update issue

const updateIssue = async (issueId: number, payload: any, user: any) => {
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
    // Contributor Rules
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
  } catch (error: any) {
    throw error.message;
  }
};

// delete issue

const deleteIssue = async (issueId: number) => {
  try {
    const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
      issueId,
    ]);
    if (!(await issueResult).rows.length) {
      throw new Error("Issue not found");
    }
    await pool.query(`DELETE FROM issues WHERE id = $1`, [issueId]);
    return;
  } catch (error: any) {
    throw error.message;
  }
};

export const issuesService = {
  createIssuesIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssue,
  deleteIssue,
};
