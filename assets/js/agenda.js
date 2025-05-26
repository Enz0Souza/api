import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const allowedOrigins = [
  'http://localhost:4200',
  'https://desafio-trilha-front-end-9v9d.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true
}));

// Simula banco de dados
const agendamentos = [
  {
    id: 1,
    userId: 'user-123',
    data: '2023-11-20',
    hora: '10:00',
    especie: 'Cachorro',
    criadoEm: new Date().toISOString()
  }
];

console.log('Servidor iniciado. Agendamentos iniciais:', agendamentos);

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

// Rota para criar agendamento
app.post('/api/agendamentos', authMiddleware, (req, res) => {
  const { data, hora, especie } = req.body;

  if (!data || !hora || !especie) {
    return res.status(400).json({ error: 'Campos obrigatórios: data, hora, especie' });
  }

  const novo = {
    id: agendamentos.length + 1,
    userId: req.userId,
    data,
    hora,
    especie,
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
  if (isNaN(dtDia)) return res.status(400).json({ error: 'Data inválida' });


  const agsUser = agendamentos.filter(a => {
    return a.userId === req.userId;
  });


  const agsDoDia = agsUser.filter(a => a.data === dia);

  const dayOfWeek = dtDia.getDay();
  const diffToSunday = dayOfWeek;
  const sunday = new Date(dtDia);
  sunday.setDate(dtDia.getDate() - diffToSunday);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const agsSemana = agsUser.filter(a => {
    const dataA = new Date(a.data);
    return dataA >= sunday && dataA <= saturday && a.data !== dia;
  });

  console.log('Agendamentos da semana:', agsSemana);

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
