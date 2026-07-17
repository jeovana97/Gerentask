import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FolderOpen, 
  TrendingUp,
  Inbox,
  UserCheck,
  Award
} from 'lucide-react';

const Dashboard = ({ setActivePage }) => {
  const { user } = useAuth();
  const { tasks, departments, users } = useData();

  const isManager = user.role === 'manager' || user.role === 'master';

  // 1. Filtragem das tarefas corporativas (normais)
  const corporateTasks = user.role === 'master'
    ? tasks.filter(t => !t.isPersonal)
    : user.role === 'manager'
      ? tasks.filter(t => !t.isPersonal && t.departmentId === user.departmentId)
      : tasks.filter(t => !t.isPersonal && (t.assignedToIds?.includes(user.id) || t.assignedToId === user.id));

  // 2. Filtragem das tarefas pessoais (próprias)
  const personalTasks = tasks.filter(t => t.isPersonal && t.createdById === user.id);

  // 3. Métricas das tarefas corporativas
  const totalCorp = corporateTasks.length;
  const todoCorp = corporateTasks.filter(t => t.status === 'todo').length;
  const doingCorp = corporateTasks.filter(t => t.status === 'doing').length;
  const doneCorp = corporateTasks.filter(t => t.status === 'done' || t.status === 'archived').length;
  const rateCorp = totalCorp > 0 ? Math.round((doneCorp / totalCorp) * 100) : 0;

  // 4. Métricas das tarefas pessoais
  const totalPers = personalTasks.length;
  const todoPers = personalTasks.filter(t => t.status === 'todo').length;
  const doingPers = personalTasks.filter(t => t.status === 'doing').length;
  const donePers = personalTasks.filter(t => t.status === 'done' || t.status === 'archived').length;
  const ratePers = totalPers > 0 ? Math.round((donePers / totalPers) * 100) : 0;

  // 5. Dados para os gráficos de pizza separados
  const statusCorpChartData = [
    { name: 'A Fazer', value: todoCorp, color: '#9ca3af' },
    { name: 'Em Andamento', value: doingCorp, color: '#3b82f6' },
    { name: 'Concluídas', value: doneCorp, color: '#10b981' }
  ].filter(d => d.value > 0);

  const statusPersChartData = [
    { name: 'A Fazer', value: todoPers, color: '#f59e0b' },
    { name: 'Em Andamento', value: doingPers, color: '#8b5cf6' },
    { name: 'Concluídas', value: donePers, color: '#10b981' }
  ].filter(d => d.value > 0);

  // 6. Dados para Gráfico por Departamento (apenas públicas para o gerente)
  const deptChartData = departments.map(dept => {
    const deptTasks = tasks.filter(t => t.departmentId === dept.id && !t.isPersonal);
    return {
      name: dept.name,
      'A Fazer': deptTasks.filter(t => t.status === 'todo').length,
      'Em Andamento': deptTasks.filter(t => t.status === 'doing').length,
      'Concluídas': deptTasks.filter(t => t.status === 'done' || t.status === 'archived').length,
    };
  });

  // 7. Lista de atividades recentes (mesclada apenas para o usuário)
  const myRecentTasks = [...corporateTasks, ...personalTasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Baixa';
    }
  };

  return (
    <div className="page-container animate-fade-in">
      {/* Título de Apresentação */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {isManager ? 'Painel de Controle Organizacional' : 'Minha Área de Trabalho'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          {isManager 
            ? 'Monitore a produtividade, tarefas pendentes e distribuição de trabalho nos setores.' 
            : 'Confira suas tarefas pendentes, prazos e progresso geral de suas atividades.'}
        </p>
      </div>

      {/* SEÇÃO: TAREFAS CORPORATIVAS */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Inbox size={20} style={{ color: 'var(--accent-primary)' }} />
        {isManager ? 'Estatísticas do Departamento (Tarefas do Setor)' : 'Minhas Tarefas da Equipe (Atribuídas)'}
      </h3>
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {/* Card Total */}
        <div className="glass-card" onClick={() => setActivePage('tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Inbox size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Total de Tarefas</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>{totalCorp}</h3>
          </div>
        </div>

        {/* Card Executando */}
        <div className="glass-card" onClick={() => setActivePage('tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Em Andamento / A Fazer</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {doingCorp} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>fazendo / {todoCorp} a fazer</span>
            </h3>
          </div>
        </div>

        {/* Card Concluídas */}
        <div className="glass-card" onClick={() => setActivePage('tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Produtividade (Setor)</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {doneCorp} <span style={{ fontSize: '0.95rem', color: 'var(--success)' }}>({rateCorp}%)</span>
            </h3>
          </div>
        </div>
      </div>

      {/* SEÇÃO: TAREFAS PRÓPRIAS */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UserCheck size={20} style={{ color: 'var(--accent-secondary)' }} />
        Minhas Tarefas Próprias (Pessoais Privadas)
      </h3>
      <div className="grid-3" style={{ marginBottom: '40px' }}>
        {/* Card Total Pessoal */}
        <div className="glass-card" onClick={() => setActivePage('personal-tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Inbox size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Total de Tarefas Próprias</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>{totalPers}</h3>
          </div>
        </div>

        {/* Card Executando Pessoal */}
        <div className="glass-card" onClick={() => setActivePage('personal-tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Em Andamento / A Fazer</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {doingPers} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>fazendo / {todoPers} a fazer</span>
            </h3>
          </div>
        </div>

        {/* Card Concluídas Pessoal */}
        <div className="glass-card" onClick={() => setActivePage('personal-tasks')} style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Produtividade Pessoal</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {donePers} <span style={{ fontSize: '0.95rem', color: 'var(--success)' }}>({ratePers}%)</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Gráficos em Grid */}
      {isManager ? (
        <>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '360px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Volume de Tarefas por Departamento
            </h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-dark)', 
                      borderColor: 'var(--border-color)', 
                      color: 'var(--text-primary)',
                      borderRadius: '8px' 
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="A Fazer" stackId="a" fill="#9ca3af" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Em Andamento" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Concluídas" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '360px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Distribuição por Status (Setor)
              </h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statusCorpChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusCorpChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusCorpChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-dark)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--text-primary)',
                          borderRadius: '8px' 
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Clock size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Nenhuma tarefa cadastrada no setor</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '360px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Distribuição por Status (Tarefas Próprias)
              </h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statusPersChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPersChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPersChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-dark)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--text-primary)',
                          borderRadius: '8px' 
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Clock size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Nenhuma tarefa própria cadastrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '360px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Distribuição por Status (Tarefas da Equipe)
              </h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statusCorpChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusCorpChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusCorpChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-dark)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--text-primary)',
                          borderRadius: '8px' 
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Clock size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Nenhuma tarefa atribuída no setor</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '360px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Distribuição por Status (Tarefas Próprias)
              </h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statusPersChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPersChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPersChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-dark)', 
                          borderColor: 'var(--border-color)', 
                          color: 'var(--text-primary)',
                          borderRadius: '8px' 
                        }} 
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Clock size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Nenhuma tarefa própria cadastrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '260px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <TrendingUp size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Métricas da Equipe</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', fontSize: '0.9rem', marginTop: '6px', lineHeight: '1.5' }}>
                Você concluiu <strong style={{ color: 'var(--success)' }}>{doneCorp}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalCorp}</strong> tarefas corporativas delegadas.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '260px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Award size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Métricas Pessoais</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', fontSize: '0.9rem', marginTop: '6px', lineHeight: '1.5' }}>
                Você concluiu <strong style={{ color: '#f59e0b' }}>{donePers}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalPers}</strong> tarefas próprias individuais.
              </p>
            </div>
          </div>
        </>
        )}

      {/* Lista de Atividades / Tarefas Recentes */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Atividades Recentes
          </h3>
          <button 
            onClick={() => setActivePage('tasks')} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          >
            Ver Todas
          </button>
        </div>

        {myRecentTasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myRecentTasks.map(task => {
              const dept = departments.find(d => d.id === task.departmentId);
              const worker = users.find(u => u.id === task.assignedToId);
              return (
                <div 
                  key={task.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {task.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      {task.isPersonal ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.7rem', border: 'none', padding: '2px 6px' }}>
                          Tarefa Própria
                        </span>
                      ) : (
                        <>
                          {dept && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              • {dept.name}
                            </span>
                          )}
                          {worker && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              • Atribuído a: {worker.name}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`badge badge-${task.status}`} style={{ padding: '6px 12px' }}>
                      {task.status === 'todo' ? 'A Fazer' : task.status === 'doing' ? 'Fazendo' : task.status === 'archived' ? 'Arquivada' : 'Concluída'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Não há tarefas registradas.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
