import { Router, type IRouter } from "express";
import { db, teachersTable, schoolsTable, membershipsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// ── Join school via invite code ────────────────────────────────────────────────

router.post("/schools/join", requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || typeof inviteCode !== "string") {
      res.status(400).json({ error: "Código de convite é obrigatório" });
      return;
    }

    const [school] = await db
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.inviteCode, inviteCode.trim().toUpperCase()));

    if (!school) {
      res.status(404).json({ error: "Código de convite inválido" });
      return;
    }
    if (school.status === "inativa") {
      res.status(403).json({ error: "Esta escola está inativa" });
      return;
    }

    const existing = await db
      .select()
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.teacherId, req.teacherId!),
          eq(membershipsTable.schoolId, school.id)
        )
      );

    if (existing.length > 0) {
      res.status(409).json({ error: "Você já está vinculado a esta escola", school });
      return;
    }

    const [membership] = await db.insert(membershipsTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      schoolId: school.id,
      role: "professor",
      status: "ativo",
    }).returning();

    await db
      .update(teachersTable)
      .set({ vinculo: "escola" })
      .where(eq(teachersTable.id, req.teacherId!));

    res.status(201).json({ membership, school: { id: school.id, name: school.name } });
  } catch (err) {
    req.log.error({ err }, "Error joining school");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── Create school (admin_institucional or super_admin) ────────────────────────

router.post("/schools", requireAuth, async (req, res) => {
  try {
    const [teacher] = await db
      .select({ role: teachersTable.role })
      .from(teachersTable)
      .where(eq(teachersTable.id, req.teacherId!));

    if (!teacher || (teacher.role !== "admin_institucional" && teacher.role !== "super_admin")) {
      res.status(403).json({ error: "Apenas diretores ou super admins podem criar escolas" });
      return;
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Nome da escola é obrigatório" });
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = generateId();

    const [school] = await db.insert(schoolsTable).values({
      id,
      name: name.trim(),
      inviteCode,
      status: "ativa",
      createdBy: req.teacherId!,
    }).returning();

    const [membership] = await db.insert(membershipsTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      schoolId: school.id,
      role: "admin_institucional",
      status: "ativo",
    }).returning();

    await db
      .update(teachersTable)
      .set({ vinculo: "escola" })
      .where(eq(teachersTable.id, req.teacherId!));

    res.status(201).json({ school, membership });
  } catch (err) {
    req.log.error({ err }, "Error creating school");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── Get teacher's schools ──────────────────────────────────────────────────────

router.get("/schools/mine", requireAuth, async (req, res) => {
  try {
    const memberships = await db
      .select({
        membershipId: membershipsTable.id,
        role: membershipsTable.role,
        status: membershipsTable.status,
        joinedAt: membershipsTable.joinedAt,
        schoolId: schoolsTable.id,
        schoolName: schoolsTable.name,
        schoolStatus: schoolsTable.status,
        inviteCode: schoolsTable.inviteCode,
      })
      .from(membershipsTable)
      .innerJoin(schoolsTable, eq(membershipsTable.schoolId, schoolsTable.id))
      .where(eq(membershipsTable.teacherId, req.teacherId!));

    res.json(memberships);
  } catch (err) {
    req.log.error({ err }, "Error fetching teacher schools");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
