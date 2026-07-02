import { Wrench } from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'

export default function Maintenance() {
  return (
    <ComingSoon
      title="Maintenance Mode"
      description="Aktifkan/nonaktifkan mode maintenance launcher"
      icon={Wrench}
    />
  )
}
