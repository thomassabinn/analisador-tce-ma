import React, { useState, useEffect, useCallback, useRef } from 'react';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import GameLoader from './components/GameLoader';
import PreviewModal from './components/PreviewModal';
import UndoToast from './components/UndoToast';
import DownloadProgressToast from './components/DownloadProgressToast';
import SessionManager from './components/SessionManager';
import ConfirmationModal from './components/ConfirmationModal';
import NotificationToast from './components/NotificationToast';
import FeedbackButton from './components/FeedbackButton';
import FeedbackModal from './components/FeedbackModal';
import { XIcon } from './components/icons';

import { analyzeTcePdf } from './services/geminiService';
import { fileToBase64, base64ToFile, generateDocxBlob } from './utils/fileUtils';
import { TOPIC_CLASSIFICATIONS } from './topicClassifications';
import type {
  GroupedAnalysisResultTopic,
  Criterion,
  TceApiResponse,
  SerializableAppState,
  SerializableFile,
  Session,
  SessionMetadata,
  SessionsDB,
  TceApiTopic,
  OriginalScores,
  SerializableGroupedAnalysisResultTopic,
  SerializableCriterion,
  TopicTag,
} from './types';

const App: React.FC = () => {
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Open by default on desktop for dashboard feel
  const [showResults, setShowResults] = useState(false);
  const [newlyAddedTopicId, setNewlyAddedTopicId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Data State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResults, setAnalysisResults] = useState<GroupedAnalysisResultTopic[]>([]);
  const [validationText, setValidationText] = useState('');
  const [entityLogo, setEntityLogo] = useState<string | null>(null);
  const [originalScores, setOriginalScores] = useState<OriginalScores | null>(null);

  // Analysis Queue State
  const [analysisQueue, setAnalysisQueue] = useState<File[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const totalQueueCount = useRef(0);

  // Session State
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [sessionNameToSave, setSessionNameToSave] = useState('');
  const [saveMode, setSaveMode] = useState<'save' | 'saveAs'>('save');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Undo Delete State
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ topic: GroupedAnalysisResultTopic; index: number; timeoutId: number } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  // Ref for scrolling main content
  const mainContentRef = useRef<HTMLElement>(null);

  // --- Scroll Lock for Modal ---
  useEffect(() => {
    if (previewImageUrl || isFeedbackModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [previewImageUrl, isFeedbackModalOpen]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Session Management ---
  const getSessionsDB = (): SessionsDB => {
    try {
      const db = localStorage.getItem('sessionsDB');
      return db ? JSON.parse(db) : {};
    } catch (e) {
      console.error("Failed to parse sessions DB from localStorage", e);
      return {};
    }
  };

  const saveSessionsDB = (db: SessionsDB) => {
    localStorage.setItem('sessionsDB', JSON.stringify(db));
    const metadata = Object.values(db).map(({ appState, ...meta }) => meta).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    setSessions(metadata);
  };

  useEffect(() => {
    const db = getSessionsDB();
    const metadata = Object.values(db).map(({ appState, ...meta }) => meta).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    setSessions(metadata);

    // Restaurar última sessão ativa se existir
    const lastActiveSessionId = localStorage.getItem('lastActiveSessionId');
    if (lastActiveSessionId && db[lastActiveSessionId]) {
      const lastSession = db[lastActiveSessionId];
      // Só restaurar se a sessão tiver resultados (análise completa ou em progresso salva)
      if (lastSession.appState.analysisResults.length > 0) {
        handleLoadSession(lastActiveSessionId);
      }
    }
  }, []);

  const saveSessionToDb = useCallback(async (data: {
    id: string | null,
    name: string,
    fileName: string | null,
    appState: {
      analysisResults: GroupedAnalysisResultTopic[],
      validationText: string,
      entityLogo: string | null,
      originalScores: OriginalScores | null,
    }
  }) => {
    const { id, name, fileName, appState: rawAppState } = data;

    const serializableImages = async (images: File[]): Promise<SerializableFile[]> => {
      return Promise.all(images.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: await fileToBase64(file),
      })));
    };

    const serializableResults = await Promise.all(
      rawAppState.analysisResults.map(async (group): Promise<SerializableGroupedAnalysisResultTopic> => ({
        ...group,
        criteria: await Promise.all(group.criteria.map(async (criterion): Promise<SerializableCriterion> => ({
          ...criterion,
          images: await serializableImages(criterion.images),
        })))
      }))
    );

    const appState: SerializableAppState = {
      ...rawAppState,
      analysisResults: serializableResults,
    };

    const db = getSessionsDB();
    const now = new Date().toISOString();
    const sessionId = id || uuidv4();

    const sessionToSave: Session = {
      id: sessionId,
      name: name,
      createdAt: db[sessionId]?.createdAt || now,
      lastModified: now,
      fileName: fileName ?? db[sessionId]?.fileName ?? null,
      appState,
    };

    db[sessionId] = sessionToSave;
    saveSessionsDB(db);

    return sessionId;
  }, []);

  const clearState = () => {
    setSelectedFile(null);
    setAnalysisResults([]);
    setValidationText('');
    setError(null);
    setCurrentSessionId(null);
    setShowResults(false);
    setEntityLogo(null);
    setOriginalScores(null);
  }

  const handleSaveSession = useCallback(async (name: string, options: { silent?: boolean } = {}) => {
    const newSessionId = await saveSessionToDb({
      id: currentSessionId,
      name,
      fileName: selectedFile?.name ?? null,
      appState: { analysisResults, validationText, entityLogo, originalScores }
    });
    setCurrentSessionId(newSessionId);
    // Salvar como última sessão ativa
    localStorage.setItem('lastActiveSessionId', newSessionId);
    if (!options.silent) {
      setNotification({ message: `Sessão "${name}" salva com sucesso!`, type: 'success' });
    }
    return newSessionId;
  }, [saveSessionToDb, currentSessionId, selectedFile, analysisResults, validationText, entityLogo, originalScores]);

  // Auto-save durante análise (isLoading)
  useEffect(() => {
    if (isLoading && currentSessionId) {
      // Salvar estado periodicamente durante a análise (mesmo sem resultados ainda)
      const autoSaveInterval = setInterval(async () => {
        const db = getSessionsDB();
        const currentSession = db[currentSessionId];
        if (currentSession) {
          // Atualizar o estado atual, mantendo o progresso
          await handleSaveSession(currentSession.name, { silent: true });
        }
      }, 5000); // Salvar a cada 5 segundos durante a análise

      return () => clearInterval(autoSaveInterval);
    }
  }, [isLoading, currentSessionId, handleSaveSession]);

  // Auto-save quando o usuário faz alterações nos resultados (debounced)
  useEffect(() => {
    if (currentSessionId && analysisResults.length > 0 && !isLoading) {
      // Debounce: salvar 2 segundos após a última alteração
      const timeoutId = setTimeout(async () => {
        const db = getSessionsDB();
        const currentSession = db[currentSessionId];
        if (currentSession) {
          await handleSaveSession(currentSession.name, { silent: true });
        }
      }, 2000); // Salvar 2 segundos após a última alteração

      return () => clearTimeout(timeoutId);
    }
  }, [analysisResults, validationText, entityLogo, originalScores, currentSessionId, isLoading, handleSaveSession]);


  const handleNewSession = useCallback(async () => {
    const isDirty = analysisResults.length > 0 || selectedFile !== null;

    if (isDirty) {
      const db = getSessionsDB();
      const currentSession = currentSessionId ? db[currentSessionId] : null;
      const name = currentSession?.name || selectedFile?.name || `Análise de ${new Date().toLocaleString('pt-BR')}`;
      await handleSaveSession(name, { silent: true });
    }

    clearState();
  }, [analysisResults.length, selectedFile, currentSessionId, handleSaveSession]);

  const handleTriggerSave = (mode: 'save' | 'saveAs') => {
    if (analysisResults.length === 0) {
      setNotification({ message: "Não há nada para salvar.", type: 'error' });
      return;
    }
    setSaveMode(mode);
    const currentName = sessions.find(s => s.id === currentSessionId)?.name ?? selectedFile?.name ?? 'Nova Análise';
    const suggestedName = mode === 'saveAs' && currentName ? `Cópia de ${currentName}` : currentName;
    setSessionNameToSave(suggestedName);
    setIsSaveModalOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (sessionNameToSave.trim()) {
      const idToSave = saveMode === 'saveAs' ? null : currentSessionId;

      const newSessionId = await saveSessionToDb({
        id: idToSave,
        name: sessionNameToSave.trim(),
        fileName: selectedFile?.name ?? null,
        appState: { analysisResults, validationText, entityLogo, originalScores }
      });

      setCurrentSessionId(newSessionId);

      const alertMessage = saveMode === 'saveAs'
        ? `Análise salva como "${sessionNameToSave.trim()}"!`
        : `Análise "${sessionNameToSave.trim()}" salva!`;

      setNotification({ message: alertMessage, type: 'success' });

      setIsSaveModalOpen(false);
      setSessionNameToSave('');
    }
  };

  const handleRenameSession = (id: string, newName: string) => {
    const db = getSessionsDB();
    if (db[id]) {
      db[id].name = newName;
      db[id].lastModified = new Date().toISOString();
      saveSessionsDB(db);
    }
  };


  const handleLoadSession = async (id: string) => {
    clearState();
    const db = getSessionsDB();
    const session = db[id];
    if (!session) {
      setError("Sessão não encontrada.");
      return;
    }

    const deserializableImages = (images: SerializableFile[]): File[] => {
      return images.map(img => base64ToFile(img.base64, img.name, img.type));
    };

    const deserializedResults: GroupedAnalysisResultTopic[] = session.appState.analysisResults.map(
      (group): GroupedAnalysisResultTopic => ({
        ...group,
        tag: group.tag || 'Não Classificado',
        criteria: group.criteria.map((criterion): Criterion => ({
          ...criterion,
          images: deserializableImages(criterion.images),
        })),
      })
    );

    setAnalysisResults(deserializedResults);
    setValidationText(session.appState.validationText);
    setEntityLogo(session.appState.entityLogo || null);
    setOriginalScores(session.appState.originalScores || null);
    setCurrentSessionId(id);

    // Salvar como última sessão ativa
    localStorage.setItem('lastActiveSessionId', id);

    // Animate results in
    setTimeout(() => setShowResults(true), 50);
  };

  const handleDeleteSession = useCallback((id: string) => {
    const sessionName = sessions.find(s => s.id === id)?.name || 'esta sessão';
    setConfirmation({
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir "${sessionName}"? Esta ação é irreversível.`,
      onConfirm: () => {
        const db = getSessionsDB();
        delete db[id];
        saveSessionsDB(db);
        if (currentSessionId === id) {
          clearState();
        }
        setConfirmation(null);
      }
    });
  }, [sessions, currentSessionId]);


  // --- Core Analysis & Queue Logic ---
  const handleFilesSelected = (files: File[]) => {
    const MAX_QUEUE_SIZE = 5;
    if (analysisQueue.length + files.length > MAX_QUEUE_SIZE) {
      setNotification({ message: `Máximo de ${MAX_QUEUE_SIZE} arquivos na fila.`, type: 'error' });
      return;
    }
    setAnalysisQueue(prev => [...prev, ...files]);
    if (totalQueueCount.current === 0) {
      totalQueueCount.current = files.length;
    } else {
      totalQueueCount.current += files.length;
    }
  };

  useEffect(() => {
    if (!isProcessingQueue && analysisQueue.length > 0) {
      const fileToProcess = analysisQueue[0];
      processFileFromQueue(fileToProcess);
    } else if (!isProcessingQueue && analysisQueue.length === 0 && totalQueueCount.current > 0) {
      totalQueueCount.current = 0;
    }
  }, [analysisQueue, isProcessingQueue]);

  const processFileFromQueue = async (file: File) => {
    setIsProcessingQueue(true);

    if (analysisResults.length === 0) {
      clearState();
    }

    setSelectedFile(file);
    setIsLoading(true);
    const queuePosition = totalQueueCount.current - analysisQueue.length + 1;
    setLoadingMessage(`Analisando ${file.name} (${queuePosition} de ${totalQueueCount.current})...`);
    setError(null);
    setShowResults(false);

    // Criar uma sessão temporária para rastrear a análise em andamento
    const tempSessionId = uuidv4();
    const tempSessionName = `Análise: ${file.name}`;
    await saveSessionToDb({
      id: tempSessionId,
      name: tempSessionName,
      fileName: file.name,
      appState: {
        analysisResults: [],
        validationText: '',
        entityLogo: null,
        originalScores: null,
      }
    });
    setCurrentSessionId(tempSessionId);
    localStorage.setItem('lastActiveSessionId', tempSessionId);

    try {
      const base64 = await fileToBase64(file);
      setLoadingMessage(`Processando inteligência: ${file.name} (${queuePosition} de ${totalQueueCount.current})...`);
      const resultJson = await analyzeTcePdf(base64, file.type);

      const parsedResult: TceApiResponse = JSON.parse(resultJson);

      const groupTopics = (topics: TceApiTopic[]): GroupedAnalysisResultTopic[] => {
        const topicMap = new Map<string, { titulo_principal: string; criteria: Omit<Criterion, 'id' | 'links_referencia'>[] }>();

        topics.forEach(topic => {
          const key = topic.titulo;
          if (!topicMap.has(key)) {
            topicMap.set(key, {
              titulo_principal: topic.titulo_principal,
              criteria: []
            });
          }
          topicMap.get(key)!.criteria.push({
            criterio_nao_atendido: topic.criterio_nao_atendido,
            observacao_auditor: topic.observacao_auditor,
            resposta: topic.resposta,
            isSelected: true,
            editedResposta: topic.resposta.replace(/(\r\n|\n|\r)/gm, "\n").replace(/\n{5,}/g, ''),
            images: [],
            referenceLinks: topic.links_referencia || [],
          });
        });

        return Array.from(topicMap.entries()).map(([titulo, data]) => {
          const topicNumber = titulo.match(/^[\d\.]+/)?.[0] || '';
          const tag = (TOPIC_CLASSIFICATIONS[topicNumber as keyof typeof TOPIC_CLASSIFICATIONS]) || 'Não Classificado';

          return {
            id: uuidv4(),
            titulo,
            titulo_principal: data.titulo_principal,
            tag: tag as TopicTag,
            criteria: data.criteria.map(c => ({
              ...c,
              id: uuidv4(),
              links_referencia: c.referenceLinks,
            }))
          };
        });
      };

      const groupedResults = groupTopics(parsedResult.topicos_nao_atendidos);

      const sessionName = parsedResult.nome_entidade || file.name;
      const scores = {
        essenciais: parsedResult.indice_atendimento_essenciais,
        avaliacao: parsedResult.indice_atendimento_avaliacao,
        classificacao: parsedResult.classificacao_transparencia,
      };

      // Atualizar a sessão temporária com os resultados ou criar nova se necessário
      const finalSessionId = await saveSessionToDb({
        id: currentSessionId, // Usar a sessão temporária se existir
        name: sessionName,
        fileName: file.name,
        appState: {
          analysisResults: groupedResults,
          validationText: parsedResult.validacao,
          entityLogo: null,
          originalScores: scores,
        }
      });

      setCurrentSessionId(finalSessionId);
      localStorage.setItem('lastActiveSessionId', finalSessionId);

      if (analysisQueue.length === 1 || currentSessionId === null) {
        await handleLoadSession(finalSessionId);
      }

      setNotification({ message: `Análise de "${file.name}" concluída.`, type: 'success' });

    } catch (e: any) {
      setError(`Erro ao analisar "${file.name}": ${e.message || 'Erro desconhecido.'}`);
      console.error(e);
      setNotification({ message: `Falha ao analisar "${file.name}".`, type: 'error' });
    } finally {
      if (analysisQueue.length === 1) {
        setIsLoading(false);
        setLoadingMessage('');
      }
      setAnalysisQueue(prev => prev.slice(1));
      setIsProcessingQueue(false);
    }
  };


  const handleUpdateGroup = (updatedGroup: GroupedAnalysisResultTopic) => {
    setAnalysisResults(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  const handleAddNewGroup = () => {
    const newGroupId = uuidv4();
    const newGroup: GroupedAnalysisResultTopic = {
      id: newGroupId,
      titulo_principal: "Outros Tópicos",
      titulo: "Novo Tópico",
      tag: "Não Classificado",
      criteria: [{
        id: uuidv4(),
        criterio_nao_atendido: "Não especificado",
        observacao_auditor: "Critério adicionado manualmente.",
        resposta: "",
        links_referencia: [],
        isSelected: true,
        editedResposta: "",
        images: [],
        referenceLinks: [],
      }]
    };
    setAnalysisResults(prev => [newGroup, ...prev]);
    setNewlyAddedTopicId(newGroupId);
  };

  const handleDeleteGroup = useCallback((idToDelete: string) => {
    const groupIndex = analysisResults.findIndex(g => g.id === idToDelete);
    if (groupIndex === -1) return;

    const groupToDelete = analysisResults[groupIndex];

    setConfirmation({
      title: "Excluir Tópico",
      message: `Deseja remover "${groupToDelete.titulo}"?`,
      onConfirm: () => {
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }

        setAnalysisResults(prev => prev.filter(g => g.id !== idToDelete));

        const timeoutId = window.setTimeout(() => {
          setRecentlyDeleted(null);
          undoTimeoutRef.current = null;
        }, 5000);

        undoTimeoutRef.current = timeoutId;
        setRecentlyDeleted({ topic: groupToDelete, index: groupIndex, timeoutId });
        setConfirmation(null);
      }
    });
  }, [analysisResults]);

  const handleUndoDelete = () => {
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeoutId);
      setAnalysisResults(prev => {
        const newResults = [...prev];
        newResults.splice(recentlyDeleted.index, 0, recentlyDeleted.topic);
        return newResults;
      });
      setRecentlyDeleted(null);
      undoTimeoutRef.current = null;
    }
  };



  const generateAndDownloadDoc = async (
    filterCondition: (c: Criterion) => boolean,
    reportTitle: string,
    fileNameSuffix: string
  ) => {
    const allCriteria = analysisResults.flatMap(g => g.criteria);
    const includedCriteria = allCriteria.filter(filterCondition);

    if (includedCriteria.length === 0) {
      setNotification({ message: "Nenhum critério para exportar.", type: 'error' });
      return;
    }

    setIsDownloading(true);
    try {
      let newScores = null;
      if (originalScores && allCriteria.length > 0) {
        const totalCriteria = allCriteria.length;
        const unselectedCriteriaCount = allCriteria.filter(c => !c.isSelected).length;

        const totalPenaltyEssential = 100 - originalScores.essenciais;
        const penaltyPerCriterionEssential = totalCriteria > 0 ? totalPenaltyEssential / totalCriteria : 0;
        const newEssentialScore = 100 - (unselectedCriteriaCount * penaltyPerCriterionEssential);

        const totalPenaltyAvaliacao = 100 - originalScores.avaliacao;
        const penaltyPerCriterionAvaliacao = totalCriteria > 0 ? totalPenaltyAvaliacao / totalCriteria : 0;
        const newAvaliacaoScore = 100 - (unselectedCriteriaCount * penaltyPerCriterionAvaliacao);

        newScores = { essenciais: newEssentialScore, avaliacao: newAvaliacaoScore };
      }

      const filteredGroupsForDoc = analysisResults
        .map(group => ({
          ...group,
          criteria: group.criteria.filter(filterCondition)
        }))
        .filter(group => group.criteria.length > 0);

      const currentSessionName = sessions.find(s => s.id === currentSessionId)?.name;
      const blob = await generateDocxBlob(filteredGroupsForDoc, validationText, entityLogo, newScores, currentSessionName, reportTitle);
      saveAs(blob, `${fileNameSuffix}-${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error("Erro DOCX:", error);
      setNotification({ message: "Erro ao gerar arquivo.", type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadReanalysis = () => {
    generateAndDownloadDoc(
      c => c.isSelected,
      "RELATÓRIO DE JUSTIFICATIVAS (REANÁLISE)",
      "relatorio-reanalise"
    );
  };

  const handleDownloadPMQ = () => {
    generateAndDownloadDoc(
      c => !c.isSelected,
      "RELATÓRIO DE PADRÃO MÍNIMO DE QUALIDADE (PMQ)",
      "relatorio-pmq"
    );
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleFeedbackSubmit = ({ rating, text }: { rating: number; text: string }) => {
    console.log('Feedback:', { rating, text });
    setIsFeedbackModalOpen(false);
    setNotification({
      message: 'Feedback recebido. Obrigado!',
      type: 'success',
    });
  };

  const currentSessionFileName = sessions.find(s => s.id === currentSessionId)?.fileName || selectedFile?.name;
  const currentSessionName = sessions.find(s => s.id === currentSessionId)?.name;

  return (
    <div className="bg-[#F9FAFB] min-h-screen text-gray-900 font-sans flex h-screen overflow-hidden">

      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#FCFCFD] border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex-shrink-0 flex flex-col shadow-subtle`}>
        <SessionManager
          sessions={sessions}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
          onNewSession={handleNewSession}
          currentSessionId={currentSessionId}
          onRenameSession={handleRenameSession}
          onTriggerSave={handleTriggerSave}
        />
      </aside>

      {isSidebarOpen && <div onClick={handleToggleSidebar} className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-20 lg:hidden" />}

      <div className="flex-1 flex flex-col overflow-hidden bg-[#F9FAFB]">
        <Header
          currentFileName={currentSessionFileName ?? null}
          onToggleSidebar={handleToggleSidebar}
        />
        {/* Modified layout logic for centering loading screen */}
        <main ref={mainContentRef} className="flex-1 relative flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 z-10 bg-[#F9FAFB] flex items-center justify-center p-4 overflow-hidden">
              <GameLoader key="game-loader" message={loadingMessage} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
              <div className="max-w-7xl mx-auto space-y-8">
                {analysisResults.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Comece sua análise</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">Arraste seu relatório do TCE aqui para processar automaticamente os critérios e gerar sua defesa.</p>
                    <div className="max-w-xl mx-auto">
                      <FileUpload
                        onFilesSelect={handleFilesSelected}
                        disabled={isLoading}
                        maxFiles={5}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex items-center shadow-sm">
                    <span className="font-bold mr-2">Erro:</span> {error}
                  </div>
                )}

                {analysisResults.length > 0 && (
                  <div className={`transition-all duration-500 ease-out ${showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <AnalysisResults
                      results={analysisResults}
                      onUpdateGroup={handleUpdateGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onDownloadReanalysis={handleDownloadReanalysis}
                      onDownloadPMQ={handleDownloadPMQ}
                      onPreview={handlePreview}
                      onAddNewGroup={handleAddNewGroup}
                      sessionName={currentSessionName}
                      newlyAddedTopicId={newlyAddedTopicId}
                      onImagePreview={(url) => setPreviewImageUrl(url)}
                      entityLogo={entityLogo}
                      onLogoUpload={setEntityLogo}
                      originalScores={originalScores}
                      scrollToTop={scrollToTop}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {isPreviewOpen && (
        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          results={analysisResults}
          validationText={validationText}
        />
      )}

      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Salvar Análise</h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-2">Nome do Arquivo</label>
              <input
                type="text"
                id="session-name"
                value={sessionNameToSave}
                onChange={(e) => setSessionNameToSave(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
                className="block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="Ex: Relatório Prefeitura 2024"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!sessionNameToSave.trim()}
                className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal
          isOpen={!!confirmation}
          title={confirmation.title}
          message={confirmation.message}
          onConfirm={confirmation.onConfirm}
          onCancel={() => setConfirmation(null)}
        />
      )}

      <UndoToast recentlyDeleted={recentlyDeleted} onUndo={handleUndoDelete} />

      {isDownloading && <DownloadProgressToast message="Preparando seu documento..." />}

      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center bg-transparent" onClick={e => e.stopPropagation()}>
            <img src={previewImageUrl} className="block max-w-full max-h-full rounded-lg shadow-2xl ring-1 ring-white/10" alt="Evidência" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-4 -right-4 p-2 bg-white text-gray-900 rounded-full shadow-lg hover:bg-gray-100 transition-transform hover:scale-105 focus:outline-none"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <FeedbackButton onClick={() => setIsFeedbackModalOpen(true)} />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />

      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
};

export default App;