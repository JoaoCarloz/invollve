import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/layout/Sidebar'
import OfficeShell from '@/components/modules/escritorio/OfficeShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'cliente') redirect('/portal')

  return (
    <div className="app-bg flex h-screen overflow-hidden">
      <Sidebar session={session} />
      <OfficeShell session={session}>{children}</OfficeShell>
    </div>
  )
}
