import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/students", async (req, res) => {
  try {
    const students = await db.select().from(studentsTable).orderBy(studentsTable.name);
    res.json(students.map(s => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/students", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const [student] = await db.insert(studentsTable).values({
      id,
      name: name.trim(),
    }).returning();
    res.status(201).json({
      id: student.id,
      name: student.name,
      createdAt: student.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    await db.delete(studentsTable).where(eq(studentsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
