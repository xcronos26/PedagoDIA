import { Router, type IRouter } from "express";
import { db, studentsTable, attendanceTable, activitiesTable, deliveriesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/relatorio/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: "Token é obrigatório" });
      return;
    }

    // Buscar aluno pelo token
    const [student] = await db.select().from(studentsTable)
      .where(and(
        eq(studentsTable.parentAccessToken, token),
        isNotNull(studentsTable.parentTokenExpires)
      ));

    if (!student) {
      res.status(404).json({ error: "Relatório não encontrado" });
      return;
    }

    // Verificar se o token não expirou
    if (student.parentTokenExpires && new Date() > student.parentTokenExpires) {
      res.status(410).json({ error: "Link expirado" });
      return;
    }

    // Buscar dados do aluno
    const [attendance, activities, deliveries] = await Promise.all([
      db.select().from(attendanceTable).where(eq(attendanceTable.studentId, student.id)),
      db.select().from(activitiesTable).where(eq(activitiesTable.teacherId, student.teacherId)),
      db.select().from(deliveriesTable).where(eq(deliveriesTable.studentId, student.id))
    ]);

    // Calcular estatísticas
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.present).length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const totalActivities = activities.length;
    const deliveredCount = deliveries.filter(d => d.delivered).length;
    const seenCount = deliveries.filter(d => d.seen).length;
    const activityPercentage = totalActivities > 0 ? Math.round((deliveredCount / totalActivities) * 100) : 0;

    // Retornar dados formatados
    res.json({
      student: {
        id: student.id,
        name: student.name
      },
      stats: {
        attendance: {
          total: totalDays,
          present: presentDays,
          absent: absentDays,
          percentage: attendancePercentage
        },
        activities: {
          total: totalActivities,
          delivered: deliveredCount,
          seen: seenCount,
          percentage: activityPercentage
        }
      },
      attendance: attendance.map(a => ({
        id: a.id,
        date: a.date,
        present: a.present,
        justified: a.justified ?? false,
        justification: a.justification ?? undefined
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      activities: activities.map(activity => {
        const delivery = deliveries.find(d => d.activityId === activity.id);
        return {
          id: activity.id,
          subject: activity.subject,
          type: activity.type,
          date: activity.date,
          description: activity.description,
          link: activity.link,
          delivered: delivery?.delivered ?? false,
          seen: delivery?.seen ?? false
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });

  } catch (err) {
    console.error("Error accessing parent report:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
