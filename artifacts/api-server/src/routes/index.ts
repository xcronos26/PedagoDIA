import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import subjectsRouter from "./subjects";
import studentsRouter from "./students";
import attendanceRouter from "./attendance";
import activitiesRouter from "./activities";
import deliveriesRouter from "./deliveries";
import parentReportsRouter from "./parent-reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(subjectsRouter);
router.use(studentsRouter);
router.use(attendanceRouter);
router.use(activitiesRouter);
router.use(deliveriesRouter);
router.use(parentReportsRouter);

export default router;
