--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

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
-- Name: campaign_costs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_costs (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    user_id integer NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    reference_month character varying(7) NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes text,
    status character varying(10) DEFAULT 'ATIVO'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    inactivated_at timestamp without time zone,
    inactivated_by integer,
    cnpj_fornecedor character varying(18),
    razao_social character varying(255),
    category_id integer,
    CONSTRAINT campaign_costs_status_check CHECK (((status)::text = ANY ((ARRAY['ATIVO'::character varying, 'INATIVO'::character varying])::text[])))
);


ALTER TABLE public.campaign_costs OWNER TO neondb_owner;

--
-- Name: campaign_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.campaign_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_costs_id_seq OWNER TO neondb_owner;

--
-- Name: campaign_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.campaign_costs_id_seq OWNED BY public.campaign_costs.id;


--
-- Name: campaign_tasks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_tasks (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    task_type_id integer NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaign_tasks OWNER TO neondb_owner;

--
-- Name: campaign_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.campaign_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_tasks_id_seq OWNER TO neondb_owner;

--
-- Name: campaign_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.campaign_tasks_id_seq OWNED BY public.campaign_tasks.id;


--
-- Name: campaign_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaign_users (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaign_users OWNER TO neondb_owner;

--
-- Name: campaign_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.campaign_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_users_id_seq OWNER TO neondb_owner;

--
-- Name: campaign_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.campaign_users_id_seq OWNED BY public.campaign_users.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    contract_start_date date,
    contract_end_date date,
    contract_value numeric(12,2),
    client_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    cost_center_id integer
);


ALTER TABLE public.campaigns OWNER TO neondb_owner;

--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO neondb_owner;

--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    trade_name character varying(255),
    cnpj character varying(18),
    email character varying,
    economic_group_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clients OWNER TO neondb_owner;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO neondb_owner;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: cost_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cost_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cost_categories OWNER TO neondb_owner;

--
-- Name: cost_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.cost_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cost_categories_id_seq OWNER TO neondb_owner;

--
-- Name: cost_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.cost_categories_id_seq OWNED BY public.cost_categories.id;


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cost_centers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cost_centers OWNER TO neondb_owner;

--
-- Name: cost_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.cost_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cost_centers_id_seq OWNER TO neondb_owner;

--
-- Name: cost_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.cost_centers_id_seq OWNED BY public.cost_centers.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.departments OWNER TO neondb_owner;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO neondb_owner;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: economic_groups; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.economic_groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.economic_groups OWNER TO neondb_owner;

--
-- Name: economic_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.economic_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.economic_groups_id_seq OWNER TO neondb_owner;

--
-- Name: economic_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.economic_groups_id_seq OWNED BY public.economic_groups.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_config (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_config OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.system_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_config_id_seq OWNER TO neondb_owner;

--
-- Name: system_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.system_config_id_seq OWNED BY public.system_config.id;


--
-- Name: task_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.task_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3b82f6'::character varying,
    is_billable boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.task_types OWNER TO neondb_owner;

--
-- Name: task_types_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.task_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_types_id_seq OWNER TO neondb_owner;

--
-- Name: task_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.task_types_id_seq OWNED BY public.task_types.id;


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_entries (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date NOT NULL,
    campaign_id integer NOT NULL,
    hours character varying NOT NULL,
    description text,
    status character varying DEFAULT 'DRAFT'::character varying,
    submitted_at timestamp without time zone,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_comment text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    campaign_task_id integer NOT NULL,
    result_center character varying DEFAULT 'Todos'::character varying
);


ALTER TABLE public.time_entries OWNER TO neondb_owner;

--
-- Name: time_entries_backup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_entries_backup (
    id integer,
    user_id integer,
    date date,
    campaign_id integer,
    task_type_id integer,
    hours character varying,
    description text,
    status character varying,
    submitted_at timestamp without time zone,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_comment text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    campaign_task_id integer
);


ALTER TABLE public.time_entries_backup OWNER TO neondb_owner;

--
-- Name: time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_entries_id_seq OWNER TO neondb_owner;

--
-- Name: time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_entries_id_seq OWNED BY public.time_entries.id;


--
-- Name: time_entry_comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_entry_comments (
    id integer NOT NULL,
    time_entry_id integer NOT NULL,
    user_id integer NOT NULL,
    comment text NOT NULL,
    comment_type character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.time_entry_comments OWNER TO neondb_owner;

--
-- Name: time_entry_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_entry_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_entry_comments_id_seq OWNER TO neondb_owner;

--
-- Name: time_entry_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_entry_comments_id_seq OWNED BY public.time_entry_comments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    profile_image_url character varying,
    role character varying DEFAULT 'COLABORADOR'::character varying NOT NULL,
    "position" character varying,
    is_manager boolean DEFAULT false,
    manager_id integer,
    contract_type character varying,
    cost_center character varying,
    department character varying,
    contract_start_date date,
    contract_end_date date,
    contract_value numeric(10,2),
    company_name character varying,
    cnpj character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    cost_center_id integer,
    department_id integer,
    monthly_cost numeric(10,2)
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: campaign_costs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs ALTER COLUMN id SET DEFAULT nextval('public.campaign_costs_id_seq'::regclass);


--
-- Name: campaign_tasks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_tasks ALTER COLUMN id SET DEFAULT nextval('public.campaign_tasks_id_seq'::regclass);


--
-- Name: campaign_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_users ALTER COLUMN id SET DEFAULT nextval('public.campaign_users_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: cost_categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_categories ALTER COLUMN id SET DEFAULT nextval('public.cost_categories_id_seq'::regclass);


--
-- Name: cost_centers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_centers ALTER COLUMN id SET DEFAULT nextval('public.cost_centers_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: economic_groups id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.economic_groups ALTER COLUMN id SET DEFAULT nextval('public.economic_groups_id_seq'::regclass);


--
-- Name: system_config id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config ALTER COLUMN id SET DEFAULT nextval('public.system_config_id_seq'::regclass);


--
-- Name: task_types id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_types ALTER COLUMN id SET DEFAULT nextval('public.task_types_id_seq'::regclass);


--
-- Name: time_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries ALTER COLUMN id SET DEFAULT nextval('public.time_entries_id_seq'::regclass);


--
-- Name: time_entry_comments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entry_comments ALTER COLUMN id SET DEFAULT nextval('public.time_entry_comments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: campaign_costs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaign_costs (id, campaign_id, user_id, subject, description, reference_month, amount, notes, status, created_at, updated_at, inactivated_at, inactivated_by, cnpj_fornecedor, razao_social, category_id) FROM stdin;
2	3	1	Teste de API Backend	Descrição 2	2025-04	200000.00	\N	INATIVO	2025-07-31 20:58:44.097	2025-07-31 22:14:54.497	2025-07-31 22:14:54.497	1	\N	\N	\N
3	2	1	FOTOGRAFO	USO DE FOTOS NO EVENTO	2025-07	24560.00	\N	INATIVO	2025-07-31 22:26:26.671	2025-08-01 15:19:53.446	2025-08-01 15:19:53.446	1	\N	\N	\N
6	2	1	FOTO	SEM DESCRIÇÃO 2	2025-07	12000.00	\N	ATIVO	2025-08-01 15:20:41.185	2025-08-01 15:20:55.03	\N	\N	44556667/0001-34	FAROFA LTDA	1
\.


--
-- Data for Name: campaign_tasks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaign_tasks (id, campaign_id, task_type_id, description, is_active, created_at) FROM stdin;
1	2	1	Criação de criativos para Instagram	t	2025-07-24 23:42:00.897026
4	2	1	Criação de criativos para Youtube	t	2025-07-25 19:57:58.103427
2	3	5	Conversa com o RH	t	2025-07-25 00:23:43.098635
5	3	2	Reunião Interna	t	2025-07-25 21:09:40.97295
3	2	3	Planejamento da campanha	f	2025-07-25 00:24:01.019318
\.


--
-- Data for Name: campaign_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaign_users (id, campaign_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaigns (id, name, description, contract_start_date, contract_end_date, contract_value, client_id, is_active, created_at, cost_center_id) FROM stdin;
3	Interno	Coisas internas	2025-07-01	2025-12-31	\N	3	t	2025-07-25 00:23:27.110553	2
2	Campanha Teste	Descrição	2025-07-01	2025-12-31	25000.00	27	t	2025-07-24 23:26:14.592858	3
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clients (id, company_name, trade_name, cnpj, email, economic_group_id, is_active, created_at) FROM stdin;
5	NIKY INSTITUICAO DE PAGAMENTO SA	NIKY.	11.512.962/0001-46	\N	5	t	2025-08-18 20:24:11.743003
7	ALLP FIT FRANQUEADORA LTDA	ALLP FIT FRANQUEADORA LTDA	51.159.562/0001-13	\N	5	t	2025-08-18 20:24:11.743003
8	ELYTRON SECURITY CONSULTORIA DE TECNOLOGIA S.A.	ELYTRON SECURITY CONSULTORIA DE TECNOLOGIA S.A.	30.763.603/0001-06	\N	5	t	2025-08-18 20:24:11.743003
9	AMOR SAUDE LTDA	AMOR SAUDE	27.602.235/0001-00	\N	5	t	2025-08-18 20:24:11.743003
10	ASSOCIACAO FRANQUEADOS TODOS	ASSOCIACAO FRANQUEADOS TODOS	32.750.571/0001-30	\N	5	t	2025-08-18 20:24:11.743003
11	PROTETOR SAUDE INTERMEDIACAO DE SERVICOS LTDA	PROTETOR SAUDE	39.754.330/0001-08	\N	5	t	2025-08-18 20:24:11.743003
12	MUNDIAL DISTRIBUIDORA DE PRODUTOS DE CONSUMO LTDA	MUNDIAL DISTRIBUIDORA DE PRODUTOS DE CONSUMO LTDA	12.744.404/0002-50	\N	5	t	2025-08-18 20:24:11.743003
13	REFUTURIZA EMPREENDIMENTO EDUCACIONAL S.A	REFUTURIZA	29.490.639/0001-84	\N	5	t	2025-08-18 20:24:11.743003
14	GT7 COMUNICACAO LTDA	GTI	38.448.371/0001-03	\N	5	t	2025-08-18 20:24:11.743003
15	DATA MINES TECNOLOGIA LTDA	DATA MINES TECNOLOGIA LTDA	54.574.343/0001-99	\N	5	t	2025-08-18 20:24:11.743003
16	VISAO INCORPORADORA LTDA	VISAO INCORPORADORA LTDA	44.734.667/0001-93	\N	5	t	2025-08-18 20:24:11.743003
17	ASSOCIACAO BRASILEIRA DE METALURGIA, MATERIAIS E MINERACAO -	ABM	60.998.267/0001-41	\N	5	t	2025-08-18 20:24:11.743003
18	CASTELO ALIMENTOS S/A	CASTELO	07.814.284/0001-07	\N	5	t	2025-08-18 20:24:11.743003
19	FLYTOUR FRANCHISING ASSESSORIA E PARTICIPACOES LTDA	FLYTOUR FRANCHISING ASSESSORIA E PARTICIPACOES LTDA	73.126.732/0001-04	\N	5	t	2025-08-18 20:24:11.743003
20	GLOBO COMUNICACAO E PARTICIPACOES S/A	GLOBOPAR, TV GLOBO, REDE GLOBO E GLOBO.COM	27.865.757/0027-33	\N	5	t	2025-08-18 20:24:11.743003
22	GREENLINE CARBONSAT TECNOLOGIA LTDA	GREENLINE CARBONSAT	50.789.498/0001-91	\N	5	t	2025-08-18 20:24:11.743003
23	GTX SOLUCOES E PARTICIPACOES LTDA	GTX SOLUCOES	33.838.433/0001-70	\N	5	t	2025-08-18 20:24:11.743003
24	ITA BUS PUBLICIDADE LTDA	ITA BUS PUBLICIDADE	05.949.233/0001-59	\N	5	t	2025-08-18 20:24:11.743003
25	TODOS EMPREENDIMENTOS LTDA	CARTAO DE TODOS	04.644.515/0001-85	\N	5	t	2025-08-18 20:24:11.743003
26	PET DE TODOS FRANQUEADORA LTDA	PET DE TODOS	48.942.696/0001-00	\N	5	t	2025-08-18 20:24:11.743003
27	ALIMENTOS ZAELI LTDA	ALIMENTOS ZAELI LTDA	77.917.680/0001-37		5	t	2025-08-18 20:26:44.378799
2	Cliente teste	Teste Ltda	11.222.333/0001-44	eeep@gmail.com	5	f	2025-07-24 23:00:33.506818
3	Gotcha	GTodos	11.222.333/0001-44	ajup@gmail.com	5	t	2025-07-24 23:43:02.183039
\.


--
-- Data for Name: cost_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cost_categories (id, name, is_active, created_at, updated_at) FROM stdin;
1	Feiras e Eventos	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
2	Viagem, Estadia e Refeição - Comercial	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
3	Software e Aplicativos - Comercial	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
4	Serviço de Consultoria Comercial	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
5	Comissões	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
6	Prospecções	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
7	Brindes a Clientes	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
8	Hospedagem Site / Domínio	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
9	Software e Aplicativos - Marketing	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
10	Materiais Impressos e Promocionais	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
11	Publicidade Mídias Digitais	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
12	Serviço de Consultoria de Assessoria Imprensa	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
13	Serviço de Consultoria Marketing	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
14	Material de Uso e Consumo Geral	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
15	Locação de Equipamentos	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
16	Viagem, Estadia e Refeição - Administrativo	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
17	Legais e Cartoriais	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
18	Translado / Taxi / Aplicativo / KM / Park	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
19	Lanches e Refeições	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
20	Bens de Nat. Perm. Deduzidos como Despesas	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
21	Doações	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
22	Impostos e taxas	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
23	Manutenção e Reparos de Equipamento	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
24	Material de Escritório	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
25	Material de Informática	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
26	Material de Copa e Cozinha	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
27	Seguro de Veiculo	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
28	Manutenção de Moveis e Utensílios em Geral	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
29	Ações Endomarketing	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
30	Fundo Fixo	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
31	Serviço de Terceiros Adm	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
32	Serviço de Entregas	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
33	Serviço de Limpeza e Conservação	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
34	Serviço de Segurança e Vigilância	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
35	Serviço de Tradução	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
36	Software e Aplicativos - Adm	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
37	Serviço de Suporte Tecnologia	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
38	Serviço de Consultoria Juridica	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
39	Serviço de Recrutamento e Seleção	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
40	Serviço de Consultoria Contábil/ Fiscal/ DP	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
41	Serviço de Consultoria Adm / Financeira	t	2025-08-01 14:51:14.439445	2025-08-01 14:51:14.439445
\.


--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cost_centers (id, name, code, description, is_active, created_at, updated_at) FROM stdin;
1	GBrasil	GBR	Centro de custos Grupo Brasil	t	2025-07-30 21:18:30.281584	2025-07-30 21:18:30.281584
2	GTodos	GTD	Centro de custos GTodos	t	2025-07-30 21:18:30.281584	2025-07-30 21:18:30.281584
3	PR	PR	Centro de custos PR	t	2025-07-30 21:18:30.281584	2025-07-30 21:25:38.587
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.departments (id, name, description, is_active, created_at, updated_at) FROM stdin;
1	Criação	Departamento de criação e desenvolvimento criativo	t	2025-07-30 21:18:28.993894	2025-07-30 21:18:28.993894
2	Conteúdo	Departamento de produção de conteúdo	t	2025-07-30 21:18:28.993894	2025-07-30 21:18:28.993894
3	Design	Departamento de design gráfico e visual	t	2025-07-30 21:18:28.993894	2025-07-30 21:18:28.993894
4	Mídia	Departamento de mídia paga e performance	t	2025-07-30 21:18:28.993894	2025-07-30 21:18:28.993894
8	PLANEJAMENTO	Departamento de planejamento	t	2025-08-15 22:33:51.789495	2025-08-15 22:33:51.789495
9	PR	Departamento de relações públicas	t	2025-08-15 22:33:51.789495	2025-08-15 22:33:51.789495
11	PRODUCAO	Departamento de produção	t	2025-08-15 22:33:51.789495	2025-08-15 22:33:51.789495
12	SOCIAL	Departamento de social media	t	2025-08-15 22:38:42.304404	2025-08-15 22:38:42.304404
13	MÍDIA	Departamento de mídia	t	2025-08-15 22:38:42.304404	2025-08-15 22:38:42.304404
14	MKT INFLUENCER	Departamento de marketing de influência	t	2025-08-15 22:38:42.304404	2025-08-15 22:38:42.304404
7	CRIACAO	Departamento de criação	f	2025-08-15 22:33:51.789495	2025-08-18 20:13:56.731
6	ATENDIMENTO	Departamento de atendimento ao cliente	f	2025-08-15 22:33:51.789495	2025-08-27 18:51:30.855
10	COMERCIAL	Departamento comercial	f	2025-08-15 22:33:51.789495	2025-08-27 18:51:34.875
\.


--
-- Data for Name: economic_groups; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.economic_groups (id, name, description, created_at) FROM stdin;
5	Não Informado		2025-08-18 20:17:32.514007
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
_d_mJ0k7ZpSOYMzxVDuN7Dw3Uhn26Wun	{"cookie": {"path": "/", "secure": false, "expires": "2025-08-29T19:30:47.447Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 1}}	2025-09-26 13:21:05
EM-ei5qXdJ_HQf6ibjfjBj9n05lfTF6x	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-03T14:32:24.533Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 1}}	2025-09-03 17:12:34
5CeShbXVNpbx3AkSpB92CBZEhWfqH_YZ	{"cookie": {"path": "/", "secure": false, "expires": "2025-10-01T22:36:58.778Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 1}}	2025-10-02 18:38:46
nZPaVjFcW8nrUxfCXnC3uEocpusAQFFP	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-26T19:07:00.840Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 1}}	2025-09-26 20:10:30
6VjuVTqlxXLO37NwBDWz6MaGPs8vEyAZ	{"cookie": {"path": "/", "secure": false, "expires": "2025-08-31T18:48:26.478Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 4}}	2025-09-14 13:32:42
6KQ7kqGF2r-uBZfdAH0jADp8WIaLQ1df	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-14T19:56:15.101Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 1}}	2025-09-24 22:07:07
5YJyTqtZWuZQgwIF7jS0Uot8KHBZBA71	{"cookie": {"path": "/", "secure": false, "expires": "2025-09-14T19:53:35.556Z", "httpOnly": true, "originalMaxAge": 2592000000}, "passport": {"user": 6}}	2025-09-18 19:27:45
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_config (id, key, value, updated_at) FROM stdin;
4	backup_automatico	false	2025-08-01 00:24:23.392
3	notificacao_email	false	2025-08-01 00:24:26.92
1	fechamento_automatico	false	2025-08-01 00:24:44.644
13	last_backup_month	"2025-09"	2025-09-01 22:36:58.76
\.


--
-- Data for Name: task_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.task_types (id, name, description, color, is_billable, is_active, created_at) FROM stdin;
3	Planejamento	Planejamento estratégico	#f59e0b	t	t	2025-07-24 21:08:03.425329
4	Revisão	Revisão de materiais	#ef4444	t	t	2025-07-24 21:08:03.441796
5	Administrativo	Atividades administrativas	#6b7280	f	t	2025-07-24 21:08:03.457522
1	Criação	Desenvolvimento de peças criativas	#3b82f6	t	t	2025-07-24 21:08:03.390582
6	Atendimento	Comunicação com clientes e suporte	#d19fd5	t	t	2025-08-27 18:47:58.499903
2	Reunião Interna	Reuniões com a equipe	#10b981	f	t	2025-07-24 21:08:03.408932
7	Produção	\N	#a8ab0d	t	t	2025-08-27 18:48:57.275188
8	Gestão de Redes Sociais	Agendamento, monitoramento e respostas.	#919fb6	t	t	2025-08-27 18:49:33.882604
9	Treinamentos	\N	#6e455f	t	t	2025-08-27 18:49:43.148666
10	Prospecção	Contato com leads e novos clientes.	#225f21	f	t	2025-08-27 18:50:11.249671
11	Criação de Propostas	\N	#f76a3b	f	t	2025-08-27 18:50:30.387477
12	Pesquisa de Mercado	\N	#781c4d	f	t	2025-08-27 18:50:47.668581
13	Aprovação de Materiais	\N	#99a9c2	t	t	2025-08-27 18:51:05.801761
\.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.time_entries (id, user_id, date, campaign_id, hours, description, status, submitted_at, reviewed_by, reviewed_at, review_comment, created_at, updated_at, campaign_task_id, result_center) FROM stdin;
121	1	2025-09-01	2	1	\N	APROVADO	\N	\N	2025-09-01 22:52:19.206	\N	2025-09-01 22:51:03.509606	2025-09-01 22:52:19.446	4	Todos
\.


--
-- Data for Name: time_entries_backup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.time_entries_backup (id, user_id, date, campaign_id, task_type_id, hours, description, status, submitted_at, reviewed_by, reviewed_at, review_comment, created_at, updated_at, campaign_task_id) FROM stdin;
\.


--
-- Data for Name: time_entry_comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.time_entry_comments (id, time_entry_id, user_id, comment, comment_type, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password, first_name, last_name, profile_image_url, role, "position", is_manager, manager_id, contract_type, cost_center, department, contract_start_date, contract_end_date, contract_value, company_name, cnpj, is_active, created_at, updated_at, cost_center_id, department_id, monthly_cost) FROM stdin;
6	eduardo.marciano@gt7.com.br	$2b$10$kv.IWYZSttOAynT/B9.UieYgVvwKFdLWirkTud3GyTB9IYpbnB23a	Eduardo	Marciano	\N	MASTER	Administrador	t	\N	CLT	\N	\N	\N	\N	\N			t	2025-08-15 13:21:09.601496	2025-08-15 13:21:09.601496	1	2	0.00
2	roberto@cappei.com	$2b$10$wWKPQwwkAp4U7QnVc0hMK.4H1GG0MOBPrgZ6IA20IOOZX08pqSqmu	Roberto	Cappei	\N	COLABORADOR	AVALISTA	f	1	PJ	GTodos	Criação	\N	\N	\N	CAPPEI	11.222.333/0001-44	t	2025-07-24 21:08:03.316673	2025-07-25 00:48:23.533	2	1	15000.00
17	aline.campanha@gotcha.com.br	$2b$10$vjPwdbJcUvmGvh8K5WZkAeFn5K5aOeNmBRGDtkTC97ga/zgjeC6xG	ALINE	CAMPANHA	\N	COLABORADOR	ANALISTA DE RELACÕES PUBLICAS	f	11	PJ	\N	\N	2024-03-04	\N	5000.00	ALINE CRISTINA MARTINS CAMPANHA 47018740860	42.778.039/0001-84	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	9	5000.00
7	carol@gotcha.com.br	$2b$10$1eoIy8hKcWBwpgbii.2J...y9F0boEd94unjpg8FAovmrLtUWpYoa	CAROLINE	EHLKE	\N	GESTOR	HEAD DE ATENDIMENTO	t	\N	PJ	\N	\N	2012-07-23	\N	11000.00	CAROLINE DE ARINS EHLKE	11.127.810/0001-20	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	2	6	11000.00
8	clovis.marchetti@gotcha.com.br	$2b$10$jND6U18xpfMyNM1QXTS.EOjqIqQ.5QaFdwd4CZE1U5gNiMcPkp.8m	CLOVIS	MARCHETTI	\N	GESTOR	DIRETOR DE CRIACAO	t	\N	PJ	\N	\N	2025-02-17	\N	30000.00	MARCHETTI MARKETING LTDA	43.473.369/0001-24	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	7	30000.00
9	daniel.barros@gotcha.com.br	$2b$10$.93a8Ivt7VSMXYv8AziNGuAE3m5DQ4Xci7HkvbsRkMGFT.XDaGA2a	DANIEL	BARROS	\N	GESTOR	HEAD DE PLANEJAMENTO	t	\N	PJ	\N	\N	2023-01-04	\N	25300.00	DANIEL BALDIN BARROS	09.330.030/0001-30	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	8	25300.00
10	danilo@gotcha.com.br	$2b$10$VRIseeqsSY6EIjOtY4xVauk.RmkjvSjdkfphdE6IddsKZlwDwR0we	DANILO	TONELLI	\N	GESTOR	DIRETOR DE MÍDIA ON/OFF	t	\N	PJ	\N	\N	2019-03-07	\N	13000.00	D&B COMERCIAL LTDA	22.901.647/0001-27	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	4	13000.00
11	douglas@gotcha.com.br	$2b$10$7.xgLZYSaYVxTYrv0CfKL.QchX6r8skF9Dde6HsbASqJFkIb2WUk6	DOUGLAS	GALAN	\N	GESTOR	DIRETOR DE RELACÕES PUBLICAS	t	\N	PJ	\N	\N	2020-08-24	\N	15000.00	DOUGLAS VINICIUS GALAN 22349942848	13.435.887/0001-92	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	2	9	15000.00
12	guilherme.cotarelli@gotcha.com.br	$2b$10$V5glGhEpihMYndr5wcQb3..I7KMqruLzXsHOQttO5XAhmp2VHSjsS	GUILHERME	COTARELLI	\N	GESTOR	GERENTE DE PROJETOS	t	\N	PJ	\N	\N	2025-07-17	\N	17000.00	DESING E PROPAGANDA LGC COTARELLI LTDA	55.553.251/0001-95	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	6	17000.00
4	luciano@tractionfy.com	$2b$10$.EcQ5TFOjOoexYKuyO0.9eJ9FkwVx7yQRcG64vntW7jauulqt7sKW	Luciano	Tractionfy	\N	COLABORADOR		f	1	CLT	GBrasil	Criação	\N	\N	\N			t	2025-07-25 00:46:57.28661	2025-07-25 00:46:57.28661	1	1	20000.00
13	lilianmorgado@gotcha.com.br	$2b$10$fN0aN41b2C2.utPCmmbQEeh4YXIhk/FSENSFC584JNkDnNzVvb4gy	LILIAN	MORGADO	\N	GESTOR	DIRETOR DE NOVOS NEGÓCIOS	t	\N	PJ	\N	\N	2019-06-12	\N	15000.00	MORGADO COMUNICACOES LTDA	15.332.928/0001-40	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	10	15000.00
14	regilene@gotcha.com.br	$2b$10$pdeSqDJ91.bAVYZPfsTHieAPg9h15vFlS6PrI6VevlVf10cvwww06	REGILENE	REGIS	\N	GESTOR	HEAD DE PRODUCAO	t	\N	PJ	\N	\N	2021-11-08	\N	9500.00	REGILENE SOARES REGIS	44.354.324/0001-01	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	3	11	9500.00
15	ronaldo.ferreira@gotcha.com.br	$2b$10$gY0mbWCTRXoLplMgz1/rB.3ivQw5tx0EgaNc6NC7YnES4H5c8VWHa	RONALDO	FERREIRA	\N	GESTOR	REDATOR	t	\N	PJ	\N	\N	2025-04-14	\N	25000.00	LITERA ESTUDIO PUBLICIDADE LTDA	54.441.659/0001-02	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	2	7	25000.00
3	ajudavip@gmail.com	$2b$10$FyBXB0eI2GRFN59Us0i4LO4.c6qy1kU1xowN9Ecut1pDri17PEoXy	Danilo	Oliveira	\N	COLABORADOR	Artista	f	1	CLT	GBrasil	Criação	\N	\N	\N			t	2025-07-24 22:44:37.08827	2025-07-24 22:44:37.08827	2	2	14000.00
1	roberto@tractionfy.com	$2b$10$1jTP0GdmvXMiT434UVdIougjRSGZAbvKk1dkfhY.JzG0lefv5izRG	Roberto	Master	\N	MASTER	Diretor Geral	t	\N	PJ	GTodos	Criação	\N	\N	\N	CAPPEI 2	22.710.146/0001-63	t	2025-07-24 21:08:03.292897	2025-07-24 22:43:55.666	1	2	\N
5	fernando@tractionfy.com	$2b$10$PnozWwIdQEqodVWMHGfDwupK/XmJaRap50EuP5.BrjnACvQJhd1QG	Fernando	Matias	\N	COLABORADOR	Anaista	f	1	PJ	GBrasil	Design	\N	\N	\N	TRACTIONFY	11.222.333/0001-44	t	2025-07-30 20:49:31.360424	2025-07-30 20:49:31.360424	1	3	9000.00
16	tali.monterosa@gotcha.com.br	$2b$10$nWT8pHvISCSOv2GmGxCva.rE0lWzogVVmAxG8x56q2UHX1x46mNxC	TALI	ROSA	\N	GESTOR	DIRETOR DE PROJETOS	t	\N	PJ	\N	\N	2025-03-18	\N	23000.00	PEPALANTO MARKETING LTDA	12.439.679/0001-07	t	2025-08-15 22:36:08.480088	2025-08-15 22:36:08.480088	1	8	23000.00
18	caio.biasi@gotcha.com.br	$2b$10$mAt0y7kRJp5VsTeiYYbErOebVxQSRGSYb/s6VHO367NBZm5hRVgci	CAIO	BIASI	\N	COLABORADOR	COORDENADOR PR	f	11	PJ	\N	\N	\N	\N	10000.00	55.109.373 CAIO PORTO BIASI	55.109.373/0001-97	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	9	10000.00
19	camila.fuente@gotcha.com.br	$2b$10$gru.6IIxnelPrR48GTIO/eoeSL0pPdUFqtOewCyilW4U0I9jOYwQa	CAMILA	FUENTE	\N	COLABORADOR	GERENTE DE PROJETOS	f	12	PJ	\N	\N	2025-03-31	\N	12000.00	CAMILA ROA DE LA FUENTE	39.879.527/0001-73	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	6	12000.00
20	camila.piccoli@gotcha.com.br	$2b$10$YShiKpKSSQvCpXa.UJLnVO3brlHbWAdEJ7VB9ciEkLgcyisW5R/7K	CAMILA	PICCOLI	\N	COLABORADOR	FREELANCER	f	8	PJ	\N	\N	\N	\N	6000.00	CAMILA PICCOLI 35779456801	28.241.729/0001-79	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	7	6000.00
21	christiane.moura@gotcha.com.br	$2b$10$CaUsSEytZmtc2c0S54IEHeIXld9tgogzqYosSC7leekvH3/3yxtkO	CHRISTIANE	MOURA	\N	COLABORADOR	ANALISTA DE MÍDIA	f	10	PJ	\N	\N	2022-09-20	\N	5500.00	CHRISTIANE CRUZ DE MOURA 14667405821	40.722.748/0001-12	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	13	5500.00
22	diego.amaral@gotcha.com.br	$2b$10$QUzc2dT5xiMlo00dqlK3jOv7OyEeXs.gX19KP80b3ppWiQf5NlQX.	DIEGO	AMARAL	\N	COLABORADOR	ARTE FINALISTA	f	15	PJ	\N	\N	2021-11-24	\N	7000.00	D/AMARAL LTDA	54.147.317/0001-84	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	7	7000.00
23	eduardo.menezes@gotcha.com.br	$2b$10$hTWYiPS8OgGdeFaUi5gf3.8LVDIrZv9nGcc61.5IGVA/Kq.SDTxIy	EDUARDO	MENEZES	\N	COLABORADOR	DIRETOR DE ARTE	f	8	PJ	\N	\N	2024-06-24	\N	13000.00	EDUARDO CUNHA DE MENEZES PUBLICIDADE	14.750.093/0001-86	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	7	13000.00
24	eduardo.duarte@gotcha.com.br	$2b$10$uwH4a9HNfjR6ORbgjiUH4.OTodvSOO/cZhfjzYiufeX23wErazJVa	EDUARDO	DUARTE	\N	COLABORADOR	DIRETOR DE ARTE	f	37	PJ	\N	\N	2022-11-07	\N	4000.00	46.308.843 EDUARDO SILVA DUARTE	46.308.843/0001-50	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	12	4000.00
26	gisleine@gotcha.com.br	$2b$10$wHMISJbAHGKzkFecjAUUaOBrj6uWkpVOp/MF9eLjrV4aAIShaDEh2	GISLEINE	DURIGAN	\N	COLABORADOR	HEAD DE RELACÕES PUBLICAS	f	11	PJ	\N	\N	2020-09-17	\N	12000.00	GISLEINE DE FATIMA DURIGAN 21868837831	32.196.843/0001-00	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	9	12000.00
27	gustavoborges@gotcha.com.br	$2b$10$6XF/Yp1iNTriBvFmkN10VOkla2wmNukYKaXioots7vrYFwIjNf0L2	GUSTAVO	BORGES	\N	COLABORADOR	REDATOR	f	15	PJ	\N	\N	2024-07-29	\N	7500.00	GUSTAVO BRANDAO BORGES	12.156.497/0001-10	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	7	7500.00
28	gustavo.oliveira@gotcha.com.br	$2b$10$8aZG4COgDe6W3UV2L7V5V.NL3uq4NxT1.Xqo8VdQGEETzcwGtk9KS	GUSTAVO	OLIVEIRA	\N	COLABORADOR	ANALISTA DE MARKTING DE INFLUÊNCIA	f	37	PJ	\N	\N	2025-07-15	\N	5000.00	53.797.057 GUSTAVO CRUZ DE OLIVEIRA	53.797.057/0001-20	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	14	5000.00
29	jessica.ortiz@gotcha.com.br	$2b$10$WouKLWoPn6Aepyn77C9HNeKACgkNz1RJQTmVb2x5gBmrrhsDereuy	JESSICA	ORTIZ	\N	COLABORADOR	DIRETOR DE ARTE	f	37	PJ	\N	\N	2021-12-01	\N	4000.00	JESSICA CAROLINE BERTOLINA SANTOS ORTIZ 13324245702	37.770.230/0001-40	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	12	4000.00
30	joao.martinez@gotcha.com.br	$2b$10$YV3iHaDr4rcZlIQH2C55VeEtdgjS9NcGNubY3izE0zO8rBktTj1Zu	JOAO	MARTINEZ	\N	COLABORADOR	ANALISTA DE RELACÕES PUBLICAS JR	f	11	PJ	\N	\N	2025-07-15	\N	4000.00	61.297.981 JOAO PEDRO VAZ MARTINEZ	61.297.981/0001-75	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	9	4000.00
31	juliana.pinheiro@gotcha.com.br	$2b$10$/kmjencx35dWQnWN6ABnBO5rElhlX8MGRyXdD2DQDqcH7cF2cOM3.	JULIANA	WANDERLEY	\N	COLABORADOR	COMMUNITY MANAGER	f	37	PJ	\N	\N	2025-02-18	\N	5000.00	47.090.132 JULIANA PINHEIRO WANDERLEY	47.090.132/0001-15	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	12	5000.00
25	milia.guimaraes@gotcha.com.br	$2b$10$FJwRut1aWwctppoNA8cTMuEaensiG.PBBsYP7QzTDOrsgH7FRF6ou	EMILIA	GUIMARAES	\N	COLABORADOR	ANALISTA REL PUBLICAS PL	f	11	PJ	\N	\N	\N	\N	5000.00	EMILIA GOUVEIA GUIMARAES 13925312684	46.993.274/0001-20	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	9	5000.00
32	laysa.padilha@gotcha.com.br	$2b$10$vmOJEI.eEU/zIcWYiAptcuekLsq1P1rdBld3Y2FmSoNr7F01OE9sO	LAYSA	OLIVEIRA	\N	COLABORADOR	COORDENADOR DE SOCIAL	f	37	PJ	\N	\N	2023-05-08	\N	5000.00	50.539.437 LAYSA PADILHA DE SOUZA OLIVEIRA	50.539.437/0001-76	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	12	5000.00
33	lucas.ribeiro@gotcha.com.br	$2b$10$g2xOdNNnzENDCiVCA63NDO.Rqu8CWMWzEfFsQweAfdN0m0EXkEFFi	LUCAS	RIBEIRO	\N	COLABORADOR	MOTION DESIGN	f	37	PJ	\N	\N	2023-01-23	\N	7500.00	LUCAS DIONIZIO ALVES RIBEIRO 46250452826	30.626.296/0001-11	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	12	7500.00
35	marcos.silva@gotcha.com.br	$2b$10$MC24FXFzMhleQr1UK2OtKeho0QidqIa.JpO0UgQ1EN.sdUIcn4lNm	MARCOS	SILVA	\N	COLABORADOR	ANALISTA DADOS	f	10	PJ	\N	\N	\N	\N	6500.00	61.603.532 MARCOS JOSE DA SILVA	61.603.532/0001-08	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	13	6500.00
36	marcos.visolli@gotcha.com.br	$2b$10$NV3gGwsEtcDqTRzhRugj.On/cOL2HVzjpsbocA6wnVOxjUFK5hXru	MARCOS	VISOLLI	\N	COLABORADOR	DIRETOR DE ARTE	f	37	PJ	\N	\N	2022-09-12	\N	5400.00	MARCOS VINICIUS FERREIRA VISOLLI	44.496.419/0001-51	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	12	5400.00
37	margareth.furtado@gotcha.com.br	$2b$10$cFheU/8feIcW6u1TWbUFBeHeQixo16kZPyjytvXHe1BT4w.wl9GXm	MARGARETH	FURTADO	\N	COLABORADOR	HEAD DE SOCIAL	t	37	PJ	\N	\N	2022-08-15	\N	17000.00	16.981.546 MARGARETH DE VASCONCELLOS DE OLIVEIRA FURTADO	16.981.546/0001-00	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	12	17000.00
38	matheus.lima@gotcha.com.br	$2b$10$l9R5NhRalgPhs44x57YkwukU/sA/zK8sk.kNKDM0jLegpV3e290FC	MATHEUS	LIMA	\N	COLABORADOR	ANALISTA REL PUBLICAS PL	f	11	PJ	\N	\N	\N	\N	5000.00	61.476.703 MATHEUS AUGUSTO MULLER DE LIMA	61.476.703/0001-85	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	9	5000.00
39	mauro.villas@gotcha.com.br	$2b$10$p425B9CD514LrRRJP.mg5u/oR8VEL7wCMq237.LiIaRUqabE/UkQS	MAURO	BOAS	\N	COLABORADOR	DIRETOR DE ARTE	f	15	PJ	\N	\N	2025-04-22	\N	20000.00	MAURO VILLAS BOAS	17.237.445/0001-92	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	7	20000.00
41	nayara.silva@gotcha.com.br	$2b$10$aMrFWnsfYQV/8vZvEbkJEO6ozyN/MtqRZvCRnHKXzqPdn0qk6BXkC	NAYARA	SILVA	\N	COLABORADOR	ANALISTA DE RELACÕES PUBLICAS	f	11	PJ	\N	\N	2023-02-13	\N	6000.00	NAYARA CAMPOS DA SILVA 46512028880	39.919.806/0001-13	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	3	9	6000.00
42	paula.chande@gotcha.com.br	$2b$10$k0YgzZjUwxiFxt6g1CI9m.4In3HMU7/S2bTq5duEAaNT/5Hq2lP5K	PAULA	CHANDE	\N	COLABORADOR	REDATOR	f	8	PJ	\N	\N	\N	\N	8000.00	PALAVRA CERTA COMUNICACAO LTDA	06.922.957/0001-71	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	7	8000.00
44	roberta.fonseca@gotcha.com.br	$2b$10$ff.hdMnXat.SS7BvoXQlTOdwDOS/LpoLrEhrxhGUCkOZYWEURM8.m	ROBERTA	FONSECA	\N	COLABORADOR	CM/REDATOR JR	f	37	PJ	\N	\N	2024-01-02	\N	4000.00	53.188.960 ROBERTA COSTA BALMANTE FONSECA	53.188.960/0001-93	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	12	4000.00
45	thabata.feltrin@gotcha.com.br	$2b$10$UIrUacpBfiU7ijcnzM.eIeikOm.0ueClmxWu9wkev/zfGejXaWZB2	THABATA	FELTRIN	\N	COLABORADOR	GERENTE DE PROJETOS	f	7	PJ	\N	\N	2024-04-24	\N	6500.00	THABATA PEREIRA FELTRIN 42931461806	40.053.885/0001-01	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	6	6500.00
46	vanessa.fonseca@gotcha.com.br	$2b$10$nGKmnFEVL4K8B9C5ETUxK.wNKI3gG.V9D5jN8Yw5A4UyYeG1sYMOW	VANESSA	FONSECA	\N	COLABORADOR	FREELANCER	f	9	PJ	\N	\N	\N	\N	10000.00	57.452.075 VANESSA MARCONDES FONSECA	57.452.075/0001-20	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	8	10000.00
34	manuela.lessa@gotcha.com.br	$2b$10$Jm1SyIGP5da1i1F9Mg4Bbu3eRsVlxzsRWVz1FYhfXqk4ERyEuV6VS	MANUELA	GUEDES	\N	COLABORADOR	FREELANCER	f	10	PJ	\N	\N	\N	\N	4000.00	32.294.392 MANUELA ANDRADE LESSA DA SILVEIRA GUEDES	32.294.392/0001-35	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	13	4000.00
40	nataly.barros@gotcha.com.br	$2b$10$ZNHtsyZ3cDlD3cNXzZjSj.I.oOBNuaVLjOGLaqSj98bdNtLThFoDW	NATALY	BARROS	\N	COLABORADOR	GERENTE DE PROJETOS	f	7	PJ	\N	\N	\N	\N	6000.00	61.390.709 NATALY DA SILVA BARROS	39.919.806/0001-13	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	2	6	6000.00
43	renan.lima@gotcha.com.br	$2b$10$CqkOei0PVU7.eV6YCQlYzeN.cnn1lgI1XirUEzKOaTv48fonXkus6	RENAN	LIMA	\N	COLABORADOR	FREELANCER	f	10	PJ	\N	\N	\N	\N	1550.00	RENAN PEREIRA LIMA	41.422.788/0001-01	t	2025-08-15 22:41:59.948157	2025-08-15 22:41:59.948157	1	13	1550.00
\.


--
-- Name: campaign_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.campaign_costs_id_seq', 7, true);


--
-- Name: campaign_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.campaign_tasks_id_seq', 7, true);


--
-- Name: campaign_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.campaign_users_id_seq', 13, true);


--
-- Name: campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.campaigns_id_seq', 4, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clients_id_seq', 27, true);


--
-- Name: cost_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.cost_categories_id_seq', 41, true);


--
-- Name: cost_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.cost_centers_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.departments_id_seq', 14, true);


--
-- Name: economic_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.economic_groups_id_seq', 5, true);


--
-- Name: system_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.system_config_id_seq', 13, true);


--
-- Name: task_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.task_types_id_seq', 13, true);


--
-- Name: time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.time_entries_id_seq', 121, true);


--
-- Name: time_entry_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.time_entry_comments_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 46, true);


--
-- Name: campaign_costs campaign_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs
    ADD CONSTRAINT campaign_costs_pkey PRIMARY KEY (id);


--
-- Name: campaign_tasks campaign_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_tasks
    ADD CONSTRAINT campaign_tasks_pkey PRIMARY KEY (id);


--
-- Name: campaign_users campaign_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_users
    ADD CONSTRAINT campaign_users_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: cost_categories cost_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_name_key UNIQUE (name);


--
-- Name: cost_categories cost_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_categories
    ADD CONSTRAINT cost_categories_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_code_key UNIQUE (code);


--
-- Name: cost_centers cost_centers_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_name_key UNIQUE (name);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: economic_groups economic_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.economic_groups
    ADD CONSTRAINT economic_groups_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: system_config system_config_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_key_unique UNIQUE (key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: task_types task_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.task_types
    ADD CONSTRAINT task_types_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: time_entry_comments time_entry_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entry_comments
    ADD CONSTRAINT time_entry_comments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_campaign_costs_campaign; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_campaign_costs_campaign ON public.campaign_costs USING btree (campaign_id);


--
-- Name: idx_campaign_costs_category; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_campaign_costs_category ON public.campaign_costs USING btree (category_id);


--
-- Name: idx_campaign_costs_month; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_campaign_costs_month ON public.campaign_costs USING btree (reference_month);


--
-- Name: idx_campaign_costs_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_campaign_costs_status ON public.campaign_costs USING btree (status);


--
-- Name: idx_campaign_costs_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_campaign_costs_user ON public.campaign_costs USING btree (user_id);


--
-- Name: idx_time_entry_comments_created; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_time_entry_comments_created ON public.time_entry_comments USING btree (created_at);


--
-- Name: idx_time_entry_comments_entry; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_time_entry_comments_entry ON public.time_entry_comments USING btree (time_entry_id);


--
-- Name: idx_time_entry_comments_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_time_entry_comments_user ON public.time_entry_comments USING btree (user_id);


--
-- Name: campaign_costs campaign_costs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs
    ADD CONSTRAINT campaign_costs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: campaign_costs campaign_costs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs
    ADD CONSTRAINT campaign_costs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.cost_categories(id);


--
-- Name: campaign_costs campaign_costs_inactivated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs
    ADD CONSTRAINT campaign_costs_inactivated_by_fkey FOREIGN KEY (inactivated_by) REFERENCES public.users(id);


--
-- Name: campaign_costs campaign_costs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_costs
    ADD CONSTRAINT campaign_costs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: campaign_tasks campaign_tasks_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_tasks
    ADD CONSTRAINT campaign_tasks_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: campaign_tasks campaign_tasks_task_type_id_task_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_tasks
    ADD CONSTRAINT campaign_tasks_task_type_id_task_types_id_fk FOREIGN KEY (task_type_id) REFERENCES public.task_types(id);


--
-- Name: campaign_users campaign_users_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_users
    ADD CONSTRAINT campaign_users_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: campaign_users campaign_users_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaign_users
    ADD CONSTRAINT campaign_users_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: campaigns campaigns_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: campaigns campaigns_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: clients clients_economic_group_id_economic_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_economic_group_id_economic_groups_id_fk FOREIGN KEY (economic_group_id) REFERENCES public.economic_groups(id);


--
-- Name: time_entries time_entries_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: time_entries time_entries_campaign_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_campaign_task_id_fkey FOREIGN KEY (campaign_task_id) REFERENCES public.campaign_tasks(id);


--
-- Name: time_entries time_entries_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: time_entries time_entries_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: time_entry_comments time_entry_comments_time_entry_id_time_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entry_comments
    ADD CONSTRAINT time_entry_comments_time_entry_id_time_entries_id_fk FOREIGN KEY (time_entry_id) REFERENCES public.time_entries(id);


--
-- Name: time_entry_comments time_entry_comments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_entry_comments
    ADD CONSTRAINT time_entry_comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

