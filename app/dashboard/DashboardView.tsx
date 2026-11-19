import Link from "next/link";
import type { ComponentProps } from "react";
import { ChevronRight, Dumbbell, GraduationCap, LogOut, MessageSquare, Shield, Trophy, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { TierBadge } from "@/components/career/CareerView";
import SiteFooter from "@/components/SiteFooter";
import type { summarize } from "@/lib/career/career";
import LobbyOverview from "./LobbyOverview";
import UniverseSwitcher from "./UniverseSwitcher";
import InviteFriends from "./InviteFriends";

/* Darstellung des Dashboards. Die Seite (page.tsx) lädt die Daten und reicht
   sie hierher durch; so lässt sich das Dashboard auch mit festen Beispieldaten
   rendern (Live-Harness, .claude/skills/live).

   Aufbau seit dem Redesign (November 2026), von oben nach unten:
   Spielerkarte (wer bin ich, wo stehe ich), Navigation, Spielmodus als
   einzige farbig hervorgehobene Aufgabe, Üben, Community. */

type LobbyProps = ComponentProps<typeof LobbyOverview>;
type SwitcherProps = ComponentProps<typeof UniverseSwitcher>;

export interface DashboardViewProps {
  displayName: string;
  email: string | null | undefined;
  isAdmin: boolean;
  universes: SwitcherProps["universes"];
  activeUniverse: { id: string; name: string; description?: string | null; isActive: boolean };
  showUniverse: boolean;
  mySeasons: LobbyProps["initialMySeasons"];
  openLobbies: LobbyProps["initialOpenLobbies"];
  limits: LobbyProps["limits"];
  openTurns: NonNullable<LobbyProps["openTurns"]>;
  career: ReturnType<typeof summarize>;
  signupUrl: string;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "?").slice(0, 2);
  return letters.toUpperCase();
}

export default function DashboardView(p: DashboardViewProps) {
  const { career } = p;
  const myTurns = p.mySeasons.filter((s) => s.status === "running" && p.openTurns[s.id] && !p.openTurns[s.id].submitted).length;

  return (
    <main className="dashwrap">
      <div className="dashinner">
        {/* Spielerkarte: Begrüßung, Karrierestufe, Bilanz. Ein Tipp führt ins Profil. */}
        <header className="dhero">
          <div className="dhero-top">
            <span className="dhero-avatar" aria-hidden="true">{initialsOf(p.displayName)}</span>
            <div className="dhero-hello">
              <span className="dhero-kicker">
                {myTurns > 0 ? `Du bist in ${myTurns === 1 ? "einer Partie" : `${myTurns} Partien`} dran` : "Willkommen zurück"}
              </span>
              <h1>{p.displayName}</h1>
              {p.email && <span className="dashsub">{p.email}</span>}
            </div>
          </div>
          {p.showUniverse && (
            <div className="dashsub dhero-universe">
              Universum: <strong>{p.activeUniverse.name}</strong>
              {p.activeUniverse.description ? ` — ${p.activeUniverse.description}` : ""}
            </div>
          )}
          <Link href="/profile" className="dhero-career" aria-label="Karriere im Profil ansehen">
            <TierBadge points={career.points} compact />
            <div className="dhero-stats">
              <span><b>{career.played}</b>{career.played === 1 ? "Partie" : "Partien"}</span>
              <span><b>{career.wins}</b>{career.wins === 1 ? "Sieg" : "Siege"}</span>
              <span><b>{career.podiums}</b>{career.podiums === 1 ? "Podium" : "Podien"}</span>
              <ChevronRight className="dhero-go" aria-hidden="true" />
            </div>
          </Link>
        </header>

        <nav className="dashnav" aria-label="Bereiche">
          <Link href="/profile" className="btn-quiet"><UserRound aria-hidden="true" />Profil</Link>
          <Link href="/leaderboard" className="btn-quiet"><Trophy aria-hidden="true" />Rangliste</Link>
          <Link href="/feedback" className="btn-quiet"><MessageSquare aria-hidden="true" />Feedback</Link>
          {p.isAdmin && <a href="/admin" className="btn-quiet"><Shield aria-hidden="true" />Admin</a>}
          <form action={signOut}>
            <button type="submit" className="btn-quiet"><LogOut aria-hidden="true" />Abmelden</button>
          </form>
        </nav>

        <UniverseSwitcher universes={p.universes} activeUniverseId={p.activeUniverse.id} />

        {/* Der Spielmodus ist die einzige farbig hervorgehobene Aufgabe --
            alles andere ist Vorbereitung darauf. */}
        <div className="dashsection">
          <h2>Spielmodus</h2>
          <span className="dashsub">Gegen vier Mitspieler, ein Halbjahr je Zug</span>
        </div>

        {/* key je Universum: LobbyOverview setzt mySeason und openLobbies über
            useState aus den Props auf. Das greift nur beim Einhängen -- nach
            einem Universumswechsel lieferte der Server zwar neue Werte, die
            Komponente zeigte aber weiter die Partie des vorigen Universums.
            Der key erzwingt das Neuaufsetzen mit den neuen Daten. */}
        <LobbyOverview
          key={p.activeUniverse.id}
          initialMySeasons={p.mySeasons}
          initialOpenLobbies={p.openLobbies}
          limits={p.limits}
          universeId={p.activeUniverse.id}
          universeName={p.activeUniverse.name}
          universeActive={p.activeUniverse.isActive}
          showUniverse={p.showUniverse}
          openTurns={p.openTurns}
        />

        <div className="dashsection">
          <h2>Üben</h2>
          <span className="dashsub">Allein, jederzeit</span>
        </div>
        <div className="modegrid">
          {/* Link statt <a>: Wechsel innerhalb der App, mit Überblendung
              (app/template.tsx) statt eines harten Neuladens. */}
          <Link href="/explain" className="modecard modecard-teal">
            <span className="modeicon" aria-hidden="true"><GraduationCap /></span>
            <h3>Einführung</h3>
            <p>
              Geführt durch alle Entscheidungen: eine Beteiligung über zehn Halbjahre,
              ein Coach erklärt jeden Schritt.
            </p>
          </Link>
          <Link href="/practice" className="modecard modecard-gold">
            <span className="modeicon" aria-hidden="true"><Dumbbell /></span>
            <h3>Übungsmodus</h3>
            <p>
              Eine vollständige Solopartie gegen vier Fonds derselben Kohorte — wie im
              Spielmodus, nur ohne Mitspieler.
            </p>
          </Link>
        </div>

        <div className="dashsection">
          <h2>Community</h2>
          <span className="dashsub">Mitspieler einladen, mitreden</span>
        </div>
        <InviteFriends signupUrl={p.signupUrl} />
        <Link href="/feedback" className="modecard modecard-row">
          <span className="modeicon" aria-hidden="true"><MessageSquare /></span>
          <span>
            <h3>Feedback geben</h3>
            <p>1 bis 5 Sterne und was wir an Spielerlebnis, Simulation oder Bedienung verbessern können.</p>
          </span>
          <ChevronRight className="modego" aria-hidden="true" />
        </Link>
        <SiteFooter />
      </div>
    </main>
  );
}
