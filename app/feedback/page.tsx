import Link from "next/link";
import { requireAccess } from "@/lib/access/context";
import FeedbackForm from "./FeedbackForm";

export default async function FeedbackPage() {
  await requireAccess("/feedback");

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Feedback</h1>
            <div className="dashsub">Wie gefällt dir PE Leagues?</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>
        <FeedbackForm />
      </div>
    </main>
  );
}
