import { createFileRoute } from "@tanstack/react-router";

// GET /api/admin/apply-schema?key=<APP_PASSWORD> — ONE-TIME endpoint untuk
// menjalankan supabase/schema.sql di database production. Hapus file ini
// setelah schema berhasil di-apply lalu redeploy.
export const Route = createFileRoute("/api/admin/apply-schema")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!process.env.APP_PASSWORD || url.searchParams.get("key") !== process.env.APP_PASSWORD)
          return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        const conn = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
        if (!conn) return Response.json({ ok: false, error: "no POSTGRES_URL" }, { status: 500 });
        try {
          const { Client } = await import("pg");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schema = ((await import("../../../../supabase/schema.sql?raw")) as any).default as string;
          const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
          await client.connect();
          await client.query(schema);
          const check = await client.query(
            "select table_name from information_schema.tables where table_schema='public' and table_name in ('debts','accounts','transactions','categories') order by 1",
          );
          await client.end();
          return Response.json({ ok: true, tables: check.rows.map((r) => r.table_name) });
        } catch (e) {
          return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
      },
    },
  },
});
