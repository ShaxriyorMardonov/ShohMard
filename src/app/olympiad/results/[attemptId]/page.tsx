import { AttemptResult } from "@/components/results/attempt-result";
import { requireExaminee } from "@/lib/auth";

export default async function OlympiadResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireExaminee();
  return <AttemptResult attemptId={attemptId} userId={user.id} backHref="/olympiad/results" historyHref="/olympiad/results" />;
}
