declare global {
  namespace Express {
    interface Request {
      teacherId?: string;
      effectivePlanTier?: import("@workspace/db").PlanType;
    }
  }
}

export {};
