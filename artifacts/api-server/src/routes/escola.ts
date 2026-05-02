import { Router, type IRouter } from "express";
import { db, teachersTable, schoolsTable, membershipsTable, activitiesTable, promptLogsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { requireSchoolAdmin } from "../middlewares/role";

const router: IRouter = Router();

// ── School dashboard ──────────────────────────────────────────────────────────

router.get("/escola/dashboard", requireAuth, requireSchoolAdmin(), async (req, res) => {
  try {
    const memberships = await db
      .select({
        membershipId: membershipsTable.id,
        role: membershipsTable.role,
        schoolId: schoolsTable.id,
        schoolName: schoolsTable.name,
        schoolStatus: schoolsTable.status,
        inviteCode: schoolsTable.inviteCode,
      })
      .from(membershipsTable)
      .innerJoin(schoolsTable, eq(membershipsTable.schoolId, schoolsTable.id))
      .where(eq(membershipsTable.teacherId, req.teacherId!));

    if (memberships.length === 0) {
      res.status(404).json({ error: "Nenhuma escola vinculada" });
      return;
    }

    const school = memberships[0];

    const [{ count: teacherCount }] = await db
      .select({ count: count() })
      .from(membershipsTable)
      .where(eq(membershipsTable.schoolId, school.schoolId));

    const teachers = await db
      .select({
        memberId: membershipsTable.id,
        memberRole: membershipsTable.role,
        joinedAt: membershipsTable.joinedAt,
        teacherId: teachersTable.id,
        teacherName: teachersTable.name,
        teacherEmail: teachersTable.email,
        planType: teachersTable.planType,
        isBlocked: teachersTable.isBlocked,
      })
      .from(membershipsTable)
      .innerJoin(teachersTable, eq(membershipsTable.teacherId, teachersTable.id))
      .where(eq(membershipsTable.schoolId, school.schoolId));

    const teacherIds = teachers.map((t) => t.teacherId);
    let totalActivities = 0;
    let totalAiLogs = 0;

    if (teacherIds.length > 0) {
      for (const tid of teacherIds) {
        const [{ count: ac }] = await db
          .select({ count: count() })
          .from(activitiesTable)
          .where(eq(activitiesTable.teacherId, tid));
        totalActivities += Number(ac);

        const [{ count: al }] = await db
          .select({ count: count() })
          .from(promptLogsTable)
          .where(eq(promptLogsTable.teacherId, tid));
        totalAiLogs += Number(al);
      }
    }

    res.json({
      escola: {
        id: school.schoolId,
        name: school.schoolName,
        status: school.schoolStatus,
        inviteCode: school.inviteCode,
      },
      stats: {
        totalProfessores: Number(teacherCount),
        totalAtividades: totalActivities,
        totalGeneracoesIA: totalAiLogs,
      },
      professores: teachers,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching escola dashboard");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
