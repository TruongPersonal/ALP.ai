import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing!');
}

const targetUrl =
  supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
    ? supabaseUrl
    : 'https://placeholder-project.supabase.co';

const targetKey = supabaseAnonKey || 'placeholder-anon-key';

// Kết nối tới Supabase
export const supabase = createClient(targetUrl, targetKey, {
  db: { schema: 'alp_ai' }
});
