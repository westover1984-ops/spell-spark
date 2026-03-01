"use client";

import { useState } from "react";
import Link from "next/link";
import { cardStyle, btn } from "../../lib/ui";

export default function TeacherLogin() {
  const [secret, setSecret] = useState("");
  return (
    <main style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"grid", placeItems:"center", padding:24 }}>
      <div style={{ width:"min(860px,100%)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:12 }}>
          <h1 style={{ margin:0 }}>Teacher</h1>
          <Link href="/" style={{ opacity:0.9 }}>Home</Link>
        </div>
        <section style={{ ...cardStyle, marginTop:16 }}>
          <h2 style={{ margin:"0 0 10px 0", fontSize:18 }}>Enter teacher secret</h2>
          <form action={`/teacher/dashboard`} method="GET" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <input name="t" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Teacher secret" required
              style={{ flex:"1 1 280px", padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.35)", color:"var(--text)" }} />
            <button style={btn()}>Enter</button>
          </form>
          <p style={{ margin:"10px 0 0 0", color:"var(--muted)", fontSize:13 }}>
            This is a lightweight gate (no accounts). Keep the secret private.
          </p>
        </section>
      </div>
    </main>
  );
}
