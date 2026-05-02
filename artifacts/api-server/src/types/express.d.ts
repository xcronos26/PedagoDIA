declare global {
  namespace Express {
    interface Request {
      teacherId?: string;
      teacherRole?: import("@workspace/db").TeacherRole;
      effectivePlanTier?: import("@workspace/db").PlanType;
      schoolId?: string;
    }
  }
}

export {};
