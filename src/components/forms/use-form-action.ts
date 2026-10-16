"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/lib/validation";

/**
 * useActionState ustidan o'ram: forma onSubmit orqali yuboriladi, shuning uchun
 * React 19 xatolikdan keyin maydonlarni avtomatik tozalamaydi.
 */
export function useFormAction(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}
