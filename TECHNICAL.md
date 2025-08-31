# Documentação Técnica - DTI Digital Drone Simulation

## Arquitetura do Sistema

### Padrão MVC Implementado

O projeto segue o padrão Model-View-Controller (MVC) com as seguintes responsabilidades:

#### Models (`src/js/models/`)
- **Order.js**: Modelo de dados para pedidos de entrega
- **Drone.js**: Modelo de dados para drones e suas operações
- **SimulationEngine.js**: Motor principal da simulação

#### Views
- **index.html**: Interface principal do usuário
- **CSS files**: Estilização e layout responsivo

#### Controllers (`src/js/controllers/`)
- **SimulationController.js**: Controlador principal que coordena toda a aplicação

### Services (`src/js/services/`)
- **DroneService.js**: Lógica de negócio para gerenciamento de drones
- **OrderService.js**: Lógica de negócio para gerenciamento de pedidos
- **OptimizationService.js**: Algoritmos avançados de otimização

### Utilities (`src/js/utils/`)
- **calculations.js**: Funções matemáticas e cálculos
- **validators.js**: Validação de dados e regras de negócio

## Fluxo de Dados

1. **Entrada**: Usuário cria pedidos e adiciona drones via interface
2. **Processamento**: SimulationEngine coordena a alocação e otimização
3. **Saída**: Interface atualizada em tempo real com status da simulação

## Algoritmos Implementados

### Otimização de Rotas
- **Nearest Neighbor**: Algoritmo guloso para roteamento básico
- **Genetic Algorithm**: Otimização evolutiva para rotas complexas
- **Simulated Annealing**: Metaheurística para escape de mínimos locais

### Alocação de Recursos
- **Bin Packing**: Empacotamento otimizado de pedidos por capacidade
- **Priority Queue**: Fila de prioridade para pedidos urgentes
- **Load Balancing**: Distribuição equilibrada entre drones

## Estados do Sistema

### Estados do Drone
- `idle`: Disponível na base
- `loading`: Carregando pacotes
- `flying`: Em rota para entrega
- `delivering`: Realizando entrega
- `returning`: Retornando à base
- `charging`: Recarregando bateria
- `maintenance`: Em manutenção
- `offline`: Desativado

### Estados do Pedido
- `pending`: Aguardando atribuição
- `assigned`: Atribuído a um drone
- `picked_up`: Coletado pelo drone
- `in_transit`: Em transporte
- `delivered`: Entregue com sucesso
- `cancelled`: Cancelado

## Regras de Negócio

### Restrições de Drone
- Capacidade máxima de carga: 50kg
- Alcance máximo: 500km
- Velocidade máxima: 200km/h
- Nível mínimo de bateria para voo: 20%
- Consumo de bateria: 2% por km

### Regras de Prioridade
- **Alta**: Processado imediatamente, multiplicador de custo 1.5x
- **Média**: Processado em ordem, multiplicador de custo 1.2x
- **Baixa**: Processado quando disponível, multiplicador padrão

### Algoritmo de Alocação
1. Ordena pedidos por score de prioridade
2. Agrupa pedidos próximos geograficamente
3. Atribui grupos aos melhores drones disponíveis
4. Calcula rotas otimizadas
5. Inicia execução da simulação

## Performance e Otimização

### Métricas Monitoradas
- **Eficiência**: Entregas por km percorrido
- **Utilização**: Percentual de tempo ativo dos drones
- **Tempo de Entrega**: Média de tempo do pedido à entrega
- **Taxa de Sucesso**: Percentual de entregas bem-sucedidas
- **Consumo de Bateria**: Otimização energética

### Algoritmos de Otimização

#### Genetic Algorithm
```javascript
População inicial → Avaliação fitness → Seleção → Crossover → Mutação → Nova geração
```
- Tamanho da população: 50 indivíduos
- Taxa de mutação: 10%
- Critério de parada: 100 gerações ou convergência

#### Simulated Annealing
```javascript
Solução inicial → Gerar vizinho → Aceitar/Rejeitar → Atualizar temperatura → Repetir
```
- Temperatura inicial: 100
- Taxa de resfriamento: 0.995
- Critério de parada: temperatura < 0.01

## Testes

### Estrutura de Testes
- **Unit Tests**: Testes individuais de cada classe e método
- **Integration Tests**: Testes de interação entre componentes
- **Performance Tests**: Testes de carga e eficiência

