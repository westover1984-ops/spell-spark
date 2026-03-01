"use server";

import { supabaseAdmin } from "../../lib/supabaseClient";

function assertTeacher(secret) {
  const expected = process.env.TEACHER_SECRET;
  if (!expected) throw new Error("Missing TEACHER_SECRET env var");
  if (secret !== expected) throw new Error("Invalid teacher secret");
}

export async function createClass({ secret, code, name }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  const c = code.trim().toUpperCase();
  const n = name.trim();
  const { data, error } = await sb.from("classes").insert({ code: c, name: n }).select("*").limit(1);
  if (error) throw new Error(error.message);
  return data[0];
}

export async function addStudentsBulk({ secret, classId, namesText }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  const names = namesText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (names.length === 0) return { inserted: 0 };
  const rows = names.map(display_name => ({ class_id: classId, display_name }));
  const { error } = await sb.from("students").insert(rows);
  if (error) throw new Error(error.message);
  return { inserted: names.length };
}

export async function deleteStudent({ secret, studentId }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  const { error } = await sb.from("students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function upsertWeek({ secret, classId, weekNumber, title, publish }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  const { data: existing, error: e1 } = await sb.from("weeks").select("*").eq("class_id", classId).eq("week_number", weekNumber).limit(1);
  if (e1) throw new Error(e1.message);
  if (existing?.[0]) {
    const { data, error } = await sb.from("weeks").update({ title, is_published: !!publish }).eq("id", existing[0].id).select("*").limit(1);
    if (error) throw new Error(error.message);
    return data[0];
  }
  const { data, error } = await sb.from("weeks").insert({ class_id: classId, week_number: weekNumber, title, is_published: !!publish }).select("*").limit(1);
  if (error) throw new Error(error.message);
  return data[0];
}

export async function replaceWordsForWeek({ secret, weekId, easyText, mediumText, hardText }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  // delete existing
  const { error: delErr } = await sb.from("words").delete().eq("week_id", weekId);
  if (delErr) throw new Error(delErr.message);

  function parse(text) {
    return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  const easy = parse(easyText);
  const medium = parse(mediumText);
  const hard = parse(hardText);

  const rows = [
    ...easy.map(word => ({ week_id: weekId, difficulty: "easy", word })),
    ...medium.map(word => ({ week_id: weekId, difficulty: "medium", word })),
    ...hard.map(word => ({ week_id: weekId, difficulty: "hard", word })),
  ];
  if (rows.length) {
    const { error } = await sb.from("words").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { inserted: rows.length };
}

export async function getDashboard({ secret }) {
  assertTeacher(secret);
  const sb = supabaseAdmin();
  const { data: classes, error } = await sb.from("classes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { classes };
}
