import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type AdminState = {
  isAdmin: boolean
  loading: boolean
  error: string | null
}

/**
 * After login, fetch the user's profile from `profiles` table and verify role === 'admin'.
 * If the user is not an admin, we sign them out and surface an error message.
 */
export function useAdminCheck(): AdminState {
  const { user, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      return profile
    },
    enabled: !!user,
    retry: false,
  })

  useEffect(() => {
    if (!user) return
    if (isLoading) return

    if (!data || data.role !== 'admin') {
      setError('Akun Anda bukan admin. Hubungi developer utama untuk akses.')
      // sign out non-admins
      signOut().catch(() => {})
    } else {
      setError(null)
    }
  }, [data, isLoading, user, signOut])

  return {
    isAdmin: !!user && !!data && data.role === 'admin',
    loading: isLoading,
    error,
  }
}
