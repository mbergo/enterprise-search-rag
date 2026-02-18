import { 
  ShoppingBag, Smartphone, Store, Database, Server, 
  Cpu, Search, BarChart3, Workflow, Boxes, 
  Zap, BrainCircuit, Globe, Filter, Sparkles,
  Users, Briefcase, Settings, HardDrive
} from 'lucide-react';
import { PipelineNodeDef, PipelineEdgeDef, NodeDetail } from './types';

export const NODES: PipelineNodeDef[] = [
  // --- Frontend (Top) ---
  { id: 'storefront_ui', label: 'Web Storefront', x: 100, y: 50, icon: Globe, description: 'Next.js App. Barra de busca com Typeahead preditivo e resultados instantâneos.', category: 'frontend' },
  { id: 'mobile_app', label: 'iOS/Android App', x: 400, y: 50, icon: Smartphone, description: 'Busca por voz e visual (Image Search) integrada.', category: 'frontend' },
  { id: 'merchant_dashboard', label: 'Painel Lojista', x: 900, y: 50, icon: Store, description: 'Analytics de termos sem resultado e gestão de catálogo.', category: 'frontend' },

  // --- Search Intelligence (Middle) ---
  { id: 'search_api', label: 'Search API', x: 250, y: 220, icon: Search, description: 'Orquestrador de Consultas. Expansão de queries e filtros.', category: 'search_core' },
  { id: 'reranker', label: 'Semantic Reranker', x: 500, y: 220, icon: Filter, description: 'Learning to Rank (LTR). Reordena Top-N resultados por relevância semântica.', category: 'search_core' },
  { id: 'genai_gateway', label: 'RAG Service', x: 750, y: 220, icon: Sparkles, description: 'LLM Gateway. Gera guias de compra e resumos comparativos.', category: 'search_core' },

  // --- Data & Infra (Bottom) ---
  { id: 'connectors', label: 'Data Connectors', x: 50, y: 400, icon: Boxes, description: 'Sync Postgres/MySQL -> Elastic.', category: 'data_ops' },
  { id: 'kafka_stream', label: 'Kafka Buffer', x: 250, y: 400, icon: Workflow, description: 'Stream de Catálogo e Eventos de Usuário.', category: 'data_ops' },
  { id: 'ml_inference', label: 'ML Inference Node', x: 450, y: 400, icon: BrainCircuit, description: 'Geração de Embeddings (E5) e Sparse Vectors (ELSER).', category: 'data_ops' },
  { id: 'elasticsearch', label: 'Elasticsearch Cluster', x: 650, y: 400, icon: Database, description: 'Motor Híbrido: BM25 + kNN + ES|QL. Sharding & Replication.', category: 'data_ops' },
  { id: 'redis_cache', label: 'Redis Cache', x: 900, y: 220, icon: HardDrive, description: 'Cache Semântico para respostas de RAG. Reduz custos de LLM.', category: 'data_ops' },
  { id: 'kibana_analytics', label: 'Kibana', x: 1100, y: 400, icon: BarChart3, description: 'Dashboards de Conversão e Latência.', category: 'data_ops' },

  // --- Business / Teams (Right) ---
  { id: 'team_search', label: 'Search Engineers', x: 1200, y: 150, icon: Cpu, description: 'Tuning de Relevância e Infra.', category: 'business' },
  { id: 'team_merchandising', label: 'Merchandising', x: 1200, y: 300, icon: ShoppingBag, description: 'Regras de Negócio e Boosts.', category: 'business' },
];

