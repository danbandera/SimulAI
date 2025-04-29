-- Crear la base de datos para supabase
CREATE DATABASE IF NOT EXISTS users;

-- Crear la tabla users para supabase
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla scenarios
CREATE TABLE scenarios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  context TEXT,
  user_id_assigned INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_id_created INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft',
  parent_scenario INTEGER,
  aspects JSONB DEFAULT '[]'::jsonb,
  files TEXT[] DEFAULT '{}',
  assignedIA VARCHAR(255),
  assignedIAModel VARCHAR(255),
  generated_image_url TEXT,
  show_image_prompt BOOLEAN DEFAULT false,
  interactive_avatar VARCHAR(255),
  avatar_language VARCHAR(255),
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
    -- AI Keys
    heygen_key TEXT,
    openai_key TEXT,
    mistral_key TEXT,
    llama_key TEXT,
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

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update timestamp
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conversation JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
