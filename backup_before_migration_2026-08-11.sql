--
-- PostgreSQL database dump
--

\restrict fZXOASnqm8BhanQIVcgdrCBMnX5aODHhBls5huva3i5gi3lM5VcPdbwzv6EJk9p

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asistencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asistencia (
    id integer NOT NULL,
    encuentro_id integer NOT NULL,
    player_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.asistencia OWNER TO postgres;

--
-- Name: asistencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asistencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asistencia_id_seq OWNER TO postgres;

--
-- Name: asistencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asistencia_id_seq OWNED BY public.asistencia.id;


--
-- Name: club_sport_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.club_sport_categories (
    id integer NOT NULL,
    club_sport_id integer,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.club_sport_categories OWNER TO postgres;

--
-- Name: club_sport_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.club_sport_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.club_sport_categories_id_seq OWNER TO postgres;

--
-- Name: club_sport_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.club_sport_categories_id_seq OWNED BY public.club_sport_categories.id;


--
-- Name: club_sports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.club_sports (
    id integer NOT NULL,
    club_id integer NOT NULL,
    sport_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.club_sports OWNER TO postgres;

--
-- Name: club_sports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.club_sports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.club_sports_id_seq OWNER TO postgres;

--
-- Name: club_sports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.club_sports_id_seq OWNED BY public.club_sports.id;


--
-- Name: clubs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clubs (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    plan text DEFAULT 'basic'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    invite_code text,
    logo_url text,
    primary_color text,
    secondary_color text,
    address text,
    country text,
    state text,
    city text,
    map_url text,
    default_language text DEFAULT 'es'::text,
    admin_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clubs OWNER TO postgres;

--
-- Name: clubs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clubs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clubs_id_seq OWNER TO postgres;

--
-- Name: clubs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clubs_id_seq OWNED BY public.clubs.id;


--
-- Name: cobros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cobros (
    id integer NOT NULL,
    player_id integer NOT NULL,
    club_id integer,
    encuentro_id integer,
    gasto_id integer,
    monto integer DEFAULT 0 NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    pagado_at timestamp with time zone,
    confirmado_por text,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cobros OWNER TO postgres;

--
-- Name: cobros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cobros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cobros_id_seq OWNER TO postgres;

--
-- Name: cobros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cobros_id_seq OWNED BY public.cobros.id;


--
-- Name: elo_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.elo_history (
    id integer NOT NULL,
    player_id integer NOT NULL,
    match_id integer,
    sport_id integer NOT NULL,
    elo_before integer NOT NULL,
    elo_after integer NOT NULL,
    elo_change integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.elo_history OWNER TO postgres;

--
-- Name: elo_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.elo_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.elo_history_id_seq OWNER TO postgres;

--
-- Name: elo_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.elo_history_id_seq OWNED BY public.elo_history.id;


--
-- Name: encuentros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encuentros (
    id integer NOT NULL,
    title text NOT NULL,
    date_time timestamp with time zone NOT NULL,
    location text NOT NULL,
    max_spots integer,
    notes text,
    organizer_id text,
    club_id integer,
    sport_id integer,
    formato text,
    estado text DEFAULT 'abierto'::text NOT NULL,
    notification_email boolean DEFAULT false NOT NULL,
    notification_whatsapp boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.encuentros OWNER TO postgres;

--
-- Name: encuentros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.encuentros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encuentros_id_seq OWNER TO postgres;

--
-- Name: encuentros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.encuentros_id_seq OWNED BY public.encuentros.id;


--
-- Name: gasto_participantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gasto_participantes (
    id integer NOT NULL,
    gasto_id integer NOT NULL,
    player_id integer NOT NULL,
    es_invitado boolean DEFAULT false NOT NULL,
    paga_arriendo boolean DEFAULT true NOT NULL,
    paga_implementos boolean DEFAULT true NOT NULL,
    paga_bebidas boolean DEFAULT true NOT NULL,
    paga_alimentos boolean DEFAULT true NOT NULL,
    paga_otros boolean DEFAULT true NOT NULL,
    monto_calculado integer DEFAULT 0 NOT NULL,
    monto_personalizado integer
);


ALTER TABLE public.gasto_participantes OWNER TO postgres;

--
-- Name: gasto_participantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gasto_participantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gasto_participantes_id_seq OWNER TO postgres;

--
-- Name: gasto_participantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gasto_participantes_id_seq OWNED BY public.gasto_participantes.id;


--
-- Name: gastos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gastos (
    id integer NOT NULL,
    encuentro_id integer,
    club_id integer,
    arriendo integer DEFAULT 0 NOT NULL,
    implementos integer DEFAULT 0 NOT NULL,
    bebidas integer DEFAULT 0 NOT NULL,
    alimentos integer DEFAULT 0 NOT NULL,
    otros integer DEFAULT 0 NOT NULL,
    descripcion_otros text,
    total integer DEFAULT 0 NOT NULL,
    creado_por text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gastos OWNER TO postgres;

--
-- Name: gastos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gastos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gastos_id_seq OWNER TO postgres;

--
-- Name: gastos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gastos_id_seq OWNED BY public.gastos.id;


--
-- Name: match_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_players (
    id integer NOT NULL,
    match_id integer NOT NULL,
    player_id integer NOT NULL,
    team text NOT NULL
);


ALTER TABLE public.match_players OWNER TO postgres;

--
-- Name: match_players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.match_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.match_players_id_seq OWNER TO postgres;

--
-- Name: match_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.match_players_id_seq OWNED BY public.match_players.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    club_id integer,
    sport_id integer NOT NULL,
    encuentro_id integer,
    team1_score integer DEFAULT 0 NOT NULL,
    team2_score integer DEFAULT 0 NOT NULL,
    sets jsonb,
    result text NOT NULL,
    status text DEFAULT 'pending_confirmation'::text NOT NULL,
    played_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    modality_id integer NOT NULL
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id integer NOT NULL,
    player_id integer NOT NULL,
    club_id integer NOT NULL,
    role text DEFAULT 'player'::text NOT NULL
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.memberships_id_seq OWNER TO postgres;

--
-- Name: memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.memberships_id_seq OWNED BY public.memberships.id;


--
-- Name: notification_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_subscriptions (
    id integer NOT NULL,
    player_id integer NOT NULL,
    type text NOT NULL,
    value text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_subscriptions OWNER TO postgres;

--
-- Name: notification_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_subscriptions_id_seq OWNER TO postgres;

--
-- Name: notification_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_subscriptions_id_seq OWNED BY public.notification_subscriptions.id;


--
-- Name: player_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_categories (
    id integer NOT NULL,
    player_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.player_categories OWNER TO postgres;

--
-- Name: player_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.player_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.player_categories_id_seq OWNER TO postgres;

--
-- Name: player_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.player_categories_id_seq OWNED BY public.player_categories.id;


--
-- Name: player_sport_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_sport_ratings (
    id integer NOT NULL,
    player_id integer NOT NULL,
    sport_id integer NOT NULL,
    elo integer DEFAULT 1500 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.player_sport_ratings OWNER TO postgres;

--
-- Name: player_sport_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.player_sport_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.player_sport_ratings_id_seq OWNER TO postgres;

--
-- Name: player_sport_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.player_sport_ratings_id_seq OWNED BY public.player_sport_ratings.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.players (
    id integer NOT NULL,
    name text NOT NULL,
    nickname text,
    elo integer DEFAULT 1500 NOT NULL,
    phone text,
    wa_id text,
    wsp_consent boolean DEFAULT false,
    language text DEFAULT 'es'::text,
    club_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.players OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.players_id_seq OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sport_modalities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sport_modalities (
    id integer NOT NULL,
    sport_id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    team_size integer NOT NULL,
    min_team_size integer,
    max_team_size integer,
    use_sets boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sport_modalities OWNER TO postgres;

--
-- Name: sport_modalities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sport_modalities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sport_modalities_id_seq OWNER TO postgres;

--
-- Name: sport_modalities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sport_modalities_id_seq OWNED BY public.sport_modalities.id;


--
-- Name: sports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sports (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    team_size integer DEFAULT 2 NOT NULL,
    min_team_size integer,
    max_team_size integer,
    use_sets boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.sports OWNER TO postgres;

--
-- Name: sports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sports_id_seq OWNER TO postgres;

--
-- Name: sports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sports_id_seq OWNED BY public.sports.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    name character varying,
    nickname character varying,
    phone character varying,
    player_id integer,
    is_admin integer DEFAULT 0 NOT NULL,
    is_club_admin integer DEFAULT 0 NOT NULL,
    club_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: asistencia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencia ALTER COLUMN id SET DEFAULT nextval('public.asistencia_id_seq'::regclass);


--
-- Name: club_sport_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sport_categories ALTER COLUMN id SET DEFAULT nextval('public.club_sport_categories_id_seq'::regclass);


--
-- Name: club_sports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sports ALTER COLUMN id SET DEFAULT nextval('public.club_sports_id_seq'::regclass);


--
-- Name: clubs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs ALTER COLUMN id SET DEFAULT nextval('public.clubs_id_seq'::regclass);


--
-- Name: cobros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros ALTER COLUMN id SET DEFAULT nextval('public.cobros_id_seq'::regclass);


--
-- Name: elo_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elo_history ALTER COLUMN id SET DEFAULT nextval('public.elo_history_id_seq'::regclass);


--
-- Name: encuentros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encuentros ALTER COLUMN id SET DEFAULT nextval('public.encuentros_id_seq'::regclass);


--
-- Name: gasto_participantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gasto_participantes ALTER COLUMN id SET DEFAULT nextval('public.gasto_participantes_id_seq'::regclass);


--
-- Name: gastos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos ALTER COLUMN id SET DEFAULT nextval('public.gastos_id_seq'::regclass);


--
-- Name: match_players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players ALTER COLUMN id SET DEFAULT nextval('public.match_players_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: memberships id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships ALTER COLUMN id SET DEFAULT nextval('public.memberships_id_seq'::regclass);


--
-- Name: notification_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.notification_subscriptions_id_seq'::regclass);


--
-- Name: player_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_categories ALTER COLUMN id SET DEFAULT nextval('public.player_categories_id_seq'::regclass);


--
-- Name: player_sport_ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_sport_ratings ALTER COLUMN id SET DEFAULT nextval('public.player_sport_ratings_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: sport_modalities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sport_modalities ALTER COLUMN id SET DEFAULT nextval('public.sport_modalities_id_seq'::regclass);


--
-- Name: sports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports ALTER COLUMN id SET DEFAULT nextval('public.sports_id_seq'::regclass);


--
-- Data for Name: asistencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.asistencia (id, encuentro_id, player_id, status, responded_at, created_at) FROM stdin;
1	3	2	confirmed	2026-08-05 03:16:04.272+00	2026-08-05 03:15:28.596099+00
4	3	5	confirmed	2026-08-05 03:16:04.275+00	2026-08-05 03:15:28.625445+00
2	3	3	confirmed	2026-08-05 03:16:04.277+00	2026-08-05 03:15:28.609318+00
3	3	4	confirmed	2026-08-05 03:16:04.277+00	2026-08-05 03:15:28.620059+00
7	3	8	confirmed	2026-08-05 03:16:04.445+00	2026-08-05 03:15:28.643864+00
5	3	6	confirmed	2026-08-05 03:16:04.446+00	2026-08-05 03:15:28.631887+00
6	3	7	confirmed	2026-08-05 03:16:04.449+00	2026-08-05 03:15:28.640544+00
8	3	1	confirmed	2026-08-05 03:16:04.45+00	2026-08-05 03:15:28.64992+00
10	4	3	confirmed	2026-08-05 03:20:51.347+00	2026-08-05 03:20:19.940158+00
9	4	2	confirmed	2026-08-05 03:20:51.354+00	2026-08-05 03:20:19.933583+00
13	4	6	confirmed	2026-08-05 03:20:51.562+00	2026-08-05 03:20:19.963041+00
16	4	1	confirmed	2026-08-05 03:20:51.563+00	2026-08-05 03:20:19.978416+00
14	4	7	confirmed	2026-08-05 03:20:51.563+00	2026-08-05 03:20:19.969019+00
11	4	4	confirmed	2026-08-05 03:24:58.179+00	2026-08-05 03:20:19.947674+00
12	4	5	confirmed	2026-08-05 03:24:59.904+00	2026-08-05 03:20:19.951035+00
15	4	8	confirmed	2026-08-05 03:25:00.92+00	2026-08-05 03:20:19.973174+00
18	5	3	confirmed	2026-08-06 17:08:48.386+00	2026-08-06 17:08:37.969839+00
22	5	7	confirmed	2026-08-06 17:08:48.406+00	2026-08-06 17:08:37.985914+00
20	5	5	confirmed	2026-08-06 17:08:48.408+00	2026-08-06 17:08:37.978044+00
17	5	2	confirmed	2026-08-06 17:08:48.407+00	2026-08-06 17:08:37.961273+00
19	5	4	confirmed	2026-08-06 17:08:48.407+00	2026-08-06 17:08:37.974805+00
21	5	6	confirmed	2026-08-06 17:08:48.411+00	2026-08-06 17:08:37.98177+00
23	5	8	confirmed	2026-08-06 17:08:48.562+00	2026-08-06 17:08:37.990653+00
24	5	1	confirmed	2026-08-06 17:08:48.563+00	2026-08-06 17:08:37.997806+00
\.


--
-- Data for Name: club_sport_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.club_sport_categories (id, club_sport_id, name, created_at) FROM stdin;
\.


--
-- Data for Name: club_sports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.club_sports (id, club_id, sport_id, active) FROM stdin;
1	1	1	t
\.


--
-- Data for Name: clubs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clubs (id, name, slug, plan, active, invite_code, logo_url, primary_color, secondary_color, address, country, state, city, map_url, default_language, admin_id, created_at) FROM stdin;
1	CLUB PRUEBA 1	club-prueba-1	basic	t	0UI5YT	data:image/jpeg;base64,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	#f6041c	#0d0d0d	Avd. El Peral 07462	Chile	Región Metropolitana	Puente Alto	https://www.google.com/maps/search/?api=1&query=Avd.%20El%20Peral%2007462%2C%20Puente%20Alto%2C%20Regi%C3%B3n%20Metropolitana%2C%20Chile	es	\N	2026-08-05 03:14:06.688544+00
\.


--
-- Data for Name: cobros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cobros (id, player_id, club_id, encuentro_id, gasto_id, monto, estado, pagado_at, confirmado_por, notas, created_at) FROM stdin;
\.


--
-- Data for Name: elo_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.elo_history (id, player_id, match_id, sport_id, elo_before, elo_after, elo_change, created_at) FROM stdin;
\.


--
-- Data for Name: encuentros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.encuentros (id, title, date_time, location, max_spots, notes, organizer_id, club_id, sport_id, formato, estado, notification_email, notification_whatsapp, created_at) FROM stdin;
3	PRUEBA 1	2026-08-10 23:00:00+00	Star Padel	8	PRUEBA	60741545	\N	\N	\N	abierto	f	f	2026-08-05 03:15:28.550732+00
4	PRUEBA 2	2026-08-08 04:20:00+00	La Araucana	\N	\N	60741545	\N	\N	\N	abierto	f	f	2026-08-05 03:20:19.898214+00
5	Prueba 06.08	2026-08-06 14:00:00+00	La Araucana	\N	\N	60741545	\N	\N	\N	abierto	f	f	2026-08-06 17:08:37.951672+00
\.


--
-- Data for Name: gasto_participantes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gasto_participantes (id, gasto_id, player_id, es_invitado, paga_arriendo, paga_implementos, paga_bebidas, paga_alimentos, paga_otros, monto_calculado, monto_personalizado) FROM stdin;
\.


--
-- Data for Name: gastos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gastos (id, encuentro_id, club_id, arriendo, implementos, bebidas, alimentos, otros, descripcion_otros, total, creado_por, created_at) FROM stdin;
\.


--
-- Data for Name: match_players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_players (id, match_id, player_id, team) FROM stdin;
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matches (id, club_id, sport_id, encuentro_id, team1_score, team2_score, sets, result, status, played_at, created_at, modality_id) FROM stdin;
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.memberships (id, player_id, club_id, role) FROM stdin;
\.


--
-- Data for Name: notification_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_subscriptions (id, player_id, type, value, active, created_at) FROM stdin;
\.


--
-- Data for Name: player_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_categories (id, player_id, category_id) FROM stdin;
\.


--
-- Data for Name: player_sport_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_sport_ratings (id, player_id, sport_id, elo, created_at, updated_at) FROM stdin;
1	1	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
2	2	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
3	3	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
4	4	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
5	5	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
6	6	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
7	7	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
8	8	1	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
9	1	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
10	2	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
11	3	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
12	4	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
13	5	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
14	6	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
15	7	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
16	8	2	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
17	1	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
18	2	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
19	3	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
20	4	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
21	5	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
22	6	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
23	7	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
24	8	3	1500	2026-08-12 01:48:20.657623+00	2026-08-12 01:48:20.657623+00
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.players (id, name, nickname, elo, phone, wa_id, wsp_consent, language, club_id, created_at) FROM stdin;
1	Prueba 1	P1	1500	\N	\N	f	es	1	2026-08-05 03:06:38.64153+00
2	P2	P2	1500	\N	\N	f	es	1	2026-08-05 03:07:14.715229+00
3	P3	P3	1500	\N	\N	f	es	1	2026-08-05 03:07:52.89675+00
4	P4	P4	1500	\N	\N	f	es	1	2026-08-05 03:08:31.53733+00
5	P5	P5	1500	\N	\N	f	es	1	2026-08-05 03:09:06.492055+00
6	P6	P6	1500	\N	\N	f	es	1	2026-08-05 03:09:32.147702+00
7	P7	P7	1500	\N	\N	f	es	1	2026-08-05 03:10:05.477476+00
8	P8	P8	1500	\N	\N	f	es	1	2026-08-05 03:10:38.53307+00
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: sport_modalities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sport_modalities (id, sport_id, name, slug, team_size, min_team_size, max_team_size, use_sets, active, created_at) FROM stdin;
1	1	Individual	individual	1	1	1	t	t	2026-08-12 01:48:20.657623+00
2	1	Dobles	dobles	2	2	2	t	t	2026-08-12 01:48:20.657623+00
3	2	Individual	individual	1	1	1	t	t	2026-08-12 01:48:20.657623+00
4	2	Dobles	dobles	2	2	2	t	t	2026-08-12 01:48:20.657623+00
5	3	Fútbol 5	futbol-5	5	5	5	f	t	2026-08-12 01:48:20.657623+00
6	3	Fútbol 7	futbol-7	7	7	7	f	t	2026-08-12 01:48:20.657623+00
7	3	Fútbol 8	futbol-8	8	8	8	f	t	2026-08-12 01:48:20.657623+00
8	3	Fútbol 11	futbol-11	11	11	11	f	t	2026-08-12 01:48:20.657623+00
\.


--
-- Data for Name: sports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sports (id, name, slug, team_size, min_team_size, max_team_size, use_sets, active) FROM stdin;
1	Pádel	padel	2	2	2	t	t
2	Tenis	tenis	1	1	2	t	t
3	Fútbol	futbol	5	4	7	f	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, name, nickname, phone, player_id, is_admin, is_club_admin, club_id, created_at, updated_at) FROM stdin;
155a74f6-0ed2-4ab9-8e44-0b253d203494	JP@JP.CL	\N	\N	\N	JUN PEREZ	JP	00900900099	\N	0	1	1	2026-08-05 03:14:06.881741+00	2026-08-05 03:14:06.881741+00
60741545	mbau73@hotmail.com	Mbau73	\N	\N	\N	\N	\N	\N	1	1	\N	2026-07-30 21:54:54.325409+00	2026-08-11 18:08:07.913+00
\.


--
-- Name: asistencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.asistencia_id_seq', 24, true);


--
-- Name: club_sport_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.club_sport_categories_id_seq', 1, false);


--
-- Name: club_sports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.club_sports_id_seq', 1, true);


--
-- Name: clubs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clubs_id_seq', 1, true);


--
-- Name: cobros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cobros_id_seq', 1, false);


--
-- Name: elo_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.elo_history_id_seq', 1, false);


--
-- Name: encuentros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.encuentros_id_seq', 5, true);


--
-- Name: gasto_participantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gasto_participantes_id_seq', 1, false);


--
-- Name: gastos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gastos_id_seq', 1, false);


--
-- Name: match_players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_players_id_seq', 28, true);


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matches_id_seq', 7, true);


--
-- Name: memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.memberships_id_seq', 1, false);


--
-- Name: notification_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_subscriptions_id_seq', 1, false);


--
-- Name: player_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.player_categories_id_seq', 1, false);


--
-- Name: player_sport_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.player_sport_ratings_id_seq', 24, true);


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.players_id_seq', 8, true);


--
-- Name: sport_modalities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sport_modalities_id_seq', 8, true);


--
-- Name: sports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sports_id_seq', 3, true);


--
-- Name: asistencia asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT asistencia_pkey PRIMARY KEY (id);


--
-- Name: club_sport_categories club_sport_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sport_categories
    ADD CONSTRAINT club_sport_categories_pkey PRIMARY KEY (id);


--
-- Name: club_sports club_sports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sports
    ADD CONSTRAINT club_sports_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_invite_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_invite_code_unique UNIQUE (invite_code);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_slug_unique UNIQUE (slug);


--
-- Name: cobros cobros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_pkey PRIMARY KEY (id);


--
-- Name: elo_history elo_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_pkey PRIMARY KEY (id);


--
-- Name: encuentros encuentros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encuentros
    ADD CONSTRAINT encuentros_pkey PRIMARY KEY (id);


--
-- Name: gasto_participantes gasto_participantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gasto_participantes
    ADD CONSTRAINT gasto_participantes_pkey PRIMARY KEY (id);


--
-- Name: gastos gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: notification_subscriptions notification_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions
    ADD CONSTRAINT notification_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: player_categories player_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_categories
    ADD CONSTRAINT player_categories_pkey PRIMARY KEY (id);


--
-- Name: player_sport_ratings player_sport_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_sport_ratings
    ADD CONSTRAINT player_sport_ratings_pkey PRIMARY KEY (id);


--
-- Name: player_sport_ratings player_sport_ratings_player_id_sport_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_sport_ratings
    ADD CONSTRAINT player_sport_ratings_player_id_sport_id_unique UNIQUE (player_id, sport_id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: sport_modalities sport_modalities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sport_modalities
    ADD CONSTRAINT sport_modalities_pkey PRIMARY KEY (id);


--
-- Name: sport_modalities sport_modalities_sport_id_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sport_modalities
    ADD CONSTRAINT sport_modalities_sport_id_slug_unique UNIQUE (sport_id, slug);


--
-- Name: sports sports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_pkey PRIMARY KEY (id);


--
-- Name: sports sports_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_slug_unique UNIQUE (slug);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: player_sport_ratings_player_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX player_sport_ratings_player_id_idx ON public.player_sport_ratings USING btree (player_id);


--
-- Name: player_sport_ratings_sport_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX player_sport_ratings_sport_id_idx ON public.player_sport_ratings USING btree (sport_id);


--
-- Name: sport_modalities_sport_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sport_modalities_sport_id_idx ON public.sport_modalities USING btree (sport_id);


--
-- Name: asistencia asistencia_encuentro_id_encuentros_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT asistencia_encuentro_id_encuentros_id_fk FOREIGN KEY (encuentro_id) REFERENCES public.encuentros(id) ON DELETE CASCADE;


--
-- Name: asistencia asistencia_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asistencia
    ADD CONSTRAINT asistencia_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: club_sports club_sports_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sports
    ADD CONSTRAINT club_sports_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_sports club_sports_sport_id_sports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_sports
    ADD CONSTRAINT club_sports_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: cobros cobros_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id);


--
-- Name: cobros cobros_encuentro_id_encuentros_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_encuentro_id_encuentros_id_fk FOREIGN KEY (encuentro_id) REFERENCES public.encuentros(id) ON DELETE SET NULL;


--
-- Name: cobros cobros_gasto_id_gastos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_gasto_id_gastos_id_fk FOREIGN KEY (gasto_id) REFERENCES public.gastos(id) ON DELETE SET NULL;


--
-- Name: cobros cobros_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: elo_history elo_history_match_id_matches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_match_id_matches_id_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: elo_history elo_history_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: elo_history elo_history_sport_id_sports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.elo_history
    ADD CONSTRAINT elo_history_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: encuentros encuentros_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encuentros
    ADD CONSTRAINT encuentros_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id);


--
-- Name: encuentros encuentros_sport_id_sports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encuentros
    ADD CONSTRAINT encuentros_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: gasto_participantes gasto_participantes_gasto_id_gastos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gasto_participantes
    ADD CONSTRAINT gasto_participantes_gasto_id_gastos_id_fk FOREIGN KEY (gasto_id) REFERENCES public.gastos(id) ON DELETE CASCADE;


--
-- Name: gasto_participantes gasto_participantes_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gasto_participantes
    ADD CONSTRAINT gasto_participantes_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: gastos gastos_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id);


--
-- Name: gastos gastos_encuentro_id_encuentros_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_encuentro_id_encuentros_id_fk FOREIGN KEY (encuentro_id) REFERENCES public.encuentros(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_match_id_matches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_matches_id_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE RESTRICT;


--
-- Name: matches matches_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: matches matches_encuentro_id_encuentros_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_encuentro_id_encuentros_id_fk FOREIGN KEY (encuentro_id) REFERENCES public.encuentros(id) ON DELETE SET NULL;


--
-- Name: matches matches_modality_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_modality_id_fk FOREIGN KEY (modality_id) REFERENCES public.sport_modalities(id) ON DELETE RESTRICT;


--
-- Name: matches matches_sport_id_sports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: notification_subscriptions notification_subscriptions_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_subscriptions
    ADD CONSTRAINT notification_subscriptions_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_categories player_categories_category_id_club_sport_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_categories
    ADD CONSTRAINT player_categories_category_id_club_sport_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.club_sport_categories(id) ON DELETE CASCADE;


--
-- Name: player_categories player_categories_player_id_players_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_categories
    ADD CONSTRAINT player_categories_player_id_players_id_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_sport_ratings player_sport_ratings_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_sport_ratings
    ADD CONSTRAINT player_sport_ratings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_sport_ratings player_sport_ratings_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_sport_ratings
    ADD CONSTRAINT player_sport_ratings_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: players players_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id);


--
-- Name: sport_modalities sport_modalities_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sport_modalities
    ADD CONSTRAINT sport_modalities_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: users users_club_id_clubs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_club_id_clubs_id_fk FOREIGN KEY (club_id) REFERENCES public.clubs(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fZXOASnqm8BhanQIVcgdrCBMnX5aODHhBls5huva3i5gi3lM5VcPdbwzv6EJk9p