export const EDGES: PipelineEdgeDef[] = [
  // Merchant Flow (New)
  { from: 'merchant_dashboard', to: 'connectors', activeInFlow: true, payloadInfo: 'Catalog Update (SQL)' },
  { from: 'merchant_dashboard', to: 'search_api', activeInFlow: false, payloadInfo: 'Merchandising Rules' },
  { from: 'kibana_analytics', to: 'merchant_dashboard', activeInFlow: false, payloadInfo: 'Insights API' },

  // Ingestion Flow
  { from: 'connectors', to: 'kafka_stream', activeInFlow: true, payloadInfo: 'CDC: Product Update' },
  { from: 'kafka_stream', to: 'ml_inference', activeInFlow: true, payloadInfo: 'Pipeline Ingest' },
  { from: 'ml_inference', to: 'elasticsearch', activeInFlow: true, payloadInfo: 'Index: Docs + Vectors' },

  // Search Flow
  { from: 'storefront_ui', to: 'search_api', activeInFlow: true, payloadInfo: 'Query: "Gaming Laptop"' },
  { from: 'mobile_app', to: 'search_api', activeInFlow: true, payloadInfo: 'Query: Voice/Image' },
  
  { from: 'search_api', to: 'ml_inference', activeInFlow: true, payloadInfo: 'Encode Query' },
  { from: 'ml_inference', to: 'elasticsearch', activeInFlow: true, payloadInfo: 'Hybrid Search (kNN + BM25)' },
  
  { from: 'elasticsearch', to: 'reranker', activeInFlow: true, payloadInfo: 'Top 50 Hits' },
  { from: 'reranker', to: 'genai_gateway', activeInFlow: true, payloadInfo: 'Top 10 (Context)' },
  { from: 'genai_gateway', to: 'redis_cache', activeInFlow: true, payloadInfo: 'Cache Write' },
  { from: 'redis_cache', to: 'storefront_ui', activeInFlow: true, payloadInfo: 'JSON: AI Response' },

  // Analytics Loop
  { from: 'storefront_ui', to: 'kafka_stream', activeInFlow: true, payloadInfo: 'Event: Click/Buy' },
  { from: 'elasticsearch', to: 'kibana_analytics', activeInFlow: true, payloadInfo: 'Logs & Metrics' },

  // Team Interactions (Dashed)
  { from: 'team_search', to: 'elasticsearch', activeInFlow: false },
  { from: 'team_search', to: 'ml_inference', activeInFlow: false },
  { from: 'team_merchandising', to: 'kibana_analytics', activeInFlow: false },
  { from: 'team_merchandising', to: 'search_api', activeInFlow: false },
];

