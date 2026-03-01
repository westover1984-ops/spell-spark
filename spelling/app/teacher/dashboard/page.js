import Link from "next/link";
import { cardStyle, btn } from "../../../lib/ui";
import { getDashboard, createClass } from "../actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }) {
  const secret = (searchParams?.t || "").toString();
  let data;
  try {
    data = await getDashboard({ secret });
  } catch (e) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
        <div style={{ width:"min(820px,100%)" }}>
          <h1 style={{ margin:0 }}>Teacher access denied</h1>
          <p style={{ color:"var(--muted)" }}>{e.message}</p>
          <Link href="/teacher" style={{ textDecoration:"underline" }}>Back</Link>
        </div>
      </main>
    );
  }

  async function createClassAction(formData) {
    "use server";
    const code = formData.get("code");
    const name = formData.get("name");
    const t = formData.get("t");
    await createClass({ secret: t, code, name });
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", padding:24 }}>
      <div style={{ width:"min(980px,100%)", margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:12 }}>
          <h1 style={{ margin:0 }}>Teacher Dashboard</h1>
          <div style={{ display:"flex", gap:12 }}>
            <Link href="/" style={{ opacity:0.9 }}>Home</Link>
            <Link href="/teacher" style={{ opacity:0.9 }}>Lock</Link>
          </div>
        </div>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Create a class</h2>
          <form action={createClassAction} style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input type="hidden" name="t" value={secret} />
            <input name="code" placeholder="Class code (e.g., WEST6A)" required
              style={{ padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
            <input name="name" placeholder="Class name (e.g., Year 6 Westover)" required
              style={{ padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
            <button style={btn()}>Create</button>
          </form>
        </section>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Your classes</h2>
          {data.classes.length === 0 ? (
            <p style={{ color:"var(--muted)", margin:0 }}>No classes yet.</p>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:10 }}>
              {data.classes.map(c => (
                <Link key={c.id} href={`/teacher/class/${c.id}?t=${encodeURIComponent(secret)}`} style={{ textDecoration:"none" }}>
                  <div style={{ padding:"12px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)" }}>
                    <div style={{ fontWeight:900 }}>{c.name}</div>
                    <div style={{ color:"var(--muted)", fontSize:13 }}>Code: {c.code}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
