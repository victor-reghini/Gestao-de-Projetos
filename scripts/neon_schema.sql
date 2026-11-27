-- Schema DDL migrated from PostgreSQL source to NeonDB
-- Generated cleanly without credentials or data rows

CREATE TABLE IF NOT EXISTS "public"."api_key" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL,
  "project_id" text,
  "created_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "key_hash" text NOT NULL,
  "last_used_at" timestamp with time zone,
  "name" text NOT NULL,
  "scopes" text[],
  CONSTRAINT "api_key_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."user" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "avatar_url" text,
  "created_at" timestamp with time zone,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "updated_at" timestamp with time zone,
  "is_super_user" boolean DEFAULT false NOT NULL,
  "api_token" text,
  "api_token_hash" text,
  CONSTRAINT "user_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_api_token_hash_key" UNIQUE (api_token_hash),
  CONSTRAINT "user_api_token_key" UNIQUE (api_token)
);

CREATE TABLE IF NOT EXISTS "public"."project" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL,
  "repository_id" text,
  "created_at" timestamp with time zone,
  "description" text NOT NULL,
  "links" text,
  "name" text NOT NULL,
  "readme" text,
  "short_description" text,
  "slug" text NOT NULL,
  "status" text DEFAULT 'EM_ANDAMENTO'::text NOT NULL,
  "technologies" text[],
  "updated_at" timestamp with time zone,
  "visibility" text DEFAULT 'PUBLIC'::text NOT NULL,
  CONSTRAINT "project_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."bug_report" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "author_user_id" text,
  "project_id" text NOT NULL,
  "author_email" text,
  "author_name" text NOT NULL,
  "created_at" timestamp with time zone,
  "description" text NOT NULL,
  "environment" text,
  "expected_behavior" text,
  "image_url" text,
  "observed_behavior" text,
  "severity" text DEFAULT 'MEDIA'::text NOT NULL,
  "status" text DEFAULT 'ABERTO'::text NOT NULL,
  "steps_to_reproduce" text,
  "title" text NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "bug_report_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."idea" (
  "id" text NOT NULL,
  "converted_project_id" text,
  "owner_id" text,
  "created_at" timestamp with time zone,
  "description" text,
  "links" text,
  "status" text,
  "technologies" text[],
  "title" text NOT NULL,
  "updated_at" timestamp with time zone,
  "visibility" text DEFAULT 'PUBLIC'::text NOT NULL,
  "author_id" text,
  "likes" integer,
  "project_id" text,
  CONSTRAINT "idea_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."project_column" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "project_id" text NOT NULL,
  "color" text DEFAULT '#2563eb'::text,
  "created_at" timestamp with time zone,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone,
  "auto_complete" boolean DEFAULT false,
  CONSTRAINT "project_column_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."project_document" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "project_id" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone,
  "position" integer DEFAULT 0 NOT NULL,
  "title" text NOT NULL,
  "type" text DEFAULT 'markdown'::text NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "project_document_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."project_member" (
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone,
  "role" text NOT NULL,
  CONSTRAINT "project_member_pkey" PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS "public"."repository" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone,
  "default_branch" text DEFAULT 'main'::text,
  "name" text NOT NULL,
  "owner" text NOT NULL,
  "provider" text DEFAULT 'github'::text,
  "url" text NOT NULL,
  CONSTRAINT "repository_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."suggestion" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "author_user_id" text,
  "project_id" text NOT NULL,
  "author_email" text,
  "author_name" text NOT NULL,
  "created_at" timestamp with time zone,
  "description" text NOT NULL,
  "status" text DEFAULT 'ABERTO'::text NOT NULL,
  "title" text NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "suggestion_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."system_setting" (
  "id" text NOT NULL,
  "theme" text DEFAULT 'dark'::text NOT NULL,
  "primary_color" text DEFAULT '#2563eb'::text NOT NULL,
  "secondary_color" text DEFAULT '#8b5cf6'::text NOT NULL,
  "allow_registration" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "updated_by" text,
  CONSTRAINT "system_setting_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."task" (
  "id" text DEFAULT gen_random_uuid() NOT NULL,
  "column_id" text NOT NULL,
  "created_by_id" text,
  "project_id" text NOT NULL,
  "created_at" timestamp with time zone,
  "created_by_name" text,
  "description" text,
  "due_date" date,
  "position" integer DEFAULT 0 NOT NULL,
  "priority" text DEFAULT 'MEDIA'::text NOT NULL,
  "title" text NOT NULL,
  "updated_at" timestamp with time zone,
  "concluded" boolean DEFAULT false,
  CONSTRAINT "task_pkey" PRIMARY KEY (id)
);

-- Application compatibility guards
ALTER TABLE "public"."user" ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "public"."user" ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;
ALTER TABLE "public"."user" ADD COLUMN IF NOT EXISTS api_token_hash TEXT UNIQUE;
ALTER TABLE "public"."project_column" ADD COLUMN IF NOT EXISTS auto_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE "public"."task" ADD COLUMN IF NOT EXISTS concluded BOOLEAN DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS "public"."system_setting" (
  id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'dark',
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  allow_registration BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

DO $$ BEGIN
  ALTER TABLE "public"."project" ADD CONSTRAINT "project_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES "user"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."bug_report" ADD CONSTRAINT "bug_report_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."project_column" ADD CONSTRAINT "project_column_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."project_document" ADD CONSTRAINT "project_document_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."suggestion" ADD CONSTRAINT "suggestion_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."task" ADD CONSTRAINT "task_column_id_fkey" FOREIGN KEY (column_id) REFERENCES project_column(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."task" ADD CONSTRAINT "task_project_id_fkey" FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "api_key_ownerId_idx" ON public.api_key USING btree (owner_id);
CREATE INDEX IF NOT EXISTS "api_key_projectId_idx" ON public.api_key USING btree (project_id);
CREATE INDEX IF NOT EXISTS "project_ownerId_idx" ON public.project USING btree (owner_id);
CREATE INDEX IF NOT EXISTS "project_repositoryId_idx" ON public.project USING btree (repository_id);
CREATE INDEX IF NOT EXISTS "bug_report_authorUserId_idx" ON public.bug_report USING btree (author_user_id);
CREATE INDEX IF NOT EXISTS "bug_report_projectId_idx" ON public.bug_report USING btree (project_id);
CREATE INDEX IF NOT EXISTS "idea_convertedProjectId_idx" ON public.idea USING btree (converted_project_id);
CREATE INDEX IF NOT EXISTS "idea_ownerId_idx" ON public.idea USING btree (owner_id);
CREATE INDEX IF NOT EXISTS "project_column_projectId_idx" ON public.project_column USING btree (project_id);
CREATE INDEX IF NOT EXISTS "project_document_projectId_idx" ON public.project_document USING btree (project_id);
CREATE INDEX IF NOT EXISTS "project_member_projectId_idx" ON public.project_member USING btree (project_id);
CREATE INDEX IF NOT EXISTS "project_member_userId_idx" ON public.project_member USING btree (user_id);
CREATE INDEX IF NOT EXISTS "suggestion_authorUserId_idx" ON public.suggestion USING btree (author_user_id);
CREATE INDEX IF NOT EXISTS "suggestion_projectId_idx" ON public.suggestion USING btree (project_id);
CREATE INDEX IF NOT EXISTS "task_columnId_idx" ON public.task USING btree (column_id);
CREATE INDEX IF NOT EXISTS "task_createdById_idx" ON public.task USING btree (created_by_id);
CREATE INDEX IF NOT EXISTS "task_projectId_idx" ON public.task USING btree (project_id);
