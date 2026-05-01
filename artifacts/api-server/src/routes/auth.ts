import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth";
import type { WeeklySchedule } from "@workspace/db";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const PUBLIC_FIELDS = {
  id: teachersTable.id,
  name: teachersTable.name,
  email: teachersTable.email,
  weeklySchedule: teachersTable.weeklySchedule,
  grade: teachersTable.grade,
  teacherType: teachersTable.teacherType,
};

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
      return;
    }
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }
    const existing = await db.select().from(teachersTable).where(eq(teachersTable.email, email.toLowerCase().trim()));
    if (existing.length > 0) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [teacher] = await db.insert(teachersTable).values({
      id: generateId(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    }).returning();

    const token = generateToken({ teacherId: teacher.id, email: teacher.email });
    res.status(201).json({
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email, weeklySchedule: teacher.weeklySchedule ?? null, grade: teacher.grade ?? null, teacherType: teacher.teacherType ?? null },
    });
  } catch (err) {
    req.log.error({ err }, "Error registering teacher");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      return;
    }
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.email, email.toLowerCase().trim()));
    if (!teacher) {
      res.status(401).json({ error: "E-mail ou senha incorretos" });
      return;
    }
    const valid = await bcrypt.compare(password, teacher.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "E-mail ou senha incorretos" });
      return;
    }
    const token = generateToken({ teacherId: teacher.id, email: teacher.email });
    res.json({
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email, weeklySchedule: teacher.weeklySchedule ?? null, grade: teacher.grade ?? null, teacherType: teacher.teacherType ?? null },
    });
  } catch (err) {
    req.log.error({ err }, "Error logging in teacher");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [teacher] = await db.select(PUBLIC_FIELDS)
      .from(teachersTable).where(eq(teachersTable.id, req.teacherId!));
    if (!teacher) {
      res.status(404).json({ error: "Professora não encontrada" });
      return;
    }
    res.json({ teacher });
  } catch (err) {
    req.log.error({ err }, "Error fetching teacher profile");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name, weeklySchedule, grade, teacherType } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }

    const updateData: { name: string; weeklySchedule?: WeeklySchedule | null; grade?: string | null; teacherType?: "regente" | "disciplina" | null } = {
      name: name.trim(),
    };

    if ("weeklySchedule" in req.body) {
      updateData.weeklySchedule = weeklySchedule ?? null;
    }

    if ("grade" in req.body) {
      updateData.grade = typeof grade === "string" && grade.trim() ? grade.trim() : null;
    }

    if ("teacherType" in req.body) {
      updateData.teacherType = (teacherType === "regente" || teacherType === "disciplina") ? teacherType : null;
    }

    await db
      .update(teachersTable)
      .set(updateData)
      .where(eq(teachersTable.id, req.teacherId!));
    const [teacher] = await db.select(PUBLIC_FIELDS)
      .from(teachersTable).where(eq(teachersTable.id, req.teacherId!));
    if (!teacher) {
      res.status(404).json({ error: "Professora não encontrada" });
      return;
    }
    res.json({ teacher });
  } catch (err) {
    req.log.error({ err }, "Error updating teacher profile");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
