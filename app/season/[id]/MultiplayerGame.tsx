"use client";

/* Multiplayer-Spielansicht: dieselben Bausteine wie im Übungsmodus
   (components/pel/ui.tsx), aber gespeist aus dem serverseitigen
   Spielstand (season_state) statt aus lokalem React-State, und
   Entscheidungen werden gesammelt und einmal pro Halbjahr als
   TurnDecisions abgeschickt statt sofort lokal ausgeführt. Die serverseitige
   Auswertung (lib/engine/runQuarter) unterstützt den vollen
   Entscheidungsraum bereits — hier wird nur zusammengestellt, was der
   Spieler will, nie berechnet, was passiert.

   Bewusst nicht repliziert: die "Benchmarkstudie" für bereits gekaufte,
   ungeprüfte Beteiligungen — dafür gibt es serverseitig noch keine
   Entscheidungsart (siehe lib/engine/turnTypes.ts). Alles andere aus dem
   Original (Gebote, Due Diligence, Search/Hire, Maßnahmen, MEP, Exits,
   Verkaufsangebote) ist abgebildet. */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  TAB_ICON, TAB_IDX, CSS, haptic, AnimatedNumber, Toasts, News, DealCard, Holding, Shelf,
  TvpiChart, SectorSplit, MarketChart, UseProceeds, InitPicker, Shortlist, Offers, Sheet,
  Info, SeasonDrivers,
} from "@/components/pel/ui";
import type {
  RuntimeState, RuntimeFund, TurnDecisions, Bid, InitiativeIntent, SearchIntent,
  ExitStartIntent, Seat, HireChoice,
} from "@/lib/engine/turnTypes";
import {
  EMPTY_DRAFT, draftKeyFor, draftKeyPrefixFor, isDraftEmpty, restoreDraft, type TurnDraft,
} from "./turnDraft";
import {
  BIL_DISC, BIL_FEE, CAPITAL, CV_DISC, CV_FEE, CV_STAKE, INIT_SLOTS, IPO_DISC, IPO_EBITDA,
  IPO_FEE, IPO_PLACE, LM_ANNOUNCE, LM_DEAL, MAX_PROC, MAX_SLOTS, PERIODS, PROC_FEE, PROC_Q,
  SECCOLOR, SECNAMES, SECTORS, dealMultiple, ddCapOf, ddCostOf, dpiOf, ebitdaOf, eur, fairOf,
  gebote, grossMoicOf, hj, initDur, initSuccess, effSkill, initsOf, investableOf, irrOf,
  markMultiple, navValueOf, recycleRoom, scoreOf, tvpiOf, x,
} from "@/lib/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/* Taktgrenzen für das Nachfassen nach der eigenen Abgabe (siehe den Effekt
   weiter unten). Der enge Takt gilt, solange die Auswertung tatsächlich
   ansteht; beim Warten auf Mitspieler wird bis zur Obergrenze abgestuft. */
const WAIT_POLL_MIN_MS = 5_000;
const WAIT_POLL_MAX_MS = 60_000;

interface HistoryRow {
  halfYear: number;
  market: RuntimeState["market"];
  funds: RuntimeFund[];
}

export interface MultiplayerGameProps {
  seasonId: string;
  humanSlot: number;
  currentHalfYear: number;
  deadline: string | null;
  /* Uhrzeit des Servers beim Rendern dieser Seite, in Millisekunden. Dient
     als Erstabgleich der Uhr — siehe useServerClock. */
  serverNow: number;
  state: RuntimeState;
  history: HistoryRow[];
  submissionStatus: { humanCount: number; submittedCount: number; missingCount: number };
  alreadySubmitted: boolean;
}


/* Die aktuelle Uhrzeit, im Sekundentakt.

   Als externe Quelle statt als State im Effekt, und das aus einem Grund: Der
   Server rendert diese Ansicht vor, und seine Uhr steht nicht auf derselben
   Sekunde wie die des Browsers. Eine ins Server-HTML eingebackene Restzeit
   wäre beim Hydrieren ein Mismatch. useSyncExternalStore trennt genau das —
   der Server-Schnappschuss ist null ("hier gibt es keine Uhr"), und wer null
   bekommt, zeigt so lange nichts an.

   Der Schnappschuss wird auf volle Sekunden gerundet, weil er zwischen zwei
   Takten stabil sein muss: Gäbe er bei jedem Aufruf einen neuen Wert zurück,
   liefe React in eine Endlosschleife. */
const clockSubscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
};
const clockSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const clockServerSnapshot = () => null;

function useNow(): number | null {
  return useSyncExternalStore(clockSubscribe, clockSnapshot, clockServerSnapshot);
}

/* Wie weit die Uhr des Browsers gegenüber der des Servers nachgeht, in
   Millisekunden. Maßgeblich für die Frist ist die Serverzeit: Die RLS-Policy
   auf turn_submissions vergleicht now() gegen current_half_year_deadline.
   Eine falsch gestellte Uhr auf dem Endgerät verspricht sonst Zeit, die es
   nicht gibt — oder nimmt welche weg.

   Der Erstwert kostet nichts: Die Seite wird serverseitig gerendert und
   bringt ihre Uhrzeit als Eigenschaft mit. Danach wird stündlich über
   /api/time nachgezogen, gegen die Drift billiger Endgeräteuhren. */
const CLOCK_SYNC_MS = 60 * 60 * 1000;

