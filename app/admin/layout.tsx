import Link from "next/link";
import { requireAdmin } from "./adminAuth";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <main className="dashwrap" style={{ alignItems: "flex-start" }}>
      <div className="dashinner dashinner-wide">
        <div className="dashheader">
          <div>
            <h1>Admin</h1>
            <div className="dashsub">Angemeldet als {user.email} · nur für Administratoren sichtbar</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
