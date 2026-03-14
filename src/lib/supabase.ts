import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Interview {
  id: string;
  company_name: string;
  position: string;
  location: string;
  interview_date: string;
  difficulty_level: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
  rounds: number;
  description: string;
  topics_covered: string;
  result: 'Selected' | 'Rejected' | 'Pending';
  salary_range: string;
  tips: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
