import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dlbayuearegnpmgbxgcf.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYmF5dWVhcmVnbnBtZ2J4Z2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTg3NTMsImV4cCI6MjA5MTc3NDc1M30.-3TazMdyoJJ6F8GKmrh2aMMDNK3gFN8NAJMvLB0D0iU'

// Singleton client — anon key is safe to expose (RLS protected)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'dlavie-dev-auth',
  },
})

export type Profile = {
  id: string
  role: string | null
}

export type FeedPost = {
  id: string
  title: string
  body: string
  type: 'info' | 'update' | 'maintenance'
  pinned: boolean
  official: boolean
  created_at: string
}
