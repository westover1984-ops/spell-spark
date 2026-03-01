import Link from "next/link";
import { supabaseAdmin } from "../../../lib/supabaseClient";
import { cardStyle, btn } from "../../../lib/ui";

export const dynamic = "force-dynamic";

async function getClassData(code) {
  const sb = supabaseAdmin();
  const { data: classes, error } = await sb.from("classes").select("*").eq("code", code).limit(1);
  if (error) throw new Error(error.message);
  const cls = classes?.[0];
  if (!cls) return null;

  const { data: students } = await sb.from("students").select("id,display_name").eq("class_id", cls.id).order("display_name");
  const { data: weeks } = await sb.from("weeks").select("id,week_number,title").eq("class_id", cls.id).eq("is_published", true).order("week_number", { ascending: false });
  return { cls, students: students || [], weeks: weeks || [] };
}

export default async function ClassPage({ params }) {
  const code = decodeURIComponent(params.code).toUpperCase();
  const res = await getClassData(code);
  if (!res) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
        <div style={{ width:"min(860px,100%)" }}>
          <h1 style={{ margin:0 }}>Class not found</h1>
          <p style={{ color:"var(--muted)" }}>Check the code and try again.</p>
          <Link href="/" style={{ textDecoration:"underline" }}>Back</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", padding:24 }}>
      <div style={{ width:"min(980px,100%)", margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ margin:"0 0 6px 0", fontSize:38, letterSpacing:-1 }}>{res.cls.name}</h1>
            <div style={{ color:"var(--muted)" }}>Class code: <strong>{res.cls.code}</strong></div>
          </div>
          <Link href="/" style={{ opacity:0.9 }}>Change class</Link>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16, marginTop:18 }}>
          <section style={cardStyle}>
            <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Tap your name</h2>
            {res.students.length === 0 ? (
              <p style={{ color:"var(--muted)", margin:0 }}>No students added yet. Teacher: go to /teacher to add names.</p>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
                {res.students.map(s => (
                  <Link key={s.id} href={`/s?class=${encodeURIComponent(res.cls.code)}&student=${encodeURIComponent(s.id)}`} style={{ textDecoration:"none" }}>
                    <div style={{ padding:"12px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)" }}>
                      <div style={{ fontWeight:800 }}>{s.display_name}</div>
                      <div style={{ color:"var(--muted)", fontSize:12 }}>Tap to start</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin:"0 0 8px 0", fontSize:18 }}>Published weeks</h2>
            {res.weeks.length === 0 ? (
              <p style={{ color:"var(--muted)", margin:0 }}>No published weeks yet.</p>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {res.weeks.slice(0, 12).map(w => (
                  <span key={w.id} style={{ padding:"8px 10px", borderRadius:999, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)", fontSize:13 }}>
                    Week {w.week_number}: {w.title}
                  </span>
                ))}
              </div>
            )}
            <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
              <Link href={`/s?class=${encodeURIComponent(res.cls.code)}&student=`} style={{ textDecoration:"none" }}>
                <button style={btn("ghost")}>I don't see my name</button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
