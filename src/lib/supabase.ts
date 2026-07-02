import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lvmucsxbmadtsgrxuwmo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bXVjc3hibWFkdHNncnh1d21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODUyODksImV4cCI6MjA5ODU2MTI4OX0.y-1sE6uYTn4Wbter6g6NozY6uojzD5x9YVeYif-5nJs'

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
