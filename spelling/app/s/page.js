"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabaseClient";
import { cardStyle, btn } from "../../lib/ui";

function speak(text, rate=0.9) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  synth.speak(u);
}

function normalise(word) {
  return (word || "").trim().toLowerCase();
}

export default function Student() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const url = useMemo(() => (typeof window !== "undefined" ? new URL(window.location.href) : null), []);
  const classCode = useMemo(() => url?.searchParams.get("class")?.toUpperCase() || "", [url]);
  const studentIdParam = useMemo(() => url?.searchParams.get("student") || "", [url]);

  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState(null);
  const [student, setStudent] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [step, setStep] = useState("pickWeek"); // pickWeek | pickDiff | play | results
  const [week, setWeek] = useState(null);
  const [diff, setDiff] = useState(null);

  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);

  const [answer, setAnswer] = useState("");
  const [attemptNo, setAttemptNo] = useState(1);
  const [showCorrectWord, setShowCorrectWord] = useState(false);
  const [correctWord, setCorrectWord] = useState("");

  const [sessionId, setSessionId] = useState(null);
  const [stats, setStats] = useState({ correct1: 0, correct2: 0, wrong: 0 });

  const inputRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // class
      const { data: clsData, error: clsErr } = await sb.from("classes").select("*").eq("code", classCode).limit(1);
      if (clsErr) throw clsErr;
      const c = clsData?.[0];
      setCls(c || null);

      if (c) {
        const { data: weeksData } = await sb.from("weeks").select("id,week_number,title").eq("class_id", c.id).eq("is_published", true).order("week_number", { ascending: false });
        setWeeks(weeksData || []);
      }

      // student (optional)
      if (studentIdParam) {
        const { data: sData } = await sb.from("students").select("id,display_name,class_id").eq("id", studentIdParam).limit(1);
        const s = sData?.[0];
        setStudent(s || null);
      }
      setLoading(false);
    }
    if (classCode) load();
  }, [sb, classCode, studentIdParam]);

  async function pickWeek(w) {
    setWeek(w);
    setStep("pickDiff");
  }

  async function startPractice(d) {
    setDiff(d);
    setStep("play");
    setStats({ correct1: 0, correct2: 0, wrong: 0 });
    setAttemptNo(1);
    setShowCorrectWord(false);
    setAnswer("");
    setIdx(0);

    const { data: wds } = await sb.from("words").select("id,word,difficulty").eq("week_id", week.id).eq("difficulty", d).order("word");
    const arr = (wds || []).map(x => ({ ...x }));
    setWords(arr);
    // shuffle queue
    const q = [...arr].sort(() => Math.random() - 0.5);
    setQueue(q);

    // create session
    if (student?.id) {
      const { data: sess, error } = await sb.from("sessions").insert({
        student_id: student.id,
        week_id: week.id,
        difficulty: d
      }).select("id").limit(1);
      if (error) console.error(error);
      setSessionId(sess?.[0]?.id || null);
    } else {
      setSessionId(null);
    }

    // speak first
    setTimeout(() => speak(q[0]?.word || ""), 300);
  }

  function current() {
    return queue[idx] || null;
  }

  async function recordAttempt({ wordId, typed, isCorrect, attemptNumber }) {
    if (!sessionId) return;
    await sb.from("attempts").insert({
      session_id: sessionId,
      word_id: wordId,
      typed,
      is_correct: isCorrect,
      attempt_number: attemptNumber
    });
    // Update mastery (simple client-side upsert)
    if (isCorrect) {
      // Determine whether this session already counted as correct for this word
      // We'll approximate: count sessions_with_correct once per session by checking if a correct attempt exists already.
      const { data: existing } = await sb.from("attempts")
        .select("id")
        .eq("session_id", sessionId)
        .eq("word_id", wordId)
        .eq("is_correct", true)
        .limit(1);

      const firstCorrectInSession = (existing?.length || 0) === 1 && attemptNumber === 1
        ? true
        : (existing?.length || 0) === 1 && attemptNumber === 2; // if we just inserted, there is at least one

      // Read current mastery row
      const { data: mRows } = await sb.from("mastery").select("*").eq("student_id", student.id).eq("word_id", wordId).limit(1);
      const m = mRows?.[0];

      const correct_total = (m?.correct_total || 0) + 1;
      const sessions_with_correct = (m?.sessions_with_correct || 0) + (firstCorrectInSession ? 1 : 0);
      const mastered = correct_total >= 3 && sessions_with_correct >= 2;

      if (!m) {
        await sb.from("mastery").insert({
          student_id: student.id,
          word_id: wordId,
          correct_total,
          sessions_with_correct,
          mastered
        });
      } else {
        await sb.from("mastery").update({
          correct_total,
          sessions_with_correct,
          mastered,
          updated_at: new Date().toISOString()
        }).eq("id", m.id);
      }
    }
  }

  async function submit() {
    const cur = current();
    if (!cur) return;
    const typed = answer;
    const isCorrect = normalise(typed) === normalise(cur.word);

    await recordAttempt({ wordId: cur.id, typed, isCorrect, attemptNumber: attemptNo });

    if (attemptNo === 1) {
      if (isCorrect) {
        setStats(s => ({ ...s, correct1: s.correct1 + 1 }));
        nextWord();
      } else {
        // wrong -> retry with correct word shown until typing begins
        setStats(s => s); // no change yet
        setAttemptNo(2);
        setCorrectWord(cur.word);
        setShowCorrectWord(true);
        setAnswer("");
        setTimeout(() => {
          inputRef.current?.focus();
          speak(cur.word);
        }, 200);
      }
    } else {
      if (isCorrect) setStats(s => ({ ...s, correct2: s.correct2 + 1 }));
      else setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      nextWord();
    }
  }

  async function nextWord() {
    setAttemptNo(1);
    setShowCorrectWord(false);
    setAnswer("");
    const next = idx + 1;
    if (next >= queue.length) {
      if (sessionId) {
        await sb.from("sessions").update({ finished_at: new Date().toISOString() }).eq("id", sessionId);
      }
      setStep("results");
      return;
    }
    setIdx(next);
    setTimeout(() => speak(queue[next]?.word || ""), 300);
  }

  function onType(e) {
    const val = e.target.value;
    // As soon as they type first character on retry, hide the correct word.
    if (attemptNo === 2 && showCorrectWord && val.length > 0) {
      setShowCorrectWord(false);
    }
    setAnswer(val);
  }

  if (loading) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center" }}>
        Loading…
      </main>
    );
  }

  if (!cls) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
        <div style={{ width:"min(820px,100%)" }}>
          <h1 style={{ margin:0 }}>Class not found</h1>
          <p style={{ color:"var(--muted)" }}>Go back and enter your class code.</p>
          <Link href="/" style={{ textDecoration:"underline" }}>Home</Link>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
        <div style={{ width:"min(920px,100%)" }}>
          <h1 style={{ margin:"0 0 8px 0" }}>Pick your name</h1>
          <p style={{ marginTop:0, color:"var(--muted)" }}>Your teacher hasn’t linked your name to this session. Go back and tap your name from the class page.</p>
          <Link href={`/c/${encodeURIComponent(classCode)}`} style={{ textDecoration:"underline" }}>Back to class page</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", padding:24 }}>
      <div style={{ width:"min(980px,100%)", margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ color:"var(--muted)", fontSize:13 }}>{cls.name}</div>
            <h1 style={{ margin:"4px 0 0 0", fontSize:34, letterSpacing:-0.8 }}>{student.display_name}</h1>
          </div>
          <Link href={`/c/${encodeURIComponent(classCode)}`} style={{ opacity:0.9 }}>Change name</Link>
        </div>

        {step === "pickWeek" && (
          <section style={{ ...cardStyle, marginTop:16 }}>
            <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Choose a week</h2>
            {weeks.length === 0 ? (
              <p style={{ color:"var(--muted)", margin:0 }}>No published weeks yet.</p>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10 }}>
                {weeks.map(w => (
                  <button key={w.id} onClick={() => pickWeek(w)} style={{ ...btn("ghost"), textAlign:"left" }}>
                    <div style={{ fontWeight:900 }}>Week {w.week_number}</div>
                    <div style={{ fontWeight:600, opacity:0.85 }}>{w.title}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "pickDiff" && (
          <section style={{ ...cardStyle, marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
              <h2 style={{ margin:0, fontSize:18 }}>Week {week.week_number}: {week.title}</h2>
              <button onClick={() => setStep("pickWeek")} style={btn("ghost")}>Change week</button>
            </div>
            <p style={{ color:"var(--muted)", marginTop:8 }}>Choose a difficulty.</p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={() => startPractice("easy")} style={btn()}>Easy</button>
              <button onClick={() => startPractice("medium")} style={btn()}>Medium</button>
              <button onClick={() => startPractice("hard")} style={btn()}>Hard</button>
            </div>
          </section>
        )}

        {step === "play" && (
          <section style={{ ...cardStyle, marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ color:"var(--muted)", fontSize:13 }}>Week {week.week_number} · {diff.toUpperCase()} · {idx+1}/{queue.length}</div>
                <h2 style={{ margin:"6px 0 0 0", fontSize:20 }}>Listen, then spell</h2>
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={() => speak(current()?.word || "")} style={btn("ghost")}>🔊 Hear</button>
                <button onClick={() => { setStep("pickDiff"); if (sessionId) sb.from("sessions").update({ finished_at: new Date().toISOString() }).eq("id", sessionId); }} style={btn("ghost")}>Exit</button>
              </div>
            </div>

            {attemptNo === 2 && (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.25)" }}>
                <div style={{ fontSize:13, color:"var(--muted)", marginBottom:6 }}>Retry — look, then write</div>
                {showCorrectWord ? (
                  <div
                    style={{
                      fontSize:32,
                      fontWeight:950,
                      letterSpacing:0.3,
                      userSelect:"none"
                    }}
                    aria-label="correct word"
                  >
                    {correctWord}
                  </div>
                ) : (
                  <div style={{ fontSize:14, color:"var(--muted)" }}>Word covered. Keep going.</div>
                )}
              </div>
            )}

            <div style={{ marginTop:14 }}>
              <input
                ref={inputRef}
                value={answer}
                onChange={onType}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder={attemptNo === 1 ? "Type the word you heard…" : "Type from memory…"}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ width:"100%", padding:"14px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.14)", background:"rgba(0,0,0,0.35)", color:"var(--text)", fontSize:18 }}
              />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, gap:10, flexWrap:"wrap" }}>
                <button onClick={() => { setAnswer(""); inputRef.current?.focus(); }} style={btn("ghost")}>Clear</button>
                <button onClick={submit} style={btn()}>Submit</button>
              </div>
            </div>

            <div style={{ marginTop:14, display:"flex", gap:12, flexWrap:"wrap", color:"var(--muted)", fontSize:13 }}>
              <span>✅ First try: <strong style={{ color:"var(--text)" }}>{stats.correct1}</strong></span>
              <span>🟣 On retry: <strong style={{ color:"var(--text)" }}>{stats.correct2}</strong></span>
              <span>❌ Missed: <strong style={{ color:"var(--text)" }}>{stats.wrong}</strong></span>
            </div>
          </section>
        )}

        {step === "results" && (
          <section style={{ ...cardStyle, marginTop:16 }}>
            <h2 style={{ margin:"0 0 8px 0" }}>Session complete 🎉</h2>
            <p style={{ marginTop:0, color:"var(--muted)" }}>
              Week {week.week_number} · {diff.toUpperCase()}
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ padding:"10px 12px", borderRadius:14, border:"1px solid rgba(255,255,255,0.14)" }}>
                ✅ First try: <strong>{stats.correct1}</strong>
              </div>
              <div style={{ padding:"10px 12px", borderRadius:14, border:"1px solid rgba(255,255,255,0.14)" }}>
                🟣 On retry: <strong>{stats.correct2}</strong>
              </div>
              <div style={{ padding:"10px 12px", borderRadius:14, border:"1px solid rgba(255,255,255,0.14)" }}>
                ❌ Missed: <strong>{stats.wrong}</strong>
              </div>
            </div>
            <div style={{ marginTop:14, display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={() => setStep("pickDiff")} style={btn()}>Practise another difficulty</button>
              <Link href={`/c/${encodeURIComponent(classCode)}`} style={{ textDecoration:"none" }}>
                <button style={btn("ghost")}>Back to names</button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