async function measureClockOffset(): Promise<number | null> {
  const sent = Date.now();
  const res = await fetch("/api/time", { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json()) as { now?: unknown };
  const received = Date.now();
  if (typeof body.now !== "number" || !Number.isFinite(body.now)) return null;
  /* Die gemessene Serverzeit gilt für einen Zeitpunkt irgendwo zwischen
     Absenden und Empfang. Die halbe Umlaufzeit ist die übliche Schätzung
     dafür, wie viel davon der Hinweg war. */
  return body.now + (received - sent) / 2 - received;
}

function useServerClockOffset(serverNow: number): number {
  const [offset, setOffset] = useState(() => serverNow - Date.now());
  useEffect(() => {
    let alive = true;
    /* Bewusst asynchron: Ein synchroner setState direkt im Effekt wäre ein
       zusätzliches Rendern noch vor dem ersten Anzeigen — und der Erstwert
       aus serverNow steht ohnehin schon. */
    const sync = async () => {
      try {
        const measured = await measureClockOffset();
        if (alive && measured != null) setOffset(measured);
      } catch {
        /* Netz weg, Route nicht erreichbar: Der bisherige Versatz bleibt
           stehen. Eine Uhr, die um Sekunden danebenliegt, ist besser als
           eine Anzeige, die verschwindet. */
      }
    };
    const id = setInterval(sync, CLOCK_SYNC_MS);
    void sync();
    return () => { alive = false; clearInterval(id); };
  }, []);
  return offset;
}

/* Restzeit als HH h : MM min : SS sec. Die Stunden laufen über 24 hinaus statt
   auf Tage umzubrechen — eine Frist von 28 Stunden liest sich als "28 h", und
   die Anzeige behält über die ganze Laufzeit dieselbe Form und Breite. Dass
   die Sekunden auch bei viel Restzeit mitlaufen, ist Absicht: Es ist ein
   Countdown, kein gerundeter Hinweis. Die Ziffernbreite ist fest
   (font-variant-numeric: tabular-nums über .mono), deshalb wackelt nichts.

   Die Doppelpunkte stehen frei. Ohne Abstand band der Doppelpunkt die
   vorangehende Einheit an die folgende Zahl ("h:04"), und die drei Gruppen
   liefen zu einem Block zusammen — die Abstände waren zwischen Zahl und
   Einheit anders als zwischen den Gruppen, obwohl die Gruppengrenze die
   stärkere ist. */
function remainingParts(ms: number): { h: string; m: string; s: string } | null {
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const pad = (v: number) => String(v).padStart(2, "0");
  return { h: pad(Math.floor(total / 3600)), m: pad(Math.floor((total % 3600) / 60)), s: pad(total % 60) };
}

function formatRemaining(ms: number): string {
  const p = remainingParts(ms);
  return p ? `${p.h} h : ${p.m} min : ${p.s} sec` : "Frist abgelaufen";
}

/* Dieselbe Zahl, aber mit zurückgenommenen Einheiten: Die Ziffern sind der
   Wert, "h", "min" und "sec" nur ihre Beschriftung. In der Leiste, wo die
   Restzeit als Anzeige steht statt im Satz, trägt das die Lesbarkeit. */
function RemainingTime({ ms }: { ms: number }) {
  const p = remainingParts(ms);
  if (!p) return <>Frist abgelaufen</>;
  return (
    <>
      {p.h}<span className="cdu">h</span> : {p.m}<span className="cdu">min</span> : {p.s}<span className="cdu">sec</span>
    </>
  );
}

function Countdown({ deadline, serverNow }: { deadline: string; serverNow: number }) {
  const target = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const now = useNow();
  const offset = useServerClockOffset(serverNow);
  return <span className="mono">{now == null ? "…" : formatRemaining(target - (now + offset))}</span>;
}

/* Der Horizont, über den die Leiste leerläuft. Die tatsächliche Frist liegt
   auf der nächsten Mitternacht nach der Auswertung (siehe
   lib/engine/deadline.ts) und ist damit zwischen sechs und dreißig Stunden
   entfernt — es gibt keine feste Fensterlänge, an der sich ein Anteil messen
   ließe. Die Leiste zeigt deshalb nicht "wie viel vom Fenster ist herum",
   sondern "wie nah ist der letzte Tag": Ab 24 Stunden Restzeit ist sie voll
   und beginnt erst dann zu laufen. Genau dort fängt die Dringlichkeit an. */
const DEADLINE_HORIZON_MS = 24 * 60 * 60 * 1000;
/* Die Warnschwelle liegt bewusst bei sechs Stunden: Das ist zugleich die
   kürzeste Frist, die überhaupt vergeben wird — nextHalfYearDeadline() springt
   auf die übernächste Mitternacht, wenn bis zur nächsten weniger als sechs
   Stunden bleiben. Ein Halbjahr mit dem knappsten möglichen Fenster steht
   damit von der ersten Sekunde an auf Warnstufe, und das ist richtig so. */
const DEADLINE_WARN_MS = 6 * 60 * 60 * 1000;
const DEADLINE_CRIT_MS = 60 * 60 * 1000;

/* Zeitgruppe der Kopfleiste: welches Halbjahr, wie lange noch, und die beiden
   Fortschrittslinien dazu. Dazu die Navigation an den Rändern — sie hat mit
   Zeit nichts zu tun, braucht aber einen festen Platz, und die Ränder der
   obersten Zeile sind der gewohnte.

   Die Leiste erscheint auch ohne gesetzte Frist: Das Halbjahr steht immer an,
   nur der Countdown entfällt. Server und Policy behandeln eine fehlende Frist
   als offenes Fenster (Partie gerade gestartet, erste Auswertung steht aus) —
   dann gibt es schlicht nichts herunterzuzählen. */
function TimeBar({
  deadline, serverNow, halfYear, dark, onToggleDark,
}: {
  deadline: string | null; serverNow: number; halfYear: number;
  dark: boolean; onToggleDark: () => void;
}) {
  const target = useMemo(() => (deadline ? new Date(deadline).getTime() : null), [deadline]);
  const now = useNow();
  const offset = useServerClockOffset(serverNow);
  const left = target == null || now == null ? null : target - (now + offset);
  const tone = left == null ? "" : left <= DEADLINE_CRIT_MS ? "crit" : left <= DEADLINE_WARN_MS ? "warn" : "";
  const pct = left == null ? 100 : Math.max(0, Math.min(1, left / DEADLINE_HORIZON_MS)) * 100;
  return (
    <div className={"cockzeit" + (tone ? " " + tone : "")}>
      {/* Gegenläufig: Die Saison füllt sich, die Frist läuft leer. */}
      <i className="cockseason" style={{ width: `${((halfYear - 1) / PERIODS) * 100}%` }} />
      {target != null && <i className="cockline" style={{ width: `${pct}%` }} />}
      <Link href="/dashboard" className="theme" aria-label="Zum Dashboard">←</Link>
      <span className="cockhj">
        <span className="lang">HALBJAHR </span><span className="kurz">HJ </span>
        {halfYear}<s>/{PERIODS}</s>
      </span>
      <span className="cockspacer" />
      {target != null && (
        <span className="cockdl mono" role="timer" aria-live="off">
          {/* Nach Fristablauf ist die Abgabe nicht "unsicher", sondern zu: Die
              RLS-Policy auf turn_submissions verlangt
              now() < current_half_year_deadline für INSERT wie UPDATE
              (Migration 20260816120600). Genau derselbe Zeitpunkt, den diese
              Leiste herunterzählt — die Anzeige darf also eindeutig sein. */}
          {left == null ? "…" : left <= 0 ? "Abgabe geschlossen" : <RemainingTime ms={left} />}
        </span>
      )}
      <button className="theme" onClick={() => { haptic(6); onToggleDark(); }} aria-label="Darstellung wechseln">
        {dark ? "☀" : "☾"}
      </button>
    </div>
  );
}

export default function MultiplayerGame({
  seasonId, humanSlot, currentHalfYear, deadline, serverNow, state, history, submissionStatus, alreadySubmitted,
}: MultiplayerGameProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const quarter = currentHalfYear - 1; // Halbjahre, die bereits ausgewertet sind

  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<"deals" | "port" | "rank">("deals");
  const [openFund, setOpenFund] = useState<number | null>(null);

  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [status, setStatus] = useState(submissionStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [notReadyYet, setNotReadyYet] = useState(false);

  /* Alles, was im Lauf eines Halbjahres vorgemerkt wird, liegt in EINEM
     Zustandsobjekt statt in elf einzelnen. Das ist der Entwurf des Halbjahres:
     Er wird als Ganzes gesichert und als Ganzes wiederhergestellt (siehe
     unten), und die Wiederherstellung ist damit ein einziges setState statt
     einer Kaskade. Die Einzelsetter darunter halten alle Aufrufstellen
     unverändert — sie akzeptieren wie zuvor Wert oder Updater-Funktion. */
  const [draft, setDraft] = useState<TurnDraft>(EMPTY_DRAFT);
  const {
    bids, ddStaged, searches, initiatives, ltipStaged, studyStaged,
    exitStarts, hireDecisions, offerDecisions, shortlistCursor, exitQueueCursor,
  } = draft;
  const field = useCallback(<K extends keyof TurnDraft>(k: K) =>
    (v: TurnDraft[K] | ((prev: TurnDraft[K]) => TurnDraft[K])) =>
      setDraft((p) => ({ ...p, [k]: typeof v === "function" ? (v as (x: TurnDraft[K]) => TurnDraft[K])(p[k]) : v })),
  []);
  const setBids = useMemo(() => field("bids"), [field]);
  const setDdStaged = useMemo(() => field("ddStaged"), [field]);
  const setSearches = useMemo(() => field("searches"), [field]);
  const setInitiatives = useMemo(() => field("initiatives"), [field]);
  const setLtipStaged = useMemo(() => field("ltipStaged"), [field]);
  const setStudyStaged = useMemo(() => field("studyStaged"), [field]);
  const setExitStarts = useMemo(() => field("exitStarts"), [field]);
  const setHireDecisions = useMemo(() => field("hireDecisions"), [field]);
  const setOfferDecisions = useMemo(() => field("offerDecisions"), [field]);
  const setShortlistCursor = useMemo(() => field("shortlistCursor"), [field]);
  const setExitQueueCursor = useMemo(() => field("exitQueueCursor"), [field]);

  const [sheet, setSheet] = useState<Any>(null);
  const [useProceedsItem, setUseProceedsItem] = useState<Any>(null);
  const [initPick, setInitPick] = useState<{ uid: string; dim: "plat" | "acc" } | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  const me = state.funds.find((f) => f.slot === humanSlot);
  const shortlistAll = state.shortlist[String(humanSlot)] ?? [];
  const exitQueueAll = state.exitQueue[String(humanSlot)] ?? [];
  const shortlistItem = shortlistAll[shortlistCursor];
  const exitQueueItem = exitQueueAll[exitQueueCursor];

  /* Stößt die serverseitige Auswertung an, statt nur auf den minütlichen
     pg_cron-Job zu warten. request_season_evaluation() prüft selbst, ob die
     Partie überhaupt fällig ist (alle abgegeben oder Frist erreicht) und tut
     sonst nichts — der Aufruf kann also gefahrlos wiederholt werden.
     Liefert true, wenn eine Auswertung tatsächlich angestoßen wurde. */
  const requestEvaluation = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("request_season_evaluation", { p_season_id: seasonId });
    if (rpcError) return false;
    return data === true;
  }, [supabase, seasonId]);

  const refreshStatus = useCallback(async () => {
    const { data } = await supabase
      .rpc("season_submission_status", { p_season_id: seasonId })
      .maybeSingle();
    const row = data as {
      current_half_year: number; human_count: number; submitted_count: number; missing_count: number;
    } | null;
    if (!row) return;
    setStatus({ humanCount: row.human_count, submittedCount: row.submitted_count, missingCount: row.missing_count });
    if (row.current_half_year !== currentHalfYear) router.refresh();
  }, [supabase, seasonId, currentHalfYear, router]);

  /* Nach der eigenen Abgabe nachfassen: die Auswertung anstoßen (falls die
     Edge Function den ersten Anstoß verschluckt hat) und den Stand prüfen.

     Der Takt richtet sich danach, worauf tatsächlich gewartet wird, statt
     stur bei 5 Sekunden zu bleiben. request_season_evaluation() liefert
     genau diese Auskunft mit zurück:

     - true  = die Partie ist fällig, die Auswertung läuft an. Der Wechsel
               steht unmittelbar bevor, also eng bleiben. Das ist der
               Einzelspielerfall (vier KI-Fonds), in dem nach der eigenen
               Abgabe niemand mehr fehlt — hier kostet jede Sekunde spürbar.
     - false = es fehlen noch Abgaben von Mitspielern. Das kann bis zur
               Frist dauern, also bis zu zwölf Stunden. Vorher hat ein
               Spieler, der den Tab offen ließ, in dieser Lage 1.440
               Anfragen pro Stunde erzeugt, ohne dass sich irgendetwas
               ändern konnte.

     Beim Warten auf Mitspieler wird der Abstand deshalb verdoppelt, bis auf
     eine Minute. Das senkt die Last in diesem Fall um gut das Zwölffache und
     lässt den schnellen Fall unangetastet. Den eigentlichen Übergang meldet
     ohnehin die Realtime-Subscription; dieser Takt ist nur der Rückfall für
     mobile Browser, die Websockets im Hintergrund pausieren. */
  useEffect(() => {
    if (!submitted) return;
    let stopped = false;
    let delay = WAIT_POLL_MIN_MS;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped) return;
      const due = await requestEvaluation();
      if (stopped) return;
      await refreshStatus();
      if (stopped) return;
      delay = due ? WAIT_POLL_MIN_MS : Math.min(delay * 2, WAIT_POLL_MAX_MS);
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, delay);
    return () => { stopped = true; clearTimeout(timer); };
  }, [submitted, refreshStatus, requestEvaluation]);

  // Live-Übergang ins nächste Halbjahr (bzw. in den Endstand): zwei
  // unabhängige Realtime-Events, plus ein Polling-Fallback darunter, weil
  // mobile Browser Websockets im Hintergrund pausieren und dadurch einzelne
  // Events verpassen können.
  useEffect(() => {
    const channel = supabase
      .channel(`season-${seasonId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seasons", filter: `id=eq.${seasonId}` },
        (payload) => {
          const row = payload.new as {
            current_half_year?: number; status?: string; current_half_year_deadline?: string | null;
          } | undefined;
          // status !== "running" deckt insbesondere den Partie-Abschluss ab:
          // dabei ändert sich current_half_year nicht mehr, nur der Status.
          if (row?.status && row.status !== "running") { router.refresh(); return; }
          if (row?.current_half_year != null && row.current_half_year !== currentHalfYear) { router.refresh(); return; }
          // Bootstrap des ersten Halbjahres: nur die Frist wechselt von null
          // auf einen Wert, das Halbjahr bleibt bei 1 (siehe checkAndMaybeRefresh).
          if (row && "current_half_year_deadline" in row
            && (row.current_half_year_deadline ?? null) !== (deadline ?? null)) router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "season_state", filter: `season_id=eq.${seasonId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, seasonId, currentHalfYear, deadline, router]);

  /* Auch die Frist wird verglichen, nicht nur das Halbjahr: Der Bootstrap des
     ersten Halbjahres (commit_season_bootstrap) ergänzt Dealflow und Frist,
     lässt current_half_year aber bei 1 stehen. Ein Vergleich allein über
     status/current_half_year hätte diesen Übergang deshalb nie bemerkt — die
     Ansicht wäre ohne Deals hängen geblieben, bis der Spieler selbst neu
     geladen hätte. */
  const checkAndMaybeRefresh = useCallback(async () => {
    const { data } = await supabase
      .from("seasons")
      .select("status, current_half_year, current_half_year_deadline")
      .eq("id", seasonId)
      .maybeSingle();
    if (!data) return;
    if (
      data.status !== "running"
      || data.current_half_year !== currentHalfYear
      || (data.current_half_year_deadline ?? null) !== (deadline ?? null)
    ) router.refresh();
  }, [supabase, seasonId, currentHalfYear, deadline, router]);

  useEffect(() => {
    const id = setInterval(checkAndMaybeRefresh, 20_000);
    return () => clearInterval(id);
  }, [checkAndMaybeRefresh]);

  /* Bootstrap des ersten Halbjahres: start_season() legt den Ausgangszustand
     ohne Dealflow an (newDeal() braucht den BOOK-Katalog aus lib/engine und
     läuft deshalb nicht in SQL). Bis die Edge Function das nachgeholt hat,
     zeigt der Dealflow-Tab schlicht nichts an — vorher bis zu eine Minute
     lang, weil nur der Cron-Job den Bootstrap ausgelöst hat. Jetzt stößt die
     Ansicht ihn beim ersten Rendern selbst an und prüft im Sekundentakt nach. */
  const bootstrapPending = (state.deals as Any[]).length === 0 && currentHalfYear === 1;
  useEffect(() => {
    if (!bootstrapPending) return;
    let stopped = false;
    async function kick() {
      if (stopped) return;
      await requestEvaluation();
      await checkAndMaybeRefresh();
    }
    kick();
    const id = setInterval(kick, 4_000);
    return () => { stopped = true; clearInterval(id); };
  }, [bootstrapPending, requestEvaluation, checkAndMaybeRefresh]);

  // Mobile Browser frieren Timer und die Realtime-Websocket-Verbindung ein,
  // sobald der Bildschirm gesperrt oder die App gewechselt wird -- weder das
  // 20s-Polling oben noch die Realtime-Subscription laufen dann weiter.
  // Ergebnis ohne diesen Check: die Ansicht bleibt beim zuletzt gesehenen
  // Halbjahr hängen, selbst wenn der Server (bestätigt per Cron-Log) längst
  // mehrere Halbjahre weitergerückt ist. Beim Zurückkehren zur Seite (Tab
  // wieder sichtbar bzw. Fenster fokussiert) wird deshalb sofort nachgeholt.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") checkAndMaybeRefresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkAndMaybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkAndMaybeRefresh);
    };
  }, [checkAndMaybeRefresh]);

  /* Manueller Button (Kopfleiste und Wartebildschirm). Vorher hat er den
     Stand nur abgefragt und konnte deshalb nichts beschleunigen — die
     Auswertung hing weiter am minütlichen Cron-Job. Jetzt stößt er sie
     zuerst selbst an (soweit fällig), wartet kurz auf die Edge Function und
     prüft dann. Fällig ist die Partie nur, wenn ohnehin alle abgegeben haben
     oder die Frist erreicht ist; vorzeitig erzwingen lässt sich nichts. */
  async function handleManualAdvance() {
    setChecking(true);
    setNotReadyYet(false);

    const triggered = await requestEvaluation();
    if (triggered) {
      // Der Edge-Function-Aufruf läuft asynchron über pg_net; zweimal kurz
      // nachfassen deckt den üblichen Fall (inkl. Kaltstart) ab.
      for (let i = 0; i < 2; i++) {
        await new Promise((r) => setTimeout(r, 1_500));
        const { data } = await supabase
          .from("seasons")
          .select("status, current_half_year")
          .eq("id", seasonId)
          .maybeSingle();
        if (data && (data.status !== "running" || data.current_half_year !== currentHalfYear)) {
          router.refresh();
          setChecking(false);
          return;
        }
      }
      // Angestoßen, aber noch nicht fertig — kein "noch nicht so weit"-Hinweis,
      // der wäre hier irreführend. Der 5-Sekunden-Takt oben zieht nach.
      setChecking(false);
      return;
    }

    const { data } = await supabase
      .from("seasons")
      .select("status, current_half_year")
      .eq("id", seasonId)
      .maybeSingle();
    if (data && (data.status !== "running" || data.current_half_year !== currentHalfYear)) {
      router.refresh();
    } else {
      setNotReadyYet(true);
    }
    setChecking(false);
  }

  /* ---------- Entwurf des laufenden Halbjahres sichern ----------
     Siehe ./turnDraft.ts für das Warum und die reinen Funktionen. Hier steht
     nur die Anbindung an localStorage und den Komponentenzustand. */
  const draftKey = draftKeyFor(seasonId, currentHalfYear);
  /* Ref statt State: das Flag steuert nur, ob schon gesichert werden darf, und
     soll selbst kein Rendern auslösen. */
  const draftLoaded = useRef(false);

  /* WICHTIG: Der Sichern-Effekt steht bewusst VOR dem Wiederherstellen-Effekt.
     Effekte laufen in der Reihenfolge ihrer Deklaration. Stünde er dahinter,
     liefe er beim Mounten unmittelbar nach dem Wiederherstellen — mit bereits
     gesetztem draftLoaded, aber noch mit dem leeren draft aus dem ersten
     Render (das setState greift erst im nächsten). Er würde den gerade
     gelesenen Entwurf also sofort wieder löschen und erst eine Renderrunde
     später zurückschreiben. In dieser Lücke wäre er bei einem Absturz oder
     schnellen Verlassen der Seite weg. In dieser Reihenfolge überspringt er
     den ersten Durchlauf sauber (draftLoaded ist noch false) und schreibt
     erst, wenn der Entwurf tatsächlich im Zustand steht. */
  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      // Nach der Abgabe ist der Entwurf erledigt und darf nicht wieder
      // auftauchen, wenn der Spieler die Partie erneut öffnet.
      if (submitted || isDraftEmpty(draft)) window.localStorage.removeItem(draftKey);
      else window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* Speicher nicht verfügbar — der Zug funktioniert trotzdem */ }
  }, [draftKey, submitted, draft]);

  useEffect(() => {
    let restored: TurnDraft | null = null;
    try {
      restored = restoreDraft(window.localStorage.getItem(draftKey), {
        dealIds: new Set((state.deals as Any[]).map((x2) => x2.id)),
        holdingUids: new Set(((me?.holdings ?? []) as Any[]).map((h) => h.uid)),
        shortlistKeys: new Set(shortlistAll.map((s) => `${s.holdingUid}:${s.seat}`)),
        offerUids: new Set(exitQueueAll.map((o) => o.holdingUid)),
        shortlistCount: shortlistAll.length,
        exitQueueCount: exitQueueAll.length,
      });
    } catch {
      // localStorage nicht lesbar (privater Modus, blockierte Site-Daten):
      // dann eben ohne Entwurf. Kein Grund, die Partie zu blockieren.
      restored = null;
    }
    draftLoaded.current = true;
    /* set-state-in-effect ist hier bewusst in Kauf genommen: Ein gespeicherter
       Entwurf lässt sich erst nach dem Mounten lesen, weil localStorage im
       Server-Rendering nicht existiert. Ein Lazy-Initializer in useState wäre
       die Alternative — er würde auf dem Server EMPTY_DRAFT und im Browser den
       Entwurf liefern und damit eine Hydration-Abweichung erzeugen, also einen
       echten Fehler statt einer zusätzlichen Renderrunde. Es bleibt bei genau
       einem setState, einmal je Halbjahr. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (restored) setDraft(restored);
    // Bewusst nur am Schlüssel hängend: einmal je Halbjahr wiederherstellen,
    // nicht bei jeder Zustandsänderung erneut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    // Entwürfe vergangener Halbjahre dieser Partie aufräumen, damit der
    // Speicher über zwanzig Halbjahre nicht vollläuft.
    try {
      const prefix = draftKeyPrefixFor(seasonId);
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix) && k !== draftKey) window.localStorage.removeItem(k);
      }
    } catch { /* siehe oben */ }
  }, [seasonId, draftKey]);

  if (!me) return null;

  const NEG = me.attrs.negotiation;

  function initKey(uid: string, dim: string) { return `${uid}:${dim}`; }
  const stagedInitByKey = useMemo(() => {
    const map: Record<string, InitiativeIntent> = {};
    initiatives.forEach((i) => { map[initKey(i.holdingUid, i.dim)] = i; });
    return map;
  }, [initiatives]);
  const stagedSearchByHolding = useMemo(() => {
    const map: Record<string, SearchIntent[]> = {};
    searches.forEach((s) => { (map[s.holdingUid] ??= []).push(s); });
    return map;
  }, [searches]);
  const stagedExitByHolding = useMemo(() => {
    const map: Record<string, ExitStartIntent> = {};
    exitStarts.forEach((e) => { map[e.holdingUid] = e; });
    return map;
  }, [exitStarts]);

  // Legt eine "so, als ob"-Ansicht der Beteiligung an: dieselbe Holding-Karte
  // wie im Original zeigt vorgemerkte Suchen/Maßnahmen/MEP/Exits als laufend,
  // ohne dass am Server-Zustand etwas verändert wurde.
  function patchHolding(c: Any): Any {
    const p = { ...c };
    const staged = stagedSearchByHolding[c.uid];
    if (staged?.length) {
      p.searches = [...(c.searches || []), ...staged.map((s) => ({ seat: s.seat, readyQ: quarter + 1 }))];
    }
    const platInit = stagedInitByKey[initKey(c.uid, "plat")];
    if (platInit && !p.initP) {
      const E = effSkill(c, "cfo") * (c.onboard > 0 ? 0.7 : 1);
      p.initP = { doneQ: quarter + Math.max(1, initDur(E)) };
    }
    const accInit = stagedInitByKey[initKey(c.uid, "acc")];
    if (accInit && !p.initA) {
      const E = effSkill(c, "r3") * (c.onboard > 0 ? 0.7 : 1);
      p.initA = { doneQ: quarter + Math.max(1, initDur(E)) };
    }
    if (ltipStaged.includes(c.uid)) p.ltip = true;
    // Vorgemerkte Benchmarkstudie sofort sichtbar machen: die Karte zeigt
    // Branchenreferenz und Marktwachstum ab dem Klick, nicht erst nach der
    // Auswertung — genauso wie im Übungsmodus, wo runStudy() direkt wirkt.
    if (studyStaged.includes(c.uid)) p.dd = true;
    const exit = stagedExitByHolding[c.uid];
    if (exit && !p.proc) {
      p.proc = { resolveQ: quarter + (exit.action === "process" ? PROC_Q : 1) };
    }
    return p;
  }

  // Freie Operating-Kapazität wie im Original, aber inklusive dessen, was
  // in dieser Sitzung schon vorgemerkt (noch nicht abgeschickt) wurde.
  const busySlots = me.holdings.reduce((n: number, c: Any) => n + initsOf(patchHolding(c)).length, 0);
  const maxInitSlots = INIT_SLOTS + Math.floor(me.attrs.operations / 2);
  const freeSlots = maxInitSlots - busySlots;

  /* ---- Gebote & Due Diligence ---- */
  function stageDD(dealId: string) {
    const deal = (state.deals as Any[]).find((d) => d.id === dealId);
    if (!deal) return;
    haptic(8);
    setDdStaged((p) => ({ ...p, [dealId]: true }));
  }

  /* ---- Exit-Vorschau (wie previewExit im Original) ---- */
  function previewExit(c: Any, ch: "bil" | "cv" | "ipo" | "proc") {
    const st = c.st ?? 1;
    const eb = ebitdaOf(c);
    const mMult = markMultiple(c, state.market);
    const dMult = dealMultiple(c, state.market, NEG, quarter);

    let exMult = dMult, eqDisc = 1, share = st, feeRate = 0, costBasis = c.entryEquity, note = "";
    const recap = c.recapOut || 0;
    const rows: [string, string][] = [["Adj. EBITDA (LTM)", eur(eb)], ["Bewertungsmultiple", x(mMult)]];
    if (ch !== "ipo" && NEG > 0) rows.push([`Verhandlungsprämie +${NEG * 2} %`, x(dMult)]);

    if (ch === "bil") {
      exMult = dMult - BIL_DISC; feeRate = BIL_FEE;
      rows.push([`Abschlag bilateral`, `−${BIL_DISC.toFixed(1).replace(".", ",")}× EBITDA`]);
      note = "Sofortiger Vollzug, kein Marktrisiko. Jedes Halbjahr erneut möglich.";
    } else if (ch === "cv") {
      eqDisc = CV_DISC; share = st * CV_STAKE; feeRate = CV_FEE; costBasis = c.entryEquity * CV_STAKE;
      note = "Teilexit an einen Secondary-Investor. Liquidität jetzt, künftige Wertsteigerung anteilig weg. Jedes Halbjahr wiederholbar.";
    } else if (ch === "ipo") {
      exMult = mMult; eqDisc = IPO_DISC; share = st * IPO_PLACE; feeRate = IPO_FEE; costBasis = c.entryEquity * IPO_PLACE;
      note = "Die Restbeteiligung wird nach einem Jahr Lock-up zum dann gültigen Kurs verwertet.";
    } else {
      note = "Der Preis steht erst bei Prozessende — bis dahin bewegen sich Multiples und EBITDA weiter.";
    }

    const ev = eb * exMult;
    const eqv100 = ev - c.netDebt;
    const gross = Math.max(0, eqv100 * share * eqDisc);
    const net = gross * (1 - feeRate);

    rows.push(["Exit-Multiple", x(exMult)], ["Enterprise Value", eur(ev)],
      ["− Nettoverschuldung", "−" + eur(c.netDebt)], ["= Equity Value (100 %)", eur(eqv100)]);
    if (share < 1) rows.push([`× verkaufter Anteil ${Math.round(share * 100)} %`, eur(eqv100 * share)]);
    if (eqDisc < 1) rows.push([ch === "cv" ? "− Secondary-Abschlag" : "− Emissionsabschlag", `−${Math.round((1 - eqDisc) * 100)} %`]);

    if (ch === "proc") {
      const fair = Math.max(0, eqv100 * st);
      rows.push(["Erwartete Gebotsspanne", eur(fair * 0.86) + " – " + eur(fair * 1.08)],
        [`Transaktionskosten ${PROC_FEE * 100} %`, "M&A-Berater, VDD, Legal"],
        ["Gebote liegen vor in", hj(PROC_Q)]);
      if (recap > 0.05) rows.push(["Bereits ausgeschüttet (Recap)", eur(recap)]);
      setSheet({ kind: "confirm", c, ch, rows, net: 0, note, moic: 0, dpiPct: 0 });
      return;
    }

    rows.push(["= Bruttoerlös", eur(gross)], [`− Kosten ${(feeRate * 100).toFixed(1).replace(".", ",")} %`, "−" + eur(gross * feeRate)]);
    if (ch === "cv") rows.push(["Anteil danach", Math.round(st * (1 - CV_STAKE) * 100) + " %"]);
    if (ch === "ipo") rows.push(["Lock-up Restbeteiligung", "1 Jahr"]);
    const full = ch === "bil";
    if (recap > 0.05) rows.push([full ? "+ bereits ausgeschüttet (Recap)" : "Bereits ausgeschüttet (Recap)", eur(recap)]);
    if (full && recap > 0.05) rows.push(["= Gesamtrückfluss", eur(net + recap)]);

    setSheet({
      kind: "confirm", c, ch, rows, net, note,
      moic: full ? (net + recap) / c.entryEquity : net / costBasis,
      moicLabel: full ? (recap > 0.05 ? "MOIC inkl. Ausschüttungen" : "MOIC (Deal)") : "MOIC der verkauften Tranche",
      dpiPct: net / CAPITAL,
    });
  }

  // Die Original-UI nennt Aktionen intern "bil"/"cv"/"ipo"/"proc" (Sheet-Titel
  // usw. hängen daran); der Server erwartet die ExitAction-Werte aus
  // turnTypes.ts ("bilateral"/"cv"/"ipo"/"process"). Nur diese Übersetzung.
  function toExitAction(ch: "bil" | "cv" | "ipo" | "proc"): ExitStartIntent["action"] {
    return ch === "bil" ? "bilateral" : ch === "proc" ? "process" : ch;
  }

  function stageExit(holdingUid: string, ch: "bil" | "cv" | "ipo" | "proc", keepPct: number) {
    const action = toExitAction(ch);
    setExitStarts((arr) => [...arr.filter((e) => e.holdingUid !== holdingUid), {
      holdingUid, action, ...(action === "process" ? {} : { keepPct }),
    }]);
  }

  function confirmExitStage() {
    const { c, ch, net } = sheet;
    setSheet(null);
    if (ch === "proc") { stageExit(c.uid, "proc", 0); return; }
    if (recycleRoom(me, net, quarter) > 0.5) {
      setUseProceedsItem({ c, net, action: ch });
    } else {
      stageExit(c.uid, ch, 0);
    }
  }

  function settleProceeds(keep: number) {
    const item = useProceedsItem;
    setUseProceedsItem(null);
    setSheet(null);
    if (item.offerIndex != null) {
      setOfferDecisions((arr) => [...arr, { holdingUid: item.c.uid, choice: "accept", offerIndex: item.offerIndex, keepPct: keep }]);
      setExitQueueCursor((i) => i + 1);
    } else {
      stageExit(item.c.uid, item.action, keep);
    }
  }

  function decideOfferStage(offer: Any, action: "accept" | "reneg" | "abort") {
    haptic(action === "abort" ? 20 : 10);
    const item = exitQueueItem;
    if (action === "abort") {
      setOfferDecisions((arr) => [...arr, { holdingUid: item.holdingUid, choice: "abort" }]);
      setExitQueueCursor((i) => i + 1);
      return;
    }
    if (action === "reneg") {
      setOfferDecisions((arr) => [...arr, { holdingUid: item.holdingUid, choice: "reneg" }]);
      setExitQueueCursor((i) => i + 1);
      return;
    }
    const offerIndex = item.offers.indexOf(offer);
    const net = offer.price * (1 - PROC_FEE);
    const c = me.holdings.find((h: Any) => h.uid === item.holdingUid);
    if (c && recycleRoom(me, net, quarter) > 0.5) {
      setUseProceedsItem({ c, net, offerIndex });
    } else {
      setOfferDecisions((arr) => [...arr, { holdingUid: item.holdingUid, choice: "accept", offerIndex, keepPct: 0 }]);
      setExitQueueCursor((i) => i + 1);
    }
  }

  function hireStage(item: Any, cand: Any) {
    haptic(10);
    const idx = item.candidates.indexOf(cand);
    const choice: HireChoice = idx === 0 ? "veteran" : idx === 1 ? "aplayer" : "development";
    setHireDecisions((arr) => [...arr, { holdingUid: item.holdingUid, seat: item.seat, choice }]);
    setShortlistCursor((i) => i + 1);
  }
  function rejectStage(item: Any) {
    setHireDecisions((arr) => [...arr, { holdingUid: item.holdingUid, seat: item.seat, choice: "reject" }]);
    setShortlistCursor((i) => i + 1);
  }

  function startInitStage(id: string) {
    if (!initPick) return;
    const { uid, dim } = initPick;
    setInitiatives((arr) => [...arr.filter((i) => !(i.holdingUid === uid && i.dim === dim)), { holdingUid: uid, dim, id }]);
    setInitPick(null);
  }

  const rank = useMemo(
    () =>
      [...state.funds]
        .map((f) => ({
          ...f, tvpi: tvpiOf(f, state.market, quarter), dpi: dpiOf(f, state.market, quarter),
          irr: irrOf(f, state.market, quarter), gross: grossMoicOf(f, state.market),
          score: scoreOf(f, state.market, quarter), me: f.slot === humanSlot,
        }))
        .sort((a, b) => b.score - a.score),
    [state.funds, state.market, quarter, humanSlot],
  );

  /* Vorstand für die Halbjahresspalte der Value Bridge: der Zustand vor dem
     zuletzt ausgewerteten Halbjahr. history endet auf dem aktuellen Stand. */
  const prevRow = history[history.length - 2];
  const prevFund = prevRow?.funds?.find((z: Any) => z.slot === humanSlot);
  const prevBridgeState = prevFund
    ? { fund: prevFund, market: prevRow.market, quarter: prevRow.halfYear }
    : null;
  const marketHist = history.map((h) => h.market);
  const tvpiHist = history.map((h) =>
    [...h.funds].sort((a, b) => a.slot - b.slot).map((f) => scoreOf(f, h.market, h.halfYear)),
  );
  const meIdx = [...state.funds].sort((a, b) => a.slot - b.slot).findIndex((f) => f.slot === humanSlot);

  const dpi = dpiOf(me, state.market, quarter);
  const gross = grossMoicOf(me, state.market);
  const tvpi = tvpiOf(me, state.market, quarter);
  const irr = irrOf(me, state.market, quarter);
  const score = scoreOf(me, state.market, quarter);
  /* Veränderung der Wertung über das zuletzt ausgewertete Halbjahr. prevFund
     ist derselbe Fonds im Zustand davor, bewertet zu den damaligen Marktständen
     — nicht der heutige Fonds mit alten Preisen, sonst wäre die Differenz eine
     Mischung aus Marktbewegung und eigener Leistung.

     Die Schwelle von 0,005 ist die Anzeigegenauigkeit: Die Wertung steht mit
     zwei Nachkommastellen, alles darunter würde den Pfeil kippen lassen, ohne
     dass sich die angezeigte Zahl ändert. */
  const prevScore = prevFund && prevRow ? scoreOf(prevFund, prevRow.market, prevRow.halfYear) : null;
  const scoreDelta = prevScore == null ? null : score - prevScore;
  const scoreDir = scoreDelta == null || Math.abs(scoreDelta) < 0.005
    ? "" : scoreDelta > 0 ? "up" : "dn";
  const myRank = rank.findIndex((f) => f.me) + 1;
  const landmark = state.landmark as Any;

  // News (aus components/pel/ui.tsx) erwartet dieselben Kurzfeldnamen wie im
  // Übungsmodus ({q,e,tone,t}); der Server schreibt sprechende Feldnamen
  // ({halfYear,emoji,tone,text}) — hier nur umbenannt, keine Datenänderung.
  const feedForNews = useMemo(
    () => state.feed.map((f) => ({ q: f.halfYear, e: f.emoji, tone: f.tone, t: f.text })),
    [state.feed],
  );

  async function handleSubmit() {
    setError(null);
    setPending(true);

    const bidList: Bid[] = Object.entries(bids).map(([dealId, b]) => ({ dealId, multiple: b.mult, leverage: b.lev }));
    const dueDiligence = Object.keys(ddStaged);

    const payload: TurnDecisions = {};
    if (bidList.length) payload.bids = bidList;
    if (dueDiligence.length) payload.dueDiligence = dueDiligence;
    if (initiatives.length) payload.initiatives = initiatives;
    if (ltipStaged.length) payload.ltip = ltipStaged;
    if (studyStaged.length) payload.studies = studyStaged;
    if (searches.length) payload.searches = searches;
    if (hireDecisions.length) payload.hires = hireDecisions;
    if (exitStarts.length) payload.exitStarts = exitStarts;
    if (offerDecisions.length) payload.offerDecisions = offerDecisions;

    const { error: insertError } = await supabase.from("turn_submissions").insert({
      season_id: seasonId,
      half_year: currentHalfYear,
      profile_id: (await supabase.auth.getUser()).data.user?.id,
      payload,
    });

    setPending(false);
    if (insertError) {
      if (insertError.code === "23505") { setSubmitted(true); refreshStatus(); return; }
      /* 42501 heißt hier: Die WITH CHECK-Bedingung der Policy hat abgelehnt.
         Sie prüft nur Dinge, die sich nicht durch einen zweiten Versuch
         ändern — eigenes Profil, laufende Partie, passendes Halbjahr, und vor
         allem now() < current_half_year_deadline. "Bitte erneut versuchen" war
         an dieser Stelle also ein Rat, der nie funktionieren kann. */
      if (insertError.code === "42501") {
        setError("Die Frist für dieses Halbjahr ist abgelaufen — die Auswertung übernimmt jetzt.");
        router.refresh();
        return;
      }
      setError("Das hat nicht geklappt — bitte versuch es erneut.");
      return;
    }
    setSubmitted(true);
    refreshStatus();
    // Sofort anstoßen statt bis zum nächsten Cron-Tick zu warten. Im
    // Einzelspielerfall (vier KI-Fonds) ist die Partie damit unmittelbar
    // nach der eigenen Abgabe fällig und wird in Sekunden ausgewertet.
    requestEvaluation();
  }

  if (submitted) {
    return (
      <div className={"pel" + (dark ? " dark" : "")}>
        <style>{CSS}</style>
        <div className="wrap" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="tomb" style={{ margin: "24px 16px" }}>
            <div className="sub">Halbjahr {currentHalfYear} abgegeben</div>
            <div className="amt" style={{ fontSize: 30 }}>{status.submittedCount}/{status.humanCount}</div>
            <div className="sub">Mitspieler:innen haben abgegeben</div>
          </div>
          <div className="card">
            <div className="pad" style={{ paddingTop: 16 }}>
              {deadline && (
                <p className="hint">
                  Frist in <Countdown deadline={deadline} serverNow={serverNow} /> — ausgewertet wird, sobald alle abgegeben haben
                  oder spätestens zur Frist.
                </p>
              )}
              {status.missingCount > 0 && (
                <p className="hint" style={{ marginTop: 8 }}>Noch {status.missingCount} offen.</p>
              )}
            </div>
          </div>
          <div style={{ margin: "14px 0" }}>
            <button className="btn-secondary" style={{ width: "100%" }} onClick={handleManualAdvance} disabled={checking}>
              {checking ? "Prüfe …" : "Weiter zum nächsten Halbjahr"}
            </button>
            {notReadyYet && (
              <p className="hint" style={{ marginTop: 8 }}>
                Die Auswertung steht noch aus. Sie startet, sobald alle abgegeben haben oder die Frist
                abgelaufen ist.
              </p>
            )}
          </div>
          <div style={{ margin: "0 0 24px" }}>
            <Link href="/dashboard" className="btn-secondary" style={{ display: "block", width: "100%", textAlign: "center", boxSizing: "border-box" }}>
              Zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={"pel" + (dark ? " dark" : "")}>
      <style>{CSS}</style>
      <div className="bar">
        {/* Das Halbjahr, über das gerade entschieden wird (1-basiert) — nicht
            die Zahl der bereits ausgewerteten. Vorher stand hier im ersten
            Halbjahr "0/20", während der Abgabebildschirm "Halbjahr 1
            abgegeben" meldete. */}
        <TimeBar
          deadline={deadline} serverNow={serverNow} halfYear={currentHalfYear}
          dark={dark} onToggleDark={() => setDark(!dark)}
        />
        {/* Leistung: wo stehe ich, und wohin ging es zuletzt. */}
        <div className="cockgrp">
          <div className="barrow">
            <div>
              <div className="stat">Wertung</div>
              <div className={"statv mono" + (scoreDir ? " " + scoreDir : "")}>
                <AnimatedNumber value={score} format={(v: number) => v.toFixed(2)} className={undefined} style={undefined} />
                {scoreDir && (
                  <span className={"delta " + scoreDir}>
                    {scoreDir === "up" ? "▲" : "▼"} {Math.abs(scoreDelta as number).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="stat">Platz</div>
              <div className="statv mono">{myRank}<span style={{ opacity: .5 }}>/{state.funds.length}</span></div>
            </div>
          </div>
          <div className="cockkpi mono">
            <span>TVPI {tvpi.toFixed(2)}×</span>
            <span>IRR {(irr * 100).toFixed(1).replace(".", ",")} %</span>
            <span>DPI {dpi.toFixed(2)}×</span>
          </div>
        </div>
        {/* Kapital: womit lässt sich arbeiten. */}
        <div className="cockgrp">
          <div className="barrow">
            <div>
              <div className="stat">Dry Powder</div>
              <AnimatedNumber className="statv mono" value={investableOf(me, quarter)} format={eur} style={undefined} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="stat">PortCos</div>
              <div className="statv mono">{me.holdings.length}<span style={{ opacity: .5 }}>/{MAX_SLOTS}</span></div>
            </div>
          </div>
          <div className="cockkpi mono">
            <span>
              {eur(me.undrawn ?? CAPITAL)} offenes Commitment{(me.recyc || 0) > 0.5 ? ` + ${eur(me.recyc)} einbehalten` : ""}
            </span>
            {(me.accrued || 0) > 0.5 && <span className="ox">{eur(me.accrued)} aufgelaufene Gebühren</span>}
          </div>
        </div>
        <div className="cockgrp"><div className="barrow" style={{ fontSize: 10.5, paddingBottom: 2 }}>
          <button
            className="mono"
            /* textAlign: Schaltflächen zentrieren ihren Text von sich aus. Bei
               320 px bricht die Beschriftung um, und die zweite Zeile stand
               dann mittig unter der ersten statt bündig darunter. */
            style={{ background: "none", border: "none", padding: 0, color: "var(--ink2)", textDecoration: "underline", cursor: "pointer", textAlign: "left" }}
            onClick={handleManualAdvance}
            disabled={checking}
          >
            {checking ? "Prüfe …" : "Stand prüfen / nächstes Halbjahr"}
          </button>
        </div>
        {notReadyYet && (
          <div className="barrow" style={{ marginTop: 2, fontSize: 10.5, opacity: .6, paddingBottom: 2 }}>
            <span>Noch kein neues Halbjahr — läuft weiter, bis alle abgegeben haben oder die Frist erreicht ist.</span>
          </div>
        )}
        </div>
      </div>

      <Toasts items={[]} />

      <div className="wrap">
        <News feed={feedForNews} quarter={quarter} practice={false} />

        {tab === "deals" && (
          <>
            {/* Die Sektormultiples gehören dorthin, wo eingekauft wird: sie sind
                die Referenz für jede Preiserwartung auf den Karten darunter.
                Die Wertung gegen die Kohorte steht dafür im Peer-Group-Tab. */}
            <div className="card">
              <h3 className="disp">
                EV/EBITDA je Sektor
                <Info t="Sektormultiple">
                  Das durchschnittliche Bewertungsvielfache des EBITDA in diesem Sektor und damit die
                  Referenz für jede Preiserwartung im Dealflow. Es bewegt sich jedes Halbjahr mit dem
                  Markt und wirkt in beide Richtungen: teuer einkaufen kostet, teuer verkaufen bringt.
                  Der Pfeil zeigt die Veränderung gegenüber dem Niveau bei Fondsauflage.
                </Info>
              </h3>
              <MarketChart hist={marketHist} />
              <table className="ledger"><tbody>
                {SECNAMES.map((s: string) => {
                  const d = (state.market[s] / SECTORS[s].m - 1) * 100;
                  return (
                    <tr key={s}>
                      <td className="lab"><i className="sdot" style={{ background: SECCOLOR[s] }} />{s}</td>
                      <td>{x(state.market[s])}
                        <span style={{ color: d >= 0 ? "var(--teal)" : "var(--ox)", fontSize: 11 }}>
                          {" "}{d >= 0 ? "▲" : "▼"} {Math.abs(Math.round(d))} %
                        </span></td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
            {landmark && quarter >= LM_ANNOUNCE && quarter < LM_DEAL && (
              <div className="card lm">
                <h3 className="disp">{landmark.name}</h3>
                <div className="pad">
                  <span className="tag prop">Trophy Asset</span>
                  <span className="tag"><i className="sdot" style={{ background: SECCOLOR[landmark.sector] }} />{landmark.sector}</span>
                  <p className="biz">{landmark.desc}</p>
                  <table className="ledger"><tbody>
                    <tr><td className="lab">Umsatz</td><td>{eur(landmark.revenue)}</td></tr>
                    <tr><td className="lab">Kennzahlen</td><td>Erst mit dem Datenraum</td></tr>
                    <tr><td className="lab">Am Markt in</td><td>{hj(LM_DEAL - quarter)}</td></tr>
                  </tbody></table>
                </div>
              </div>
            )}
            {bootstrapPending && (
              <div className="card">
                <div className="pad" style={{ paddingTop: 16, fontSize: 13, color: "var(--ink2)", lineHeight: 1.55 }}>
                  Der erste Dealflow wird zusammengestellt. Die Ansicht aktualisiert sich selbst.
                </div>
              </div>
            )}
            {(state.deals as Any[]).map((d) => (
              <DealCard key={d.id} d={d} me={me} bid={bids[d.id]} dd={!!ddStaged[d.id]}
                onDD={() => stageDD(d.id)} ddUsed={Object.keys(ddStaged).length} ddCap={ddCapOf(me.attrs.analysis)}
                quarter={quarter} setBid={(b: Any) => setBids((p) => ({ ...p, [d.id]: b }))}
                clear={() => setBids((p) => { const n = { ...p }; delete n[d.id]; return n; })} market={state.market} />
            ))}
            <div className="card">
              <h3 className="disp">Archiv</h3>
              {state.feed.filter((f) => f.halfYear < quarter).length === 0 && (
                <div className="quiet">Noch keine älteren Meldungen.</div>
              )}
              {state.feed.filter((f) => f.halfYear < quarter).slice(0, 15).map((f, i) => (
                <div className={"item " + (f.tone || "neu")} key={i}>
                  <span className="em">{f.emoji || "·"}</span>
                  <span dangerouslySetInnerHTML={{ __html: `<span class="mono" style="opacity:.5">HJ ${f.halfYear}</span> ${f.text}` }} />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "port" && (
          <>
            <div className="card">
              <h3 className="disp">Sektoren nach NAV</h3>
              <SectorSplit holdings={me.holdings} market={state.market} cash={me.cash} />
            </div>
            <SeasonDrivers fund={me} market={state.market} quarter={quarter}
              prev={prevBridgeState} />
            {me.holdings.length === 0 && (
              <div className="card"><div className="pad" style={{ paddingTop: 14, fontSize: 13, color: "var(--ink2)" }}>
                Noch keine Beteiligungen. Im Dealflow findest du strukturierte Prozesse und proprietäre Kontakte.
              </div></div>
            )}
            <Shelf holdings={me.holdings} market={state.market} cash={me.cash} quarter={quarter}
              onPick={(uid: string) => { haptic(6); const el = document.getElementById("h_" + uid); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            {me.holdings.map((c: Any) => {
              const patched = patchHolding(c);
              const stagedExit = stagedExitByHolding[c.uid];
              return (
                <div key={c.uid}>
                  <Holding c={patched} market={state.market} neg={NEG} quarter={quarter}
                    procCount={me.holdings.filter((h: Any) => h.proc).length} freeSlots={freeSlots}
                    act={{
                      proc: () => previewExit(c, "proc"), bil: () => previewExit(c, "bil"),
                      cv: () => previewExit(c, "cv"), ipo: () => previewExit(c, "ipo"),
                      search: (seat: Seat) => setSearches((arr) => [...arr, { holdingUid: c.uid, seat }]),
                      init: (dim: "plat" | "acc") => setInitPick({ uid: c.uid, dim }),
                      ltip: () => setLtipStaged((p) => (p.includes(c.uid) ? p : [...p, c.uid])),
                      study: () => setStudyStaged((p) => (p.includes(c.uid) ? p : [...p, c.uid])),
                    }} />
                  {stagedExit && stagedExit.action !== "process" && (
                    <p className="hint" style={{ margin: "-8px 16px 14px" }}>
                      ✓ Verkauf vorgemerkt ({stagedExit.action === "bilateral" ? "bilateral" : stagedExit.action === "cv" ? "GP-led Secondary" : "IPO"}) —
                      wird mit dem Halbjahresabschluss ausgeführt.
                    </p>
                  )}
                </div>
              );
            })}
            {me.realized.length > 0 && (
              <div className="card">
                <h3 className="disp">Track Record</h3>
                {me.realized.map((r: Any, i: number) => (
                  <div className="lb" key={i}>
                    <span className="nm">{r.name}</span>
                    <span className="mo" style={{ color: r.moic >= 1 ? "var(--teal)" : "var(--ox)" }}>{r.moic.toFixed(2)}×</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "rank" && (
          <>
            {/* Die Wertung gegen die Kohorte steht jetzt hier statt im
                Dealflow-Tab: sie gehört zur Rangliste, nicht zum Einkauf. */}
            <div className="card">
              <h3 className="disp">
                Wertung gegen die Kohorte
                <Info k="score" />
              </h3>
              <TvpiChart hist={tvpiHist} meIdx={meIdx} />
            </div>
            <div className="card">
              <h3 className="disp">Peer Group</h3>
              {rank.map((f, i) => (
                <div key={f.slot}>
                  <div className={"lb" + (f.me ? " me" : "")} onClick={() => setOpenFund(openFund === f.slot ? null : f.slot)}
                    style={{ cursor: "pointer" }} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setOpenFund(openFund === f.slot ? null : f.slot)}>
                    <span className="rk">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                    <span className="nm">{f.name}</span>
                    <span className="bar2"><i style={{ width: `${Math.max(4, Math.min(100, ((f.score + 0.2) / 2.0) * 100))}%` }} /></span>
                    <span className="mo" style={{ color: f.score >= 1 ? "var(--teal)" : "var(--ox)" }}>{f.score.toFixed(2)}</span>
                    <span style={{ color: "var(--ink2)", fontSize: 11 }}>{openFund === f.slot ? "▴" : "▾"}</span>
                  </div>
                  {openFund === f.slot && (
                    <div style={{ background: "var(--zebra)", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 2px" }}>
                        <span className="eyebrow">{f.me ? "Dein Portfolio" : f.name}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                          TVPI {f.tvpi.toFixed(2)}× · IRR {(f.irr * 100).toFixed(1).replace(".", ",")} % · DPI {f.dpi.toFixed(2)}× · {eur(f.cash)} frei
                        </span>
                      </div>
                      {f.holdings.length === 0 && <div className="quiet" style={{ paddingTop: 4 }}>Keine Beteiligungen.</div>}
                      {f.holdings.map((c: Any) => {
                        const val = fairOf(c, state.market, f.attrs.negotiation);
                        const mo = val / c.entryEquity;
                        return (
                          <div key={c.uid} style={{ padding: "6px 14px", fontSize: 12.5, display: "flex", gap: 8, alignItems: "baseline" }}>
                            <i className="sdot" style={{ background: SECCOLOR[c.sector] }} />
                            <span style={{ flex: 1 }}>{c.name}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>Kauf {x(c.entryMult)}</span>
                            <span className="mono" style={{ color: "var(--ink2)" }}>{c.holdQ} HJ</span>
                            <span className="mono" style={{ color: mo >= 1 ? "var(--teal)" : "var(--ox)", minWidth: 42, textAlign: "right" }}>
                              {mo.toFixed(2)}×
                            </span>
                          </div>
                        );
                      })}
                      {f.realized.length > 0 && (
                        <div style={{ padding: "6px 14px 10px", fontSize: 12, color: "var(--ink2)" }}>
                          Realisiert: {f.realized.map((r: Any) => `${r.name} ${r.moic.toFixed(2)}×`).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ margin: "18px 16px 8px" }}>
          {error && <p className="autherror" style={{ marginBottom: 10 }}>{error}</p>}
          <button className={"solid cta-big" + (Object.keys(bids).length > 0 ? " ready" : "")}
            style={{ width: "100%", padding: 14 }} disabled={pending} onClick={handleSubmit}>
            {pending ? "Wird abgeschickt …" : <>Halbjahr abschließen {Object.keys(bids).length > 0 && `· ${gebote(Object.keys(bids).length)}`}</>}
          </button>
        </div>
      </div>

      <div className="tabs">
        <div className="tabinner">
          <span className="ind" style={{ transform: `translateX(${TAB_IDX[tab] * 100}%)` }} />
          {([["deals", "Dealflow"], ["port", "Portfolio"], ["rank", "Peer Group"]] as const).map(([k, n]) => {
            const Icon = TAB_ICON[k];
            return (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => { if (tab !== k) haptic(6); setTab(k); }}>
                <Icon strokeWidth={tab === k ? 2.2 : 1.7} />
                {n}
                {k === "port" && shortlistAll.length - shortlistCursor + exitQueueAll.length - exitQueueCursor > 0 && (
                  <span className="badge">{shortlistAll.length - shortlistCursor + exitQueueAll.length - exitQueueCursor}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {sheet && <Sheet sheet={sheet} close={() => setSheet(null)} onConfirm={confirmExitStage} />}
      {useProceedsItem && (
        <UseProceeds item={useProceedsItem} me={me} quarter={quarter} settle={settleProceeds} />
      )}
      {initPick && me.holdings.find((h: Any) => h.uid === initPick.uid) && (
        <InitPicker c={me.holdings.find((h: Any) => h.uid === initPick.uid)} dim={initPick.dim} market={state.market}
          start={startInitStage} close={() => setInitPick(null)} />
      )}
      {!sheet && !initPick && shortlistItem && (
        <Shortlist item={{ ...shortlistItem, cands: shortlistItem.candidates }}
          holding={me.holdings.find((h: Any) => h.uid === shortlistItem.holdingUid)}
          analysis={me.attrs.analysis} hire={hireStage} reject={rejectStage} />
      )}
      {!sheet && !initPick && !shortlistItem && exitQueueItem && (
        <Offers item={exitQueueItem} holding={me.holdings.find((h: Any) => h.uid === exitQueueItem.holdingUid)}
          market={state.market} neg={NEG} decide={decideOfferStage} />
      )}
    </div>
  );
}
