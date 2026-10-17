import { AttemptResult } from "@/components/results/attempt-result";
import { requireStudent } from "@/lib/auth";

export default async function ResultDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireStudent();
  return <AttemptResult attemptId={attemptId} userId={user.id} backHref="/student/results" historyHref="/student/history" />;
}
