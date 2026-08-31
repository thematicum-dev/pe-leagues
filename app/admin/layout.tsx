import Link from "next/link";
import { requireAdmin } from "./adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="dashwrap">
      <div className="dashinner">
        <div className="dashheader">
          <div>
            <h1>Admin</h1>
            <div className="dashsub">Nur für thematicum.dev@gmail.com sichtbar</div>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Zum Dashboard
          </Link>
        </div>
        <nav className="adminnav">
          <Link href="/admin/seasons">Partien</Link>
          <Link href="/admin/users">Nutzer &amp; Zugänge</Link>
          <Link href="/admin/universes">Universen</Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
