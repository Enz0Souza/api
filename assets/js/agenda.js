import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors({
  origin: ['https://desafio-trilha-front-end-9v9d.vercel.app', 'http://localhost:4200'],
  credentials: true
}));
app.use(bodyParser.json());

// Simula banco de dados
const agendamentos = [
  {
    id: 1,
    userId: 'user-123',
    data: '2023-11-20',
    hora: '10:00',
    especie: 'Cachorro',
    servico: 'Banho e Tosa',
    criadoEm: new Date().toISOString()
  }
];

console.log('Servidor iniciado. Agendamentos iniciais:', agendamentos);

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('Formato de token inválido');
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  const userId = tokenParts[1];
  if (!userId) {
    console.log('Token inválido');
    return res.status(401).json({ error: 'Token inválido' });
  }

  console.log('Usuário autenticado:', userId);
  req.userId = userId;
  next();
}

// Função para verificar conflitos de horário
function verificarConflitoHorario(data, hora, agendamentosExistente) {
  const [h, m] = hora.split(':').map(Number);
  const minutosAgendamento = h * 60 + m;
  
  return agendamentosExistente.some(a => {
    const [ah, am] = a.hora.split(':').map(Number);
    const minutosExistente = ah * 60 + am;
    return Math.abs(minutosExistente - minutosAgendamento) < 30;
  });
}

// Rota para verificar disponibilidade
app.get('/api/agendamentos/disponibilidade', authMiddleware, (req, res) => {
  const { data, hora } = req.query;
  
  if (!data || !hora) {
    return res.status(400).json({ error: 'Parâmetros data e hora são obrigatórios' });
  }

  // Verifica se a data/hora é no passado
  const agora = new Date();
  const dataHoraAgendamento = new Date(`${data}T${hora}`);
  if (dataHoraAgendamento < agora) {
    return res.json(false);
  }

  // Filtra agendamentos do mesmo dia
  const agendamentosNoDia = agendamentos.filter(a => a.data === data);
  
  // Verifica conflitos de horário
  const conflito = verificarConflitoHorario(data, hora, agendamentosNoDia);

  res.json(!conflito);
});

// Rota para criar agendamento
app.post('/api/agendamentos', authMiddleware, (req, res) => {
  const { data, hora, especie, servico } = req.body;

  if (!data || !hora || !especie || !servico) {
    return res.status(400).json({ error: 'Campos obrigatórios: data, hora, especie, servico' });
  }

  // Verifica se a data/hora é no passado
  const agora = new Date();
  const dataHoraAgendamento = new Date(`${data}T${hora}`);
  if (dataHoraAgendamento < agora) {
    return res.status(400).json({ error: 'Não é possível agendar para datas/horários passados' });
  }

  // Filtra agendamentos do mesmo dia
  const agendamentosNoDia = agendamentos.filter(a => a.data === data);
  
  // Verifica conflitos de horário para não permitir agendamentos com intervalo menor que 30 minutos
  const conflito = verificarConflitoHorario(data, hora, agendamentosNoDia);

  if (conflito) {
    return res.status(400).json({ 
      error: 'Já existe um agendamento neste horário ou com intervalo menor que 30 minutos' 
    });
  }

  // Cria novo agendamento
  const novo = {
    id: agendamentos.length + 1,
    userId: req.userId,
    data,
    hora,
    especie,
    servico,
    criadoEm: new Date().toISOString()
  };

  agendamentos.push(novo);
  res.status(201).json(novo);
});

// Rota para buscar agendamentos
app.get('/api/agendamentos', authMiddleware, (req, res) => {
  const { dia } = req.query;

  if (!dia) return res.status(400).json({ error: 'Parâmetro dia é obrigatório' });

  const dtDia = new Date(dia);
  if (isNaN(dtDia.getTime())) return res.status(400).json({ error: 'Data inválida' });

  // Filtra agendamentos do usuário
  const agsUser = agendamentos.filter(a => a.userId === req.userId);

  // Agendamentos no dia específico
  const agsDoDia = agsUser.filter(a => a.data === dia);

  // Calcula semana (domingo a sábado)
  const dayOfWeek = dtDia.getDay();
  const diffToSunday = dayOfWeek;
  const sunday = new Date(dtDia);
  sunday.setDate(dtDia.getDate() - diffToSunday);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  // Agendamentos da semana (excluindo o dia atual)
  const agsSemana = agsUser.filter(a => {
    const dataA = new Date(a.data);
    return dataA >= sunday && dataA <= saturday && a.data !== dia;
  });

  res.json({
    dia,
    agendamentosDoDia: agsDoDia,
    agendamentosDaSemana: agsSemana,
    debug: {
      totalAgendamentos: agendamentos.length,
      agendamentosUsuario: agsUser.length
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});