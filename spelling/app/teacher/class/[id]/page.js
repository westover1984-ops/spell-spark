import Link from "next/link";
import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { cardStyle, btn } from "../../../../lib/ui";
import { addStudentsBulk, deleteStudent, upsertWeek, replaceWordsForWeek } from "../../actions";

export const dynamic = "force-dynamic";

async function fetchAll(classId) {
  const sb = supabaseAdmin();
  const { data: cls } = await sb.from("classes").select("*").eq("id", classId).limit(1);
  const c = cls?.[0];

  const { data: students } = await sb.from("students").select("id,display_name,created_at").eq("class_id", classId).order("display_name");
  const { data: weeks } = await sb.from("weeks").select("*").eq("class_id", classId).order("week_number", { ascending: false });

  return { c, students: students || [], weeks: weeks || [] };
}

async function fetchWeekWords(weekId) {
  const sb = supabaseAdmin();
  const { data } = await sb.from("words").select("difficulty,word").eq("week_id", weekId).order("word");
  return data || [];
}

export default async function TeacherClass({ params, searchParams }) {
  const secret = (searchParams?.t || "").toString();
  const classId = params.id;

  // Validate secret by attempting an admin action lightly (handled in actions too); here we just load with admin key.
  const { c, students, weeks } = await fetchAll(classId);
  if (!c) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
        <div style={{ width:"min(820px,100%)" }}>
          <h1 style={{ margin:0 }}>Class not found</h1>
          <Link href={`/teacher/dashboard?t=${encodeURIComponent(secret)}`} style={{ textDecoration:"underline" }}>Back</Link>
        </div>
      </main>
    );
  }

  // pick most recent week for editing convenience
  const latestWeek = weeks?.[0] || null;
  const latestWords = latestWeek ? await fetchWeekWords(latestWeek.id) : [];
  const byDiff = { easy: [], medium: [], hard: [] };
  for (const w of latestWords) byDiff[w.difficulty]?.push(w.word);

  async function addStudentsAction(formData) {
    "use server";
    await addStudentsBulk({ secret: formData.get("t"), classId: formData.get("classId"), namesText: formData.get("names") });
  }

  async function deleteStudentAction(formData) {
    "use server";
    await deleteStudent({ secret: formData.get("t"), studentId: formData.get("studentId") });
  }

  async function upsertWeekAction(formData) {
    "use server";
    const weekNumber = parseInt(formData.get("weekNumber"), 10);
    const title = formData.get("title");
    const publish = formData.get("publish") === "on";
    const week = await upsertWeek({ secret: formData.get("t"), classId: formData.get("classId"), weekNumber, title, publish });
    await replaceWordsForWeek({
      secret: formData.get("t"),
      weekId: week.id,
      easyText: formData.get("easy") || "",
      mediumText: formData.get("medium") || "",
      hardText: formData.get("hard") || ""
    });
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", padding:24 }}>
      <div style={{ width:"min(1100px,100%)", margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ margin:"0 0 6px 0" }}>{c.name}</h1>
            <div style={{ color:"var(--muted)" }}>
              Code: <strong>{c.code}</strong> · Student link: <Link href={`/c/${encodeURIComponent(c.code)}`} style={{ textDecoration:"underline" }}>/c/{c.code}</Link>
            </div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <Link href={`/teacher/dashboard?t=${encodeURIComponent(secret)}`} style={{ opacity:0.9 }}>Back</Link>
          </div>
        </div>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Students</h2>
          <form action={addStudentsAction} style={{ display:"grid", gap:10, gridTemplateColumns:"1fr", marginBottom:12 }}>
            <input type="hidden" name="t" value={secret} />
            <input type="hidden" name="classId" value={c.id} />
            <textarea name="names" placeholder={"Paste student names (one per line)\n\nViolet Adams\nLilah Bowden\n..."} rows={6}
              style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)", lineHeight:1.4 }} />
            <button style={btn()}>Add names</button>
          </form>

          {students.length === 0 ? (
            <p style={{ color:"var(--muted)", margin:0 }}>No students yet.</p>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10 }}>
              {students.map(s => (
                <div key={s.id} style={{ padding:"12px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)", display:"flex", justifyContent:"space-between", gap:10 }}>
                  <div>
                    <div style={{ fontWeight:900 }}>{s.display_name}</div>
                    <div style={{ color:"var(--muted)", fontSize:12 }}>Progress is tracked automatically</div>
                  </div>
                  <form action={deleteStudentAction}>
                    <input type="hidden" name="t" value={secret} />
                    <input type="hidden" name="studentId" value={s.id} />
                    <button style={btn("danger")} title="Remove student">×</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Create / update a week</h2>
          <form action={upsertWeekAction} style={{ display:"grid", gap:10 }}>
            <input type="hidden" name="t" value={secret} />
            <input type="hidden" name="classId" value={c.id} />
            <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))" }}>
              <input name="weekNumber" type="number" min="1" placeholder="Week number (e.g., 20)" required
                style={{ padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
              <input name="title" placeholder="Title (e.g., REV + New + Heart Words)" required
                style={{ padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
              <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.25)" }}>
                <input name="publish" type="checkbox" />
                Publish (students can see it)
              </label>
            </div>

            <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
              <div>
                <div style={{ fontWeight:900, marginBottom:6 }}>Easy</div>
                <textarea name="easy" rows={10} placeholder="One word per line"
                  defaultValue={latestWeek ? byDiff.easy.join("\n") : ""}
                  style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
              </div>
              <div>
                <div style={{ fontWeight:900, marginBottom:6 }}>Medium</div>
                <textarea name="medium" rows={10} placeholder="One word per line"
                  defaultValue={latestWeek ? byDiff.medium.join("\n") : ""}
                  style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
              </div>
              <div>
                <div style={{ fontWeight:900, marginBottom:6 }}>Hard</div>
                <textarea name="hard" rows={10} placeholder="One word per line"
                  defaultValue={latestWeek ? byDiff.hard.join("\n") : ""}
                  style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
              </div>
            </div>

            <button style={btn()}>Save week + words</button>
            <p style={{ margin:"6px 0 0 0", color:"var(--muted)", fontSize:13 }}>
              Tip: Saving a week replaces its word list completely (clean and predictable).
            </p>
          </form>
        </section>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Weeks (all)</h2>
          {weeks.length === 0 ? <p style={{ color:"var(--muted)", margin:0 }}>No weeks yet.</p> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
              {weeks.map(w => (
                <div key={w.id} style={{ padding:"12px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.25)" }}>
                  <div style={{ fontWeight:900 }}>Week {w.week_number}</div>
                  <div style={{ color:"var(--muted)", fontSize:13 }}>{w.title}</div>
                  <div style={{ marginTop:8, fontSize:12, color: w.is_published ? "var(--ok)" : "var(--muted)" }}>
                    {w.is_published ? "Published" : "Draft"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Progress (coming next)</h2>
          <p style={{ margin:0, color:"var(--muted)" }}>
            Version 1 includes tracking tables (sessions, attempts, mastery). Next step is a teacher-friendly dashboard view.
            If you want it now, say: <em>“Add the progress dashboard”</em>.
          </p>
        </section>

      </div>
    </main>
  );
}
