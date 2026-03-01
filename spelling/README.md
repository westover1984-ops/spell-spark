# Spell Spark (Hosted spelling tracker)

This is a ready-to-deploy Next.js + Supabase web app for classroom spelling practice.

## What it does
- Students: open class link, tap their name (no login), practise spelling with audio.
- Teacher: simple "teacher secret" login to create weeks, paste Easy/Medium/Hard words, view progress.

## Key retry rule (as requested)
- Attempt 1: audio only.
- If wrong: show the correct word. It stays visible UNTIL the student types the first character in the input box, then disappears and stays hidden.

## Deploy (minimal clicks)
1) Create a Supabase project.
2) Run the SQL in `supabase/schema.sql`.
3) Put the Supabase URL + keys into Vercel environment variables.
4) Deploy to Vercel.

See `DEPLOYMENT.md` for a step-by-step checklist.
