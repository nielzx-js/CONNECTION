import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://nxbgjvaeqtddhvyxcfka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YmdqdmFlcXRkZGh2eXhjZmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Mjg0NzEsImV4cCI6MjA3NTIwNDQ3MX0.wsqI66J9OSUyx5dLm3wVMrP6l2gEXLxlLHE52bN9Ga4';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);