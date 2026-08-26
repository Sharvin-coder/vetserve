-- VetGuide document store: one row per chunk of an ingested official document.
-- Vector search (pgvector HNSW) + keyword search (tsvector GIN) live side by side;
-- the API fuses both result lists with reciprocal rank fusion.

create extension if not exists vector;

create table if not exists public.chunks (
  id bigint generated always as identity primary key,
  content text not null,
  content_hash text not null unique,          -- sha256 of content; makes ingestion idempotent
  source_url text not null,
  title text not null,
  page int,                                    -- PDF page, null for HTML
  section_path text,                           -- e.g. "Health Care > Eligibility"
  embedding vector(768) not null,              -- nomic-embed-text
  tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create index if not exists chunks_embedding_idx
  on public.chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_tsv_idx
  on public.chunks using gin (tsv);

-- Anyone may read the official-document chunks; only the service role writes.
alter table public.chunks enable row level security;

create policy "chunks are publicly readable"
  on public.chunks for select
  using (true);

-- Vector search: cosine distance, best first.
create or replace function public.match_chunks(
  query_embedding vector(768),
  match_count int default 20
)
returns table (
  id bigint,
  content text,
  source_url text,
  title text,
  page int,
  section_path text,
  similarity float
)
language sql stable as $$
  select
    c.id, c.content, c.source_url, c.title, c.page, c.section_path,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Keyword search: websearch syntax ("hazlewood act" tuition), ts_rank ordering.
create or replace function public.keyword_chunks(
  query text,
  match_count int default 20
)
returns table (
  id bigint,
  content text,
  source_url text,
  title text,
  page int,
  section_path text,
  rank float
)
language sql stable as $$
  select
    c.id, c.content, c.source_url, c.title, c.page, c.section_path,
    ts_rank(c.tsv, websearch_to_tsquery('english', query)) as rank
  from public.chunks c
  where c.tsv @@ websearch_to_tsquery('english', query)
  order by rank desc
  limit match_count;
$$;

-- Anonymous thumbs up/down on VetGuide answers (Phase 2 uses this).
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null,
  helpful boolean not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "anyone can leave feedback"
  on public.feedback for insert
  with check (true);
