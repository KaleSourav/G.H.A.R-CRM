import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ikeamkudlburujwwiyvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWFta3VkbGJ1cnVqd3dpeXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjQ2NjQsImV4cCI6MjEwMjY0MDY2NH0.Lqp8mSGohHCB6njHm6Fbs2KAM2JsLXFyS7fd7q59p1w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
