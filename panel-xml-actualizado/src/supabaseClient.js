// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'postgresql://postgres.saqsmmkzxljrnsmcplxt:0739Airg----@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcXNtbWt6eGxqcm5zbWNwbHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MjA3OTAsImV4cCI6MjA2MzQ5Njc5MH0.BCkF3X9QqAgcEcUAmGbH6tNj1uF0Xxs3NXqxgXdQkyA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
