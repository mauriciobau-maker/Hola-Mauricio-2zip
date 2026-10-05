CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"player_id" integer,
	"is_admin" integer DEFAULT 0 NOT NULL,
	"is_club_admin" integer DEFAULT 0 NOT NULL,
	"club_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "club_sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"sport_id" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'basic' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"invite_code" text,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"address" text,
	"admin_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clubs_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "elo_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer,
	"sport_id" integer NOT NULL,
	"elo_before" integer NOT NULL,
	"elo_after" integer NOT NULL,
	"elo_change" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asistencia" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encuentros" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date_time" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"max_spots" integer,
	"notes" text,
	"organizer_id" text,
	"club_id" integer,
	"sport_id" integer,
	"formato" text,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"notification_email" boolean DEFAULT false NOT NULL,
	"notification_whatsapp" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cobros" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"club_id" integer,
	"encuentro_id" integer,
	"gasto_id" integer,
	"monto" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"pagado_at" timestamp with time zone,
	"confirmado_por" text,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gasto_participantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"gasto_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"es_invitado" boolean DEFAULT false NOT NULL,
	"paga_arriendo" boolean DEFAULT true NOT NULL,
	"paga_implementos" boolean DEFAULT true NOT NULL,
	"paga_bebidas" boolean DEFAULT true NOT NULL,
	"paga_alimentos" boolean DEFAULT true NOT NULL,
	"paga_otros" boolean DEFAULT true NOT NULL,
	"monto_calculado" integer DEFAULT 0 NOT NULL,
	"monto_personalizado" integer
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer,
	"club_id" integer,
	"arriendo" integer DEFAULT 0 NOT NULL,
	"implementos" integer DEFAULT 0 NOT NULL,
	"bebidas" integer DEFAULT 0 NOT NULL,
	"alimentos" integer DEFAULT 0 NOT NULL,
	"otros" integer DEFAULT 0 NOT NULL,
	"descripcion_otros" text,
	"total" integer DEFAULT 0 NOT NULL,
	"creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer,
	"sport_id" integer NOT NULL,
	"encuentro_id" integer,
	"team1_score" integer DEFAULT 0 NOT NULL,
	"team2_score" integer DEFAULT 0 NOT NULL,
	"sets" jsonb,
	"result" text NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"club_id" integer NOT NULL,
	"role" text DEFAULT 'player' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"elo" integer DEFAULT 1500 NOT NULL,
	"phone" text,
	"wa_id" text,
	"wsp_consent" boolean DEFAULT false,
	"language" text DEFAULT 'es',
	"club_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"team_size" integer DEFAULT 2 NOT NULL,
	"min_team_size" integer,
	"max_team_size" integer,
	"use_sets" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_sports" ADD CONSTRAINT "club_sports_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_sports" ADD CONSTRAINT "club_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_history" ADD CONSTRAINT "elo_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_history" ADD CONSTRAINT "elo_history_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_history" ADD CONSTRAINT "elo_history_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_gasto_id_gastos_id_fk" FOREIGN KEY ("gasto_id") REFERENCES "public"."gastos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gasto_participantes" ADD CONSTRAINT "gasto_participantes_gasto_id_gastos_id_fk" FOREIGN KEY ("gasto_id") REFERENCES "public"."gastos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gasto_participantes" ADD CONSTRAINT "gasto_participantes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");