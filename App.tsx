import React, { useState, useCallback, useEffect, useRef } from 'react';
import PipelineVisualizer from './components/PipelineVisualizer';
import DetailPanel from './components/DetailPanel';
import DataInspector from './components/DataInspector';
import { generateRAGResponse, generateVeoVideo } from './services/geminiService';
import { NodeType, SimulationStepDef } from './types';
import { Play, RotateCcw, ChevronRight, Terminal, Search, Zap, TrendingUp, Info, GripVertical } from 'lucide-react';

// --- E-commerce Simulation Definitions ---

const getSearchSessionSteps = (region: string): SimulationStepDef[] => [
  // --- MERCHANT ACTION ---
  { 
    stepId: 0, node: 'merchant_dashboard', edge: {from: 'merchant_dashboard', to: 'connectors'}, log: 'Merchant: Atualiza Preço',
    inspectorData: { 
      title: 'Catalog Update', 
      description: 'Lojista acessa o portal e aplica desconto de Black Friday no Notebook Gamer. Isso gera um comando de update no banco relacional.', 
      impact: 'Gatilho inicial para o pipeline de ingestão e indexação.',
      roiMetric: { label: 'Time to Web', value: '< 2s', trend: 'down' },
      data: { user: "merchant_123", action: "update_price", sku: "NB-GAMER-X", new_price: 1150 } 
    }
  },

  // --- INGESTION PHASE ---
  { 
    stepId: 1, node: 'connectors', edge: {from: 'connectors', to: 'kafka_stream'}, log: `Sync: Catálogo de Produtos (${region})`,
    inspectorData: { 
      title: 'CDC Database Sync', 
      description: 'Detectada mudança de preço no ERP. Conector dispara evento de atualização para o pipeline Kafka.', 
      impact: 'Garante que o preço na busca seja o mesmo do checkout.',
      roiMetric: { label: 'Sync Lag', value: '< 200ms', trend: 'down' },
      data: { source: "Postgres", table: "products", op: "UPDATE", sku: "NB-GAMER-X", price_old: 1200, price_new: 1150 } 
    }
  },
  { 
    stepId: 2, node: 'ml_inference', edge: {from: 'ml_inference', to: 'elasticsearch'}, log: 'ML: Gerando Embeddings',
    inspectorData: { 
      title: 'Inference Pipeline', 
      description: 'Pipeline re-processa o produto. Gera vetor denso (e5-base) e vetor esparso (ELSER) para garantir busca semântica atualizada.', 
      impact: 'Habilita busca semântica ("Notebook para jogos") mesmo se a keyword exata não existir.',
      roiMetric: { label: 'Inference Time', value: '45ms', trend: 'down' },
      data: { model: "ELSER v2 + e5-base", embedding_dim: 1024, tokens_generated: 128 } 
    }
  },
  { 
    stepId: 3, node: 'elasticsearch', edge: {from: 'ml_inference', to: 'elasticsearch'}, log: 'Elastic: Indexação Híbrida',
    inspectorData: { 
      title: 'Indexing Document', 
      description: 'Armazenando documento JSON contendo: Preço (float), Descrição (text), Vetor Denso (knn) e Vetor Esparso (rank_features).', 
      impact: 'Produto disponível para busca em < 1s após atualização.',
      roiMetric: { label: 'Refresh Rate', value: '1s', trend: 'up' },
      data: { index: "products-v4", shard: 2, doc_id: "p_9982", strategy: "Log Structured Merge" } 
    }
  },

  // --- SEARCH PHASE ---
  {
    stepId: 4, node: 'storefront_ui', log: 'User: Busca "Melhor notebook gamer"',
    inspectorData: {
        title: 'User Intent',
        description: 'Usuário digita query em linguagem natural. Frontend captura eventos de digitação.',
        impact: 'Captura de intenção de compra de alto valor.',
        roiMetric: { label: 'Est. Ticket', value: '$1,200', trend: 'up' },
        data: { query: "Melhor notebook gamer custo beneficio", device: "Desktop", session_id: "s_8821" }
    }
  },
  { 
    stepId: 5, node: 'search_api', edge: {from: 'storefront_ui', to: 'search_api'}, log: 'API: Pre-Processamento',
    inspectorData: { 
      title: 'Query Expansion', 
      description: 'API identifica "Gamer" como categoria e expande sinônimos (Notebook -> Laptop). Remove stop words.', 
      impact: 'Aumenta Recall (encontra mais produtos relevantes).',
      roiMetric: { label: 'Zero Results', value: '0%', trend: 'down' },
      data: { original: "notebook gamer", expanded: "(notebook OR laptop) AND (category:gaming OR gpu:rtx)", filters_extracted: [] } 
    }
  },
  { 
    stepId: 6, node: 'elasticsearch', edge: {from: 'search_api', to: 'elasticsearch'}, log: 'Elastic: Busca Vetorial Híbrida',
    inspectorData: { 
      title: 'Retrieval (RRF)', 
      description: 'Executando em paralelo: 1. Busca BM25 (Texto exato). 2. Busca kNN (Vetor). 3. Combinando scores com Reciprocal Rank Fusion.', 
      impact: 'Melhor dos dois mundos: Precisão da palavra-chave + Entendimento de contexto.',
      roiMetric: { label: 'Recall@50', value: '98%', trend: 'up' },
      data: { bm25_hits: 1400, knn_hits: 100, rrf_top_score: 0.95, latency: "12ms" } 
    }
  },
  { 
    stepId: 7, node: 'reranker', edge: {from: 'elasticsearch', to: 'reranker'}, log: 'ML: Semantic Reranking',
    inspectorData: { 
      title: 'Learning to Rank', 
      description: 'Analisando os Top 50 resultados com modelo Cross-Encoder pesado para reordenar por relevância estrita.', 
      impact: 'Garante que o produto mais provável de compra esteja na posição #1.',
      roiMetric: { label: 'Precision@10', value: '+15%', trend: 'up' },
      data: { input_count: 50, output_count: 10, model: "ms-marco-MiniLM-L-12-v2" } 
    }
  },

  // --- RAG PHASE ---
  { 
    stepId: 8, node: 'genai_gateway', edge: {from: 'reranker', to: 'genai_gateway'}, log: 'GenAI: Resumo de Compra',
    inspectorData: { 
      title: 'RAG Generation', 
      description: 'Enviando specs dos Top 5 produtos para o Gemini Pro gerar um "Guia de Compra" personalizado.', 
      impact: 'Aumenta confiança do usuário explicando as diferenças técnicas de forma simples.',
      roiMetric: { label: 'Time on Site', value: '+40s', trend: 'up' },
      data: { prompt_tokens: 850, model: "gemini-1.5-pro", temperature: 0.2, task: "summarize_comparison" } 
    }
  },
  { 
    stepId: 9, node: 'redis_cache', edge: {from: 'genai_gateway', to: 'redis_cache'}, log: 'Redis: Saving Response',
    inspectorData: { 
      title: 'Semantic Cache Write', 
      description: 'Salvando a resposta do LLM e o embedding da query no Redis. Próximas buscas similares serão servidas instantaneamente.', 
      impact: 'Redução de custos e latência para perguntas frequentes.',
      roiMetric: { label: 'Cache Cost Save', value: '$0.002', trend: 'up' },
      data: { key: "hash_9a8f...", ttl: "24h", embedding: "[0.1, -0.2, ...]", size: "4KB" } 
    }
  },
  { 
    stepId: 10, node: 'storefront_ui', edge: {from: 'redis_cache', to: 'storefront_ui'}, log: 'UI: Renderizando Resultados + AI',
    inspectorData: { 
      title: 'Hybrid SERP', 
      description: 'Exibindo lista de produtos reordenada + Widget de IA "Nossa Recomendação" (do cache ou live).', 
      impact: 'Experiência premium de compra.',
      roiMetric: { label: 'Conversion Rate', value: '3.2%', trend: 'up' },
      data: { components: ["ProductGrid", "AI_Summary_Widget", "Filters"], total_time: "185ms" } 
    }
  },
  
  // --- ANALYTICS LOOP ---
  { 
    stepId: 11, node: 'kibana_analytics', edge: {from: 'storefront_ui', to: 'kafka_stream'}, log: 'Kibana: Analytics de Conversão',
    inspectorData: { 
      title: 'Feedback Loop', 
      description: 'Evento "Add to Cart" capturado. Atualiza dashboard de conversão e alimenta modelo de re-ranking.', 
      impact: 'Melhora contínua do algoritmo baseada em comportamento real.',
      roiMetric: { label: 'Revenue', value: '+$1200', trend: 'up' },
      data: { event: "conversion", term: "notebook gamer", position_clicked: 1, revenue: 1150 } 
    }
  }
];

