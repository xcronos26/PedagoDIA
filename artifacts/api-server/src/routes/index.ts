import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import subjectsRouter from "./subjects";
import classesRouter from "./classes";
import studentsRouter from "./students";
import attendanceRouter from "./attendance";
import activitiesRouter from "./activities";
import deliveriesRouter from "./deliveries";
import parentReportsRouter from "./parent-reports";
import studentReportsRouter from "./student-reports";
import lessonPlansRouter from "./lesson-plans";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(subjectsRouter);
router.use(classesRouter);
router.use(studentsRouter);
router.use(attendanceRouter);
router.use(activitiesRouter);
router.use(deliveriesRouter);
router.use(parentReportsRouter);
router.use(studentReportsRouter);
router.use(lessonPlansRouter);
router.use(aiRouter);

export default router;
