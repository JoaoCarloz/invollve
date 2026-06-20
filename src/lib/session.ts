import 'server-only'
import { cookies } from 'next/headers'
import { verifyToken, UserSession } from './auth'

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('invollve_token')?.value
  if (!token) return null
  return verifyToken(token)
}
