// A resposta original da API Gemini
export interface TceApiTopic {
  titulo_principal: string;
  titulo: string;
  observacao_auditor: string;
  criterio_nao_atendido: string;
  resposta: string;
  links_referencia: string[];
}

export interface TceApiResponse {
  nome_entidade: string;
  topicos_nao_atendidos: TceApiTopic[];
  validacao: string;
  indice_atendimento_essenciais: number;
  indice_atendimento_avaliacao: number;
  classificacao_transparencia: string;
}

// O tipo de dado usado para gerenciar o estado na UI

export interface Criterion {
  id: string; // ID único para a instância do critério
  criterio_nao_atendido: string;
  observacao_auditor: string;
  resposta: string;
  links_referencia: string[];
  isSelected: boolean;
  editedResposta: string;
  images: File[];
  referenceLinks: string[];
}

export type TopicTag = 'Essencial' | 'Obrigatória' | 'Recomendada' | 'Não Classificado';

export interface GroupedAnalysisResultTopic {
  id: string; // ID único para o grupo
  titulo_principal: string;
  titulo: string;
  tag: TopicTag;
  criteria: Criterion[];
}


// Tipos para serializar o estado para o localStorage

export interface SerializableFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface SerializableCriterion {
  id: string;
  criterio_nao_atendido: string;
  observacao_auditor: string;
  resposta: string;
  links_referencia: string[];
  isSelected: boolean;
  editedResposta: string;
  images: SerializableFile[];
  referenceLinks: string[];
}

export interface SerializableGroupedAnalysisResultTopic {
  id: string;
  titulo_principal: string;
  titulo: string;
  tag: TopicTag;
  criteria: SerializableCriterion[];
}


export interface OriginalScores {
  essenciais: number;
  avaliacao: number;
  classificacao: string;
}

export interface SerializableAppState {
  analysisResults: SerializableGroupedAnalysisResultTopic[];
  validationText: string;
  entityLogo: string | null;
  originalScores: OriginalScores | null;
}


// Tipos para gerenciamento de sessões
export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: string; // ISO string
  lastModified: string; // ISO string
  fileName: string | null;
}

export interface Session extends SessionMetadata {
  appState: SerializableAppState;
}

export type SessionsDB = Record<string, Session>;