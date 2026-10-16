// Vercel build vaqtida: SEED_ADMIN_PASSWORD o'rnatilgan bo'lsagina seed ishga tushadi.
import { spawnSync } from "node:child_process";

if (!process.env.SEED_ADMIN_PASSWORD) {
  console.log("SEED_ADMIN_PASSWORD o'rnatilmagan: seed o'tkazib yuborildi.");
  process.exit(0);
}
const r = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
process.exit(r.status ?? 1);
