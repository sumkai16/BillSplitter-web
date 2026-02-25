import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yajfsgtsomlzvrwnswcg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhamZzZ3Rzb21senZyd25zd2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Njc1OTUsImV4cCI6MjA4NzE0MzU5NX0.gy26Wrgh_9M_KJvWk0EFuTrrJ30S0x3Iy4aTzfotOe4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)