import { Globe2, Trophy } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { OlympiadCard } from "@/components/student/olympiad-card";
import { getT } from "@/i18n/server";
import { requireExaminee } from "@/lib/auth";
import { OLYMPIAD } from "@/lib/olympiad";
import { getOlympiadTests } from "@/server/student";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Olimpiadalar") };
}

export default async function OlympiadsPage() {
  const user = await requireExaminee();
  const { t } = await getT();
  const tests = await getOlympiadTests(user.id);
  // Yakunlangan va qatnashilmagan olimpiadalar ko'rsatilmaydi
  const visible = tests.filter((x) => x.status !== "missed" || x.attempt);
  const sections = [
    { slug: "international" as const, icon: Globe2 },
    { slug: "local" as const, icon: Trophy },
  ].map((s) => ({ ...s, ...OLYMPIAD[s.slug], tests: visible.filter((x) => x.kind === OLYMPIAD[s.slug].kind) }));

  return (
    <>
      <PageHeader title={t("Olimpiadalar")} description={t("Olimpiadalar 100 ballik tizimda baholanadi. Natija va sertifikat shu yerda chiqadi.")} />
      {visible.length === 0 ? (
        <EmptyState icon={<Trophy />} title={t("Hozircha olimpiadalar yo'q")} description={t("Yangi olimpiada e'lon qilinganda shu yerda ko'rinadi.")} />
      ) : (
        <div className="grid gap-8">
          {sections.filter((s) => s.tests.length).map(({ slug, icon: Icon, title, tests: list }) => (
            <section key={slug}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-midnight"><Icon className="size-5 text-royal" /> {t(title)}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((x) => <OlympiadCard key={x.id} test={x} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
