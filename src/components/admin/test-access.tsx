"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  addTestAccessAction,
  listAccessCandidatesAction,
  removeTestAccessAction,
  removeTestAccessByFilterAction,
  setTestRestrictedAction,
} from "@/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type Row = { id: string; fullName: string; login: string; group: string | null; allowed: boolean };

export function TestAccessCard({
  testId,
  restricted,
  allowedCount,
  universities,
  faculties,
  groups,
}: {
  testId: string;
  restricted: boolean;
  allowedCount: number;
  universities: { id: string; name: string }[];
  faculties: { id: string; name: string; universityId: string }[];
  groups: { id: string; name: string; universityId: string; facultyId: string | null }[];
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState(restricted);
  React.useEffect(() => setMode(restricted), [restricted]);
  const [uni, setUni] = React.useState(universities.length === 1 ? universities[0]!.id : "");
  const [fac, setFac] = React.useState("");
  const [grp, setGrp] = React.useState("");
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [busy, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const filter = React.useMemo(() => ({ universityId: uni || undefined, facultyId: fac || undefined, groupId: grp || undefined, q: query || undefined }), [uni, fac, grp, query]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const r = await listAccessCandidatesAction(testId, filter);
    setRows(r.rows);
    setTotal(r.total);
    setError("error" in r && r.error ? r.error : null);
    setLoading(false);
  }, [testId, filter]);

  React.useEffect(() => {
    if (mode) void load();
  }, [mode, load]);

  // Qidiruv kiritilgandan biroz keyin qo'llanadi
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const facOptions = faculties.filter((f) => !uni || f.universityId === uni);
  const grpOptions = groups.filter((g) => (!uni || g.universityId === uni) && (!fac || g.facultyId === fac));
  const multiUni = universities.length > 1;
  const allChecked = rows.length > 0 && rows.every((r) => r.allowed);

  const mutate = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      const r = await fn();
      if (r && r.error) setError(r.error);
      await load();
      router.refresh();
    });

  const toggleOne = (row: Row) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, allowed: !r.allowed } : r)));
    mutate(() => (row.allowed ? removeTestAccessAction(testId, [row.id]) : addTestAccessAction(testId, { ...filter, userIds: [row.id] })));
  };

  const toggleAll = () => {
    setRows((rs) => rs.map((r) => ({ ...r, allowed: !allChecked })));
    mutate(() => (allChecked ? removeTestAccessByFilterAction(testId, filter) : addTestAccessAction(testId, { ...filter, all: true })));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kimlar topshira oladi</CardTitle>
        <CardDescription>Testni barcha talabalarga yoki faqat belgilanganlarga ochish</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="grid gap-2">
          {[
            { v: false, t: "Tanlangan universitetlarning barcha talabalari" },
            { v: true, t: "Faqat belgilangan talabalar" },
          ].map((o) => (
            <label key={String(o.v)} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 has-[:checked]:border-royal has-[:checked]:bg-royal/5">
              <input
                type="radio"
                name="access-mode"
                checked={mode === o.v}
                disabled={busy}
                onChange={() => {
                  setMode(o.v);
                  mutate(() => setTestRestrictedAction(testId, o.v));
                }}
                className="size-4 accent-[#315ECA]"
              />
              {o.t}
            </label>
          ))}
        </div>

        {mode && (
          <>
            <p className="font-semibold text-midnight">
              Ruxsat berilgan: <Badge variant={allowedCount ? "success" : "muted"}>{allowedCount}</Badge>
            </p>
            {allowedCount === 0 && (
              <Alert variant="warning"><span>Hozircha hech kim belgilanmagan, test hech kimga ko&apos;rinmaydi.</span></Alert>
            )}
            <div className="grid gap-2">
              {multiUni && (
                <NativeSelect value={uni} onChange={(e) => { setUni(e.target.value); setFac(""); setGrp(""); }} aria-label="Universitet">
                  <option value="">Barcha universitetlar</option>
                  {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </NativeSelect>
              )}
              <NativeSelect value={fac} onChange={(e) => { setFac(e.target.value); setGrp(""); }} aria-label="Fakultet">
                <option value="">Barcha fakultetlar</option>
                {facOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </NativeSelect>
              <NativeSelect value={grp} onChange={(e) => setGrp(e.target.value)} aria-label="Guruh">
                <option value="">Barcha guruhlar</option>
                {grpOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </NativeSelect>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism yoki login" className="pl-9" aria-label="Talabani qidirish" />
              </div>
            </div>
            {error && <p className="text-xs font-medium text-error">{error}</p>}
            <div className="overflow-hidden rounded-lg border">
              <label className="flex cursor-pointer items-center gap-2.5 border-b bg-muted/60 px-3 py-2 font-semibold text-midnight">
                <input type="checkbox" checked={allChecked} disabled={busy || loading || rows.length === 0} onChange={toggleAll} className="size-4 accent-[#315ECA]" />
                Hammasini belgilash
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {loading || busy ? <Loader2 className="size-3.5 animate-spin" /> : `${total} ta talaba`}
                </span>
              </label>
              <ul className="max-h-80 divide-y overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/40">
                      <input type="checkbox" checked={r.allowed} disabled={busy} onChange={() => toggleOne(r)} className="size-4 accent-[#315ECA]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-midnight">{r.fullName}</span>
                        <span className="text-xs text-muted-foreground">{r.login}{r.group ? ` · ${r.group}` : ""}</span>
                      </span>
                    </label>
                  </li>
                ))}
                {!loading && rows.length === 0 && <li className="px-3 py-3 text-xs text-muted-foreground">Talabalar topilmadi</li>}
              </ul>
              {total > rows.length && (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Birinchi {rows.length} tasi ko&apos;rsatildi. &quot;Hammasini belgilash&quot; filtrga mos barcha {total} ta talabaga ta&apos;sir qiladi.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
