import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'suarel';
const supabaseAnonKey = 'suaAnoKey';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