### Cobertura de Testes
- Models: 95%+ de cobertura
- Services: 90%+ de cobertura
- Controllers: 85%+ de cobertura
- Utilities: 100% de cobertura

### Executar Testes
```bash
# Todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## API e Integrações

### API Simulada REST
O sistema simula endpoints REST para integração externa:

```javascript
// Pedidos
POST /api/orders          // Criar pedido
GET  /api/orders          // Listar pedidos
PUT  /api/orders/:id      // Atualizar pedido
DELETE /api/orders/:id    // Cancelar pedido

// Drones
POST /api/drones          // Adicionar drone
GET  /api/drones          // Listar drones
PUT  /api/drones/:id      // Atualizar drone
DELETE /api/drones/:id    // Remover drone

// Simulação
POST /api/simulation/start     // Iniciar simulação
POST /api/simulation/pause     // Pausar simulação
POST /api/simulation/stop      // Parar simulação
GET  /api/simulation/status    // Status da simulação
```

### Integração Externa
O sistema foi projetado para integração com:
- APIs de mapas (Google Maps, OpenStreetMap)
- Sistemas de pagamento
- ERPs empresariais
- Sistemas de tracking GPS
- APIs de clima para otimização

## Configuração e Deployment

### Variáveis de Ambiente
```javascript
SIMULATION_SPEED=1          // Velocidade da simulação
MAX_DRONES=50              // Máximo de drones
MAX_ORDERS=1000            // Máximo de pedidos
UPDATE_INTERVAL=100        // Intervalo de atualização (ms)
DEBUG_MODE=false           // Modo debug
```

### Deploy
1. **Desenvolvimento**: Abrir `index.html` diretamente no navegador
2. **Produção**: Servir via servidor HTTP (nginx, Apache)
3. **Docker**: Container pronto para deploy
4. **Cloud**: Compatível com Netlify, Vercel, GitHub Pages

## Monitoramento e Logs

### Sistema de Eventos
O sistema emite eventos para monitoramento:
- `simulationStarted`
- `simulationPaused`
- `simulationStopped`
- `orderAssigned`
- `droneStatusChanged`
- `deliveryCompleted`
- `batteryLow`
- `maintenanceRequired`

### Logs Estruturados
```javascript
{
  timestamp: "2025-08-30T15:30:00Z",
  level: "INFO",
  component: "DroneService",
  event: "delivery_completed",
  data: {
    droneId: "DRN-123",
    orderId: "ORD-456",
    duration: 45,
    distance: 25.5
  }
}
```

## Segurança

### Validação de Dados
- Sanitização de entradas
- Validação de tipos e intervalos
- Proteção contra injeção de código
- Limitação de taxa de requisições

### Controle de Acesso
- Validação de permissões (simulação)
- Logs de auditoria
- Proteção de APIs sensíveis

## Troubleshooting

### Problemas Comuns

#### Simulação não inicia
1. Verificar se há drones disponíveis
2. Verificar se há pedidos pendentes
3. Verificar console para erros JavaScript

#### Performance lenta
1. Reduzir velocidade da simulação
2. Limitar número de drones/pedidos
3. Verificar recursos do sistema

#### Resultados inconsistentes
1. Verificar algoritmo de otimização selecionado
2. Verificar parâmetros de configuração
3. Consultar logs de eventos

### Debug Mode
```javascript
// Ativar modo debug
DroneSimulation.config.debug = true;

// Ver estado completo
console.log(controller.simulationEngine.getState());

// Logs detalhados
controller.simulationEngine.eventLog
```

## Extensibilidade

### Adicionando Novos Algoritmos
1. Implementar interface em `OptimizationService`
2. Adicionar configuração no sistema
3. Criar testes unitários
4. Documentar parâmetros

### Novos Tipos de Drone
1. Estender classe `Drone`
2. Adicionar validações específicas
3. Atualizar interface de usuário
4. Implementar testes

### Integração com APIs Externas
1. Criar service específico
2. Implementar tratamento de erros
3. Adicionar configuração
4. Documentar endpoints

## Contribuição

### Padrões de Código
- ES6+ JavaScript
- JSDoc para documentação
- Prettier para formatação
- ESLint para qualidade

### Workflow
1. Fork do repositório
2. Branch para feature/bugfix
3. Implementar com testes
4. Pull request com descrição detalhada
5. Code review e merge

---

**Desenvolvido para DTI Digital - Processo Seletivo 2025**
