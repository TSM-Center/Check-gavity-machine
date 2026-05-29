/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Create a dummy client or null if keys are missing so the app doesn't crash on startup
export const supabase = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
