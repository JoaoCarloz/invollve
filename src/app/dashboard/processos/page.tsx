'use client'
import { useState } from 'react'

type Task = { id: string; label: string; done: boolean }
type Section = { title: string; icon: string; color: string; tasks: Task[] }
type Role = { key: string; label: string; icon: string; color: string; sections: Section[] }

const ROLES: Role[] = [
  {
    key: 'trafego',
    label: 'Gestor de Tráfego',
    icon: '🚀',
    color: 'text-blue-400',
    sections: [
      {
        title: 'Diário', icon: '☀️', color: 'text-yellow-400',
        tasks: [
          { id: 't-d1', label: 'Verificar gastos e desempenho de todas as campanhas ativas', done: false },
          { id: 't-d2', label: 'Checar frequência dos anúncios (acima de 2.5 = alerta)', done: false },
          { id: 't-d3', label: 'Analisar CPL / CPA do dia anterior', done: false },
          { id: 't-d4', label: 'Pausar anúncios com CPA fora do meta', done: false },
          { id: 't-d5', label: 'Verificar orçamento restante e ajustar se necessário', done: false },
          { id: 't-d6', label: 'Checar notificações do Gerenciador de Anúncios (Meta)', done: false },
          { id: 't-d7', label: 'Responder dúvidas do cliente sobre performance', done: false },
          { id: 't-d8', label: 'Verificar leads recebidos e qualidade dos contatos', done: false },
        ],
      },
      {
        title: 'Semanal', icon: '📅', color: 'text-blue-400',
        tasks: [
          { id: 't-w1', label: 'Gerar relatório de performance semanal por cliente', done: false },
          { id: 't-w2', label: 'Revisar conjuntos de anúncios com baixo desempenho', done: false },
          { id: 't-w3', label: 'Testar novos criativos (mínimo 2 por cliente)', done: false },
          { id: 't-w4', label: 'Analisar públicos: ampliar ou criar lookalike de leads qualificados', done: false },
          { id: 't-w5', label: 'Revisar segmentação e excluir leads já convertidos', done: false },
          { id: 't-w6', label: 'Checar pixel / API de conversões — eventos disparando corretamente?', done: false },
          { id: 't-w7', label: 'Atualizar budget semanal por conta conforme performance', done: false },
          { id: 't-w8', label: 'Reunião ou envio de relatório ao cliente', done: false },
          { id: 't-w9', label: 'Verificar e responder comentários negativos nos anúncios', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 't-m1', label: 'Elaborar relatório mensal completo (investimento, leads, CPL, ROAS)', done: false },
          { id: 't-m2', label: 'Apresentar resultados ao cliente e propor ajustes de estratégia', done: false },
          { id: 't-m3', label: 'Revisar objetivos e KPIs para o próximo mês', done: false },
          { id: 't-m4', label: 'Planejar calendário de campanhas do próximo mês', done: false },
          { id: 't-m5', label: 'Solicitar novos criativos ao designer / social media', done: false },
          { id: 't-m6', label: 'Atualizar orçamentos mensais no gerenciador', done: false },
          { id: 't-m7', label: 'Revisar e renovar tokens de acesso (Meta, Google Ads)', done: false },
          { id: 't-m8', label: 'Analisar histórico e identificar sazonalidades', done: false },
          { id: 't-m9', label: 'Verificar faturamento e emitir nota fiscal / recibo', done: false },
          { id: 't-m10', label: 'Backup dos relatórios e dados das contas no Drive', done: false },
        ],
      },
    ],
  },
  {
    key: 'social',
    label: 'Social Media',
    icon: '📱',
    color: 'text-pink-400',
    sections: [
      {
        title: 'Diário', icon: '☀️', color: 'text-yellow-400',
        tasks: [
          { id: 's-d1', label: 'Verificar e responder comentários e DMs em todas as contas', done: false },
          { id: 's-d2', label: 'Monitorar menções à marca e interações relevantes', done: false },
          { id: 's-d3', label: 'Publicar stories programados do dia', done: false },
          { id: 's-d4', label: 'Checar engajamento dos posts recentes (curtidas, comentários, saves)', done: false },
          { id: 's-d5', label: 'Atualizar hashtags ou CTAs conforme tendência do dia', done: false },
          { id: 's-d6', label: 'Interagir com perfis estratégicos (comentar, curtir, seguir)', done: false },
        ],
      },
      {
        title: 'Semanal', icon: '📅', color: 'text-pink-400',
        tasks: [
          { id: 's-w1', label: 'Planejar e agendar todos os posts da semana seguinte', done: false },
          { id: 's-w2', label: 'Criar e entregar roteiro/briefing de conteúdo para o designer', done: false },
          { id: 's-w3', label: 'Analisar posts com melhor desempenho e replicar formato', done: false },
          { id: 's-w4', label: 'Pesquisar tendências e datas comemorativas da próxima semana', done: false },
          { id: 's-w5', label: 'Revisar e atualizar bio/destaques dos perfis se necessário', done: false },
          { id: 's-w6', label: 'Gravar ou orientar gravação de reels/vídeos da semana', done: false },
          { id: 's-w7', label: 'Enviar relatório de engajamento semanal ao cliente', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 's-m1', label: 'Elaborar calendário editorial completo do próximo mês', done: false },
          { id: 's-m2', label: 'Apresentar relatório mensal de crescimento ao cliente', done: false },
          { id: 's-m3', label: 'Revisar estratégia de conteúdo e ajustar por formato/canal', done: false },
          { id: 's-m4', label: 'Analisar crescimento de seguidores e taxa de engajamento', done: false },
          { id: 's-m5', label: 'Pesquisar e propor novas campanhas ou ações de conteúdo', done: false },
          { id: 's-m6', label: 'Verificar se todos os links na bio estão funcionando', done: false },
          { id: 's-m7', label: 'Backup de todos os conteúdos publicados no Drive', done: false },
        ],
      },
    ],
  },
  {
    key: 'editor',
    label: 'Editor de Vídeo',
    icon: '🎬',
    color: 'text-orange-400',
    sections: [
      {
        title: 'Diário', icon: '☀️', color: 'text-yellow-400',
        tasks: [
          { id: 'e-d1', label: 'Verificar fila de edições pendentes e priorizar por prazo', done: false },
          { id: 'e-d2', label: 'Confirmar recebimento de materiais brutos (gravações, assets)', done: false },
          { id: 'e-d3', label: 'Entregar edições aprovadas no prazo combinado', done: false },
          { id: 'e-d4', label: 'Exportar vídeos nos formatos corretos por plataforma (Reels 9:16, YouTube 16:9)', done: false },
          { id: 'e-d5', label: 'Atualizar status das edições em andamento na tarefa', done: false },
        ],
      },
      {
        title: 'Semanal', icon: '📅', color: 'text-orange-400',
        tasks: [
          { id: 'e-w1', label: 'Reunião de alinhamento com social media sobre pautas da semana', done: false },
          { id: 'e-w2', label: 'Organizar e nomear arquivos de edição no Drive', done: false },
          { id: 'e-w3', label: 'Revisar feedbacks recebidos e aplicar nos próximos vídeos', done: false },
          { id: 'e-w4', label: 'Atualizar biblioteca de trilhas, efeitos e templates', done: false },
          { id: 'e-w5', label: 'Verificar e exportar legendas dos vídeos publicados', done: false },
          { id: 'e-w6', label: 'Enviar prévia das edições para aprovação do cliente/social', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 'e-m1', label: 'Arquivar todos os projetos finalizados do mês no Drive', done: false },
          { id: 'e-m2', label: 'Revisar e atualizar templates de vídeo por cliente', done: false },
          { id: 'e-m3', label: 'Fazer backup completo dos projetos em HD externo/nuvem', done: false },
          { id: 'e-m4', label: 'Atualizar softwares e plugins de edição', done: false },
          { id: 'e-m5', label: 'Analisar métricas dos vídeos publicados (retenção, views, CTR)', done: false },
          { id: 'e-m6', label: 'Alinhar com equipe o volume de entregas para o próximo mês', done: false },
        ],
      },
    ],
  },
  {
    key: 'design',
    label: 'Designer',
    icon: '🎨',
    color: 'text-green-400',
    sections: [
      {
        title: 'Diário', icon: '☀️', color: 'text-yellow-400',
        tasks: [
          { id: 'd-d1', label: 'Verificar briefings e solicitações pendentes de design', done: false },
          { id: 'd-d2', label: 'Entregar artes do dia dentro do prazo', done: false },
          { id: 'd-d3', label: 'Exportar artes nos formatos e tamanhos corretos por plataforma', done: false },
          { id: 'd-d4', label: 'Atualizar status das entregas na tarefa do sistema', done: false },
          { id: 'd-d5', label: 'Confirmar aprovação das artes antes de publicar', done: false },
        ],
      },
      {
        title: 'Semanal', icon: '📅', color: 'text-green-400',
        tasks: [
          { id: 'd-w1', label: 'Reunião de briefing com social media para artes da semana', done: false },
          { id: 'd-w2', label: 'Criar artes de feed, stories e peças de anúncios conforme calendário', done: false },
          { id: 'd-w3', label: 'Organizar arquivos e versões no Drive por cliente', done: false },
          { id: 'd-w4', label: 'Solicitar feedbacks de clientes sobre artes entregues', done: false },
          { id: 'd-w5', label: 'Pesquisar referências e tendências de design da semana', done: false },
          { id: 'd-w6', label: 'Revisar e atualizar manual de identidade visual dos clientes', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 'd-m1', label: 'Arquivar todos os projetos do mês no Drive organizado por cliente', done: false },
          { id: 'd-m2', label: 'Atualizar templates mensais (posts, stories, artes de anúncio)', done: false },
          { id: 'd-m3', label: 'Verificar licenças de fontes, imagens e assets em uso', done: false },
          { id: 'd-m4', label: 'Fazer backup completo dos arquivos de projeto (.psd, .ai, .fig)', done: false },
          { id: 'd-m5', label: 'Alinhamento com equipe para volume de entregas do próximo mês', done: false },
          { id: 'd-m6', label: 'Atualizar biblioteca de componentes e elementos visuais', done: false },
        ],
      },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: '💰',
    color: 'text-emerald-400',
    sections: [
      {
        title: 'Diário', icon: '☀️', color: 'text-yellow-400',
        tasks: [
          { id: 'f-d1', label: 'Verificar entradas e saídas bancárias do dia', done: false },
          { id: 'f-d2', label: 'Conciliar pagamentos recebidos com lançamentos do sistema', done: false },
          { id: 'f-d3', label: 'Alertar sócios sobre contas a vencer nos próximos 3 dias', done: false },
          { id: 'f-d4', label: 'Registrar qualquer novo lançamento no sistema financeiro', done: false },
        ],
      },
      {
        title: 'Semanal', icon: '📅', color: 'text-emerald-400',
        tasks: [
          { id: 'f-w1', label: 'Verificar todas as contas a receber da semana e cobrar pendentes', done: false },
          { id: 'f-w2', label: 'Confirmar pagamento de fornecedores e freelancers', done: false },
          { id: 'f-w3', label: 'Atualizar relatório de fluxo de caixa semanal', done: false },
          { id: 'f-w4', label: 'Reconciliar extratos bancários com lançamentos do sistema', done: false },
          { id: 'f-w5', label: 'Enviar resumo financeiro da semana aos sócios', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 'f-m1', label: 'Fechar competência do mês: conferir todos os lançamentos', done: false },
          { id: 'f-m2', label: 'Emitir notas fiscais de todos os clientes ativos', done: false },
          { id: 'f-m3', label: 'Calcular e pagar pró-labore e comissões da equipe', done: false },
          { id: 'f-m4', label: 'Pagar guias de impostos (DAS, ISS, etc.) dentro do prazo', done: false },
          { id: 'f-m5', label: 'Elaborar DRE (Demonstrativo de Resultados) do mês', done: false },
          { id: 'f-m6', label: 'Apresentar resultado financeiro aos sócios', done: false },
          { id: 'f-m7', label: 'Projetar fluxo de caixa para o próximo mês', done: false },
          { id: 'f-m8', label: 'Enviar documentação para contabilidade (notas, extratos, folha)', done: false },
          { id: 'f-m9', label: 'Backup de todos os documentos financeiros no Drive', done: false },
        ],
      },
    ],
  },
  {
    key: 'contabilidade',
    label: 'Contabilidade',
    icon: '📒',
    color: 'text-cyan-400',
    sections: [
      {
        title: 'Semanal', icon: '📅', color: 'text-cyan-400',
        tasks: [
          { id: 'c-w1', label: 'Verificar entrada de documentos fiscais (notas de compra/venda)', done: false },
          { id: 'c-w2', label: 'Lançar notas fiscais no sistema contábil', done: false },
          { id: 'c-w3', label: 'Checar pendências de documentos com o financeiro interno', done: false },
          { id: 'c-w4', label: 'Monitorar prazo de obrigações fiscais da semana', done: false },
        ],
      },
      {
        title: 'Mensal', icon: '📊', color: 'text-purple-400',
        tasks: [
          { id: 'c-m1', label: 'Receber e conferir documentação enviada pelo financeiro', done: false },
          { id: 'c-m2', label: 'Calcular e entregar guia do Simples Nacional / DAS', done: false },
          { id: 'c-m3', label: 'Apurar ISS e gerar guia de pagamento', done: false },
          { id: 'c-m4', label: 'Fechar folha de pagamento e calcular encargos (FGTS, INSS)', done: false },
          { id: 'c-m5', label: 'Enviar SPED Contribuições e EFD-Reinf se obrigatório', done: false },
          { id: 'c-m6', label: 'Conciliar contas contábeis (bancos, fornecedores, clientes)', done: false },
          { id: 'c-m7', label: 'Elaborar balancete mensal e enviar aos sócios', done: false },
          { id: 'c-m8', label: 'Verificar situação cadastral da empresa (CNPJ, Alvará, CND)', done: false },
        ],
      },
      {
        title: 'Anual', icon: '🗓️', color: 'text-zinc-400',
        tasks: [
          { id: 'c-a1', label: 'Entregar declaração de IRPJ / IRPF dos sócios', done: false },
          { id: 'c-a2', label: 'Apurar e entregar DIRF', done: false },
          { id: 'c-a3', label: 'Revisar enquadramento tributário para o próximo ano', done: false },
          { id: 'c-a4', label: 'Fechar balanço patrimonial anual', done: false },
          { id: 'c-a5', label: 'Renovar certidões negativas (federal, estadual, municipal)', done: false },
          { id: 'c-a6', label: 'Atualizar contrato social se houver alterações', done: false },
        ],
      },
    ],
  },
]

function SectionBlock({ section, roleKey, onToggle, onAdd, onRemove }: {
  section: Section; roleKey: string
  onToggle: (taskId: string) => void
  onAdd: (label: string) => void
  onRemove: (taskId: string) => void
}) {
  const [newLabel, setNewLabel] = useState('')
  const done = section.tasks.filter(t => t.done).length
  const total = section.tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{section.icon}</span>
          <h3 className={`font-bold ${section.color}`}>{section.title}</h3>
          <span className="text-xs text-zinc-500">{done}/{total}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6c3de8, #ec4899)' }} />
          </div>
          <span className="text-xs text-zinc-500">{pct}%</span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {section.tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 group">
            <button onClick={() => onToggle(task.id)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.done ? 'border-purple-500 bg-purple-500' : 'border-white/20 hover:border-purple-400'}`}>
              {task.done && <span className="text-white text-xs">✓</span>}
            </button>
            <span className={`text-sm flex-1 transition-all ${task.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{task.label}</span>
            <button onClick={() => onRemove(task.id)} className="text-xs text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input placeholder={`+ Nova tarefa ${section.title.toLowerCase()}...`} value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onAdd(newLabel.trim()); setNewLabel('') } }}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50" />
        <button onClick={() => { if (newLabel.trim()) { onAdd(newLabel.trim()); setNewLabel('') } }}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-sm">+ Add</button>
      </div>
    </div>
  )
}

export default function ProcessosPage() {
  const [activeRole, setActiveRole] = useState('trafego')
  const [roles, setRoles] = useState<Role[]>(ROLES)

  const role = roles.find(r => r.key === activeRole)!

  function toggleTask(sectionTitle: string, taskId: string) {
    setRoles(prev => prev.map(r => r.key !== activeRole ? r : {
      ...r,
      sections: r.sections.map(s => s.title !== sectionTitle ? s : {
        ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      })
    }))
  }

  function addTask(sectionTitle: string, label: string) {
    setRoles(prev => prev.map(r => r.key !== activeRole ? r : {
      ...r,
      sections: r.sections.map(s => s.title !== sectionTitle ? s : {
        ...s, tasks: [...s.tasks, { id: `${activeRole}-${sectionTitle}-${Date.now()}`, label, done: false }]
      })
    }))
  }

  function removeTask(sectionTitle: string, taskId: string) {
    setRoles(prev => prev.map(r => r.key !== activeRole ? r : {
      ...r,
      sections: r.sections.map(s => s.title !== sectionTitle ? s : {
        ...s, tasks: s.tasks.filter(t => t.id !== taskId)
      })
    }))
  }

  function resetRole() {
    if (!confirm(`Resetar todas as tarefas de ${role.label}?`)) return
    setRoles(prev => prev.map(r => r.key !== activeRole ? r : {
      ...r, sections: r.sections.map(s => ({ ...s, tasks: s.tasks.map(t => ({ ...t, done: false })) }))
    }))
  }

  const totalDone = role.sections.flatMap(s => s.tasks).filter(t => t.done).length
  const totalTasks = role.sections.flatMap(s => s.tasks).length
  const totalPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">⚙️ Processos</h1>
        <p className="text-zinc-400 text-sm">Checklists operacionais por profissional. Marque conforme executa.</p>
      </div>

      {/* Tabs por profissional */}
      <div className="flex flex-wrap gap-2 mb-6">
        {roles.map(r => (
          <button key={r.key} onClick={() => setActiveRole(r.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeRole === r.key ? 'text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
            style={activeRole === r.key ? { background: 'linear-gradient(135deg, #6c3de8, #ec4899)' } : {}}>
            <span>{r.icon}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Header do profissional */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{role.icon}</span>
          <div>
            <p className={`font-bold ${role.color}`}>{role.label}</p>
            <p className="text-xs text-zinc-500">{totalDone}/{totalTasks} tarefas concluídas</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${totalPct}%`, background: 'linear-gradient(90deg, #6c3de8, #ec4899)' }} />
            </div>
            <span className="text-sm font-bold text-white">{totalPct}%</span>
          </div>
          <button onClick={resetRole} className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 border border-white/5">
            ↺ Reset tudo
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {role.sections.map(section => (
          <SectionBlock key={section.title} section={section} roleKey={activeRole}
            onToggle={taskId => toggleTask(section.title, taskId)}
            onAdd={label => addTask(section.title, label)}
            onRemove={taskId => removeTask(section.title, taskId)}
          />
        ))}
      </div>
    </div>
  )
}
