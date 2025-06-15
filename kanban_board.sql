-- -------------------------------------------------------------
-- TablePlus 6.4.8(608)
--
-- https://tableplus.com/
--
-- Database: kanban_board
-- Generation Time: 2025-06-15 00:06:37.7200
-- -------------------------------------------------------------




DROP TABLE IF EXISTS "public"."SequelizeMeta";
-- Table Definition
CREATE TABLE "public"."SequelizeMeta" (
    "name" varchar(255) NOT NULL,
    PRIMARY KEY ("name")
);

DROP TABLE IF EXISTS "public"."Boards";
-- Table Definition
CREATE TABLE "public"."Boards" (
    "id" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "isPublic" bool DEFAULT false,
    "settings" jsonb DEFAULT '{"showTaskCount": true, "allowMemberEdit": true}'::jsonb,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."CardHistories";
DROP TYPE IF EXISTS "public"."enum_CardHistories_changeType";
CREATE TYPE "public"."enum_CardHistories_changeType" AS ENUM ('create', 'update', 'delete', 'move', 'status_change');

-- Table Definition
CREATE TABLE "public"."CardHistories" (
    "id" uuid NOT NULL,
    "cardId" uuid NOT NULL,
    "changedBy" uuid,
    "changeType" "public"."enum_CardHistories_changeType" NOT NULL,
    "field" varchar(255) NOT NULL,
    "oldValue" text,
    "newValue" text,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."Sprints";
-- Table Definition
CREATE TABLE "public"."Sprints" (
    "id" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "goal" text,
    "startDate" timestamptz NOT NULL,
    "endDate" timestamptz NOT NULL,
    "boardId" uuid NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "isActive" bool DEFAULT false,
    "velocity" int4 DEFAULT 0,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tasks";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq;

-- Table Definition
CREATE TABLE "public"."tasks" (
    "id" int4 NOT NULL DEFAULT nextval('tasks_id_seq'::regclass),
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" varchar(50) NOT NULL DEFAULT 'todo'::character varying,
    "priority" varchar(20) DEFAULT 'medium'::character varying,
    "position" int4 NOT NULL,
    "reporter_id" int4,
    "assignee_id" int4,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "ticket_number" varchar(255),
    "effort" varchar(10) CHECK ((effort IS NULL) OR (((effort)::text ~ '^\d+(\.\d+)?[hd]$'::text) AND
CASE
    WHEN ((effort)::text ~~ '%h'::text) THEN ((split_part((effort)::text, 'h'::text, 1))::numeric >= 0.5)
    WHEN ((effort)::text ~~ '%d'::text) THEN ((split_part((effort)::text, 'd'::text, 1))::numeric >= (1)::numeric)
    ELSE NULL::boolean
END)),
    "sprint_order" int4,
    "completed_at" timestamp,
    "timespent" varchar(10) CHECK ((timespent)::text ~ '^(0\.5|[1-9][0-9]*(\.5)?)?(h|d)$'::text),
    "sprint_id" int4,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."Comments";
-- Table Definition
CREATE TABLE "public"."Comments" (
    "id" uuid NOT NULL,
    "content" text NOT NULL,
    "cardId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "isPinned" bool DEFAULT false,
    "parentCommentId" uuid,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."BoardMembers";
-- Table Definition
CREATE TABLE "public"."BoardMembers" (
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "UserId" uuid,
    "BoardId" uuid
);

DROP TABLE IF EXISTS "public"."comments";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS comments_id_seq;

-- Table Definition
CREATE TABLE "public"."comments" (
    "id" int4 NOT NULL DEFAULT nextval('comments_id_seq'::regclass),
    "task_id" int4,
    "user_id" int4,
    "content" text NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."Cards";
DROP TYPE IF EXISTS "public"."enum_Cards_status";
CREATE TYPE "public"."enum_Cards_status" AS ENUM ('todo', 'in_progress', 'review', 'done');
DROP TYPE IF EXISTS "public"."enum_Cards_priority";
CREATE TYPE "public"."enum_Cards_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- Table Definition
CREATE TABLE "public"."Cards" (
    "id" uuid NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" "public"."enum_Cards_status" NOT NULL DEFAULT 'todo'::"enum_Cards_status",
    "priority" "public"."enum_Cards_priority" NOT NULL DEFAULT 'medium'::"enum_Cards_priority",
    "position" int4 NOT NULL DEFAULT 0,
    "epicLabel" varchar(255) NOT NULL,
    "boardId" uuid NOT NULL,
    "reporterId" uuid NOT NULL,
    "assigneeId" uuid,
    "startDate" timestamptz,
    "dueDate" timestamptz,
    "storyPoints" int4,
    "labels" _varchar DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "sprintId" uuid,
    "ticketNumber" varchar(255),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."task_history";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS task_history_id_seq;

-- Table Definition
CREATE TABLE "public"."task_history" (
    "id" int4 NOT NULL DEFAULT nextval('task_history_id_seq'::regclass),
    "task_id" int4,
    "user_id" int4,
    "field_name" varchar(50) NOT NULL,
    "old_value" text,
    "new_value" text,
    "changed_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."users";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- Table Definition
CREATE TABLE "public"."users" (
    "id" int4 NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "email" varchar(255) NOT NULL,
    "username" varchar(100) NOT NULL,
    "password_hash" varchar(255),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."sprints";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS sprints_id_seq;

-- Table Definition
CREATE TABLE "public"."sprints" (
    "id" int4 NOT NULL DEFAULT nextval('sprints_id_seq'::regclass),
    "name" varchar(100) NOT NULL,
    "start_date" date,
    "end_date" date,
    "status" varchar(20) NOT NULL DEFAULT 'planned'::character varying,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."SequelizeMeta" ("name") VALUES
('20240530180000-initial-schema.cjs');

INSERT INTO "public"."tasks" ("id", "title", "description", "status", "priority", "position", "reporter_id", "assignee_id", "created_at", "updated_at", "ticket_number", "effort", "sprint_order", "completed_at", "timespent", "sprint_id") VALUES
(48, 'Yolo24', 'Wow
', 'inProgress', 'high', 2, 2, 2, '2025-06-09 13:12:09.959717+02', '2025-06-14 12:42:48.70845+02', 'PT-0001', '1d', 1, NULL, NULL, NULL),
(49, '50ty', 'Test', 'review', 'high', 4, 2, 3, '2025-06-09 13:12:16.290911+02', '2025-06-14 12:52:24.882596+02', 'PT-0002', '2d', 6, NULL, NULL, NULL),
(50, 'Another One4', 'Yes
', 'done', 'high', 1, 2, 1, '2025-06-09 13:12:24.841468+02', '2025-06-14 12:52:24.882596+02', 'PT-0003', '2d', 3, '2025-06-14 12:52:24.882596', NULL, NULL),
(51, 'UmbrellaX', 'Sun Ultimate booking customizable widget in which clients can easily choose a service and set the date and time for the appointment in a few clicks. Suitable for any sites on WordPress and for any business that requires a booking appointment system: SPA and Massage salons, Restaurants, Universities and Schools, Law consultancy, Fitness and Yoga classes, Private clinics and Dental services, and many others with no restrictions.
', 'todo', 'high', 1, 2, 3, '2025-06-09 13:13:43.5306+02', '2025-06-14 00:48:56.284888+02', 'PT-0004', '4d', 8, NULL, '3d', NULL),
(52, 'Main Task248842X', 'Hello', 'done', 'medium', 2, 2, 1, '2025-06-09 13:13:56.227432+02', '2025-06-14 12:52:24.882596+02', 'PT-0005', '1h', NULL, '2025-06-14 12:52:11.596308', NULL, NULL),
(53, 'Hulu44', 'Testo
', 'review', 'low', 2, 2, 1, '2025-06-09 13:22:15.554131+02', '2025-06-14 12:52:24.882596+02', 'PT-0006', '1d', NULL, NULL, NULL, NULL),
(54, 'Bettina24', 'dgf', 'done', 'medium', 4, 2, 1, '2025-06-09 13:40:04.092319+02', '2025-06-14 12:52:24.882596+02', 'PT-0007', '2h', NULL, '2025-06-14 12:51:18.669105', '1h', NULL),
(55, 'Mellowback4842', 'dfg', 'done', 'high', 3, 2, 3, '2025-06-09 14:36:43.924585+02', '2025-06-14 12:52:24.882596+02', 'PT-0008', '2d', NULL, '2025-06-14 12:51:53.478372', NULL, NULL),
(56, 'Monomental', 'Freedom
', 'inProgress', 'low', 1, 2, NULL, '2025-06-09 16:17:26.382612+02', '2025-06-14 12:42:48.70845+02', 'PT-0009', '1d', 2, NULL, '1d', NULL),
(57, 'Testo', 'Meto', 'review', 'low', 1, 2, NULL, '2025-06-09 16:29:05.090552+02', '2025-06-14 12:52:24.882596+02', 'PT-0010', '2d', NULL, NULL, '1.5d', NULL),
(58, 'Asap Rocky488', 'sdfdf', 'todo', 'high', 2, 2, NULL, '2025-06-09 23:15:20.719209+02', '2025-06-14 12:25:35.369352+02', 'PT-0011', '1d', 1, NULL, NULL, NULL),
(61, 'New82', 'Test', 'review', 'high', 3, 2, NULL, '2025-06-11 16:25:06.314657+02', '2025-06-14 12:52:24.882596+02', 'PT-0013', '2d', 1, NULL, NULL, NULL),
(62, 'Hund24', 'dfgfg', 'todo', 'medium', 4, 2, NULL, '2025-06-11 16:47:09.457947+02', '2025-06-14 12:25:35.452794+02', 'PT-0014', NULL, 2, NULL, NULL, NULL),
(63, 'ImpressiveTask', 'dsfdfs', 'done', 'medium', 5, 2, NULL, '2025-06-11 16:48:09.035944+02', '2025-06-14 12:52:24.882596+02', 'PT-0015', '6h', 1, NULL, NULL, NULL);

;
ALTER TABLE "public"."CardHistories" ADD FOREIGN KEY ("cardId") REFERENCES "public"."Cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Indices
CREATE INDEX card_histories_card_id_idx ON public."CardHistories" USING btree ("cardId");
ALTER TABLE "public"."Sprints" ADD FOREIGN KEY ("boardId") REFERENCES "public"."Boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."tasks" ADD FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE SET NULL;


-- Indices
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx_tasks_position ON public.tasks USING btree ("position");
CREATE UNIQUE INDEX tasks_ticket_number_key ON public.tasks USING btree (ticket_number);
ALTER TABLE "public"."Comments" ADD FOREIGN KEY ("cardId") REFERENCES "public"."Cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Comments" ADD FOREIGN KEY ("parentCommentId") REFERENCES "public"."Comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."BoardMembers" ADD FOREIGN KEY ("BoardId") REFERENCES "public"."Boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."comments" ADD FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_comments_task_id ON public.comments USING btree (task_id);
ALTER TABLE "public"."Cards" ADD FOREIGN KEY ("sprintId") REFERENCES "public"."Sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Cards" ADD FOREIGN KEY ("boardId") REFERENCES "public"."Boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Indices
CREATE INDEX cards_board_status_position_idx ON public."Cards" USING btree ("boardId", status, "position");
CREATE UNIQUE INDEX "Cards_ticketNumber_key" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key1" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key2" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key3" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key4" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key5" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key6" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key7" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key8" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key9" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key11" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key10" ON public."Cards" USING btree ("ticketNumber");
CREATE UNIQUE INDEX "Cards_ticketNumber_key12" ON public."Cards" USING btree ("ticketNumber");
ALTER TABLE "public"."task_history" ADD FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_task_history_task_id ON public.task_history USING btree (task_id);


-- Indices
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
