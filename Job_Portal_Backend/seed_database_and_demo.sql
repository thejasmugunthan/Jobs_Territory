-- =============================================================================
-- JOBS TERRITORY - POSTGRESQL COMPLETE SCHEMA & DEMO DATA SEED SCRIPT
-- Compatible with PostgreSQL 13, 14, 15, 16, 17+ (Render, Supabase, Neon, AWS RDS)
-- Credentials Created:
--   1. demo@123      (Password: demo@123)
--   2. demo@123.com  (Password: demo@123)
--   3. candidate@jobsterritory.com (Password: Password123!)
-- =============================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure schema columns exist across evolving tables
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS full_name VARCHAR(160) DEFAULT 'Candidate';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'candidate';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(12) DEFAULT 'system';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_job_alerts BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
UPDATE users SET full_name = 'Candidate' WHERE full_name IS NULL OR full_name = '';
ALTER TABLE IF EXISTS candidate_profiles ADD COLUMN IF NOT EXISTS recruiter_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS candidate_profiles ADD COLUMN IF NOT EXISTS resume_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS candidate_profiles ADD COLUMN IF NOT EXISTS contact_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS candidate_profiles ADD COLUMN IF NOT EXISTS profile_initialized BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS candidate_preferences ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS job_alerts ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255);
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS resume_storage_path VARCHAR(500);
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS resume_content_type VARCHAR(100);
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS resume_size_bytes INTEGER;
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS resume_sha256 VARCHAR(64);
ALTER TABLE IF EXISTS applications ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMP WITH TIME ZONE;

