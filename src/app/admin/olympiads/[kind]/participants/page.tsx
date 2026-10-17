import { redirect } from "next/navigation";

/** Eski manzil: ishtirokchilar endi alohida bo'limda. */
export default function Page() {
  redirect("/admin/olympiads/participants");
}
