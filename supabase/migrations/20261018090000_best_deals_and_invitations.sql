-- Zwei Ergänzungen fürs Dashboard: die Bestenliste der Einzeldeals neben der
-- Rangliste und Einladungen an Freunde per E-Mail.

-- ---------------------------------------------------------------------------
-- 1. best_deals(): der beste realisierte Deal jeder abgeschlossenen Partie
-- ---------------------------------------------------------------------------
--
-- Je Partie genau ein Eintrag: der Deal mit dem höchsten MOIC unter allen
-- menschlichen Fondsplätzen. Gelesen wird der Endstand (season_state des
-- letzten Halbjahres) -- nach Spielende ohnehin für alle öffentlich (siehe
-- season_state_select), hier nur verdichtet.
--
-- Gezählt werden vollständige Verkäufe, die Tail-End-Verwertung am
-- Laufzeitende und Totalverluste nach einem Covenant Breach. Teilverkäufe (Continuation Vehicle, Börsengang, die
-- Restbeteiligung nach der Lock-up) bleiben draußen: Ihr MOIC gilt nur für
-- die verkaufte Tranche und wäre neben einem ganzen Deal nicht vergleichbar.
--
-- Der MOIC steht im Endstand (realized[].moic, wie im Track Record des
-- Spiels: Nettoerlös plus Rekapitalisierungen je Euro Einstand). Die
-- Haltedauer steht dort nicht -- sie ergibt sich aus den Halbjahresständen:
-- der höchste holdQ, den die Beteiligung im Portfolio erreicht hat. Bei der
-- Tail-End-Verwertung ist das ein Halbjahr weniger als gehalten (sie läuft
-- nach dem Fortschreiben des letzten Halbjahres, der Endstand führt die
-- Beteiligung nicht mehr), deshalb dort + 1.
--
-- Der IRR des Deals ist daraus annualisiert: MOIC^(2/Haltedauer in
-- Halbjahren) - 1 -- dieselbe Näherung, mit der die KI-Fonds ihre Exits
-- abwägen (runQuarter.ts) und der Erklärmodus rechnet. Sie übergeht
-- Zwischenzahlungen (Rekapitalisierungen, Kapitalzuführungen), ist für den
-- Vergleich von Einzeldeals aber die übliche Größe.
create or replace function public.best_deals(p_universe_id uuid)
returns table (
  season_id uuid,
  finished_at timestamptz,
  profile_id uuid,
  display_name text,
  deal_name text,
  moic numeric,
  hold_half_years integer,
  irr numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_universe_member(p_universe_id) and not public.is_admin() then
    raise exception 'universe_not_granted';
  end if;

  return query
  with fin as (
    select s.id as sid, s.updated_at as fin_at, ss.state
    from public.seasons s
    join public.season_state ss on ss.season_id = s.id
    where s.status = 'finished'
      and s.universe_id = p_universe_id
      and ss.half_year = (select max(x.half_year) from public.season_state x where x.season_id = s.id)
  ),
  deals as (
    select
      f.sid,
      f.fin_at,
      (fund ->> 'slot')::int as slot,
      (fund ->> 'profileId') as pid,
      (r ->> 'name') as name,
      (r ->> 'moic')::numeric as moic,
      (r ->> 'name') like '% (Tail-End)' as tail_end,
      regexp_replace(r ->> 'name', ' \((Tail-End|Covenant Breach)\)$', '') as base_name
    from fin f
    cross join lateral jsonb_array_elements(f.state -> 'funds') as fund
    cross join lateral jsonb_array_elements(coalesce(fund -> 'realized', '[]'::jsonb)) as r
    where coalesce((fund ->> 'isAi')::boolean, false) = false
      and (fund ->> 'profileId') is not null
      and (r ->> 'moic') is not null
      and (r ->> 'name') !~ ' \((Teilexit|IPO|Restbeteiligung)\)$'
  ),
  best as (
    select d.*, row_number() over (partition by d.sid order by d.moic desc, d.name) as rn
    from deals d
  ),
  held as (
    select ss.season_id as sid, (fund ->> 'slot')::int as slot, (h ->> 'name') as name,
      max((h ->> 'holdQ')::int) as hold_q
    from public.season_state ss
    join best b on b.sid = ss.season_id and b.rn = 1
    cross join lateral jsonb_array_elements(ss.state -> 'funds') as fund
    cross join lateral jsonb_array_elements(coalesce(fund -> 'holdings', '[]'::jsonb)) as h
    where (fund ->> 'slot')::int = b.slot and (h ->> 'name') = b.base_name
    group by 1, 2, 3
  )
  select
    b.sid,
    b.fin_at,
    b.pid::uuid,
    p.display_name,
    b.base_name,
    round(b.moic, 4),
    h.hold_q + (case when b.tail_end then 1 else 0 end),
    case
      when h.hold_q is null or h.hold_q + (case when b.tail_end then 1 else 0 end) < 1 or b.moic <= 0 then null
      else round((power(b.moic, 2.0 / (h.hold_q + (case when b.tail_end then 1 else 0 end))) - 1)::numeric, 4)
    end
  from best b
  join public.profiles p on p.id = b.pid::uuid
  left join held h on h.sid = b.sid and h.slot = b.slot and h.name = b.base_name
  where b.rn = 1
  order by b.moic desc, b.fin_at desc
  limit 50;
end;
$$;

comment on function public.best_deals(uuid) is
  'Bester realisierter Deal je abgeschlossener Partie eines Universums (Spieler, MOIC, IRR aus MOIC und Haltedauer), nach MOIC sortiert. Nur für Mitglieder dieses Universums (oder den Admin).';

revoke all on function public.best_deals(uuid) from public, anon;
grant execute on function public.best_deals(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. invitations: Einladungen an Freunde
-- ---------------------------------------------------------------------------
--
-- Verschickt wird die Mail von Supabase Auth (auth.admin.inviteUserByEmail,
-- Vorlage "Invite user", siehe supabase/templates/invite.html) aus einer
-- Server Action heraus. Diese Tabelle hält fest, wer wen eingeladen hat --
-- für die Obergrenze je Spieler und Tag und für den Admin, der den Zugang
-- anschließend freigibt.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  message text,
  created_at timestamptz not null default now(),
  constraint invitations_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  constraint invitations_message_length check (message is null or char_length(message) <= 500)
);

create index invitations_inviter_created_idx on public.invitations (inviter_id, created_at desc);

comment on table public.invitations is
  'Einladungen per E-Mail: wer wen wann eingeladen hat (Obergrenze je Spieler, Nachvollziehbarkeit für den Admin).';

alter table public.invitations enable row level security;

-- Jeder sieht nur die eigenen Einladungen ...
create policy "invitations_select_own"
  on public.invitations
  for select
  to authenticated
  using (inviter_id = auth.uid());

-- ... und legt sie nur im eigenen Namen an, und nur mit freigegebenem
-- Zugang. Die Obergrenze prüft zusätzlich die Server Action vor dem Versand.
create policy "invitations_insert_own"
  on public.invitations
  for insert
  to authenticated
  with check (
    inviter_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.access_status = 'approved'
    )
  );
