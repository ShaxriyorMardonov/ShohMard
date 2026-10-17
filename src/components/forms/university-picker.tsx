"use client";

import * as React from "react";
import { BadgeCheck, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Hit = { ref: string; name: string; detail: string | null };

/**
 * Universitetni qidirib tanlash (Google yoki o'rnatilgan ro'yxat orqali tasdiqlanadi).
 * Formaga `orgRef` (tanlangan kalit) yoki `orgManual=1` + `organization` (qo'lda yozilgan nom) yuboriladi.
 */
export function UniversityPicker({ id, invalid }: { id: string; invalid?: boolean }) {
  const { t } = useT();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Hit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [picked, setPicked] = React.useState<Hit | null>(null);
  const [manual, setManual] = React.useState(false);
  const listId = `${id}-list`;

  React.useEffect(() => {
    if (picked || manual) return;
    const q = query.trim();
    if (q.length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/universities?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items?: Hit[] };
        setItems(data.items ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // bekor qilingan so'rov
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, picked, manual]);

  const choose = (h: Hit) => {
    setPicked(h);
    setQuery(h.name);
    setOpen(false);
  };

  if (manual) {
    return (
      <div className="grid gap-2">
        <input type="hidden" name="orgManual" value="1" />
        <Input id={id} name="organization" defaultValue={query} autoComplete="organization" placeholder={t("Universitetning to'liq rasmiy nomi")} aria-invalid={invalid} required />
        <button type="button" className="justify-self-start text-xs font-semibold text-royal hover:underline" onClick={() => setManual(false)}>
          {t("Ro'yxatdan qidirish")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="orgRef" value={picked?.ref ?? ""} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid}
          autoComplete="off"
          placeholder={t("Universitet nomini yozing va ro'yxatdan tanlang")}
          className={cn("pl-9 pr-9", picked && "border-success/60 bg-success/5")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          onFocus={() => items.length && !picked && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(items[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : picked ? (
            <button type="button" aria-label={t("Tozalash")} onClick={() => { setPicked(null); setQuery(""); }}>
              <X className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </span>
        {open && !picked && query.trim().length >= 3 && !loading && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
            {items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{t("Hech narsa topilmadi. Boshqacha yozib ko'ring.")}</li>
            ) : (
              items.map((h, i) => (
                <li
                  key={h.ref}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(h);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("cursor-pointer px-3 py-2", i === active && "bg-muted")}
                >
                  <p className="text-sm font-medium text-midnight">{h.name}</p>
                  {h.detail && <p className="text-xs text-muted-foreground">{h.detail}</p>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {picked && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-success">
          <BadgeCheck className="size-4" /> {t("Universitet tasdiqlandi")}
          {picked.detail && <span className="text-muted-foreground">· {picked.detail}</span>}
        </p>
      )}
      <button type="button" className="justify-self-start text-xs font-semibold text-royal hover:underline" onClick={() => setManual(true)}>
        {t("Universitetim ro'yxatda topilmadi")}
      </button>
    </div>
  );
}
