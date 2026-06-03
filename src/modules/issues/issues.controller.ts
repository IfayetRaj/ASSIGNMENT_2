import type { Request, Response } from "express";
import { issuesService } from "./issues.service";

const createIssue = async (req: Request, res: Response) => {
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
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error: error });
  }
};

// get all issues
const getAllIssues = async (req: Request, res: Response) => {
  try {
    const result = await issuesService.getAllIssuesFromDB();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({success:false, message: "Internal Server Error", error: error});
  }
};

// get single issue 
const getSingleIssue = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await issuesService.getSingleIssueFromDB(id);
    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully",
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: error });
  }
};

// update issue
const updateIssue = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await issuesService.updateIssue(id, req.body, req.user);

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: error });
  }
};

// delete user
const deleteIssue = async (req: Request, res: Response) => {
  try {
    await issuesService.deleteIssue(Number(req.params.id));
    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: error });
  }
};

export const issuesController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
