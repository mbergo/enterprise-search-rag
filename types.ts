import React from 'react';

export type NodeType = 
  // User Interfaces
  | 'storefront_ui' 
  | 'mobile_app' 
  | 'merchant_dashboard'
  
  // Data / Infrastructure
  | 'kafka_stream'      // Event Buffer
  | 'logstash_etl'      // Ingestion Pipeline
  | 'ml_inference'      // Text Embedding / ELSER
  | 'elasticsearch'     // The Core Engine (Vector Store + Search)
  | 'kibana_analytics'  // Visualization
  | 'connectors'        // Database Sync
  | 'redis_cache'       // RAG Cache
  
  // Logic & Intelligence
  | 'search_api'        // Query Construction
  | 'reranker'          // LTR / Semantic Rerank
  | 'genai_gateway'     // LLM Integration (RAG)
  
  // Business Units
  | 'team_search'
  | 'team_merchandising'
  | 'team_infra';

export interface PipelineNodeDef {
  id: NodeType;
  label: string;
  x: number;
  y: number;
  icon: React.ComponentType<any>;
  description: string;
  category: 'frontend' | 'search_core' | 'data_ops' | 'business';
}

export interface PipelineEdgeDef {
  from: NodeType;
  to: NodeType;
  label?: string;
  activeInFlow: boolean;
  payloadInfo?: string; 
}

export interface CrossDomainImpact {
  inputs: { source: string; benefit: string }[]; 
  outputs: { target: string; improvement: string }[];
}

export interface NodeDetail {
  title: string;
  subtitle: string;
  content: string; 
  algorithms: string[];
  techStack: string[];
  keyConcepts?: string[]; // New field for Interview Topics
  kpis?: string[]; 
  crossDomainImpact?: CrossDomainImpact; 
}

export interface SimulationStepData {
  title: string;
  data: Record<string, any> | string;
  description: string;
  visualType?: 'json' | 'ranking';
  impact?: string; 
  roiMetric?: { label: string; value: string; trend: 'up' | 'down' }; 
}

export interface SimulationStepDef {
  stepId: number;
  node: NodeType;
  edge?: { from: string; to: string };
  log: string;
  inspectorData?: SimulationStepData;
}