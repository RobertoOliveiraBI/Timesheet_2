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

