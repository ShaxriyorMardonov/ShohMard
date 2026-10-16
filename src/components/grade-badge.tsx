"use client";

import { Badge } from "@/components/ui/badge";
import { GRADE, gradeKey } from "@/lib/grade";
import { useT } from "@/i18n/client";

/** Foizga mos baho: qoniqarsiz / qoniqarli / yaxshi / a'lo. */
export function GradeBadge({ percent, className }: { percent: number | null | undefined; className?: string }) {
  const { t } = useT();
  const g = GRADE[gradeKey(percent)];
  return <Badge variant={g.variant} className={className}>{t(g.label)}</Badge>;
}
