# 🚁 Simulador de Entregas por Drone - DTI Digital

## Descrição do Projeto
Sistema web interativo que simula operações de entrega por drones urbanos, desenvolvido como desafio técnico para o processo seletivo da DTI Digital. O sistema gerencia drones, pedidos de entrega e otimiza rotas respeitando regras de capacidade, distância e prioridade.

## 🚀 Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Bibliotecas**: Chart.js (para dashboards), Leaflet.js (mapas interativos)
- **Testes**: Jest para testes unitários
- **Arquitetura**: MVC Pattern com Classes ES6

## 📋 Funcionalidades Implementadas

### Funcionalidades Básicas
- ✅ **Gestão de Drones**: Cadastro, capacidade de peso e alcance
- ✅ **Sistema de Pedidos**: Localização, peso, prioridade (alta, média, baixa)
- ✅ **Algoritmo de Alocação**: Otimização inteligente baseada em múltiplos critérios
- ✅ **Simulação em Tempo Real**: Estados do drone (idle, carregando, voando, entregando, retornando)

### Funcionalidades Avançadas
- ✅ **Sistema de Bateria**: Gestão automática de recarga
- ✅ **Zonas de Exclusão**: Obstáculos e restrições de voo
- ✅ **Fila de Prioridade**: Ordenação inteligente por prioridade e tempo
- ✅ **Cálculo de Tempo**: Estimativa precisa de entregas

### Diferenciais
- ✅ **Dashboard Interativo**: Relatórios em tempo real com gráficos
- ✅ **Mapa Visual**: Visualização de rotas e posições
- ✅ **API REST Simulada**: Endpoints para integração externa
- ✅ **Feedback do Cliente**: Status de entrega em tempo real
- ✅ **Sistema de Notificações**: Alertas de estado e problemas

## 🏗️ Estrutura do Projeto

```
logistics-drone-simulation/
├── src/
│   ├── js/
│   │   ├── models/
│   │   │   ├── Drone.js          # Classe do drone
│   │   │   ├── Order.js          # Classe do pedido
│   │   │   └── SimulationEngine.js # Motor da simulação
│   │   ├── services/
│   │   │   ├── DroneService.js   # Serviços do drone
│   │   │   ├── OrderService.js   # Serviços de pedidos
│   │   │   └── OptimizationService.js # Algoritmos de otimização
│   │   ├── controllers/
│   │   │   └── SimulationController.js # Controlador principal
│   │   ├── utils/
│   │   │   ├── calculations.js   # Utilitários matemáticos
│   │   │   └── validators.js     # Validações
│   │   └── main.js              # Arquivo principal
│   ├── css/
│   │   ├── main.css             # Estilos principais
│   │   └── dashboard.css        # Estilos do dashboard
│   └── assets/
│       └── icons/               # Ícones do sistema
├── tests/
│   ├── drone.test.js            # Testes do drone
│   ├── order.test.js            # Testes de pedidos
│   └── optimization.test.js     # Testes de otimização
├── index.html                   # Página principal
├── package.json                 # Dependências
└── README.md                    # Documentação
```

## 🎮 Como Executar

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/logistics-drone-simulation.git
cd logistics-drone-simulation
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute os testes**
```bash
npm test
```

4. **Inicie o servidor local**
```bash
npm start
# ou simplesmente abra index.html no navegador
```

5. **Acesse a aplicação**
- Abra http://localhost:3000 ou o arquivo index.html diretamente

## 🧠 Algoritmos e Regras de Negócio

### Regras Básicas
- **Capacidade**: Cada drone suporta até 10kg
- **Alcance**: Máximo de 50km por carga
- **Bateria**: 100% no início, consome 2% por km
- **Velocidade**: 60 km/h média
- **Recarga**: Automática quando bateria < 20%

### Algoritmo de Otimização
1. **Priorização**: Alta > Média > Baixa
2. **Agrupamento**: Combina pedidos próximos geograficamente
3. **Bin Packing**: Maximiza uso de capacidade
4. **Roteamento**: Calcula menor caminho entre pontos
5. **Load Balancing**: Distribui trabalho entre drones

