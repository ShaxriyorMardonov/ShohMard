"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useT } from "@/i18n/client";

export type FilterOption = { value: string; label: string };
export type FilterField =
  | { type?: "select"; name: string; label: string; all: string; options: FilterOption[]; resets?: string[] }
  | { type: "date"; name: string; label: string };

/**
 * Sahifa filtrlari: tanlov o'zgarganda darhol qo'llanadi, qidiruv Enter yoki tugma bilan.
 * `resets` — bu maydon o'zgarganda tozalanadigan bog'liq maydonlar (masalan, universitet → fakultet, guruh).
 */
export function FilterBar({
  search,
  fields,
  values,
}: {
  search?: { placeholder: string };
  fields: FilterField[];
  values: Record<string, string | undefined>;
}) {
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const active = Object.entries(values).some(([k, v]) => v && k !== "page");
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        // Bo'sh qiymatlar URL'ga qo'shilmaydi
        const sp = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === "string" && v.trim()) sp.set(k, v.trim());
        const qs = sp.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }}
      className="mb-4 rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)]" role="search">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {search && (
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={values.q ?? ""} placeholder={search.placeholder} className="pl-9" aria-label={t("Qidirish")} />
          </div>
        )}
        {fields.map((f) =>
          f.type === "date" ? (
            <label key={f.name} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="shrink-0">{f.label}</span>
              <Input type="date" name={f.name} defaultValue={values[f.name] ?? ""} onChange={submit} aria-label={f.label} />
            </label>
          ) : (
            <NativeSelect
              key={f.name + (values[f.name] ?? "")}
              name={f.name}
              defaultValue={values[f.name] ?? ""}
              aria-label={f.label}
              onChange={(e) => {
                const form = e.currentTarget.form;
                for (const r of f.resets ?? []) {
                  const el = form?.elements.namedItem(r);
                  if (el instanceof HTMLSelectElement) el.value = "";
                }
                submit();
              }}
            >
              <option value="">{f.all}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </NativeSelect>
          ),
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        {active && (
          <Button asChild variant="ghost" size="sm">
            <Link href={pathname}><X /> {t("Filtrni tozalash")}</Link>
          </Button>
        )}
        <Button type="submit" variant="midnight" size="sm">{t("Qidirish")}</Button>
      </div>
    </form>
  );
}
