-- Enable Row Level Security (RLS) on all tables
-- This version is designed for custom authentication (not Supabase Auth)
-- Since you're using custom JWT authentication, we'll use a different approach

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Since you're using custom authentication with service role key,
-- we need to create policies that allow service role access
-- but still provide security through your application logic

-- Allow service role to bypass RLS (this is what your app uses)
-- Your application will handle the authorization logic

-- Users table policies
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

-- Allow authenticated users to read users (your app will filter)
CREATE POLICY "Allow authenticated read access to users" ON users
  FOR SELECT USING (true);

-- Companies table policies  
CREATE POLICY "Service role can manage companies" ON companies
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to companies" ON companies
  FOR SELECT USING (true);

-- Departments table policies
CREATE POLICY "Service role can manage departments" ON departments
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to departments" ON departments
  FOR SELECT USING (true);

-- User departments table policies
CREATE POLICY "Service role can manage user_departments" ON user_departments
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to user_departments" ON user_departments
  FOR SELECT USING (true);

-- Scenarios table policies
CREATE POLICY "Service role can manage scenarios" ON scenarios
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to scenarios" ON scenarios
  FOR SELECT USING (true);

-- Password resets table policies
CREATE POLICY "Service role can manage password_resets" ON password_resets
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

-- Settings table policies - Allow authenticated access for admin functionality
CREATE POLICY "Service role can manage settings" ON settings
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to settings" ON settings
  FOR SELECT USING (true);

-- Conversations table policies
CREATE POLICY "Service role can manage conversations" ON conversations
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to conversations" ON conversations
  FOR SELECT USING (true);

-- Reports table policies
CREATE POLICY "Service role can manage reports" ON reports
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

CREATE POLICY "Allow authenticated read access to reports" ON reports
  FOR SELECT USING (true); 