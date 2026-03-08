# FamilyHub 🏠

אפליקציה לניהול משפחתי — קניות, משימות, בחינות ועוד.

Built with **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**, **Supabase**, and **Shadcn/UI**. Full RTL Hebrew UI.

---

## Features

- **Auth**: Login / Signup with Supabase Auth
- **Family management**: Create a new family or join an existing one via invite code
- **Dashboard**: Welcome screen with upcoming exams and missing shopping items summary
- **Shopping list**: Add items by category, toggle bought/unbought, group by category
- **Tasks**: Manage chores and exams with due dates, filter by type
- **Settings**: View and copy family invite code, logout

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Supabase](https://supabase.com/) account (free tier works)

---

## Setup

### 1. Clone / Open the project

```bash
cd familyhub
npm install
```

### 2. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure environment variables

Edit `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set up the database schema

In your Supabase project, go to **SQL Editor** and run the following SQL:

```sql
-- Enable uuid extension
create extension if not exists "uuid-ossp";

-- Families table
create table families (
  id uuid primary key default uuid_generate_v4(),
  family_name text not null,
  invite_code text unique not null default substring(uuid_generate_v4()::text, 1, 8),
  created_at timestamptz default now()
);

-- Profiles table (linked to auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  family_id uuid references families(id),
  full_name text not null default 'משתמש חדש',
  created_at timestamptz default now()
);

-- Shopping list table
create table shopping_list (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  item_name text not null,
  category text not null default 'כללי',
  is_bought boolean not null default false,
  added_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'done')),
  type text not null check (type in ('exam', 'chore')),
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table families enable row level security;
alter table profiles enable row level security;
alter table shopping_list enable row level security;
alter table tasks enable row level security;

-- RLS Policies
create policy "Users can view their family" on families
  for all using (id = (select family_id from profiles where id = auth.uid()));

create policy "Users can manage own profile" on profiles
  for all using (id = auth.uid());

create policy "Family members can manage shopping list" on shopping_list
  for all using (family_id = (select family_id from profiles where id = auth.uid()));

create policy "Family members can manage tasks" on tasks
  for all using (family_id = (select family_id from profiles where id = auth.uid()));

-- Auto-create profile on auth signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'משתמש חדש')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

---

## Deployment (Vercel)

1. Push the project to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel handles the Next.js build automatically

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout: RTL, Hebrew font (Heebo)
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx      # Login page
│   │   └── signup/page.tsx     # Signup + create/join family
│   └── (app)/
│       ├── layout.tsx          # Protected layout + BottomNav
│       ├── dashboard/page.tsx  # Dashboard (RSC)
│       ├── shopping/page.tsx   # Shopping list (RSC + Client)
│       ├── tasks/page.tsx      # Tasks (RSC + Client)
│       └── settings/page.tsx   # Settings (RSC + Client)
├── components/
│   ├── ui/                     # Shadcn/UI components
│   ├── BottomNav.tsx
│   ├── ShoppingList.tsx
│   ├── TaskList.tsx
│   ├── CopyInviteButton.tsx
│   └── LogoutButton.tsx
└── lib/
    ├── supabase/
    │   ├── client.ts           # Browser Supabase client
    │   ├── server.ts           # Server Supabase client
    │   └── middleware.ts       # Middleware Supabase client
    ├── types.ts                # TypeScript DB types
    └── utils.ts                # cn() utility
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 | App Router, RSC, Server Actions |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | Auth + PostgreSQL database |
| Shadcn/UI | UI components |
| Lucide React | Icons |
| Heebo | Hebrew font |
