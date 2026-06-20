import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendTaskNotification({
  to,
  taskTitle,
  assignedBy,
  dueDate,
  description,
}: {
  to: string
  taskTitle: string
  assignedBy: string
  dueDate?: string
  description?: string
}) {
  if (!process.env.SMTP_USER) return // Email not configured, skip silently

  const dueDateStr = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Sem prazo definido'

  await transporter.sendMail({
    from: `"Invollve" <${process.env.SMTP_USER}>`,
    to,
    subject: `📋 Nova tarefa: ${taskTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f0f13;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6c3de8,#ec4899);padding:24px">
          <h1 style="margin:0;font-size:20px;font-weight:900">INVOLLVE</h1>
          <p style="margin:4px 0 0;opacity:0.8;font-size:13px">Gestão de Agência</p>
        </div>
        <div style="padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px">📋 Você tem uma nova tarefa!</h2>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-size:16px;font-weight:700">${taskTitle}</p>
            ${description ? `<p style="margin:0 0 8px;color:#a1a1aa;font-size:14px">${description}</p>` : ''}
            <p style="margin:0;font-size:13px;color:#a1a1aa">📅 Prazo: <strong style="color:#fff">${dueDateStr}</strong></p>
          </div>
          <p style="color:#a1a1aa;font-size:13px">Atribuída por: <strong style="color:#fff">${assignedBy}</strong></p>
          <a href="${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard/tarefas"
            style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(135deg,#6c3de8,#ec4899);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px">
            Ver Tarefas →
          </a>
        </div>
      </div>
    `,
  })
}
