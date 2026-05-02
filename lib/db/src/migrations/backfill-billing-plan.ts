import { db, teachersTable } from "../index.js";
import { isNull } from "drizzle-orm";

async function main() {
  console.log("Backfilling billing plan for existing teachers...");

  const result = await db
    .update(teachersTable)
    .set({
      planType: "advanced",
      planStatus: "trial",
      planExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .where(isNull(teachersTable.planExpirationDate));

  console.log("Done. Rows updated:", result.rowCount ?? "unknown");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
