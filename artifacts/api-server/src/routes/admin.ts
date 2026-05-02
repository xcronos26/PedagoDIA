import { Router, type IRouter } from "express";
import { db, teachersTable, schoolsTable, membershipsTable, activitiesTable, promptLogsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import type { PlanType, TeacherRole } from "@workspace/db";

const router: IRouter = Router();

// ── Stats ──────────────────────────────────────────────────────────────────────

router.get("/admin/stats", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const [teachersCount] = await db.select({ count: count() }).from(teachersTable)
      .where(eq(teachersTable.role, "professor"));
    const [schoolsCount] = await db.select({ count: count() }).from(schoolsTable);
    const [activitiesCount] = await db.select({ count: count() }).from(activitiesTable);
    const [aiCount] = await db.select({ count: count() }).from(promptLogsTable);
    const [blockedCount] = await db.select({ count: count() }).from(teachersTable)
      .where(eq(teachersTable.isBlocked, true));
    const [adminsCount] = await db.select({ count: count() }).from(teachersTable)
      .where(eq(teachersTable.role, "admin_institucional"));

    res.json({
      totalProfessores: Number(teachersCount.count),
      totalEscolas: Number(schoolsCount.count),
      totalAtividades: Number(activitiesCount.count),
      totalGeneracoesIA: Number(aiCount.count),
      totalBloqueados: Number(blockedCount.count),
      totalDiretores: Number(adminsCount.count),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── Teachers ───────────────────────────────────────────────────────────────────

router.get("/admin/teachers", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const teachers = await db.select({
      id: teachersTable.id,
      name: teachersTable.name,
      email: teachersTable.email,
      role: teachersTable.role,
      vinculo: teachersTable.vinculo,
      planType: teachersTable.planType,
      planStatus: teachersTable.planStatus,
      isBlocked: teachersTable.isBlocked,
      createdAt: teachersTable.createdAt,
    }).from(teachersTable)
      .orderBy(sql`${teachersTable.createdAt} DESC`);

    res.json(teachers);
  } catch (err) {
    req.log.error({ err }, "Error fetching admin teachers");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/admin/teachers/:id/block", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;

    if (id === req.teacherId) {
      res.status(400).json({ error: "Você não pode bloquear a si mesmo" });
      return;
    }

    const [teacher] = await db
      .update(teachersTable)
      .set({ isBlocked: !!blocked })
      .where(eq(teachersTable.id, id))
      .returning({ id: teachersTable.id, isBlocked: teachersTable.isBlocked });

    if (!teacher) {
      res.status(404).json({ error: "Professor não encontrado" });
      return;
    }
    res.json(teacher);
  } catch (err) {
    req.log.error({ err }, "Error blocking teacher");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/admin/teachers/:id/role", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles: TeacherRole[] = ["professor", "admin_institucional", "super_admin"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "Role inválido" });
      return;
    }

    const [teacher] = await db
      .update(teachersTable)
      .set({ role })
      .where(eq(teachersTable.id, id))
      .returning({ id: teachersTable.id, role: teachersTable.role });

    if (!teacher) {
      res.status(404).json({ error: "Professor não encontrado" });
      return;
    }
    res.json(teacher);
  } catch (err) {
    req.log.error({ err }, "Error updating teacher role");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/admin/teachers/:id/plan", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { planType } = req.body;

    const validPlans: PlanType[] = ["free", "basic", "medium", "advanced"];
    if (!validPlans.includes(planType)) {
      res.status(400).json({ error: "Plano inválido" });
      return;
    }

    const [teacher] = await db
      .update(teachersTable)
      .set({ planType, planStatus: "active" })
      .where(eq(teachersTable.id, id))
      .returning({ id: teachersTable.id, planType: teachersTable.planType });

    if (!teacher) {
      res.status(404).json({ error: "Professor não encontrado" });
      return;
    }
    res.json(teacher);
  } catch (err) {
    req.log.error({ err }, "Error updating teacher plan");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── Schools ────────────────────────────────────────────────────────────────────

router.get("/admin/schools", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const schools = await db.select().from(schoolsTable)
      .orderBy(sql`${schoolsTable.createdAt} DESC`);

    const schoolsWithCount = await Promise.all(
      schools.map(async (school) => {
        const [{ count: memberCount }] = await db
          .select({ count: count() })
          .from(membershipsTable)
          .where(eq(membershipsTable.schoolId, school.id));
        return { ...school, totalMembros: Number(memberCount) };
      })
    );

    res.json(schoolsWithCount);
  } catch (err) {
    req.log.error({ err }, "Error fetching admin schools");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/admin/schools", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Nome da escola é obrigatório" });
      return;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);

    const [school] = await db.insert(schoolsTable).values({
      id,
      name: name.trim(),
      inviteCode,
      status: "ativa",
      createdBy: req.teacherId!,
    }).returning();

    res.status(201).json(school);
  } catch (err) {
    req.log.error({ err }, "Error creating school");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/admin/schools/:id/status", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== "ativa" && status !== "inativa") {
      res.status(400).json({ error: "Status inválido" });
      return;
    }

    const [school] = await db
      .update(schoolsTable)
      .set({ status })
      .where(eq(schoolsTable.id, id))
      .returning();

    if (!school) {
      res.status(404).json({ error: "Escola não encontrada" });
      return;
    }
    res.json(school);
  } catch (err) {
    req.log.error({ err }, "Error updating school status");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/admin/schools/:id/teachers", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const memberships = await db
      .select({
        memberId: membershipsTable.id,
        memberRole: membershipsTable.role,
        memberStatus: membershipsTable.status,
        joinedAt: membershipsTable.joinedAt,
        teacherId: teachersTable.id,
        teacherName: teachersTable.name,
        teacherEmail: teachersTable.email,
        planType: teachersTable.planType,
        isBlocked: teachersTable.isBlocked,
      })
      .from(membershipsTable)
      .innerJoin(teachersTable, eq(membershipsTable.teacherId, teachersTable.id))
      .where(eq(membershipsTable.schoolId, id));

    res.json(memberships);
  } catch (err) {
    req.log.error({ err }, "Error fetching school teachers");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ── AI Logs ────────────────────────────────────────────────────────────────────

router.get("/admin/ai-logs", requireAuth, requireRole("super_admin"), async (req, res) => {
  try {
    const logs = await db
      .select()
      .from(promptLogsTable)
      .orderBy(sql`${promptLogsTable.createdAt} DESC`)
      .limit(200);
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Error fetching AI logs");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
