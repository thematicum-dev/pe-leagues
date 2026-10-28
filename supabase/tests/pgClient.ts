/* Ersatz für "npm:@supabase/supabase-js" beim Test des Serverpfads gegen ein
   lokales Postgres (siehe supabase/tests/README.md). Bildet genau den Teil der
   Client-Schnittstelle nach, den supabase/functions/evaluate-seasons benutzt:
   rpc() und from().select().eq().lte().order().limit().single()/maybeSingle().

   Jede Anfrage läuft in einer eigenen Transaktion mit der Rolle, die der
   Schlüssel hätte: der Service-Schlüssel als service_role — so greifen die
   GRANTs der Migrationen wie in Supabase, statt als Superuser alles zu
   dürfen. */
import pg from "pg";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let pool: pg.Pool | null = null;
export function pgPool(): pg.Pool {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.PEL_PG, max: 4 });
  return pool;
}

/* Eine Anfrage in der Rolle eines Nutzers oder des Dienstes. `sub` setzt
   auth.uid() so, wie PostgREST es aus dem JWT tut. */
export async function runAs<T = Any>(role: "service_role" | "authenticated" | "anon", sub: string | null,
  sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
  const c = await pgPool().connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${role}`);
    await c.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [sub ?? "", role]);
    const r = await c.query(sql, params as Any[]);
    await c.query("commit");
    return { rows: r.rows as T[] };
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

const enc = (v: unknown) => (v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v);

async function rpcAs(role: Any, sub: string | null, fn: string, params: Record<string, unknown> = {}) {
  try {
    const meta = await pgPool().query(
      `select p.proretset, t.typname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       join pg_type t on t.oid = p.prorettype where n.nspname = 'public' and p.proname = $1 limit 1`, [fn]);
    if (!meta.rows.length) return { data: null, error: { message: `function ${fn} not found` } };
    const keys = Object.keys(params);
    const args = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
    const vals = keys.map((k) => enc(params[k]));
    if (meta.rows[0].proretset) {
      const r = await runAs(role, sub, `select * from public.${fn}(${args})`, vals);
      return { data: r.rows, error: null };
    }
    const r = await runAs(role, sub, `select public.${fn}(${args}) as v`, vals);
    return { data: meta.rows[0].typname === "void" ? null : r.rows[0]?.v ?? null, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: (e as Any).code } };
  }
}

class Query implements PromiseLike<Any> {
  private cols = "*";
  private where: string[] = [];
  private vals: unknown[] = [];
  private ord = "";
  private lim = "";
  private mode: "many" | "single" | "maybe" = "many";
  constructor(private role: Any, private sub: string | null, private table: string) {}
  select(cols = "*") { this.cols = cols; return this; }
  private cond(op: string, col: string, v: unknown) { this.vals.push(v); this.where.push(`${col} ${op} $${this.vals.length}`); return this; }
  eq(col: string, v: unknown) { return this.cond("=", col, v); }
  lte(col: string, v: unknown) { return this.cond("<=", col, v); }
  gte(col: string, v: unknown) { return this.cond(">=", col, v); }
  order(col: string, o: { ascending?: boolean } = {}) { this.ord = ` order by ${col} ${o.ascending === false ? "desc" : "asc"}`; return this; }
  limit(n: number) { this.lim = ` limit ${Number(n)}`; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  async run() {
    try {
      const sql = `select ${this.cols} from public.${this.table}${this.where.length ? " where " + this.where.join(" and ") : ""}${this.ord}${this.lim}`;
      const r = await runAs(this.role, this.sub, sql, this.vals);
      if (this.mode === "many") return { data: r.rows, error: null };
      if (r.rows.length === 1) return { data: r.rows[0], error: null };
      if (this.mode === "maybe" && !r.rows.length) return { data: null, error: null };
      return { data: null, error: { message: `expected one row, got ${r.rows.length}` } };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
  then<A, B>(ok?: ((v: Any) => A | PromiseLike<A>) | null, bad?: ((e: Any) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, bad);
  }
}

export function clientAs(role: "service_role" | "authenticated" | "anon", sub: string | null = null) {
  return {
    rpc: (fn: string, params?: Record<string, unknown>) => rpcAs(role, sub, fn, params),
    from: (table: string) => new Query(role, sub, table),
  };
}

// Die Signatur von supabase-js: der Service-Schlüssel ergibt service_role
export function createClient(_url: string, _key: string, _opts?: unknown) {
  return clientAs("service_role");
}
export type SupabaseClient = ReturnType<typeof createClient>;
