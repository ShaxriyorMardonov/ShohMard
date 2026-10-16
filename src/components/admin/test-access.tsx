"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCheck, X } from "lucide-react";
import { addTestAccessAction, removeTestAccessAction, setTestRestrictedAction } from "@/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Option = { value: string; label: string };

export function TestAccessCard({
  testId,
  restricted,
  allowed,
  groups,
  faculties,
}: {
  testId: string;
  restricted: boolean;
  allowed: { id: string; fullName: string; login: string; group: string | null }[];
  groups: Option[];
  faculties: Option[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [by, setBy] = React.useState<"group" | "faculty" | "logins">("group");
  const [value, setValue] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [mode, setMode] = React.useState(restricted);
  React.useEffect(() => setMode(restricted), [restricted]);

  const run = (fn: () => Promise<{ error?: string; added?: number; notFound?: string[] } | void>) =>
    start(async () => {
      const r = await fn();
      if (r?.error) setMsg({ ok: false, text: r.error });
      else if (r && "added" in r)
        setMsg({
          ok: true,
          text: `${r.added} ta talabaga ruxsat berildi.${r.notFound?.length ? ` Topilmadi: ${r.notFound.slice(0, 10).join(", ")}` : ""}`,
        });
      else setMsg(null);
      router.refresh();
    });

  const shown = filter
    ? allowed.filter((a) => (a.fullName + " " + a.login + " " + (a.group ?? "")).toLowerCase().includes(filter.toLowerCase()))
    : allowed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kimlar topshira oladi</CardTitle>
        <CardDescription>Testni barcha talabalarga yoki faqat ruxsat berilganlarga ochish</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="grid gap-2">
          {[
            { v: false, t: "Tanlangan universitetlarning barcha talabalari" },
            { v: true, t: "Faqat ruxsat berilgan talabalar" },
          ].map((o) => (
            <label key={String(o.v)} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 has-[:checked]:border-royal has-[:checked]:bg-royal/5">
              <input
                type="radio"
                name="access-mode"
                checked={mode === o.v}
                disabled={pending}
                onChange={() => {
                  setMode(o.v);
                  run(() => setTestRestrictedAction(testId, o.v));
                }}
                className="size-4 accent-[#315ECA]"
              />
              {o.t}
            </label>
          ))}
        </div>

        {mode && (
          <>
            {allowed.length === 0 && (
              <Alert variant="warning"><span>Hozircha hech kimga ruxsat berilmagan, test hech kimga ko&apos;rinmaydi.</span></Alert>
            )}
            <form
              className="grid gap-2 rounded-lg bg-muted/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!value.trim()) return;
                run(() =>
                  addTestAccessAction(testId, by === "group" ? { groupId: value } : by === "faculty" ? { facultyId: value } : { logins: value }),
                );
                setValue("");
              }}
            >
              <p className="font-semibold text-midnight">Ruxsat berish</p>
              <NativeSelect value={by} onChange={(e) => { setBy(e.target.value as typeof by); setValue(""); }} aria-label="Qanday qo'shish">
                <option value="group">Guruh bo&apos;yicha</option>
                <option value="faculty">Fakultet bo&apos;yicha</option>
                <option value="logins">Loginlar ro&apos;yxati</option>
              </NativeSelect>
              {by === "logins" ? (
                <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder="talaba1, talaba2 (vergul yoki yangi qatordan)" aria-label="Loginlar" />
              ) : (
                <NativeSelect value={value} onChange={(e) => setValue(e.target.value)} aria-label={by === "group" ? "Guruh" : "Fakultet"}>
                  <option value="">{by === "group" ? "Guruhni tanlang" : "Fakultetni tanlang"}</option>
                  {(by === "group" ? groups : faculties).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              )}
              <Button type="submit" size="sm" disabled={pending || !value.trim()}><UserCheck /> Ruxsat berish</Button>
            </form>
            {msg && <p className={`text-xs font-medium ${msg.ok ? "text-success" : "text-error"}`}>{msg.text}</p>}

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-midnight">Ruxsat berilganlar <Badge variant="muted">{allowed.length}</Badge></p>
                {allowed.length > 0 && (
                  <Button size="sm" variant="ghost" className="text-error" disabled={pending} onClick={() => run(() => removeTestAccessAction(testId, []))}>
                    Hammasini olib tashlash
                  </Button>
                )}
              </div>
              {allowed.length > 8 && (
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Ro'yxatdan qidirish"
                  className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                  aria-label="Ruxsat berilganlardan qidirish"
                />
              )}
              <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
                {shown.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-midnight">{a.fullName}</span>
                      <span className="text-xs text-muted-foreground">{a.login}{a.group ? ` · ${a.group}` : ""}</span>
                    </span>
                    <Button size="icon-sm" variant="ghost" aria-label={`${a.fullName} ruxsatini olib tashlash`} disabled={pending} onClick={() => run(() => removeTestAccessAction(testId, [a.id]))}>
                      <X />
                    </Button>
                  </li>
                ))}
                {shown.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Bo&apos;sh</li>}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
