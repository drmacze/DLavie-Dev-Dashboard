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

// v7.9.78: Berita — News Posts (official news from dev, separate from community feed)
export type NewsLabelType = 'maintenance' | 'information' | 'other'
export type NewsPost = {
  id: string
  author_id: string | null
  title: string
  body: string
  footer_text: string | null
  image_url: string | null
  label_type: NewsLabelType
  official: boolean  // always true
  scheduled_at: string | null
  published_at: string | null  // null = draft
  is_active: boolean
  created_at: string
  updated_at: string
}

// v7.9.78: Banner Slides — auto-rotating hero banner for Launcher Beranda
export type BannerMediaType = 'image' | 'gif' | 'video'
export type BannerSlide = {
  id: string
  sort_order: number
  title: string | null
  subtitle: string | null
  media_type: BannerMediaType
  media_url: string
  link_url: string | null
  duration_seconds: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
