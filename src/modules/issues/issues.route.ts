import { Router } from "express";
import { issuesController } from "./issues.controller";
import { auth } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();

// create issue
router.post('/', auth, issuesController.createIssue);
// get all issues
router.get('/', issuesController.getAllIssues);
// get single issue
router.get('/:id', issuesController.getSingleIssue);
// update issue
router.patch('/:id', auth, issuesController.updateIssue);
// delete issue
router.delete('/:id', auth, authorize("maintainer"), issuesController.deleteIssue);


export const issuesRoute = router;