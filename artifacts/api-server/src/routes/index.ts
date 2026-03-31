import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import subjectsRouter from "./subjects";
import studentsRouter from "./students";
import attendanceRouter from "./attendance";
import activitiesRouter from "./activities";
import deliveriesRouter from "./deliveries";
import parentReportsRouter from "./parent-reports";
import studentReportsRouter from "./student-reports";
import lessonPlansRouter from "./lesson-plans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(subjectsRouter);
router.use(studentsRouter);
router.use(attendanceRouter);
router.use(activitiesRouter);
router.use(deliveriesRouter);
router.use(parentReportsRouter);
router.use(studentReportsRouter);
router.use(lessonPlansRouter);

export default router;
