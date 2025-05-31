-- Crear la base de datos para supabase
CREATE DATABASE IF NOT EXISTS users;

-- Crear la tabla users para supabase
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  role VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create companies table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_departments junction table for many-to-many relationship
CREATE TABLE user_departments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, department_id)
);

-- Crear la tabla scenarios
CREATE TABLE scenarios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  context TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  users INTEGER[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  parent_scenario INTEGER,
  aspects TEXT,
  categories TEXT,
  files TEXT[] DEFAULT '{}',
  assignedIA VARCHAR(255),
  assignedIAModel VARCHAR(255),
  generated_image_url TEXT,
  show_image_prompt BOOLEAN DEFAULT false,
  interactive_avatar VARCHAR(255),
  avatar_language VARCHAR(255),
  time_limit INTEGER DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    -- Virtual Avatar
    promt_for_virtual_avatar TEXT,
    -- Analyse Conversation
    promt_for_analyse_conversation TEXT,
    -- Aspects
    aspects TEXT,
    -- Scenario Categories
    scenario_categories TEXT,
    -- Interactive Avatar
    interactive_avatar TEXT,
    -- AI Keys
    heygen_key TEXT,
    openai_key TEXT,
    -- mistral_key TEXT,
    -- llama_key TEXT,
    -- Mail Settings
    mail_username TEXT,
    mail_password TEXT,
    mail_host TEXT,
    mail_port INTEGER,
    mail_from TEXT,
    mail_from_name TEXT,
    -- AWS Settings
    aws_access_key TEXT,
    aws_secret_key TEXT,
    aws_region TEXT,
    aws_bucket TEXT,
    aws_bucket_url TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation JSONB NOT NULL,
  facial_expressions JSONB DEFAULT '[]'::jsonb,
  elapsed_time FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  conversations_ids INTEGER[] DEFAULT '{}',
  show_to_user BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_scenario_elapsed_time ON conversations(scenario_id, elapsed_time);