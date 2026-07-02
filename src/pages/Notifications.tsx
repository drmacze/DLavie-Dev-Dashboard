import { Bell } from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'

export default function Notifications() {
  return (
    <ComingSoon
      title="Push Notification"
      description="Kirim notifikasi push ke semua user launcher"
      icon={Bell}
    />
  )
}
