import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

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
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
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
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
    });
  } catch (err) {
    req.log.error({ err }, "Error logging in teacher");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET ?? "pedagogia-dev-secret-change-in-production";
    const payload = jwt.default.verify(auth.slice(7), secret) as { teacherId: string };
    const [teacher] = await db.select({ id: teachersTable.id, name: teachersTable.name, email: teachersTable.email })
      .from(teachersTable).where(eq(teachersTable.id, payload.teacherId));
    if (!teacher) {
      res.status(404).json({ error: "Professora não encontrada" });
      return;
    }
    res.json({ teacher });
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

export default router;
