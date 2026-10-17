"use client";

import { Badge } from "@/components/ui/badge";
import type { TestKind } from "@prisma/client";
import { GRADE, gradeKey } from "@/lib/grade";
import { useT } from "@/i18n/client";

/** Foizga mos baho: qoniqarsiz / qoniqarli / yaxshi / a'lo. */
export function GradeBadge({ percent, kind, className }: { percent: number | null | undefined; kind?: TestKind; className?: string }) {
  const { t } = useT();
  const g = GRADE[gradeKey(percent, kind)];
  return <Badge variant={g.variant} className={className}>{t(g.label)}</Badge>;
}
