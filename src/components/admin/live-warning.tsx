"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Square } from "lucide-react";
import { endTestNowAction, liveAttemptsAction } from "@/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/client";

export type Live = { count: number; names: string[] };

/** Hozir test ishlayotgan talabalar haqida ogohlantirish. */
export function LiveStudentsAlert({ live, note }: { live: Live; note: string }) {
  const { t } = useT();
  if (!live.count) return null;
  return (
    <Alert variant="warning">
      <AlertTriangle />
      <div className="grid gap-1">
        <b>{t("Diqqat: hozir {n} ta talaba testni ishlayapti.", { n: live.count })}</b>
        <span className="text-xs">
          {live.names.join(", ")}
          {live.count > live.names.length ? ` ${t("va yana {n} ta", { n: live.count - live.names.length })}` : ""}
        </span>
        <span>{note}</span>
      </div>
    </Alert>
  );
}

/** Ochiq testni muddatidan oldin yakunlash tugmasi. */
export function EndTestButton({ testId }: { testId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [live, setLive] = React.useState<Live | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => {
          setOpen(true);
          setLive(null);
          setError(null);
          void liveAttemptsAction(testId).then(setLive);
        }}
      >
        <Square /> {t("Testni hozir yakunlash")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Testni muddatidan oldin yakunlash")}</DialogTitle>
            <DialogDescription>{t("Test darhol yopiladi va talabalar uni boshqa boshlay olmaydi.")}</DialogDescription>
          </DialogHeader>
          {!live ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("Hozir test ishlayotganlar tekshirilmoqda...")}</p>
          ) : live.count ? (
            <LiveStudentsAlert live={live} note={t("Yakunlasangiz, ularning shu paytgacha belgilagan javoblari avtomatik topshiriladi.")} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("Hozir testni ishlayotgan talaba yo'q.")}</p>
          )}
          {error && <p className="text-sm font-medium text-error">{t(error)}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("Bekor qilish")}</Button>
            <Button
              variant="destructive"
              disabled={!live || pending}
              onClick={() =>
                start(async () => {
                  const r = await endTestNowAction(testId);
                  if (r.error) return setError(r.error);
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              {t("Yakunlash")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