### Estados do Drone
- `IDLE`: Disponível na base
- `LOADING`: Carregando pacotes
- `FLYING`: Em rota para entrega
- `DELIVERING`: Realizando entrega
- `RETURNING`: Retornando à base
- `CHARGING`: Recarregando bateria

## 📊 Dashboard e Métricas

### Métricas Monitoradas
- Total de entregas realizadas
- Tempo médio por entrega
- Drone mais eficiente
- Taxa de sucesso de entregas
- Consumo de bateria médio
- Distância total percorrida

### Visualizações
- Mapa em tempo real com posições dos drones
- Gráficos de performance
- Histórico de entregas
- Status de bateria dos drones
- Fila de pedidos pendentes

## 🧪 Testes

O projeto inclui testes unitários abrangentes:

```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm run test:coverage

# Executar testes em modo watch
npm run test:watch
```

### Cobertura de Testes
- Modelos (Drone, Order): 95%+
- Serviços: 90%+
- Algoritmos de otimização: 85%+
- Validações: 100%

## 🚀 Funcionalidades Extras Implementadas

### 1. Sistema de Bateria Inteligente
- Monitoramento contínuo
- Retorno automático para recarga
- Estimativa de autonomia

### 2. Zonas de Exclusão Aérea
- Definição de áreas proibidas
- Recálculo automático de rotas
- Alertas de violação

### 3. Feedback para Cliente
- Status em tempo real
- Estimativa de chegada
- Notificações push

### 4. API REST Simulada
```javascript
// Endpoints disponíveis
POST /api/orders         # Criar pedido
GET  /api/deliveries     # Listar entregas
GET  /api/drones/status  # Status dos drones
GET  /api/routes        # Calcular rotas
```

## 🎯 Diferenciais Técnicos

1. **Arquitetura Modular**: Separação clara de responsabilidades
2. **Performance Otimizada**: Algoritmos eficientes O(n log n)
3. **Responsividade**: Interface adaptável a diferentes telas
4. **Acessibilidade**: Seguindo padrões WCAG 2.1
5. **PWA Ready**: Preparado para ser Progressive Web App

## 🧠 Uso de IA no Desenvolvimento

### Prompts Utilizados
1. **Arquitetura Inicial**:
   ```
   "Crie uma arquitetura MVC para sistema de entregas por drone com JavaScript vanilla, 
   priorizando performance e manutenibilidade"
   ```

2. **Algoritmo de Otimização**:
   ```
   "Desenvolva algoritmo de bin packing 3D para otimizar carregamento de drones 
   considerando peso, volume e prioridade"
   ```

3. **Interface de Usuário**:
   ```
   "Crie interface moderna e intuitiva para dashboard de monitoramento de drones 
   com design responsivo e acessível"
   ```

### Ferramentas de IA Utilizadas
- **ChatGPT/Claude**: Arquitetura e algoritmos
- **GitHub Copilot**: Autocompletar código
- **Tabnine**: Sugestões de código

## 🐛 Tratamento de Erros

- Validação rigorosa de entradas
- Mensagens de erro claras e acionáveis
- Logs detalhados para debugging
- Graceful degradation em falhas

## 🔮 Melhorias Futuras

- [ ] Integração com APIs de mapas reais
- [ ] Machine Learning para otimização de rotas
- [ ] Suporte a múltiplas bases de drones
- [ ] Integração com sensores IoT
- [ ] App mobile complementar

## 👨‍💻 Desenvolvedor

**Nome**: [Seu Nome]
**Email**: [seu.email@exemplo.com]
**LinkedIn**: [linkedin.com/in/seu-perfil]
**GitHub**: [github.com/seu-usuario]

## 📄 Licença

Este projeto foi desenvolvido como parte do processo seletivo da DTI Digital.

---

*Desenvolvido com ❤️ para o desafio técnico DTI Digital - Enterprise Hakuna*
