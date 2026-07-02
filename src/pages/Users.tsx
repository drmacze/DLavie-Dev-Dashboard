import { Users as UsersIcon } from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'

export default function Users() {
  return (
    <ComingSoon
      title="User Management"
      description="Lihat dan kelola akun user DLavie"
      icon={UsersIcon}
    />
  )
}