export const NODE_DETAILS: Record<string, NodeDetail> = {
  merchant_dashboard: {
    title: 'Portal do Lojista (B2B)',
    subtitle: 'Gestão de Catálogo & Analytics',
    content: `**Fluxo de Ingestão**:
O lojista cadastra ou atualiza produtos. Essas mudanças são gravadas no banco relacional e capturadas pelos **Connectors** (CDC) para indexação quase real-time.

**Search Analytics (Insights)**:
O portal consome dados agregados do Kibana/Elastic para mostrar:
*   **Termos sem resultado**: "O que meus clientes buscam e eu não tenho?"
*   **Taxa de Conversão**: Quais produtos estão tendo views mas não vendas.

**Merchandising Self-Service**:
Configuração de regras de negócio:
*   **Boosting**: "Promover Tênis Nike no topo".
*   **Pinning**: "Fixar iPhone 15 na posição 1".
*   **Banners**: Associar banners a termos de busca.`,
    algorithms: ['Rule-based Ranking', 'Aggregation Queries'],
    techStack: ['React', 'Next.js', 'Elastic Charts'],
    keyConcepts: ['Self-Service Merchandising', 'Zero Results Analysis', 'Catalog Lifecycle'],
    kpis: ['Time-to-Market < 1min', 'Satisfação do Lojista (NPS)']
  },
  redis_cache: {
    title: 'Redis Semantic Cache',
    subtitle: 'Low-Latency RAG & Cost Optimization',
    content: `**Semantic Caching**:
Armazena pares de (Query Embedding, LLM Response).
Quando uma nova query chega, calculamos a similaridade de cosseno com as chaves no cache. Se \`similarity > 0.9\`, retornamos a resposta em cache, economizando uma chamada ao LLM.

**Architecture**:
*   **Write-Through**: Atualiza o cache assim que o LLM gera a resposta.
*   **TTL (Time-To-Live)**: Dados expiram em 24h para garantir frescor.

**Benefits**:
*   **Latência**: < 5ms (Cache) vs 1.5s (LLM).
*   **Custo**: Redução de ~30% em tokens de saída.`,
    algorithms: ['Cosine Similarity', 'Hashing', 'LRU Eviction'],
    techStack: ['Redis Stack', 'RediSearch', 'RedisJSON'],
    keyConcepts: ['Semantic Cache', 'TTL', 'Cost Optimization', 'Latency Reduction'],
    kpis: ['Hit Ratio 40%', 'Latência p99 < 5ms']
  },
  elasticsearch: {
    title: 'Elasticsearch Cluster (Layer de Dados)',
    subtitle: 'Motor de Busca Híbrido & Vector DB Distribuído',
    content: `**Core Engine & Distributed Systems**:
O Elasticsearch opera como um sistema distribuído baseado no Lucene. Ele gerencia a **Indexação de Dados** e **Querying** em escala.

**Search Algorithms (Híbrido)**:
*   **Lexical (BM25)**: Variação probabilística do TF-IDF. Otimizado para *Exact Match* (ex: SKU, Marca).
*   **Vector Space Model (HNSW)**: Indexação de vetores densos usando *Hierarchical Navigable Small Worlds* para busca aproximada (ANN).
*   **Reciprocal Rank Fusion (RRF)**: Algoritmo de normalização que combina o score do BM25 com o score de similaridade de cosseno (Vector) para um ranking unificado.

**Scalability & Vector DB Sharding**:
Os índices são divididos em **Shards**. Cada shard contém um grafo HNSW e um índice invertido. 
*   **Routing**: Garante que documentos de um mesmo "Tenant" fiquem no mesmo shard.
*   **Replication**: Réplicas primárias para escrita, réplicas secundárias para escalar leitura (Throughput).`,
    algorithms: ['Okapi BM25 (TF-IDF Variant)', 'HNSW (Vector Graph)', 'RRF (Hybrid Fusion)'],
    techStack: ['Elasticsearch 8.x', 'Lucene', 'JDK 21'],
    keyConcepts: ['Vector DB Sharding', 'Inverted Index', 'Distributed Consensus (Zen)', 'Near Real-Time (NRT)'],
    kpis: ['99.99% Availability', '<20ms Latência (p95)', '100M+ Docs']
  },
  ml_inference: {
    title: 'Nó de Inferência ML',
    subtitle: 'ELSER & Dense Embedding Generation',
    content: `**ML Model Deployment**:
Infraestrutura para servir modelos transformadores otimizados para busca.

**ELSER (Elastic Learned Sparse EncodeR)**:
A grande vantagem competitiva da Elastic. Diferente de vetores densos (que são "caixas pretas"), o ELSER realiza **Expansão Semântica** interpretável.
*   **Vocabulary Mismatch**: Resolve o problema onde o usuário busca "tênis de corrida" e o produto é "calçado para maratona". O ELSER expande os termos semanticamente, ativando tokens relacionados no espaço vetorial esparso.
*   **Zero-Shot Retrieval**: Modelo pré-treinado que performa bem em qualquer domínio sem necessidade de fine-tuning oneroso.
*   **Mecanismo**: Gera um vetor esparso (Rank Features) onde cada dimensão é um termo latente com um peso, permitindo match rápido via índice invertido.

**Dense Embeddings**:
*   **e5-base / Gecko**: Convertem texto em vetores de 768/1024 dimensões para capturar intenção profunda.

**Performance & Scale**:
Uso de **Quantização (int8)** para reduzir o tamanho do modelo na memória e acelerar a inferência sem perda significativa de precisão (Recall).`,
    algorithms: ['ELSER (Learned Sparse)', 'Transformer Encoders', 'Model Quantization', 'Sparse Retrieval'],
    techStack: ['PyTorch', 'ONNX Runtime', 'Elastic ML Nodes'],
    keyConcepts: ['Semantic Expansion', 'Vocabulary Mismatch', 'Zero-shot Learning', 'Sparse vs Dense'],
    kpis: ['1500 docs/seg (Throughput)', 'Zero-shot Learning']
  },
  reranker: {
    title: 'Semantic Reranker',
    subtitle: 'Precision Ranking & Cross-Encoders',
    content: `**2nd Stage Ranking**:
O Elasticsearch (1st Stage) foca em **Recall** (encontrar candidatos). O Reranker foca em **Precision** (ordenar perfeitamente).

**Architecture: Cross-Encoder vs Bi-Encoder**:
*   **Bi-Encoder (Elasticsearch)**: Calcula vetores de Query e Documento *separadamente*. Rápido (ANN), mas perde nuances de interação termo-a-termo.
*   **Cross-Encoder (Reranker)**: Alimenta a Query e o Documento *juntos* na rede neural (ex: BERT).
    *   *Input*: \`[CLS] Query [SEP] Document [SEP]\`.
    *   *Mecanismo*: As camadas de *Self-Attention* analisam a interação de cada palavra da query com cada palavra do documento.
    *   *Resultado*: Score de relevância extremamente preciso (0 a 1).

**Trade-off de Performance**:
Cross-Encoders são computacionalmente caros. Não é viável rodar em 1M de documentos.
*   *Estratégia*: Elastic recupera Top 50 -> Reranker reordena Top 50 -> Retorna Top 10 para o usuário.

**Learning to Rank (LTR)**:
Combina o score semântico (Cross-Encoder) com features de negócio (Preço, Popularidade, Margem) usando modelos como XGBoost (LambdaMART).`,
    algorithms: ['Cross-Encoder (BERT/RoBERTa)', 'Learning to Rank (LambdaMART)', 'ListMLE'],
    techStack: ['Python', 'Triton Inference Server', 'Hugging Face Transformers'],
    keyConcepts: ['Relevance Tuning', 'Precision vs Recall', 'Cross-Encoder vs Bi-Encoder', 'Distillation'],
    kpis: ['+8% CTR na Posição 1', '100ms Latência Adicional', 'NDCG@10 Score']
  },
  search_api: {
    title: 'Search API Orchestrator',
    subtitle: 'API Integration & Query Understanding',
    content: `**API Gateway & Composition**:
Ponto de entrada REST/GraphQL. Responsável por "Hydration" (buscar preços em tempo real no Redis) e "Policy" (Circuit Breakers).

**Search Relevance Tuning (Pre-Query)**:
*   **Query Understanding**: Detecta intenção (Navegacional vs Informacional).
*   **Category Prediction**: "Tênis Nike" -> Filtra \`category:shoes\` automaticamente.
*   **PageRank Concepts**: Aplica boost em produtos populares (Sales Rank) sobre o score de relevância textual.`,
    algorithms: ['Query Expansion', 'Named Entity Recognition', 'Static Rank Boosting'],
    techStack: ['Node.js', 'FastAPI', 'Redis (Cache)'],
    keyConcepts: ['API Gateway', 'Circuit Breaker', 'Query Rewriting', 'PageRank Integration'],
    kpis: ['15k QPS', 'Cache Hit Ratio 40%']
  },
  kafka_stream: {
    title: 'Kafka Event Backbone',
    subtitle: 'Data Pipeline Integration',
    content: `**Data Pipeline & Consistency**:
Garante o desacoplamento entre os sistemas de escrita (ERP/Catalog) e leitura (Search Engine).

**Distributed Systems Patterns**:
*   **Backpressure**: Buffer para picos de atualização de catálogo.
*   **Event Sourcing**: O estado do índice é uma projeção dos eventos no log do Kafka.
*   **Partitioning**: Particionamento por Product ID para garantir ordem de processamento.`,
    algorithms: ['Log Compaction', 'Partitioning', 'Consumer Groups'],
    techStack: ['Apache Kafka', 'Confluent Schema Registry'],
    keyConcepts: ['Eventual Consistency', 'Stream Processing', 'Backpressure', 'CDC'],
    kpis: ['< 2s Latência de Indexação', 'Zero Data Loss']
  },
  kibana_analytics: {
    title: 'Kibana / Analytics',
    subtitle: 'Search Quality Metrics & Observability',
    content: `**Search Quality Evaluation**:
Monitoramento contínuo da eficácia do algoritmo.

**Golden Metrics**:
*   **nDCG (Normalized Discounted Cumulative Gain)**: Mede a qualidade do ranking considerando a posição.
*   **MRR (Mean Reciprocal Rank)**: Onde aparece o primeiro resultado relevante?
*   **Zero Results Rate**: % de buscas que retornam vazio (falha de indexação ou catálogo).
*   **CTR@k**: Taxa de clique nas top k posições.

**A/B Testing**:
Comparação de performance entre o algoritmo "Baseline" (BM25) e "Challenger" (Híbrido).`,
    algorithms: ['Click Models', 'Time Series Analysis', 'Anomaly Detection'],
    techStack: ['Kibana', 'Lens', 'Elastic APM'],
    keyConcepts: ['nDCG', 'A/B Testing', 'Clickthrough Rate', 'Search Quality'],
    kpis: ['Dashboards em Tempo Real']
  },
  genai_gateway: {
    title: 'RAG & GenAI Service',
    subtitle: 'Hybrid Search Integration',
    content: `**Building a Hybrid Search (RAG)**:
Integração final onde o "Retrieval" (Elastic) encontra o "Generation" (LLM).

**Fluxo**:
1.  **Retrieve**: Elastic busca Top 5 chunks de manuais/reviews.
2.  **Augment**: Injeta chunks no Context Window do LLM.
3.  **Generate**: LLM produz resposta fundamentada.

**Desafios**:
*   **Context Window Management**: Selecionar apenas os trechos mais densos de informação.
*   **Hallucination Guardrails**: Verificar se a resposta está ancorada nos dados recuperados.`,
    algorithms: ['Chain-of-Thought', 'Prompt Engineering', 'Context Stuffing'],
    techStack: ['Gemini Pro', 'LangChain', 'Elastic Connector'],
    keyConcepts: ['RAG Pipeline', 'Context Window', 'Prompt Engineering'],
    kpis: ['+12% Conversão em Cauda Longa', '< 1.5s Tempo de Geração']
  },
  storefront_ui: {
    title: 'Storefront Web',
    subtitle: 'Client-Side Integration',
    content: `**API Integration**:
Consumo de APIs de busca com suporte a *Server-Side Rendering (SSR)* para SEO.

**Features**:
*   **Instant Search**: Resultados aparecem enquanto digita (Search-as-you-type).
*   **Filtros Dinâmicos (Facets)**: Elastic retorna agregações em tempo real (Marcas, Cores, Preços).`,
    algorithms: ['Debouncing', 'Prefetching'],
    techStack: ['React', 'Next.js', 'Vercel'],
    keyConcepts: ['Client-Side Caching', 'Optimistic UI', 'SSR'],
    crossDomainImpact: {
        inputs: [
            { source: 'GenAI Gateway', benefit: 'Exibe "Dica do Especialista" gerada por IA no topo da busca.' },
            { source: 'Elasticsearch', benefit: 'Recebe Facets e Agregações em <20ms.' }
        ],
        outputs: [
            { target: 'Kafka Buffer', improvement: 'Envia dados de clique para treinar modelos de Learning to Rank.' }
        ]
    }
  },
  connectors: {
    title: 'Connectors & Ingestion',
    subtitle: 'ETL & Data Indexing',
    content: `**Data Indexing Strategies**:
Processo de transformar dados relacionais (SQL) em documentos JSON desnormalizados para busca.

**Techniques**:
*   **Change Data Capture (CDC)**: Monitora logs de transação do banco para latência mínima.
*   **Bulk API**: Uso da API de lote do Elastic para maximizar throughput de indexação.`,
    algorithms: ['CDC (Change Data Capture)'],
    techStack: ['Elastic Agent', 'Logstash'],
    keyConcepts: ['ETL', 'Denormalization', 'Bulk Indexing'],
    kpis: ['10M SKUs Sincronizados']
  },
  mobile_app: { title: 'App Mobile', subtitle: 'Canal Nativo', content: 'Foco em busca visual e voz.', algorithms: [], techStack: ['Flutter'] },
  team_search: { title: 'Time de Engenharia', subtitle: 'Search Ops', content: 'Mantém o cluster saudável e ajusta pesos de relevância.', algorithms: [], techStack: [] },
  team_merchandising: { title: 'Time de Negócios', subtitle: 'Estratégia', content: 'Define campanhas e regras de "Pinning" (fixar produtos no topo).', algorithms: [], techStack: [] },
};