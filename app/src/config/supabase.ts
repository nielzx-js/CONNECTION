import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// URL e Chave Pública (Anon) do seu projeto Supabase
const supabaseUrl = 'https://qewkcblywnitnwlclmho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFld2tjYmx5d25pdG53bGNsbWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDQ4ODMsImV4cCI6MjA3NTA4MDg4M30.bRSVNTDyfCCluEc8taRFAeqIQNIpObCD4EcVOxXj9xw';

// Cria e exporta o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);