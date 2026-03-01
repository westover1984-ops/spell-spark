import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "min(920px, 100%)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -1 }}>Spell Spark</h1>
          <Link href="/teacher" style={{ opacity: 0.9 }}>Teacher</Link>
        </div>
        <p style={{ maxWidth: 640, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
          Students tap their name and practise spelling. You paste weekly word lists (Easy / Medium / Hard). Progress saves automatically.
        </p>

        <div style={{ marginTop: 22, background: "var(--card)", borderRadius: 18, padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Enter your class code</h2>
          <form action="/go" method="GET" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input name="code" placeholder="e.g., WEST6A" required
              style={{ flex: "1 1 260px", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.35)", color: "var(--text)" }} />
            <button style={{ padding: "12px 14px", borderRadius: 12, border: 0, background: "var(--accent)", color: "white", fontWeight: 700 }}>
              Go
            </button>
          </form>
          <p style={{ margin: "10px 0 0 0", color: "var(--muted)", fontSize: 13 }}>
            Tip: you can also go directly to <code>/c/CLASSCODE</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
