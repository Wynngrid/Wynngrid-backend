/*
  # Initial Schema Setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `password` (text)
      - `otp` (text, nullable)
      - `otp_expiry` (timestamptz, nullable)
      - `is_verified` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `business_name` (text, nullable)
      - `contact_number` (text)
      - `city` (text)
      - `service_provider_type` (text)
      - `experience_years` (text)
      - `graduation_info` (text)
      - `associations` (text, nullable)
      - `avg_project_area` (text, nullable)
      - `avg_project_value` (text, nullable)
      - `project_types` (text[])
      - `portfolio_urls` (text[])
      - `website_url` (text, nullable)
      - `work_setup_preference` (text)
      - `comments` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  otp text,
  otp_expiry timestamptz,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  business_name text,
  contact_number text NOT NULL,
  city text NOT NULL,
  service_provider_type text NOT NULL,
  experience_years text NOT NULL,
  graduation_info text NOT NULL,
  associations text,
  avg_project_area text,
  avg_project_value text,
  project_types text[],
  portfolio_urls text[],
  website_url text,
  work_setup_preference text NOT NULL,
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);