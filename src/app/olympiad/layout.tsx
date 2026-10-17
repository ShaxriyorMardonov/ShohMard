import { AppShell } from "@/components/layout/app-shell";
import { requireExaminee } from "@/lib/auth";

/** Olimpiadalar: tizimdagi talabalar va ro'yxatdan o'tgan ishtirokchilar uchun. */
export default async function OlympiadLayout({ children }: { children: React.ReactNode }) {
  const user = await requireExaminee();
  return <AppShell user={user}>{children}</AppShell>;
}
