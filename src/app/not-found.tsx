import Link from "next/link";
import { SamuLogo } from "@/components/brand/samu-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <SamuLogo />
      <div>
        <p className="text-6xl font-extrabold text-royal">404</p>
        <h1 className="mt-2 text-xl font-bold text-midnight">Sahifa topilmadi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Siz izlagan sahifa mavjud emas yoki sizga ruxsat berilmagan.</p>
      </div>
      <Button asChild><Link href="/">Bosh sahifaga qaytish</Link></Button>
    </main>
  );
}
