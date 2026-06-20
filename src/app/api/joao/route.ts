import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Você é o João, analista de marketing digital da Invollve — uma agência de marketing focada em resultados reais para seus clientes.

Você faz parte do time como um membro real da equipe. Você é direto, prático e orientado a resultados. Você entende de:
- Tráfego pago (Meta Ads, Google Ads)
- Performance de campanhas (ROAS, CPL, CTR, CPM)
- E-commerce e funil de vendas
- Instagram e redes sociais
- Análise de dados de vendas e leads
- Estratégia de marketing digital

Quando o usuário delegar uma análise ou tarefa, você executa com profissionalismo — como um colega de equipe faria. Você usa linguagem natural, objetiva e brasileira. Você pode fazer perguntas de follow-up quando precisar de mais contexto.

Responda sempre em português brasileiro. Seja conciso mas completo. Use bullet points e estrutura quando ajudar na clareza.`

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
  }

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages inválido' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-opus-4-7',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
          stream: true,
          thinking: { type: 'adaptive' },
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro interno'
        controller.enqueue(encoder.encode(`\n\n[Erro: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
