import { Router } from "express";
import { issuesController } from "./issues.controller";
import { auth } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();
router.post('/', auth, issuesController.createIssue);
router.get('/', issuesController.getAllIssues);
router.get('/:id', issuesController.getSingleIssue);
router.patch('/:id', auth, issuesController.updateIssue);
router.delete('/:id', auth, authorize("maintainer"), issuesController.deleteIssue);


export const issuesRoute = router;