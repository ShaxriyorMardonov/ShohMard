"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

type ActionResult = { error?: string } | void;

function SubmitBtn({ label, variant }: { label: string; variant: "destructive" | "default" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  );
}

/** Tasdiqlash oynasi orqali server amalini bajaradigan tugma. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  variant = "destructive",
  action,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  action: () => Promise<ActionResult>;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <form
          action={async () => {
            const res = await action();
            if (res && res.error) setError(res.error);
            else setOpen(false);
          }}
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Bekor qilish
              </Button>
            </DialogClose>
            <SubmitBtn label={confirmLabel} variant={variant} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
