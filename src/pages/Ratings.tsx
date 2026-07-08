import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Star, StarOff, Search, RefreshCw, TrendingUp, Users } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

interface RatingRow {
  id: string
  user_id: string
  rating: number
  review: string | null
  game_id: string | null
  created_at: string
  updated_at: string
  username?: string
  display_name?: string
  avatar_url?: string | null
}

export default function Ratings() {
  const [ratings, setRatings] = useState<RatingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterGame, setFilterGame] = useState<string | null>(null)

  const fetchRatings = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch ratings
      const { data: ratingData, error: ratingError } = await supabase
        .from('game_ratings')
        .select('*')
        .order('updated_at', { ascending: false })

      if (ratingError) throw ratingError

      // Fetch user profiles untuk display_name + username
      const userIds = [...new Set((ratingData || []).map(r => r.user_id))]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (profileError) throw profileError

      // Merge ratings dengan profiles
      const profileMap = new Map((profiles || []).map(p => [p.id, p]))
      const merged = (ratingData || []).map(r => ({
        ...r,
        username: profileMap.get(r.user_id)?.username || 'unknown',
        display_name: profileMap.get(r.user_id)?.display_name || 'Unknown User',
        avatar_url: profileMap.get(r.user_id)?.avatar_url || null,
      }))

      setRatings(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat rating')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRatings()
  }, [])

  // Compute stats
  const stats = {
    total: ratings.length,
    avg: ratings.length > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '0.0',
    fifa16: ratings.filter(r => r.game_id === 'fifa16').length,
    fifa15: ratings.filter(r => r.game_id === 'fifa15').length,
    fiveStar: ratings.filter(r => r.rating === 5).length,
    fourStar: ratings.filter(r => r.rating === 4).length,
    threeStar: ratings.filter(r => r.rating === 3).length,
    twoStar: ratings.filter(r => r.rating === 2).length,
    oneStar: ratings.filter(r => r.rating === 1).length,
  }

  // Filter ratings
  const filtered = ratings.filter(r => {
    if (filterRating && r.rating !== filterRating) return false
    if (filterGame && r.game_id !== filterGame) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.username?.toLowerCase().includes(q) &&
          !r.display_name?.toLowerCase().includes(q) &&
          !r.review?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-text-primary">Rating Manager</h1>
          <p className="text-sm text-text-muted mt-1">Lihat semua rating dari users untuk FIFA 16 & FIFA 15</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRatings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-accent-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.avg}<span className="text-sm text-text-muted">/5</span></p>
              <p className="text-xs text-text-muted">Average Rating</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-accent-green/10 border border-accent-green/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-muted">Total Ratings</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.fifa16}</p>
              <p className="text-xs text-text-muted">FIFA 16 Ratings</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-card bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.fifa15}</p>
              <p className="text-xs text-text-muted">FIFA 15 Ratings</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Rating distribution */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Distribusi Rating</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = star === 5 ? stats.fiveStar : star === 4 ? stats.fourStar : star === 3 ? stats.threeStar : star === 2 ? stats.twoStar : stats.oneStar
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-xs text-text-muted">{star}</span>
                  <Star className="h-3 w-3 text-accent-cyan fill-accent-cyan" />
                </div>
                <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                  <div className="h-full bg-accent-cyan rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-text-muted w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
          <input
            type="text"
            placeholder="Cari user atau review..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-btn bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-3 h-10 rounded-btn text-xs font-medium transition-colors ${filterRating === null ? 'bg-accent-cyan text-black' : 'bg-bg-card text-text-muted border border-border'}`}
          >All Stars</button>
          {[5, 4, 3, 2, 1].map(s => (
            <button
              key={s}
              onClick={() => setFilterRating(filterRating === s ? null : s)}
              className={`px-3 h-10 rounded-btn text-xs font-medium transition-colors flex items-center gap-1 ${filterRating === s ? 'bg-accent-cyan text-black' : 'bg-bg-card text-text-muted border border-border'}`}
            >
              {s}<Star className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterGame(null)}
            className={`px-3 h-10 rounded-btn text-xs font-medium transition-colors ${filterGame === null ? 'bg-accent-cyan text-black' : 'bg-bg-card text-text-muted border border-border'}`}
          >All Games</button>
          <button
            onClick={() => setFilterGame(filterGame === 'fifa16' ? null : 'fifa16')}
            className={`px-3 h-10 rounded-btn text-xs font-medium transition-colors ${filterGame === 'fifa16' ? 'bg-accent-cyan text-black' : 'bg-bg-card text-text-muted border border-border'}`}
          >FIFA 16</button>
          <button
            onClick={() => setFilterGame(filterGame === 'fifa15' ? null : 'fifa15')}
            className={`px-3 h-10 rounded-btn text-xs font-medium transition-colors ${filterGame === 'fifa15' ? 'bg-accent-cyan text-black' : 'bg-bg-card text-text-muted border border-border'}`}
          >FIFA 15</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-card bg-danger/10 border border-danger/30 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Rating list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 text-text-dim animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <StarOff className="h-8 w-8 text-text-dim mx-auto mb-3" />
          <p className="text-sm text-text-muted">Belum ada rating yang match dengan filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(rating => (
            <Card key={rating.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-bg-base border border-border overflow-hidden shrink-0">
                  {rating.avatar_url ? (
                    <img src={rating.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-text-muted">
                      {rating.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">{rating.display_name}</span>
                    <span className="text-xs text-text-dim">@{rating.username}</span>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s <= rating.rating ? 'text-accent-cyan fill-accent-cyan' : 'text-text-dim'}`}
                        />
                      ))}
                    </div>
                    {/* Game badge */}
                    {rating.game_id && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-base text-text-muted border border-border">
                        {rating.game_id === 'fifa16' ? 'FIFA 16' : rating.game_id === 'fifa15' ? 'FIFA 15' : rating.game_id}
                      </span>
                    )}
                  </div>

                  {/* Review text */}
                  {rating.review && (
                    <p className="text-sm text-text-muted mt-2 leading-relaxed">{rating.review}</p>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-text-dim">
                      Created: {new Date(rating.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {rating.updated_at !== rating.created_at && (
                      <span className="text-[10px] text-text-dim">
                        Updated: {new Date(rating.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-text-dim py-4">
        Menampilkan {filtered.length} dari {ratings.length} rating
      </div>
    </div>
  )
}
