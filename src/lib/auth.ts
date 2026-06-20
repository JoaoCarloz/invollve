import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'invollve-secret-key-2024-change-in-prod')

export interface UserSession {
  id: number
  name: string
  email: string
  role: 'socio' | 'gestor_trafego' | 'social_media' | 'designer' | 'cliente' | 'staff'
}

export async function createToken(user: UserSession) {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}

export const PERMISSIONS: Record<string, string[]> = {
  financeiro: ['socio'],
  clientes: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  tarefas: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  rh: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  drive: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  reunioes: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  processos: ['socio', 'gestor_trafego', 'social_media', 'designer'],
  agentes: ['socio', 'gestor_trafego'],
  usuarios: ['socio'],
  portal: ['cliente', 'socio'],
}

export function hasPermission(role: string, module: string): boolean {
  return PERMISSIONS[module]?.includes(role) ?? false
}
