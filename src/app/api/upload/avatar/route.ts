import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const filename = `${session.id}.${ext}`

  // Produção (Vercel): grava no Blob. Dev local: grava em disco.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`avatars/${filename}`, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return NextResponse.json({ url: blob.url })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await mkdir(uploadDir, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
  return NextResponse.json({ url: `/uploads/avatars/${filename}` })
}