const REGIONS = ['US East (N. Virginia)', 'EU West (Ireland)', 'Asia Pacific (Tokyo)', 'South America (São Paulo)'];

const App: React.FC = () => {
  const [activeNode, setActiveNode] = useState<NodeType | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('US East (N. Virginia)');
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [animatingEdge, setAnimatingEdge] = useState<{from: string, to: string} | null>(null);
  const [inspectorData, setInspectorData] = useState<any>(null);

  // Veo Video State (Visualizing the App/Food)
  const [rerankVideoUrl, setRerankVideoUrl] = useState<string | null>(null);
  const [isGeneratingRerankVideo, setIsGeneratingRerankVideo] = useState(false);

  // Sidebar Resizing State (Horizontal)
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Bottom Panel Resizing State (Vertical)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(260);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  // --- Horizontal Resize Logic ---
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 1000) {
            setSidebarWidth(newWidth);
        }
    }
  }, [isResizing]);

  // --- Vertical Resize Logic ---
  const startResizingBottom = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
  }, []);

  const stopResizingBottom = useCallback(() => {
    setIsResizingBottom(false);
  }, []);

  const resizeBottom = useCallback((e: MouseEvent) => {
    if (isResizingBottom) {
        const newHeight = window.innerHeight - e.clientY - 24;
        if (newHeight > 150 && newHeight < window.innerHeight * 0.7) {
            setBottomPanelHeight(newHeight);
        }
    }
  }, [isResizingBottom]);

  // Unified Mouse Event Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        resize(e);
        resizeBottom(e);
    };
    const handleMouseUp = () => {
        stopResizing();
        stopResizingBottom();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resize, resizeBottom, stopResizing, stopResizingBottom]);

  const log = (msg: string) => {
    setConsoleLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 8)]); 
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setCurrentStepIndex(-1);
    setConsoleLogs([]);
    log(`Iniciando Pipeline de Busca Híbrida em ${selectedRegion}...`);
    setInspectorData(null);
    setRerankVideoUrl(null); 
    advanceStep(0); 
  };

  const advanceStep = (stepIdx: number) => {
    const steps = getSearchSessionSteps(selectedRegion);
    
    if (stepIdx >= steps.length) {
      log('Sessão de Busca Finalizada.');
      setIsSimulating(false);
      setAnimatingEdge(null);
      return;
    }

    const step = steps[stepIdx];
    setCurrentStepIndex(stepIdx);
    
    // Update UI
    setActiveNode(step.node);
    if (step.edge) {
      setAnimatingEdge({ from: step.edge.from, to: step.edge.to });
    } else {
      setAnimatingEdge(null);
    }
    
    log(step.log);
    setInspectorData(step.inspectorData);
  };

  const handleNextStep = () => {
    if (!isSimulating) return;
    advanceStep(currentStepIndex + 1);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setActiveNode(null);
    setAnimatingEdge(null);
    setCurrentStepIndex(-1);
    setInspectorData(null);
    setRerankVideoUrl(null);
    log('Sistema Reiniciado.');
  };

  const handleGenerateStorefrontVideo = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await aistudio.openSelectKey();
          }
      }

      setIsGeneratingRerankVideo(true);
      setRerankVideoUrl(null);
      log('Gerando visualização da Experiência de Busca...');
      
      // Updated prompt for E-commerce context
      const prompt = "A high-end e-commerce website interface on a monitor. Modern, clean UI. A user is typing into a large search bar. Below, product cards for 'Gaming Laptops' appear instantly with glowing AI summaries. Data streams flowing into the search bar. Tech style, blue and yellow accents.";

      try {
          const videoUrl = await generateVeoVideo(prompt, undefined, '16:9'); 
          if (videoUrl) {
              setRerankVideoUrl(videoUrl);
              log('Vídeo de UX Gerado.');
          } else {
              log('Falha ao gerar vídeo.');
          }
      } catch(e: any) {
          log('Erro ao gerar vídeo. Verifique permissões da API Key.');
          if (e.toString().includes("Requested entity was not found") && aistudio) {
             log('Solicitando nova chave...');
             await aistudio.openSelectKey();
          }
      } finally {
          setIsGeneratingRerankVideo(false);
      }
  };

  return (
    <div className={`h-screen flex flex-col font-sans text-slate-200 selection:bg-[#0077CC] selection:text-white ${isResizing || isResizingBottom ? 'select-none' : ''} ${isResizing ? 'cursor-col-resize' : ''} ${isResizingBottom ? 'cursor-row-resize' : ''}`}>
      {/* Header */}
      <header className="border-b border-tech-800 bg-tech-900 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-4">
          <div className="bg-[#0077CC] p-2 rounded-lg shadow-[0_0_15px_rgba(0,119,204,0.4)]">
             <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Elasticsearch <span className="text-[#FEC514]">Search & RAG</span> Engine
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Vector Search • ELSER • Hybrid Retrieval</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-tech-800 px-4 py-2 rounded-full border border-tech-700">
                <Terminal className="w-4 h-4 text-[#FEC514]" />
                <span className="text-xs text-slate-400 font-bold uppercase">Cluster Region:</span>
                <select 
                  value={selectedRegion} 
                  onChange={(e) => {
                      if (!isSimulating) setSelectedRegion(e.target.value);
                  }}
                  disabled={isSimulating}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer disabled:opacity-50"
                >
                    {REGIONS.map(t => <option key={t} value={t} className="text-black bg-white">{t}</option>)}
                </select>
            </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-tech-900">
        
        {/* Left: Visualization & Controls */}
        <div className="flex-1 min-w-0 flex flex-col h-full relative">
            
            {/* Top Section: Controls + Visualizer */}
            <div className="flex-1 flex flex-col min-h-0 p-6 pb-0 overflow-hidden">
                {/* Controls Bar */}
                <div className="bg-tech-800/60 backdrop-blur-md border border-tech-700 rounded-2xl p-4 flex items-center justify-between shadow-xl mb-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-tech-900 p-2 rounded-lg border border-tech-700">
                            <Zap className="w-5 h-5 text-[#FEC514]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Simulação de Query</h3>
                            <p className="text-xs text-slate-400">Fluxo: Ingestão -> Indexação -> Busca Híbrida -> RAG</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!isSimulating ? (
                            <button 
                                onClick={startSimulation}
                                className="flex items-center gap-2 px-6 py-2 bg-[#0077CC] hover:bg-[#0055aa] text-white text-sm font-bold rounded-lg transition shadow-[0_4px_14px_rgba(0,119,204,0.4)]"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Iniciar Query
                            </button>
                        ) : (
                            <>
                            <button 
                                onClick={handleNextStep}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-[#0077CC] hover:bg-slate-100 text-sm font-bold rounded-lg transition shadow-lg animate-pulse-fast"
                            >
                                Próxima Etapa <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={resetSimulation}
                                className="p-2 text-slate-400 hover:text-white hover:bg-tech-700 rounded-lg transition"
                                title="Resetar"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Visualization Stage */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Info className="w-3 h-3" /> Topology Map
                        </h2>
                        {isSimulating && (
                            <span className="text-xs bg-[#0077CC]/10 text-[#0077CC] px-3 py-1 rounded-full border border-[#0077CC]/20 font-mono font-bold">
                                STEP {currentStepIndex + 1} / {getSearchSessionSteps(selectedRegion).length}
                            </span>
                        )}
                    </div>
                    {/* The Visualizer Container */}
                    <div className="flex-1 min-h-0 relative rounded-xl border border-tech-700 overflow-hidden shadow-2xl bg-[#0d0d0f]">
                         <PipelineVisualizer 
                            activeNode={activeNode} 
                            onNodeClick={setActiveNode} 
                            activeFlow={isSimulating ? 'both' : null} 
                            animatingEdge={animatingEdge}
                         />
                    </div>
                </div>
            </div>

            {/* Vertical Resizer Handle */}
            <div 
               className={`h-4 w-full cursor-row-resize flex items-center justify-center hover:bg-[#0077CC]/10 transition-colors z-40 flex-shrink-0 group ${isResizingBottom ? 'bg-[#0077CC]/10' : ''}`}
               onMouseDown={startResizingBottom}
            >
               <div className={`w-12 h-1 rounded-full bg-tech-600 group-hover:bg-[#0077CC] transition-colors ${isResizingBottom ? 'bg-[#0077CC]' : ''}`} />
            </div>

            {/* Bottom Panels (Adjustable Height) */}
            <div 
                style={{ height: bottomPanelHeight }} 
                className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0"
            >
                {/* Data Inspector */}
                <DataInspector 
                    data={inspectorData} 
                    onGenerateVideo={handleGenerateStorefrontVideo}
                    videoUrl={rerankVideoUrl}
                    isGeneratingVideo={isGeneratingRerankVideo}
                />

                {/* Console Log */}
                <div className="bg-tech-900 border border-tech-700 rounded-xl p-0 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                    <div className="bg-tech-800 px-4 py-2 border-b border-tech-700 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-slate-300">System Logs</span>
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-tech-700">
                        {consoleLogs.map((msg, i) => (
                        <div key={i} className={`truncate font-medium ${i === 0 ? 'text-[#0077CC]' : 'text-slate-500'}`}>
                            <span className="opacity-30 mr-2">{'>'}</span>{msg}
                        </div>
                        ))}
                        {consoleLogs.length === 0 && <span className="text-slate-700 italic opacity-50">Cluster Ready. Waiting for signals.</span>}
                    </div>
                </div>
            </div>
        </div>

        {/* Resizer Handle (Horizontal) */}
        <div 
           className={`hidden lg:flex w-2 bg-tech-900 items-center justify-center cursor-col-resize hover:bg-[#0077CC]/50 transition-colors z-30 flex-shrink-0 ${isResizing ? 'bg-[#0077CC]' : ''}`}
           onMouseDown={startResizing}
        >
            <GripVertical className={`w-3 h-3 text-slate-600 ${isResizing ? 'text-white' : ''}`} />
        </div>

        {/* Right: Info Panel (Resizable) */}
        <div 
            className="h-full min-h-0 border-l border-tech-700 bg-tech-800/30 backdrop-blur-sm relative z-10 flex flex-col overflow-hidden transition-none"
            style={{ width: window.innerWidth >= 1024 ? sidebarWidth : '100%' }}
        >
          <DetailPanel nodeId={activeNode} onClose={() => setActiveNode(null)} />
        </div>

      </main>
    </div>
  );
};

export default App;