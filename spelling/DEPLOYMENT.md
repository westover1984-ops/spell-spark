## Deployment checklist (Vercel + Supabase)

### 1) Create Supabase project
- Go to Supabase and create a new project.
- In **Project Settings → API**, copy:
  - Project URL
  - Anon public key
  - Service role key (keep private)

### 2) Create tables and policies
- In Supabase **SQL Editor**, open `supabase/schema.sql` and run it.

### 3) Set environment variables in Vercel
Create a new Vercel project from this folder (upload ZIP or connect repo), then set:

- `NEXT_PUBLIC_SUPABASE_URL` = (Supabase Project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase anon key)
- `SUPABASE_SERVICE_ROLE_KEY` = (Supabase service role key)
- `TEACHER_SECRET` = choose your own phrase (e.g., `westover-teacher-2026`)

Deploy.

### 4) First-time setup in the app
- Visit `/teacher`
- Enter your `TEACHER_SECRET`
- Create your class (class code + class name)
- Paste student names

Then students can use: `https://<your-vercel-domain>/c/<CLASSCODE>`

### Notes
- This app uses Supabase Row Level Security. Students can only write progress for the class they are in.
- Teacher screens use server actions with service role key (so teacher secret should be kept private).
