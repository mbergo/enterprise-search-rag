import React, { useState, useRef, useEffect } from 'react';
import { NODES, EDGES } from '../constants';
import { NodeType, PipelineNodeDef } from '../types';
import { Eye, EyeOff, Maximize2, X, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

interface PipelineVisualizerProps {
  activeNode: NodeType | null;
  onNodeClick: (node: NodeType) => void;
  activeFlow: any; 
  animatingEdge: { from: string; to: string } | null;
}

// Elasticsearch Theme Styles
const CATEGORY_STYLES = {
  frontend: {
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    activeBorder: 'border-white',
    icon: 'text-white',
    glow: 'shadow-white/20',
    label: 'text-slate-200'
  },
  search_core: {
    bg: 'bg-[#0077CC]/20', // Elastic Blue tint
    border: 'border-[#0077CC]/50',
    activeBorder: 'border-[#0077CC]',
    icon: 'text-[#0077CC]',
    glow: 'shadow-[#0077CC]/40',
    label: 'text-blue-100'
  },
  data_ops: {
    bg: 'bg-[#FEC514]/10', // Elastic Yellow tint
    border: 'border-[#FEC514]/40',
    activeBorder: 'border-[#FEC514]',
    icon: 'text-[#FEC514]', 
    glow: 'shadow-[#FEC514]/20',
    label: 'text-yellow-100'
  },
  business: {
    bg: 'bg-slate-700/50',
    border: 'border-slate-500/50',
    activeBorder: 'border-slate-400',
    icon: 'text-slate-400',
    glow: 'shadow-slate-500/40',
    label: 'text-slate-300'
  }
};

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ 
  activeNode, 
  onNodeClick, 
  animatingEdge 
}) => {
  const [showPayloads, setShowPayloads] = useState(true);
  const [nodes, setNodes] = useState<PipelineNodeDef[]>(NODES);
  
  // Viewport State
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });

  // Interaction State
  const [expandedNodeId, setExpandedNodeId] = useState<NodeType | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: NodeType; startX: number; startY: number; initialNodeX: number; initialNodeY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom Factor
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(0.4, view.zoom + delta), 3);
    
    // Calculate new position to keep mouse over same world point
    const worldX = (mouseX - view.x) / view.zoom;
    const worldY = (mouseY - view.y) / view.zoom;
    
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    setView({ x: newPanX, y: newPanY, zoom: newZoom });
  };

  const handleManualZoom = (delta: number) => {
      const newZoom = Math.min(Math.max(0.4, view.zoom + delta), 3);
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          // Zoom towards center
          const worldX = (cx - view.x) / view.zoom;
          const worldY = (cy - view.y) / view.zoom;
          const newPanX = cx - worldX * newZoom;
          const newPanY = cy - worldY * newZoom;
          setView({ x: newPanX, y: newPanY, zoom: newZoom });
      } else {
          setView(v => ({ ...v, zoom: newZoom }));
      }
  };

  const handleZoomReset = () => setView({ x: 0, y: 0, zoom: 1 });

  // --- Interaction Handlers ---

  const handleMouseDownBg = (e: React.MouseEvent) => {
      // Start Panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - view.x, y: e.clientY - view.y });
      setExpandedNodeId(null); // Collapse nodes when clicking bg
  };

  const handleMouseDownNode = (e: React.MouseEvent, node: PipelineNodeDef) => {
      e.stopPropagation(); // Stop Pan from starting
      setDraggingNode({ 
          id: node.id, 
          startX: e.clientX, 
          startY: e.clientY, 
          initialNodeX: node.x, 
          initialNodeY: node.y 
      });
  };

  const handleNodeClick = (e: React.MouseEvent, node: PipelineNodeDef) => {
      e.stopPropagation();
      // Prevent click if we were dragging
      if (draggingNode) {
          const dist = Math.abs(e.clientX - draggingNode.startX) + Math.abs(e.clientY - draggingNode.startY);
          if (dist > 5) return; // It was a drag, not a click
      }

      if (expandedNodeId === node.id) {
          onNodeClick(node.id);
      } else {
          setExpandedNodeId(node.id);
          onNodeClick(node.id); // Also select it in side panel
      }
  };

  // Global Mouse Move / Up for Dragging
  useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
          if (isPanning) {
              setView(v => ({ ...v, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
          }
          
          if (draggingNode) {
              const dx = (e.clientX - draggingNode.startX) / view.zoom;
              const dy = (e.clientY - draggingNode.startY) / view.zoom;
              
              setNodes(prev => prev.map(n => {
                  if (n.id === draggingNode.id) {
                      return { ...n, x: draggingNode.initialNodeX + dx, y: draggingNode.initialNodeY + dy };
                  }
                  return n;
              }));
          }
      };

      const handleGlobalMouseUp = () => {
          setIsPanning(false);
          setDraggingNode(null);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, [isPanning, draggingNode, view.zoom, panStart]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#0d0d0f] rounded-xl border border-tech-700 overflow-hidden shadow-2xl group select-none cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDownBg}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
             backgroundSize: '24px 24px',
             backgroundPosition: `${view.x}px ${view.y}px`,
             transform: `scale(${view.zoom})`, 
             transformOrigin: '0 0'
           }}>
      </div>

      {/* Zoom Controls (Fixed UI) */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-1 bg-tech-800 rounded-lg border border-tech-600 p-1 shadow-lg cursor-default" onMouseDown={e => e.stopPropagation()}>
          <button onClick={() => handleManualZoom(0.2)} className="p-1.5 hover:bg-tech-700 text-slate-300 rounded"><ZoomIn className="w-4 h-4"/></button>
          <button onClick={handleZoomReset} className="p-1.5 hover:bg-tech-700 text-slate-300 rounded text-[10px] font-bold font-mono text-center w-8">{Math.round(view.zoom * 100)}%</button>
          <button onClick={() => handleManualZoom(-0.2)} className="p-1.5 hover:bg-tech-700 text-slate-300 rounded"><ZoomOut className="w-4 h-4"/></button>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); setShowPayloads(!showPayloads); }}
        className="absolute top-4 right-4 z-50 p-2 bg-tech-800 hover:bg-tech-700 text-slate-400 rounded-lg border border-tech-600 transition-colors cursor-pointer"
        onMouseDown={e => e.stopPropagation()}
      >
        {showPayloads ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* World Container */}
      <div 
        style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, 
            transformOrigin: '0 0',
            width: '100%', 
            height: '100%',
            willChange: 'transform'
        }}
      >
        {/* SVG Edges */}
        <svg className="absolute top-0 left-0 w-[4000px] h-[4000px] pointer-events-none z-0 overflow-visible">
            <defs>
            <marker id="arrow-teal" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#0077CC" />
            </marker>
            <marker id="arrow-slate" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
            </marker>
            <filter id="glow-teal">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feFlood floodColor="#0077CC" result="glowColor" />
                <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow_colored" />
                <feMerge>
                <feMergeNode in="softGlow_colored"/>
                <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            </defs>

            {EDGES.map((edge, idx) => {
            const fromNode = nodes.find(n => n.id === edge.from)!;
            const toNode = nodes.find(n => n.id === edge.to)!;
            const isAnimating = animatingEdge?.from === edge.from && animatingEdge?.to === edge.to;
            
            const isBusinessEdge = fromNode.category === 'business' || toNode.category === 'business';

            // Dynamic center calculation
            const getCenter = (n: PipelineNodeDef) => {
                const isExp = expandedNodeId === n.id;
                return {
                    x: n.x + (isExp ? 128 : 40),
                    y: n.y + (isExp ? 60 : 40)
                };
            };

            const p1 = getCenter(fromNode);
            const p2 = getCenter(toNode);

            return (
                <g key={`${edge.from}-${edge.to}-${idx}`}>
                <line
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={isAnimating ? "#0077CC" : (isBusinessEdge ? "#475569" : "#334155")}
                    strokeWidth={isAnimating ? 3 : (isBusinessEdge ? 2 : 1.5)}
                    strokeDasharray={isBusinessEdge ? "8,8" : "0"}
                    markerEnd={isAnimating ? "url(#arrow-teal)" : "url(#arrow-slate)"}
                    className="transition-colors duration-300"
                    opacity={isAnimating ? 1 : (isBusinessEdge ? 0.4 : 0.3)}
                />
                {showPayloads && edge.payloadInfo && (
                    <foreignObject x={(p1.x+p2.x)/2 - 50} y={(p1.y+p2.y)/2 - 10} width="100" height="24" className="overflow-visible pointer-events-none">
                        <div className={`text-[9px] text-center px-1.5 py-0.5 rounded border backdrop-blur-md transform transition-all duration-300 font-mono font-medium truncate
                            ${isAnimating 
                                ? 'bg-[#0077CC]/80 border-blue-400 text-white scale-110 shadow-lg' 
                                : 'bg-tech-900/80 border-tech-600 text-slate-500'}
                        `}>
                            {edge.payloadInfo}
                        </div>
                    </foreignObject>
                )}
                {isAnimating && (
                    <circle r="4" fill="#fff" filter="url(#glow-teal)">
                    <animateMotion dur="1s" repeatCount="1" path={`M${p1.x},${p1.y} L${p2.x},${p2.y}`} />
                    </circle>
                )}
                </g>
            );
            })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
            const Icon = node.icon;
            const isActive = activeNode === node.id;
            const isExpanded = expandedNodeId === node.id;
            const style = CATEGORY_STYLES[node.category];
            
            // Specialized State for RAG / GenAI
            const isGenAIProcessing = node.id === 'genai_gateway' && isActive;
            
            let effectiveStyle = style;
            if (isGenAIProcessing) {
                effectiveStyle = {
                    ...style,
                    activeBorder: 'border-purple-400',
                    icon: 'text-purple-300',
                    glow: 'shadow-[0_0_30px_rgba(192,132,252,0.6)]' 
                };
            }

            return (
            <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node)}
                onClick={(e) => handleNodeClick(e, node)}
                className={`absolute flex flex-col rounded-xl cursor-pointer transition-all duration-300 ease-spring z-10 border-2 shadow-xl backdrop-blur-md overflow-hidden
                    ${isActive ? effectiveStyle.activeBorder : effectiveStyle.border}
                    ${isExpanded ? `w-64 h-auto z-50 ${effectiveStyle.bg.replace('/20','/95').replace('/10','/95')}` : `w-20 h-20 items-center justify-center ${effectiveStyle.bg}`}
                    ${isActive && !isExpanded ? `${effectiveStyle.glow} scale-110` : ''}
                    ${isExpanded ? 'shadow-2xl shadow-black/50' : ''}
                `}
                style={{ left: node.x, top: node.y }}
            >
                {isGenAIProcessing && !isExpanded && (
                    <div className="absolute -top-2 -right-2 z-20">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 items-center justify-center border border-purple-300 shadow-lg">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                          </span>
                        </span>
                    </div>
                )}

                {isExpanded ? (
                    <div className="p-4 flex flex-col h-full relative cursor-default">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedNodeId(null); }} 
                            className="absolute top-2 right-2 text-white/50 hover:text-white"
                        >
                            <X className="w-3 h-3"/>
                        </button>
                        <div className="flex items-center gap-2 mb-3">
                            <Icon className={`w-5 h-5 ${effectiveStyle.icon}`} />
                            <span className={`text-sm font-bold text-white`}>{node.label}</span>
                            {isGenAIProcessing && (
                                <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-purple-200 bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-400/50 animate-pulse">
                                    <Sparkles className="w-3 h-3" /> GEN AI
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 leading-snug mb-3 select-text">
                            {node.description}
                        </p>
                        <div className="mt-auto pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-[#0077CC] uppercase tracking-wider">
                            <Maximize2 className="w-3 h-3" /> Ver Detalhes
                        </div>
                    </div>
                ) : (
                    <>
                        <Icon className={`w-8 h-8 mb-2 ${isActive ? (isGenAIProcessing ? 'text-purple-100 animate-pulse' : 'text-white') : effectiveStyle.icon}`} />
                        <span className={`text-[9px] font-bold text-center leading-tight px-1 select-none ${isActive ? 'text-white' : effectiveStyle.label}`}>
                        {node.label}
                        </span>
                    </>
                )}
            </div>
            );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-bold uppercase tracking-wider bg-tech-900/90 border border-tech-700 p-3 rounded-lg z-0 pointer-events-none">
          <div className="flex items-center gap-2 text-white"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Frontend</div>
          <div className="flex items-center gap-2 text-[#0077CC]"><div className="w-2 h-2 rounded-full bg-[#0077CC]"></div> Search Core</div>
          <div className="flex items-center gap-2 text-[#FEC514]"><div className="w-2 h-2 rounded-full bg-[#FEC514]"></div> Infraestrutura</div>
      </div>
    </div>
  );
};

export default PipelineVisualizer;