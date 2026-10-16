"use client";

import { useState, useTransition } from "react";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { startAttemptAction } from "@/actions/exam";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function StartTestButton({ testId, resume }: { testId: string; resume: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button
        size="lg"
        variant={resume ? "midnight" : "default"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startAttemptAction(testId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : resume ? <RotateCcw /> : <PlayCircle />}
        {resume ? t("Testni davom ettirish") : t("Testni boshlash")}
      </Button>
      {error && <p className="text-sm font-medium text-error">{t(error)}</p>}
    </div>
  );
}
