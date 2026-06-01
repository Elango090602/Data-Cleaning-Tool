import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jbjgmzhlufpliwzxbthm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiamdtemhsdWZwbGl3enhidGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDYzMjMsImV4cCI6MjA5NTYyMjMyM30.3kyoftU2hy6TWjBgZ3NiWjrE4LrUkGwk3FxeSKcfk6I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