-- 3. Create all tables if they do not exist
CREATE TABLE IF NOT EXISTS companies (
	id UUID NOT NULL, 
	name VARCHAR(180) NOT NULL, 
	logo_url VARCHAR(500), 
	description TEXT, 
	website_url VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS skills (
	id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	category VARCHAR(40) NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_skills_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS users (
	id UUID NOT NULL, 
	full_name VARCHAR(160) NOT NULL, 
	email VARCHAR(320) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	is_deleted BOOLEAN NOT NULL, 
	theme_preference VARCHAR(12) DEFAULT 'system' NOT NULL, 
	email_job_alerts BOOLEAN DEFAULT 'true' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	refresh_token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	last_used_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (refresh_token_hash)
);

CREATE TABLE IF NOT EXISTS candidate_preferences (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	preferred_job_titles JSONB NOT NULL, 
	preferred_locations JSONB NOT NULL, 
	preferred_employment_types JSONB NOT NULL, 
	preferred_work_modes JSONB NOT NULL, 
	minimum_expected_salary NUMERIC(12, 2), 
	maximum_expected_salary NUMERIC(12, 2), 
	salary_currency VARCHAR(3), 
	preferred_experience_level VARCHAR(40), 
	willing_to_relocate BOOLEAN DEFAULT 'false' NOT NULL, 
	available_to_join VARCHAR(80), 
	preferred_industries JSONB NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_preferences_min_salary_nonnegative CHECK (minimum_expected_salary IS NULL OR minimum_expected_salary >= 0), 
	CONSTRAINT ck_preferences_max_salary_nonnegative CHECK (maximum_expected_salary IS NULL OR maximum_expected_salary >= 0), 
	CONSTRAINT ck_preferences_salary_range CHECK (minimum_expected_salary IS NULL OR maximum_expected_salary IS NULL OR minimum_expected_salary <= maximum_expected_salary), 
	UNIQUE (candidate_id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	full_name VARCHAR(160) NOT NULL, 
	profile_initialized BOOLEAN DEFAULT 'false' NOT NULL, 
	phone_number VARCHAR(20), 
	profile_headline VARCHAR(180), 
	professional_summary TEXT, 
	current_location VARCHAR(180), 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	linkedin_url VARCHAR(500), 
	github_url VARCHAR(500), 
	portfolio_url VARCHAR(500), 
	total_experience INTEGER, 
	current_employment_status VARCHAR(40), 
	recruiter_visible BOOLEAN DEFAULT 'true' NOT NULL, 
	resume_visible BOOLEAN DEFAULT 'false' NOT NULL, 
	contact_visible BOOLEAN DEFAULT 'false' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_candidate_profile_experience_nonnegative CHECK (total_experience IS NULL OR total_experience >= 0), 
	CONSTRAINT ck_candidate_profile_employment_status CHECK (current_employment_status IS NULL OR current_employment_status IN ('employed','unemployed','student','self-employed','other')), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_skills (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	skill_id UUID NOT NULL, 
	proficiency_level VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_candidate_skill UNIQUE (candidate_id, skill_id), 
	CONSTRAINT ck_candidate_skill_proficiency CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert')), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(skill_id) REFERENCES skills (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS certifications (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	certification_name VARCHAR(180) NOT NULL, 
	issuing_organization VARCHAR(180) NOT NULL, 
	issue_date DATE NOT NULL, 
	expiration_date DATE, 
	credential_id VARCHAR(120), 
	credential_url VARCHAR(500), 
	does_not_expire BOOLEAN DEFAULT 'false' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_certifications_date_range CHECK (expiration_date IS NULL OR expiration_date >= issue_date), 
	CONSTRAINT ck_certifications_no_expiration CHECK (NOT does_not_expire OR expiration_date IS NULL), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS education (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	institution_name VARCHAR(180) NOT NULL, 
	degree VARCHAR(120) NOT NULL, 
	field_of_study VARCHAR(160), 
	start_date DATE NOT NULL, 
	end_date DATE, 
	is_currently_studying BOOLEAN DEFAULT 'false' NOT NULL, 
	grade VARCHAR(40), 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_education_date_range CHECK (end_date IS NULL OR end_date >= start_date), 
	CONSTRAINT ck_education_current_has_no_end CHECK (NOT is_currently_studying OR end_date IS NULL), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_alerts (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	titles JSONB NOT NULL, 
	skills JSONB NOT NULL, 
	locations JSONB NOT NULL, 
	employment_types JSONB NOT NULL, 
	work_modes JSONB NOT NULL, 
	minimum_experience INTEGER, 
	experience_level VARCHAR(40), 
	minimum_salary INTEGER, 
	maximum_salary INTEGER, 
	salary_currency VARCHAR(3), 
	frequency VARCHAR(12) DEFAULT 'daily' NOT NULL, 
	is_active BOOLEAN DEFAULT 'true' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
	id UUID NOT NULL, 
	company_id UUID NOT NULL, 
	title VARCHAR(180) NOT NULL, 
	description TEXT NOT NULL, 
	description_summary VARCHAR(500), 
	responsibilities JSONB NOT NULL, 
	required_qualifications JSONB NOT NULL, 
	preferred_qualifications JSONB NOT NULL, 
	benefits JSONB NOT NULL, 
	location VARCHAR(180), 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	employment_type VARCHAR(20) NOT NULL, 
	work_mode VARCHAR(20), 
	minimum_experience NUMERIC(5, 2), 
	maximum_experience NUMERIC(5, 2), 
	minimum_salary NUMERIC(14, 2), 
	maximum_salary NUMERIC(14, 2), 
	currency VARCHAR(3), 
	openings INTEGER DEFAULT '1' NOT NULL, 
	application_deadline DATE, 
	status VARCHAR(20) DEFAULT 'draft' NOT NULL, 
	is_deleted BOOLEAN DEFAULT 'false' NOT NULL, 
	posted_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_jobs_status CHECK (status IN ('draft','published','closed','expired')), 
	CONSTRAINT ck_jobs_employment_type CHECK (employment_type IN ('full_time','part_time','internship','contract','freelance')), 
	CONSTRAINT ck_jobs_work_mode CHECK (work_mode IS NULL OR work_mode IN ('remote','hybrid','on_site')), 
	CONSTRAINT ck_jobs_min_experience_nonnegative CHECK (minimum_experience IS NULL OR minimum_experience >= 0), 
	CONSTRAINT ck_jobs_max_experience_nonnegative CHECK (maximum_experience IS NULL OR maximum_experience >= 0), 
	CONSTRAINT ck_jobs_experience_range CHECK (minimum_experience IS NULL OR maximum_experience IS NULL OR minimum_experience <= maximum_experience), 
	CONSTRAINT ck_jobs_minimum_salary_nonnegative CHECK (minimum_salary IS NULL OR minimum_salary >= 0), 
	CONSTRAINT ck_jobs_maximum_salary_nonnegative CHECK (maximum_salary IS NULL OR maximum_salary >= 0), 
	CONSTRAINT ck_jobs_salary_range CHECK (minimum_salary IS NULL OR maximum_salary IS NULL OR minimum_salary <= maximum_salary), 
	CONSTRAINT ck_jobs_openings_nonnegative CHECK (openings >= 0), 
	FOREIGN KEY(company_id) REFERENCES companies (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	used_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (token_hash)
);

CREATE TABLE IF NOT EXISTS projects (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	project_name VARCHAR(180) NOT NULL, 
	description TEXT, 
	technologies_used JSONB NOT NULL, 
	project_url VARCHAR(500), 
	repository_url VARCHAR(500), 
	start_date DATE, 
	end_date DATE, 
	is_ongoing BOOLEAN DEFAULT 'false' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_projects_date_range CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date), 
	CONSTRAINT ck_projects_ongoing_has_no_end CHECK (NOT is_ongoing OR end_date IS NULL), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	original_filename VARCHAR(255) NOT NULL, 
	storage_path VARCHAR(500) NOT NULL, 
	file_size INTEGER NOT NULL, 
	mime_type VARCHAR(100) NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	processing_status VARCHAR(30) DEFAULT 'uploaded' NOT NULL, 
	is_current BOOLEAN DEFAULT 'true' NOT NULL, 
	uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	UNIQUE (storage_path)
);

CREATE TABLE IF NOT EXISTS support_requests (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	subject VARCHAR(160) NOT NULL, 
	category VARCHAR(40) NOT NULL, 
	description TEXT NOT NULL, 
	status VARCHAR(20) DEFAULT 'received' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_experience (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	company_name VARCHAR(180) NOT NULL, 
	job_title VARCHAR(160) NOT NULL, 
	employment_type VARCHAR(30) NOT NULL, 
	location VARCHAR(180), 
	start_date DATE NOT NULL, 
	end_date DATE, 
	currently_working BOOLEAN DEFAULT 'false' NOT NULL, 
	description TEXT, 
	responsibilities JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_experience_date_range CHECK (end_date IS NULL OR end_date >= start_date), 
	CONSTRAINT ck_experience_current_has_no_end CHECK (NOT currently_working OR end_date IS NULL), 
	CONSTRAINT ck_experience_employment_type CHECK (employment_type IN ('full-time','part-time','internship','contract','freelance')), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	job_id UUID NOT NULL, 
	status VARCHAR(30) DEFAULT 'applied' NOT NULL, 
	cover_letter TEXT, 
	resume_storage_path VARCHAR(500), 
	resume_filename VARCHAR(255), 
	resume_content_type VARCHAR(100), 
	resume_size_bytes INTEGER, 
	resume_sha256 VARCHAR(64), 
	applied_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	last_status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_applications_candidate_job UNIQUE (candidate_id, job_id), 
	CONSTRAINT ck_applications_status CHECK (status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')), 
	CONSTRAINT ck_applications_resume_size_positive CHECK (resume_size_bytes IS NULL OR resume_size_bytes > 0), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS job_match_cache (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	job_id UUID NOT NULL, 
	input_hash VARCHAR(64) NOT NULL, 
	result JSONB NOT NULL, 
	computed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_job_match_cache_candidate_job UNIQUE (candidate_id, job_id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_skills (
	job_id UUID NOT NULL, 
	skill_id UUID NOT NULL, 
	is_required BOOLEAN DEFAULT 'true' NOT NULL, 
	PRIMARY KEY (job_id, skill_id), 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(skill_id) REFERENCES skills (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS recently_viewed_jobs (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	job_id UUID NOT NULL, 
	viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	view_count INTEGER DEFAULT '1' NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_recently_viewed_candidate_job UNIQUE (candidate_id, job_id), 
	CONSTRAINT ck_recently_viewed_positive_count CHECK (view_count >= 1), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resume_analyses (
	id UUID NOT NULL, 
	resume_id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	version INTEGER NOT NULL, 
	extracted_text_hash VARCHAR(64), 
	skills JSONB NOT NULL, 
	education JSONB NOT NULL, 
	experience JSONB NOT NULL, 
	projects JSONB NOT NULL, 
	certifications JSONB NOT NULL, 
	extraction_metadata JSONB NOT NULL, 
	processing_status VARCHAR(30) NOT NULL, 
	analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_resume_analysis_version UNIQUE (resume_id, version), 
	FOREIGN KEY(resume_id) REFERENCES resumes (id) ON DELETE CASCADE, 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_jobs (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	job_id UUID NOT NULL, 
	saved_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_saved_jobs_candidate_job UNIQUE (candidate_id, job_id), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_status_history (
	id UUID NOT NULL, 
	application_id UUID NOT NULL, 
	previous_status VARCHAR(30), 
	new_status VARCHAR(30) NOT NULL, 
	changed_by UUID, 
	description VARCHAR(240), 
	changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_application_history_new_status CHECK (new_status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')), 
	CONSTRAINT ck_application_history_previous_status CHECK (previous_status IS NULL OR previous_status IN ('applied','under_review','shortlisted','interview_scheduled','selected','rejected','withdrawn')), 
	FOREIGN KEY(application_id) REFERENCES applications (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
	id UUID NOT NULL, 
	candidate_id UUID NOT NULL, 
	notification_type VARCHAR(40) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	message VARCHAR(500) NOT NULL, 
	job_id UUID, 
	application_id UUID, 
	deduplication_key VARCHAR(180) NOT NULL, 
	is_read BOOLEAN DEFAULT 'false' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_notifications_candidate_dedupe UNIQUE (candidate_id, deduplication_key), 
	FOREIGN KEY(candidate_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(job_id) REFERENCES jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(application_id) REFERENCES applications (id) ON DELETE CASCADE
);


-- 4. Seed Companies
INSERT INTO companies (id, name, logo_url, description, website_url, created_at)
VALUES ('c0000000-0000-0000-0000-000000000001', 'Jobs Territory Labs', 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128', 'Premier recruitment and high-impact tech solutions company.', 'https://jobsterritory.com', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url;
INSERT INTO companies (id, name, logo_url, description, website_url, created_at)
VALUES ('c0000000-0000-0000-0000-000000000002', 'CloudScale Systems', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=128', 'Next-gen distributed cloud infrastructure and microservices.', 'https://cloudscale.example.com', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url;
INSERT INTO companies (id, name, logo_url, description, website_url, created_at)
VALUES ('c0000000-0000-0000-0000-000000000003', 'Apex AI Solutions', 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=128', 'Enterprise agentic AI models and intelligent automations.', 'https://apexai.example.com', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url;
INSERT INTO companies (id, name, logo_url, description, website_url, created_at)
VALUES ('c0000000-0000-0000-0000-000000000004', 'FinVantage Capital', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128', 'Leading modern fintech building real-time payment rails.', 'https://finvantage.example.com', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url;

-- 5. Seed Skills
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000001', 'React', 'Frontend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000002', 'TypeScript', 'Frontend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000003', 'Python', 'Backend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000004', 'FastAPI', 'Backend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000005', 'PostgreSQL', 'Database')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000006', 'Docker', 'DevOps')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000007', 'Tailwind CSS', 'Frontend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000008', 'Redis', 'Database')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000009', 'AWS', 'Cloud')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000010', 'GraphQL', 'Backend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000011', 'Next.js', 'Frontend')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;
INSERT INTO skills (id, name, category)
VALUES ('s0000000-0000-0000-0000-000000000012', 'Kubernetes', 'DevOps')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;

-- 6. Seed Published Jobs
INSERT INTO jobs (id, company_id, title, description, description_summary, responsibilities, required_qualifications, preferred_qualifications, benefits, location, city, state, country, employment_type, work_mode, minimum_experience, maximum_experience, minimum_salary, maximum_salary, currency, openings, application_deadline, status, is_deleted, posted_at, created_at, updated_at)
VALUES ('j0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Senior Full Stack Engineer', 'Join Jobs Territory Labs to lead full-stack product development for high-scale talent acquisition and analytics platforms.', 'Join Jobs Territory Labs to lead full-stack product development for high-scale talent acquisition and analytics platform', 'Collaborate with cross-functional engineering teams and build scalable architectures.', '5+ years experience', 'Bachelor CS or equivalent', 'Medical insurance, PTO', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'India', 'full_time', 'hybrid', 5, 9, 1800000, 2800000, 'INR', 2, NOW() + INTERVAL '30 days', 'published', false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, minimum_salary = EXCLUDED.minimum_salary, maximum_salary = EXCLUDED.maximum_salary;
INSERT INTO jobs (id, company_id, title, description, description_summary, responsibilities, required_qualifications, preferred_qualifications, benefits, location, city, state, country, employment_type, work_mode, minimum_experience, maximum_experience, minimum_salary, maximum_salary, currency, openings, application_deadline, status, is_deleted, posted_at, created_at, updated_at)
VALUES ('j0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Lead Frontend Architect', 'Architect reusable design systems and performant user experiences across our core candidate-facing products.', 'Architect reusable design systems and performant user experiences across our core candidate-facing products.', 'Collaborate with cross-functional engineering teams and build scalable architectures.', '5+ years experience', 'Bachelor CS or equivalent', 'Medical insurance, PTO', 'Remote / Bengaluru', 'Bengaluru', 'Karnataka', 'India', 'full_time', 'remote', 6, 10, 2400000, 3500000, 'INR', 1, NOW() + INTERVAL '30 days', 'published', false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, minimum_salary = EXCLUDED.minimum_salary, maximum_salary = EXCLUDED.maximum_salary;
INSERT INTO jobs (id, company_id, title, description, description_summary, responsibilities, required_qualifications, preferred_qualifications, benefits, location, city, state, country, employment_type, work_mode, minimum_experience, maximum_experience, minimum_salary, maximum_salary, currency, openings, application_deadline, status, is_deleted, posted_at, created_at, updated_at)
VALUES ('j0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Cloud Infrastructure & Backend Engineer', 'Design and scale containerized backend services, automated CI/CD pipelines, and multi-region database replication.', 'Design and scale containerized backend services, automated CI/CD pipelines, and multi-region database replication.', 'Collaborate with cross-functional engineering teams and build scalable architectures.', '5+ years experience', 'Bachelor CS or equivalent', 'Medical insurance, PTO', 'Hyderabad, Telangana', 'Hyderabad', 'Telangana', 'India', 'full_time', 'remote', 4, 8, 1600000, 2500000, 'INR', 3, NOW() + INTERVAL '30 days', 'published', false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, minimum_salary = EXCLUDED.minimum_salary, maximum_salary = EXCLUDED.maximum_salary;
INSERT INTO jobs (id, company_id, title, description, description_summary, responsibilities, required_qualifications, preferred_qualifications, benefits, location, city, state, country, employment_type, work_mode, minimum_experience, maximum_experience, minimum_salary, maximum_salary, currency, openings, application_deadline, status, is_deleted, posted_at, created_at, updated_at)
VALUES ('j0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'AI Platform & Python Engineer', 'Build high-throughput inference APIs and data pipelines connecting modern LLM foundations with candidate matching.', 'Build high-throughput inference APIs and data pipelines connecting modern LLM foundations with candidate matching.', 'Collaborate with cross-functional engineering teams and build scalable architectures.', '5+ years experience', 'Bachelor CS or equivalent', 'Medical insurance, PTO', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'India', 'full_time', 'hybrid', 4, 8, 2200000, 3200000, 'INR', 2, NOW() + INTERVAL '30 days', 'published', false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, minimum_salary = EXCLUDED.minimum_salary, maximum_salary = EXCLUDED.maximum_salary;
INSERT INTO jobs (id, company_id, title, description, description_summary, responsibilities, required_qualifications, preferred_qualifications, benefits, location, city, state, country, employment_type, work_mode, minimum_experience, maximum_experience, minimum_salary, maximum_salary, currency, openings, application_deadline, status, is_deleted, posted_at, created_at, updated_at)
VALUES ('j0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'Senior Fintech Backend Engineer', 'Engineer secure, fault-tolerant financial settlement services and ledger systems for enterprise clients.', 'Engineer secure, fault-tolerant financial settlement services and ledger systems for enterprise clients.', 'Collaborate with cross-functional engineering teams and build scalable architectures.', '5+ years experience', 'Bachelor CS or equivalent', 'Medical insurance, PTO', 'Mumbai, Maharashtra', 'Mumbai', 'Maharashtra', 'India', 'full_time', 'on_site', 5, 9, 1900000, 2900000, 'INR', 1, NOW() + INTERVAL '30 days', 'published', false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, minimum_salary = EXCLUDED.minimum_salary, maximum_salary = EXCLUDED.maximum_salary;

-- 7. Seed Job Skills
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000003', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000007', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000003', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000009', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000003', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000004', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000008', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000003', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;
INSERT INTO job_skills (job_id, skill_id, is_required)
VALUES ('j0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000005', true)
ON CONFLICT (job_id, skill_id) DO NOTHING;

-- 8. Seed Demo Accounts (demo@123, demo@123.com, candidate@jobsterritory.com)
INSERT INTO users (id, full_name, email, password_hash, role, is_active, is_deleted, theme_preference, email_job_alerts, created_at)
VALUES ('u0000000-0000-0000-0000-000000000001', 'Alex Sharma', 'demo@123', '$argon2id$v=19$m=65536,t=3,p=4$LiucTdwhpfsjhzHmL1Jxqg$kDhAO4g17JBE8/ZmrvCBN1JEPEx87KOStzw7ObCkqxA', 'candidate', true, false, 'system', true, NOW() - INTERVAL '90 days')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, is_deleted = false;
INSERT INTO users (id, full_name, email, password_hash, role, is_active, is_deleted, theme_preference, email_job_alerts, created_at)
VALUES ('u0000000-0000-0000-0000-000000000002', 'Alex Sharma', 'demo@123.com', '$argon2id$v=19$m=65536,t=3,p=4$LiucTdwhpfsjhzHmL1Jxqg$kDhAO4g17JBE8/ZmrvCBN1JEPEx87KOStzw7ObCkqxA', 'candidate', true, false, 'system', true, NOW() - INTERVAL '90 days')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, is_deleted = false;
INSERT INTO users (id, full_name, email, password_hash, role, is_active, is_deleted, theme_preference, email_job_alerts, created_at)
VALUES ('u0000000-0000-0000-0000-000000000003', 'Alex Taylor', 'candidate@jobsterritory.com', '$argon2id$v=19$m=65536,t=3,p=4$Dp/P2dF+DGvLmnf3ZWAQEg$UFotRlxx50SMHaTd3FJqsE6OpxO8eCjd9QsrRu7D/s0', 'candidate', true, false, 'system', true, NOW() - INTERVAL '90 days')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true, is_deleted = false;

-- Candidate Profile for u0000000-0000-0000-0000-000000000001
INSERT INTO candidate_profiles (id, user_id, full_name, profile_initialized, phone_number, profile_headline, professional_summary, current_location, city, state, country, linkedin_url, github_url, portfolio_url, total_experience, current_employment_status, recruiter_visible, resume_visible, contact_visible, created_at, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Alex Sharma', true, '+91 98765 43210', 'Senior Full Stack & Cloud Solutions Engineer', 'Passionate Full Stack Engineer with 6+ years of expertise in building enterprise web platforms, scalable REST APIs, microservices, and AI-driven applications using React, TypeScript, Python, FastAPI, and PostgreSQL.', 'Bengaluru, Karnataka, India', 'Bengaluru', 'Karnataka', 'India', 'https://linkedin.com/in/alex-sharma-tech', 'https://github.com/alex-sharma-dev', 'https://alexsharma.dev', 6, 'employed', true, true, true, NOW() - INTERVAL '90 days', NOW())
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, profile_headline = EXCLUDED.profile_headline, profile_initialized = true;

-- Preferences in INR
INSERT INTO candidate_preferences (id, candidate_id, preferred_job_titles, preferred_locations, preferred_employment_types, preferred_work_modes, minimum_expected_salary, maximum_expected_salary, salary_currency, preferred_experience_level, willing_to_relocate, available_to_join, preferred_industries, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', '["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer", "AI Platform Engineer", "Cloud Architect"]'::jsonb, '["Bengaluru, Karnataka", "Remote", "Hyderabad, Telangana", "Mumbai, Maharashtra"]'::jsonb, '["full_time"]'::jsonb, '["remote", "hybrid"]'::jsonb, 2000000, 3200000, 'INR', 'senior', true, 'Immediate (15 days notice)', '["Information Technology", "Fintech", "Artificial Intelligence & Analytics"]'::jsonb, NOW())
ON CONFLICT (candidate_id) DO UPDATE SET minimum_expected_salary = 2000000, maximum_expected_salary = 3200000, salary_currency = 'INR';

-- Work Experiences
DELETE FROM work_experience WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO work_experience (id, candidate_id, company_name, job_title, employment_type, location, start_date, end_date, currently_working, description, responsibilities, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Jobs Territory Labs', 'Senior Software Engineer', 'full-time', 'Bengaluru, Karnataka', '2023-01-15', NULL, true, 'Leading modern candidate matching engine and full-stack web features.', '["Architected reactive candidate dashboard and AI match analysis using React and Tailwind CSS", "Optimized high-volume REST endpoints in FastAPI with sub-80ms response times", "Mentored 4 software engineers on TypeScript, code quality, and testing"]'::jsonb, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'CloudScale Systems', 'Full Stack Engineer', 'full-time', 'Hyderabad, Telangana', '2021-01-10', '2022-12-31', false, 'Engineered scalable cloud services and interactive web portals.', '["Developed distributed event processors and background worker queues in Python", "Built accessible UI component libraries in React and TypeScript", "Containerized microservices using Docker and automated CI/CD workflows"]'::jsonb, NOW() - INTERVAL '4 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'RazorPay Technologies', 'Junior Software Engineer', 'full-time', 'Bengaluru, Karnataka', '2019-07-01', '2020-12-20', false, 'Contributed to core payment integration APIs and checkout SDKs.', '["Maintained RESTful checkout microservices with 99.99% uptime", "Implemented secure webhook verification and retry policies in Python"]'::jsonb, NOW() - INTERVAL '6 years', NOW());

-- Education
DELETE FROM education WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO education (id, candidate_id, institution_name, degree, field_of_study, start_date, end_date, is_currently_studying, grade, description, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'National Institute of Technology (NIT) Karnataka', 'Bachelor of Technology (B.Tech)', 'Computer Science & Engineering', '2015-08-01', '2019-05-30', false, '8.9 / 10 CGPA', 'Graduated with Distinction. Coursework in Distributed Systems, Algorithms, Cloud Computing, and DBMS.', NOW() - INTERVAL '6 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Indian Institute of Science (IISc)', 'Post-Graduate Certification', 'Cloud Architecture & Artificial Intelligence', '2021-06-01', '2022-03-15', false, 'A+ Grade', 'Advanced studies in scalable machine learning deployments and distributed systems.', NOW() - INTERVAL '3 years', NOW());

-- Candidate Skills
DELETE FROM candidate_skills WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO candidate_skills (id, candidate_id, skill_id, proficiency_level)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000003', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000004', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000005', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000006', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000007', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000008', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000009', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000011', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000012', 'advanced');

-- Projects
DELETE FROM projects WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO projects (id, candidate_id, project_name, description, technologies_used, project_url, repository_url, start_date, end_date, is_ongoing, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Smart Candidate Career Portal & Analytics', 'Comprehensive candidate job hunting ecosystem featuring AI match metrics, real-time stage tracking, and interactive salary insights.', '["React", "TypeScript", "FastAPI", "PostgreSQL", "Tailwind CSS"]'::jsonb, 'https://jobsterritory.com', 'https://github.com/thejasmugunthan/Jobs_Territory', '2024-01-01', NULL, true, NOW() - INTERVAL '1 year', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'High-Concurrency Real-time Settlement Ledger', 'Financial transaction engine supporting idempotent ledger writes, optimistic locking, and zero-loss reconciliations.', '["Python", "FastAPI", "Redis", "PostgreSQL", "Docker"]'::jsonb, 'https://ledger.demo.jobsterritory.com', 'https://github.com/alex-sharma-dev/settlement-ledger', '2022-03-01', '2023-02-28', false, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'AI Resume Parser & Skills Matcher', 'Deep NLP extraction pipeline for PDF resumes that categorizes technical proficiencies and predicts hiring match score.', '["Python", "spaCy", "FastAPI", "Docker", "PyMuPDF"]'::jsonb, 'https://ai-resume.jobsterritory.com', 'https://github.com/alex-sharma-dev/resume-nlp-matcher', '2023-04-01', '2023-11-30', false, NOW() - INTERVAL '2 years', NOW());

-- Certifications
DELETE FROM certifications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO certifications (id, candidate_id, certification_name, issuing_organization, issue_date, expiration_date, credential_id, credential_url, does_not_expire, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'AWS Certified Solutions Architect - Associate', 'Amazon Web Services (AWS)', '2023-04-15', '2026-04-15', 'AWS-ARCH-8849102', 'https://aws.amazon.com/verification', false, NOW() - INTERVAL '1 year', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Professional Scrum Master I (PSM I)', 'Scrum.org', '2022-08-20', NULL, 'PSM-991823', 'https://scrum.org/certificates/991823', true, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Certified Kubernetes Administrator (CKA)', 'Cloud Native Computing Foundation (CNCF)', '2023-10-05', '2026-10-05', 'CKA-294812', 'https://www.cncf.io/certification/cka/', false, NOW() - INTERVAL '1 year', NOW());

-- Resume & Resume Analysis
DELETE FROM resume_analyses WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
DELETE FROM resumes WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO resumes (id, candidate_id, original_filename, storage_path, file_size, mime_type, sha256, processing_status, is_current, uploaded_at)
VALUES ('r0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 245800, 'application/pdf', 'a9f8b4c3e2d10000000000000000000000000000000000000000000000000001', 'analyzed', true, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resume_analyses (id, resume_id, candidate_id, version, extracted_text_hash, skills, education, experience, projects, certifications, extraction_metadata, processing_status, analyzed_at)
VALUES (gen_random_uuid(), 'r0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 1, 'hash123', '[{"name": "React", "category": "Frontend", "confidence": 0.96}, {"name": "TypeScript", "category": "Frontend", "confidence": 0.94}, {"name": "Python", "category": "Backend", "confidence": 0.95}, {"name": "FastAPI", "category": "Backend", "confidence": 0.92}, {"name": "PostgreSQL", "category": "Database", "confidence": 0.90}, {"name": "Docker", "category": "DevOps", "confidence": 0.88}, {"name": "Tailwind CSS", "category": "Frontend", "confidence": 0.95}, {"name": "AWS", "category": "Cloud", "confidence": 0.85}]'::jsonb, '[{"institution": "National Institute of Technology (NIT) Karnataka", "degree": "Bachelor of Technology (B.Tech)", "year": "2019"}]'::jsonb, '[{"title": "Senior Software Engineer", "company": "Jobs Territory Labs", "duration": "2023 - Present"}, {"title": "Full Stack Engineer", "company": "CloudScale Systems", "duration": "2021 - 2022"}]'::jsonb, '[{"name": "Smart Candidate Career Portal & Analytics", "role": "Lead Architect"}]'::jsonb, '[{"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services"}]'::jsonb, '{"overall_score": 92, "summary_strength": 90, "experience_strength": 95, "skill_strength": 94, "education_strength": 90, "suggestions": ["Highlight cloud cost reduction metrics achieved during architectural refactoring.", "Include open-source repository contributions to demonstrate community impact.", "Detail experience with Kubernetes orchestration to strengthen Cloud Architect profile."]}'::jsonb, 'completed', NOW() - INTERVAL '10 days');

-- Applications & Stage Progression History
DELETE FROM application_status_history WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001');
DELETE FROM applications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';

INSERT INTO applications (id, candidate_id, job_id, status, cover_letter, resume_storage_path, resume_filename, resume_content_type, resume_size_bytes, applied_at, last_status_changed_at, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000011', 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000001', 'selected', 'Dear Hiring Team, I am excited to apply for Senior Full Stack Engineer. My 6+ years of expertise in TypeScript, React, and Python make me an ideal contributor.', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours'),
('a0000000-0000-0000-0000-000000000021', 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000002', 'interview_scheduled', 'Dear Hiring Team, I am excited to apply for Lead Frontend Architect.', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
('a0000000-0000-0000-0000-000000000031', 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000003', 'shortlisted', 'Dear Hiring Team, I am excited to apply for Cloud Infrastructure & Backend Engineer.', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days'),
('a0000000-0000-0000-0000-000000000041', 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000004', 'under_review', 'Dear Hiring Team, I am excited to apply for AI Platform & Python Engineer.', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days'),
('a0000000-0000-0000-0000-000000000051', 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000005', 'applied', 'Dear Hiring Team, I am excited to apply for Senior Fintech Backend Engineer.', 'resumes/u0000000-0000-0000-0000-000000000001/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

INSERT INTO application_status_history (id, application_id, previous_status, new_status, changed_by, description, changed_at)
VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'applied', 'under_review', NULL, 'Application moved to review', NOW() - INTERVAL '14 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'under_review', 'shortlisted', NULL, 'Candidate shortlisted', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'shortlisted', 'interview_scheduled', NULL, 'Final interview conducted', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000011', 'interview_scheduled', 'selected', NULL, 'Offer letter released to candidate', NOW() - INTERVAL '6 hours');

-- Saved Jobs (3 bookmarks)
DELETE FROM saved_jobs WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO saved_jobs (id, candidate_id, job_id, saved_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days');

-- Recently Viewed Jobs (4 records)
DELETE FROM recently_viewed_jobs WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO recently_viewed_jobs (id, candidate_id, job_id, viewed_at, view_count)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 hour', 5),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours', 3),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '8 hours', 2),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day', 1);

-- Job Alert
DELETE FROM job_alerts WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO job_alerts (id, candidate_id, name, titles, skills, locations, employment_types, work_modes, minimum_experience, experience_level, minimum_salary, maximum_salary, salary_currency, frequency, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'Senior Engineering Roles (Bengaluru / Remote)', '["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer"]'::jsonb, '["React", "TypeScript", "Python", "FastAPI"]'::jsonb, '["Bengaluru, Karnataka", "Remote"]'::jsonb, '["full_time"]'::jsonb, '["remote", "hybrid"]'::jsonb, 4, 'senior', 2000000, 3200000, 'INR', 'daily', true, NOW() - INTERVAL '30 days', NOW());

-- Notifications (5 items with various categories)
DELETE FROM notifications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000001';
INSERT INTO notifications (id, candidate_id, notification_type, title, message, job_id, deduplication_key, is_read, created_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'selected', 'Congratulations! Offer Received', 'Jobs Territory Labs has extended an offer for the Lead Frontend Architect position. Review your offer details.', 'j0000000-0000-0000-0000-000000000001', 'offer_rec_u0000000-0000-0000-0000-000000000001_1', false, NOW() - INTERVAL '2 hours'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'interview_scheduled', 'Interview Scheduled: Technical Architecture Round', 'Your video interview with CloudScale Systems is scheduled for Friday at 2:30 PM IST.', 'j0000000-0000-0000-0000-000000000002', 'interview_sch_u0000000-0000-0000-0000-000000000001_2', false, NOW() - INTERVAL '14 hours'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'shortlisted', 'Application Shortlisted!', 'Your application for Senior Full Stack Engineer has been shortlisted by the engineering hiring team.', 'j0000000-0000-0000-0000-000000000003', 'shortlist_u0000000-0000-0000-0000-000000000001_3', true, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'alert_match', '3 New Jobs Match Your Alert', 'New positions matching ''Senior Engineering Roles'' in Bengaluru have been published today.', NULL, 'alert_match_u0000000-0000-0000-0000-000000000001_4', true, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000001', 'application_status', 'Application Submitted Successfully', 'Your profile and resume were forwarded to FinVantage Capital for Senior Fintech Backend Engineer.', 'j0000000-0000-0000-0000-000000000004', 'app_sub_u0000000-0000-0000-0000-000000000001_5', true, NOW() - INTERVAL '3 days');


-- Candidate Profile for u0000000-0000-0000-0000-000000000002
INSERT INTO candidate_profiles (id, user_id, full_name, profile_initialized, phone_number, profile_headline, professional_summary, current_location, city, state, country, linkedin_url, github_url, portfolio_url, total_experience, current_employment_status, recruiter_visible, resume_visible, contact_visible, created_at, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Alex Sharma', true, '+91 98765 43210', 'Senior Full Stack & Cloud Solutions Engineer', 'Passionate Full Stack Engineer with 6+ years of expertise in building enterprise web platforms, scalable REST APIs, microservices, and AI-driven applications using React, TypeScript, Python, FastAPI, and PostgreSQL.', 'Bengaluru, Karnataka, India', 'Bengaluru', 'Karnataka', 'India', 'https://linkedin.com/in/alex-sharma-tech', 'https://github.com/alex-sharma-dev', 'https://alexsharma.dev', 6, 'employed', true, true, true, NOW() - INTERVAL '90 days', NOW())
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, profile_headline = EXCLUDED.profile_headline, profile_initialized = true;

-- Preferences in INR
INSERT INTO candidate_preferences (id, candidate_id, preferred_job_titles, preferred_locations, preferred_employment_types, preferred_work_modes, minimum_expected_salary, maximum_expected_salary, salary_currency, preferred_experience_level, willing_to_relocate, available_to_join, preferred_industries, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', '["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer", "AI Platform Engineer", "Cloud Architect"]'::jsonb, '["Bengaluru, Karnataka", "Remote", "Hyderabad, Telangana", "Mumbai, Maharashtra"]'::jsonb, '["full_time"]'::jsonb, '["remote", "hybrid"]'::jsonb, 2000000, 3200000, 'INR', 'senior', true, 'Immediate (15 days notice)', '["Information Technology", "Fintech", "Artificial Intelligence & Analytics"]'::jsonb, NOW())
ON CONFLICT (candidate_id) DO UPDATE SET minimum_expected_salary = 2000000, maximum_expected_salary = 3200000, salary_currency = 'INR';

-- Work Experiences
DELETE FROM work_experience WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO work_experience (id, candidate_id, company_name, job_title, employment_type, location, start_date, end_date, currently_working, description, responsibilities, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Jobs Territory Labs', 'Senior Software Engineer', 'full-time', 'Bengaluru, Karnataka', '2023-01-15', NULL, true, 'Leading modern candidate matching engine and full-stack web features.', '["Architected reactive candidate dashboard and AI match analysis using React and Tailwind CSS", "Optimized high-volume REST endpoints in FastAPI with sub-80ms response times", "Mentored 4 software engineers on TypeScript, code quality, and testing"]'::jsonb, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'CloudScale Systems', 'Full Stack Engineer', 'full-time', 'Hyderabad, Telangana', '2021-01-10', '2022-12-31', false, 'Engineered scalable cloud services and interactive web portals.', '["Developed distributed event processors and background worker queues in Python", "Built accessible UI component libraries in React and TypeScript", "Containerized microservices using Docker and automated CI/CD workflows"]'::jsonb, NOW() - INTERVAL '4 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'RazorPay Technologies', 'Junior Software Engineer', 'full-time', 'Bengaluru, Karnataka', '2019-07-01', '2020-12-20', false, 'Contributed to core payment integration APIs and checkout SDKs.', '["Maintained RESTful checkout microservices with 99.99% uptime", "Implemented secure webhook verification and retry policies in Python"]'::jsonb, NOW() - INTERVAL '6 years', NOW());

-- Education
DELETE FROM education WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO education (id, candidate_id, institution_name, degree, field_of_study, start_date, end_date, is_currently_studying, grade, description, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'National Institute of Technology (NIT) Karnataka', 'Bachelor of Technology (B.Tech)', 'Computer Science & Engineering', '2015-08-01', '2019-05-30', false, '8.9 / 10 CGPA', 'Graduated with Distinction. Coursework in Distributed Systems, Algorithms, Cloud Computing, and DBMS.', NOW() - INTERVAL '6 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Indian Institute of Science (IISc)', 'Post-Graduate Certification', 'Cloud Architecture & Artificial Intelligence', '2021-06-01', '2022-03-15', false, 'A+ Grade', 'Advanced studies in scalable machine learning deployments and distributed systems.', NOW() - INTERVAL '3 years', NOW());

-- Candidate Skills
DELETE FROM candidate_skills WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO candidate_skills (id, candidate_id, skill_id, proficiency_level)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000003', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000004', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000005', 'expert'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000006', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000007', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000008', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000009', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000010', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000011', 'advanced'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000012', 'advanced');

-- Projects
DELETE FROM projects WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO projects (id, candidate_id, project_name, description, technologies_used, project_url, repository_url, start_date, end_date, is_ongoing, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Smart Candidate Career Portal & Analytics', 'Comprehensive candidate job hunting ecosystem featuring AI match metrics, real-time stage tracking, and interactive salary insights.', '["React", "TypeScript", "FastAPI", "PostgreSQL", "Tailwind CSS"]'::jsonb, 'https://jobsterritory.com', 'https://github.com/thejasmugunthan/Jobs_Territory', '2024-01-01', NULL, true, NOW() - INTERVAL '1 year', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'High-Concurrency Real-time Settlement Ledger', 'Financial transaction engine supporting idempotent ledger writes, optimistic locking, and zero-loss reconciliations.', '["Python", "FastAPI", "Redis", "PostgreSQL", "Docker"]'::jsonb, 'https://ledger.demo.jobsterritory.com', 'https://github.com/alex-sharma-dev/settlement-ledger', '2022-03-01', '2023-02-28', false, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'AI Resume Parser & Skills Matcher', 'Deep NLP extraction pipeline for PDF resumes that categorizes technical proficiencies and predicts hiring match score.', '["Python", "spaCy", "FastAPI", "Docker", "PyMuPDF"]'::jsonb, 'https://ai-resume.jobsterritory.com', 'https://github.com/alex-sharma-dev/resume-nlp-matcher', '2023-04-01', '2023-11-30', false, NOW() - INTERVAL '2 years', NOW());

-- Certifications
DELETE FROM certifications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO certifications (id, candidate_id, certification_name, issuing_organization, issue_date, expiration_date, credential_id, credential_url, does_not_expire, created_at, updated_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'AWS Certified Solutions Architect - Associate', 'Amazon Web Services (AWS)', '2023-04-15', '2026-04-15', 'AWS-ARCH-8849102', 'https://aws.amazon.com/verification', false, NOW() - INTERVAL '1 year', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Professional Scrum Master I (PSM I)', 'Scrum.org', '2022-08-20', NULL, 'PSM-991823', 'https://scrum.org/certificates/991823', true, NOW() - INTERVAL '2 years', NOW()),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Certified Kubernetes Administrator (CKA)', 'Cloud Native Computing Foundation (CNCF)', '2023-10-05', '2026-10-05', 'CKA-294812', 'https://www.cncf.io/certification/cka/', false, NOW() - INTERVAL '1 year', NOW());

-- Resume & Resume Analysis
DELETE FROM resume_analyses WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
DELETE FROM resumes WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO resumes (id, candidate_id, original_filename, storage_path, file_size, mime_type, sha256, processing_status, is_current, uploaded_at)
VALUES ('r0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 245800, 'application/pdf', 'a9f8b4c3e2d10000000000000000000000000000000000000000000000000001', 'analyzed', true, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resume_analyses (id, resume_id, candidate_id, version, extracted_text_hash, skills, education, experience, projects, certifications, extraction_metadata, processing_status, analyzed_at)
VALUES (gen_random_uuid(), 'r0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 1, 'hash123', '[{"name": "React", "category": "Frontend", "confidence": 0.96}, {"name": "TypeScript", "category": "Frontend", "confidence": 0.94}, {"name": "Python", "category": "Backend", "confidence": 0.95}, {"name": "FastAPI", "category": "Backend", "confidence": 0.92}, {"name": "PostgreSQL", "category": "Database", "confidence": 0.90}, {"name": "Docker", "category": "DevOps", "confidence": 0.88}, {"name": "Tailwind CSS", "category": "Frontend", "confidence": 0.95}, {"name": "AWS", "category": "Cloud", "confidence": 0.85}]'::jsonb, '[{"institution": "National Institute of Technology (NIT) Karnataka", "degree": "Bachelor of Technology (B.Tech)", "year": "2019"}]'::jsonb, '[{"title": "Senior Software Engineer", "company": "Jobs Territory Labs", "duration": "2023 - Present"}, {"title": "Full Stack Engineer", "company": "CloudScale Systems", "duration": "2021 - 2022"}]'::jsonb, '[{"name": "Smart Candidate Career Portal & Analytics", "role": "Lead Architect"}]'::jsonb, '[{"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services"}]'::jsonb, '{"overall_score": 92, "summary_strength": 90, "experience_strength": 95, "skill_strength": 94, "education_strength": 90, "suggestions": ["Highlight cloud cost reduction metrics achieved during architectural refactoring.", "Include open-source repository contributions to demonstrate community impact.", "Detail experience with Kubernetes orchestration to strengthen Cloud Architect profile."]}'::jsonb, 'completed', NOW() - INTERVAL '10 days');

-- Applications & Stage Progression History
DELETE FROM application_status_history WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002');
DELETE FROM applications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';

INSERT INTO applications (id, candidate_id, job_id, status, cover_letter, resume_storage_path, resume_filename, resume_content_type, resume_size_bytes, applied_at, last_status_changed_at, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000012', 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000001', 'selected', 'Dear Hiring Team, I am excited to apply for Senior Full Stack Engineer. My 6+ years of expertise in TypeScript, React, and Python make me an ideal contributor.', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours'),
('a0000000-0000-0000-0000-000000000022', 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000002', 'interview_scheduled', 'Dear Hiring Team, I am excited to apply for Lead Frontend Architect.', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
('a0000000-0000-0000-0000-000000000032', 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000003', 'shortlisted', 'Dear Hiring Team, I am excited to apply for Cloud Infrastructure & Backend Engineer.', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days'),
('a0000000-0000-0000-0000-000000000042', 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000004', 'under_review', 'Dear Hiring Team, I am excited to apply for AI Platform & Python Engineer.', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days'),
('a0000000-0000-0000-0000-000000000052', 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000005', 'applied', 'Dear Hiring Team, I am excited to apply for Senior Fintech Backend Engineer.', 'resumes/u0000000-0000-0000-0000-000000000002/Alex_Sharma_Resume.pdf', 'Alex_Sharma_Senior_FullStack_Resume.pdf', 'application/pdf', 245800, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

INSERT INTO application_status_history (id, application_id, previous_status, new_status, changed_by, description, changed_at)
VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'applied', 'under_review', NULL, 'Application moved to review', NOW() - INTERVAL '14 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'under_review', 'shortlisted', NULL, 'Candidate shortlisted', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'shortlisted', 'interview_scheduled', NULL, 'Final interview conducted', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000012', 'interview_scheduled', 'selected', NULL, 'Offer letter released to candidate', NOW() - INTERVAL '6 hours');

-- Saved Jobs (3 bookmarks)
DELETE FROM saved_jobs WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO saved_jobs (id, candidate_id, job_id, saved_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '6 days');

-- Recently Viewed Jobs (4 records)
DELETE FROM recently_viewed_jobs WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO recently_viewed_jobs (id, candidate_id, job_id, viewed_at, view_count)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 hour', 5),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours', 3),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '8 hours', 2),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'j0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day', 1);

-- Job Alert
DELETE FROM job_alerts WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO job_alerts (id, candidate_id, name, titles, skills, locations, employment_types, work_modes, minimum_experience, experience_level, minimum_salary, maximum_salary, salary_currency, frequency, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'Senior Engineering Roles (Bengaluru / Remote)', '["Senior Full Stack Engineer", "Lead Frontend Architect", "Python Backend Developer"]'::jsonb, '["React", "TypeScript", "Python", "FastAPI"]'::jsonb, '["Bengaluru, Karnataka", "Remote"]'::jsonb, '["full_time"]'::jsonb, '["remote", "hybrid"]'::jsonb, 4, 'senior', 2000000, 3200000, 'INR', 'daily', true, NOW() - INTERVAL '30 days', NOW());

-- Notifications (5 items with various categories)
DELETE FROM notifications WHERE candidate_id = 'u0000000-0000-0000-0000-000000000002';
INSERT INTO notifications (id, candidate_id, notification_type, title, message, job_id, deduplication_key, is_read, created_at)
VALUES
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'selected', 'Congratulations! Offer Received', 'Jobs Territory Labs has extended an offer for the Lead Frontend Architect position. Review your offer details.', 'j0000000-0000-0000-0000-000000000001', 'offer_rec_u0000000-0000-0000-0000-000000000002_1', false, NOW() - INTERVAL '2 hours'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'interview_scheduled', 'Interview Scheduled: Technical Architecture Round', 'Your video interview with CloudScale Systems is scheduled for Friday at 2:30 PM IST.', 'j0000000-0000-0000-0000-000000000002', 'interview_sch_u0000000-0000-0000-0000-000000000002_2', false, NOW() - INTERVAL '14 hours'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'shortlisted', 'Application Shortlisted!', 'Your application for Senior Full Stack Engineer has been shortlisted by the engineering hiring team.', 'j0000000-0000-0000-0000-000000000003', 'shortlist_u0000000-0000-0000-0000-000000000002_3', true, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'alert_match', '3 New Jobs Match Your Alert', 'New positions matching ''Senior Engineering Roles'' in Bengaluru have been published today.', NULL, 'alert_match_u0000000-0000-0000-0000-000000000002_4', true, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'u0000000-0000-0000-0000-000000000002', 'application_status', 'Application Submitted Successfully', 'Your profile and resume were forwarded to FinVantage Capital for Senior Fintech Backend Engineer.', 'j0000000-0000-0000-0000-000000000004', 'app_sub_u0000000-0000-0000-0000-000000000002_5', true, NOW() - INTERVAL '3 days');


-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
SELECT email, full_name, role, is_active FROM users WHERE email IN ('demo@123', 'demo@123.com', 'candidate@jobsterritory.com');
