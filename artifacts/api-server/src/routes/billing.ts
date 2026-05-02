import { Router, type IRouter } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const PLAN_PRICES: Record<string, number> = {
  basic: 60,
  medium: 80,
  advanced: 100,
};

const PLAN_NAMES: Record<string, string> = {
  basic: "PedagoDIA Básico",
  medium: "PedagoDIA Médio",
  advanced: "PedagoDIA Avançado",
};

function getAsaasBaseUrl(): string {
  return process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

function getAsaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurado");
  return key;
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const url = `${getAsaasBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: getAsaasApiKey(),
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errors = data.errors as Array<{ description?: string }> | undefined;
    throw Object.assign(
      new Error(errors?.[0]?.description ?? "Erro na API do Asaas"),
      { status: res.status, asaasData: data }
    );
  }
  return data;
}

async function findOrCreateCustomer(
  teacherId: string,
  name: string,
  email: string,
  existingCustomerId: string | null
): Promise<string> {
  if (existingCustomerId) {
    try {
      await asaasFetch(`/customers/${existingCustomerId}`);
      return existingCustomerId;
    } catch {
    }
  }

  const search = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  const searchData = search.data as Array<{ id: string }> | undefined;
  if (searchData && searchData.length > 0) {
    const customerId: string = searchData[0].id;
    await db
      .update(teachersTable)
      .set({ asaasCustomerId: customerId })
      .where(eq(teachersTable.id, teacherId));
    return customerId;
  }

  const created = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({ name, email, externalReference: teacherId }),
  });

  const createdId = created.id as string;
  await db
    .update(teachersTable)
    .set({ asaasCustomerId: createdId })
    .where(eq(teachersTable.id, teacherId));

  return createdId;
}

router.post("/billing/subscribe", requireAuth, async (req, res) => {
  try {
    const { planType } = req.body as { planType?: string };

    if (!planType || !PLAN_PRICES[planType]) {
      res.status(400).json({
        error: "planType inválido. Use: basic, medium ou advanced",
      });
      return;
    }

    const [teacher] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.id, req.teacherId!));

    if (!teacher) {
      res.status(404).json({ error: "Professora não encontrada" });
      return;
    }

    const customerId = await findOrCreateCustomer(
      teacher.id,
      teacher.name,
      teacher.email,
      teacher.asaasCustomerId ?? null
    );

    const today = new Date();
    const nextDueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const subscription = await asaasFetch("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: PLAN_PRICES[planType],
        nextDueDate,
        cycle: "MONTHLY",
        description: PLAN_NAMES[planType],
        externalReference: teacher.id,
      }),
    });

    const subscriptionId = subscription.id as string;
    const paymentLink = (subscription.paymentLink as string | undefined) ?? null;

    // Save Asaas IDs only — plan status is NOT upgraded here.
    // Premium access is only granted after PAYMENT_CONFIRMED webhook is received.
    await db
      .update(teachersTable)
      .set({ asaasSubscriptionId: subscriptionId })
      .where(eq(teachersTable.id, teacher.id));

    res.json({
      subscriptionId,
      paymentLink,
      planType,
      planStatus: teacher.planStatus,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Error creating subscription");
    const msg =
      err instanceof Error ? err.message : "Erro ao criar assinatura";
    res.status(500).json({ error: msg });
  }
});

router.post("/webhooks/asaas", async (req, res) => {
  try {
    const token = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!token) {
      res.status(503).json({ error: "Webhook não configurado" });
      return;
    }
    const provided =
      (req.headers["asaas-access-token"] as string | undefined) ??
      (req.headers["access_token"] as string | undefined);
    if (provided !== token) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    const event = req.body as {
      event: string;
      payment?: {
        customer?: string;
        subscription?: string;
      };
      subscription?: {
        id?: string;
        customer?: string;
      };
    };

    const eventType = event.event;

    const customerId =
      event.payment?.customer ??
      event.subscription?.customer ??
      null;

    const subscriptionId =
      event.payment?.subscription ??
      event.subscription?.id ??
      null;

    if (!customerId && !subscriptionId) {
      res.json({ received: true });
      return;
    }

    const conditions = [];
    if (customerId) conditions.push(eq(teachersTable.asaasCustomerId, customerId));
    if (subscriptionId) conditions.push(eq(teachersTable.asaasSubscriptionId, subscriptionId));

    const [teacher] = await db
      .select()
      .from(teachersTable)
      .where(or(...conditions));

    if (!teacher) {
      res.json({ received: true });
      return;
    }

    if (
      eventType === "PAYMENT_RECEIVED" ||
      eventType === "PAYMENT_CONFIRMED"
    ) {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30);
      await db
        .update(teachersTable)
        .set({ planStatus: "active", planExpirationDate: expiration })
        .where(eq(teachersTable.id, teacher.id));
    } else if (eventType === "PAYMENT_OVERDUE") {
      await db
        .update(teachersTable)
        .set({ planStatus: "overdue" })
        .where(eq(teachersTable.id, teacher.id));
    } else if (
      eventType === "SUBSCRIPTION_DELETED" ||
      eventType === "PAYMENT_DELETED"
    ) {
      await db
        .update(teachersTable)
        .set({
          planStatus: "canceled",
          planType: "free",
          asaasSubscriptionId: null,
          planExpirationDate: null,
        })
        .where(eq(teachersTable.id, teacher.id));
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Error processing Asaas webhook");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/billing/status", requireAuth, async (req, res) => {
  try {
    const [teacher] = await db
      .select({
        planType: teachersTable.planType,
        planStatus: teachersTable.planStatus,
        planExpirationDate: teachersTable.planExpirationDate,
      })
      .from(teachersTable)
      .where(eq(teachersTable.id, req.teacherId!));

    if (!teacher) {
      res.status(404).json({ error: "Professora não encontrada" });
      return;
    }

    const now = new Date();
    let { planType, planStatus, planExpirationDate } = teacher;

    if (
      planStatus === "trial" &&
      planExpirationDate &&
      planExpirationDate < now
    ) {
      planType = "free";
      planStatus = "active";
      planExpirationDate = null;
      await db
        .update(teachersTable)
        .set({ planType: "free", planStatus: "active", planExpirationDate: null })
        .where(eq(teachersTable.id, req.teacherId!));
    }

    res.json({ planType, planStatus, planExpirationDate: planExpirationDate ?? null });
  } catch (err) {
    req.log.error({ err }, "Error fetching billing status");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
