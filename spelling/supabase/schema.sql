-- Enable required extension
create extension if not exists pgcrypto;

-- Classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Students (no auth accounts)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null,
  pin_hash text null, -- optional future
  created_at timestamptz not null default now(),
  unique(class_id, display_name)
);

-- Weeks / lists
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  week_number int not null,
  title text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(class_id, week_number)
);

-- Words
create type if not exists public.difficulty as enum ('easy','medium','hard');

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  difficulty public.difficulty not null,
  word text not null,
  created_at timestamptz not null default now()
);

-- Sessions (one practice run)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  difficulty public.difficulty not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

-- Attempts (per word per session)
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  attempt_number int not null check (attempt_number in (1,2)),
  typed text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

-- Aggregate mastery (denormalised for speed)
create table if not exists public.mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  correct_total int not null default 0,
  sessions_with_correct int not null default 0,
  mastered boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(student_id, word_id)
);

-- RLS
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.weeks enable row level security;
alter table public.words enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.mastery enable row level security;

-- We use a simple model:
-- Public (students) can read published weeks/words and student roster for a class,
-- and can write sessions/attempts/mastery for a selected student in that class.

-- Helper: class code passed as a PostgREST header isn't available here, so we scope by IDs.
-- The app uses anon key on client. Teacher uses service role on server for admin actions.

-- Read policies (students)
create policy if not exists "read classes by code"
on public.classes for select
to anon
using (true);

create policy if not exists "read students"
on public.students for select
to anon
using (true);

create policy if not exists "read published weeks"
on public.weeks for select
to anon
using (is_published = true);

create policy if not exists "read words for published weeks"
on public.words for select
to anon
using (exists(select 1 from public.weeks w where w.id = week_id and w.is_published = true));

-- Write policies (students)
create policy if not exists "insert sessions"
on public.sessions for insert
to anon
with check (true);

create policy if not exists "update sessions finished_at"
on public.sessions for update
to anon
using (true)
with check (true);

create policy if not exists "insert attempts"
on public.attempts for insert
to anon
with check (true);

create policy if not exists "upsert mastery"
on public.mastery for insert
to anon
with check (true);

create policy if not exists "update mastery"
on public.mastery for update
to anon
using (true)
with check (true);

-- Note: this is permissive for a classroom app (no authentication).
-- If you want stronger guarantees later, we can add student PINs or device tokens and tighten policies.
