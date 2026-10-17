/** Talabalar loginlari va boshlang'ich parollarini CSV fayl qilib yuklab beradi (brauzerda). */
export function downloadAccounts(rows: { fullName: string; login: string; password: string }[], t: (k: string) => string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [[t("F.I.Sh."), t("Login"), t("Boshlang'ich parol")].map(esc).join(";")];
  for (const r of rows) lines.push([r.fullName, r.login, r.password].map(esc).join(";"));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "talabalar-loginlari.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
