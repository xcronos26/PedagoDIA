declare global {
  namespace Express {
    interface Request {
      teacherId?: string;
    }
  }
}

export {};
