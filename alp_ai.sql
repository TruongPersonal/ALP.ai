create schema if not exists alp_ai;

create or replace function alp_ai.update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create table alp_ai.profiles (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  login_token text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger update_profiles_modtime
before update on alp_ai.profiles
for each row execute procedure alp_ai.update_modified_column();
create table alp_ai.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references alp_ai.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger update_subjects_modtime
before update on alp_ai.subjects
for each row execute procedure alp_ai.update_modified_column();
create table alp_ai.materials (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references alp_ai.subjects(id) on delete cascade unique not null,
  summary_markdown text not null,
  converted text not null,
  questions jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create trigger update_materials_modtime
before update on alp_ai.materials
for each row execute procedure alp_ai.update_modified_column();

create table alp_ai.attempts (
  id uuid default gen_random_uuid() primary key,
  material_id uuid references alp_ai.materials(id) on delete cascade,
  user_id uuid references alp_ai.profiles(id) on delete cascade not null,
  questions_snapshot jsonb not null,
  answers jsonb not null,
  score numeric(5, 2) not null,
  file_url text,
  status varchar default 'processing',
  feedback jsonb,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_subjects_user_id on alp_ai.subjects(user_id);
create index idx_materials_subject_id on alp_ai.materials(subject_id);
create index idx_attempts_user_id on alp_ai.attempts(user_id);
create index idx_attempts_material_id on alp_ai.attempts(material_id);
create index idx_profiles_login_token on alp_ai.profiles(login_token);

ALTER TABLE alp_ai.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE alp_ai.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE alp_ai.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE alp_ai.attempts DISABLE ROW LEVEL SECURITY;
