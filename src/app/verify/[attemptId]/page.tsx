import { BadgeCheck, ShieldX } from "lucide-react";
import { SamuLogo } from "@/components/brand/samu-logo";
import { GradeBadge } from "@/components/grade-badge";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { formatDate } from "@/lib/time";
import { getCertificate } from "@/server/certificate";
import { OLYMPIAD, isOlympiad, olympiadSlug } from "@/lib/olympiad";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Sertifikatni tekshirish") };
}

/** Ochiq sahifa: QR kod orqali sertifikat haqiqiyligini tekshirish (kirish talab qilinmaydi). */
export default async function VerifyPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { t, lang } = await getT();
  const c = /^[a-z0-9]{10,40}$/.test(attemptId) ? await getCertificate(attemptId) : null;
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <SamuLogo size="md" />
          <LangSwitcher compact className="w-40" />
        </div>
        <Card>
          <CardContent className="grid gap-4 pt-6">
            {c ? (
              <>
                <div className="flex items-center gap-3 text-success">
                  <BadgeCheck className="size-9" />
                  <div>
                    <p className="text-lg font-bold">{t("Sertifikat haqiqiy")}</p>
                    <p className="text-sm text-muted-foreground">{t("SAMU platformasi tomonidan berilgan")}</p>
                  </div>
                </div>
                <dl className="grid gap-2 text-sm">
                  {[
                    [t("Sertifikat raqami"), c.number],
                    ...(isOlympiad(c.test.kind)
                      ? [
                          [t("Ishtirokchi"), c.user.fullName],
                          [t("O'quv muassasasi"), c.user.university?.name ?? c.user.organization ?? "—"],
                          [t("Olimpiada"), `${c.test.title} · ${t(OLYMPIAD[olympiadSlug(c.test.kind)].title)}`],
                        ]
                      : [
                          [t("Talaba"), c.user.fullName],
                          [t("Universitet"), c.user.university?.name ?? "—"],
                          [t("Fakultet"), c.user.faculty?.name ?? "—"],
                          [t("Guruh"), c.user.group?.name ?? "—"],
                          [t("Test"), c.test.title],
                        ]),
                    [t("Sana"), formatDate(c.submittedAt, lang)],
                    [t("Natija"), `${c.percent}% · ${c.score}/${c.maxScore}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-semibold text-midnight">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t("Baho")}</dt>
                    <dd><GradeBadge percent={c.percent} kind={c.test.kind} /></dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="flex items-center gap-3 text-error">
                <ShieldX className="size-9" />
                <div>
                  <p className="text-lg font-bold">{t("Sertifikat topilmadi")}</p>
                  <p className="text-sm text-muted-foreground">{t("Bunday sertifikat SAMU platformasida ro'yxatdan o'tmagan yoki bekor qilingan.")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
