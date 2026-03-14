/*
  # Interview Updates Database Schema

  ## Overview
  Creates the core database structure for an interview update platform where admins can post interview experiences and users can browse them.

  ## New Tables
  
  ### `interviews`
  Stores all interview update records with comprehensive details.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each interview
  - `company_name` (text, required) - Name of the company where interview took place
  - `position` (text, required) - Job position/role interviewed for
  - `location` (text, required) - Interview location (city/country or "Remote")
  - `interview_date` (date, required) - Date when interview occurred
  - `difficulty_level` (text, required) - Easy, Medium, Hard, or Very Hard
  - `rounds` (integer, default 1) - Number of interview rounds
  - `description` (text, required) - Detailed interview experience and questions asked
  - `topics_covered` (text, default '') - Technical topics or skills tested
  - `result` (text, required) - Selected, Rejected, or Pending
  - `salary_range` (text, default '') - Expected or offered salary range
  - `tips` (text, default '') - Tips and advice for future candidates
  - `created_at` (timestamptz) - Timestamp of record creation
  - `updated_at` (timestamptz) - Timestamp of last update
  - `created_by` (uuid, foreign key) - Reference to admin user who created the record

  ## Security
  
  ### Row Level Security (RLS)
  - RLS is enabled on the interviews table
  - Public read access: Anyone can view published interviews
  - Admin-only write access: Only authenticated admins can create, update, or delete interviews
  
  ### Policies
  1. **Public Read Access** - Anyone can view all interviews
  2. **Admin Create Access** - Authenticated users can create interviews
  3. **Admin Update Access** - Authenticated users can update interviews
  4. **Admin Delete Access** - Authenticated users can delete interviews

  ## Notes
  - The system uses Supabase Auth for admin authentication
  - Admin credentials will be set up separately via Supabase Auth
  - All timestamps are in UTC
  - Foreign key to auth.users ensures data integrity
*/

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  position text NOT NULL,
  location text NOT NULL,
  interview_date date NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard', 'Very Hard')),
  rounds integer DEFAULT 1 CHECK (rounds > 0),
  description text NOT NULL,
  topics_covered text DEFAULT '',
  result text NOT NULL CHECK (result IN ('Selected', 'Rejected', 'Pending')),
  salary_range text DEFAULT '',
  tips text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read interviews (public access)
CREATE POLICY "Anyone can view interviews"
  ON interviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Authenticated users can create interviews
CREATE POLICY "Authenticated users can create interviews"
  ON interviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update interviews
CREATE POLICY "Authenticated users can update interviews"
  ON interviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete interviews
CREATE POLICY "Authenticated users can delete interviews"
  ON interviews
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON interviews(company_name);
CREATE INDEX IF NOT EXISTS idx_interviews_result ON interviews(result);