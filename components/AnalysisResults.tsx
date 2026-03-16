import React, { useState, useEffect, useMemo } from 'react';
import TopicCard from './TopicCard';
import type { GroupedAnalysisResultTopic, OriginalScores } from '../types';
import { DownloadIcon, PlusCircleIcon, EyeIcon, ImageIcon, SearchIcon, ArrowLeftIcon, ArrowRightIcon } from './icons';
import { fileToBase64, normalizeString } from '../utils/fileUtils';

interface AnalysisResultsProps {
    results: GroupedAnalysisResultTopic[];
    onUpdateGroup: (updatedTopic: GroupedAnalysisResultTopic) => void;
    onDeleteGroup: (idToDelete: string) => void;
    onDownloadReanalysis: () => void;
    onDownloadPMQ: () => void;
    onPreview: () => void;
    onAddNewGroup: () => void;

    sessionName?: string | null;
    newlyAddedTopicId: string | null;
    onImagePreview: (url: string) => void;
    entityLogo: string | null;
    onLogoUpload: (base64: string | null) => void;
    originalScores: OriginalScores | null;
    scrollToTop: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
    results,
    onUpdateGroup,
    onDeleteGroup,
    onDownloadReanalysis,
    onDownloadPMQ,
    onPreview,
    onAddNewGroup,

    sessionName,
    newlyAddedTopicId,
    onImagePreview,
    entityLogo,
    onLogoUpload,
    originalScores,
    scrollToTop,
}) => {
    const logoInputRef = React.useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const allCriteria = useMemo(() => results.flatMap(g => g.criteria), [results]);
    const selectedCount = allCriteria.filter(c => c.isSelected).length;
    const unselectedCount = allCriteria.length - selectedCount;


    const handleLogoUploadClick = () => {
        logoInputRef.current?.click();
    };

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('O arquivo de logo deve ser menor que 2MB.');
                return;
            }
            if (['image/png', 'image/jpeg'].includes(file.type)) {
                const base64 = await fileToBase64(file);
                onLogoUpload(`data:${file.type};base64,${base64}`);
            } else {
                alert('Por favor, selecione um arquivo de imagem (PNG ou JPG).');
            }
        }
        if (logoInputRef.current) logoInputRef.current.value = "";
    };

    const { newAvaliacaoScore, newEssentialScore } = useMemo(() => {
        if (!originalScores || allCriteria.length === 0) {
            return { newAvaliacaoScore: 100, newEssentialScore: 100 };
        }
        const totalCriteria = allCriteria.length;
        const unselectedCriteriaCount = allCriteria.filter(c => !c.isSelected).length;

        const totalPenaltyEssential = 100 - originalScores.essenciais;
        const penaltyPerCriterionEssential = totalCriteria > 0 ? totalPenaltyEssential / totalCriteria : 0;
        const currentEssentialScore = 100 - (unselectedCriteriaCount * penaltyPerCriterionEssential);

        const totalPenaltyAvaliacao = 100 - originalScores.avaliacao;
        const penaltyPerCriterionAvaliacao = totalCriteria > 0 ? totalPenaltyAvaliacao / totalCriteria : 0;
        const currentAvaliacaoScore = 100 - (unselectedCriteriaCount * penaltyPerCriterionAvaliacao);

        return {
            newAvaliacaoScore: Math.min(100, currentAvaliacaoScore),
            newEssentialScore: Math.min(100, currentEssentialScore),
        };

    }, [allCriteria, originalScores]);


    const filteredResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return results;
        }
        const normalizedQuery = normalizeString(searchQuery);

        return results
            .map(group => {
                const matchingCriteria = group.criteria.filter(criterion =>
                    normalizeString(criterion.observacao_auditor).includes(normalizedQuery) ||
                    normalizeString(criterion.criterio_nao_atendido).includes(normalizedQuery)
                );

                if (normalizeString(group.titulo).includes(normalizedQuery) || normalizeString(group.tag).includes(normalizedQuery)) {
                    return group;
                } else if (matchingCriteria.length > 0) {
                    return { ...group, criteria: matchingCriteria };
                }
                return null;
            })
            .filter((g): g is GroupedAnalysisResultTopic => g !== null);

    }, [results, searchQuery]);


    const groupedResultsByPrincipal = React.useMemo(() => {
        const groups: Record<string, GroupedAnalysisResultTopic[]> = {};

        filteredResults.forEach(topic => {
            const mainTitle = topic.titulo_principal || 'Outros Tópicos';
            if (!groups[mainTitle]) {
                groups[mainTitle] = [];
            }
            groups[mainTitle].push(topic);
        });

        Object.values(groups).forEach(topics => {
            topics.sort((a, b) => a.titulo.localeCompare(b.titulo, undefined, { numeric: true }));
        });

        return Object.entries(groups).sort(([titleA], [titleB]) => {
            const getNum = (str: string) => {
                const match = str.match(/^(\d+)/);
                return match ? parseInt(match[1], 10) : Infinity;
            };
            const numA = getNum(titleA);
            const numB = getNum(titleB);

            if (numA !== numB) {
                return numA - numB;
            }
            return titleA.localeCompare(titleB);
        });
    }, [filteredResults]);

    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        if (groupedResultsByPrincipal.length > 0 && !groupedResultsByPrincipal.some(([title]) => title === activeTab)) {
            setActiveTab(groupedResultsByPrincipal[0][0]);
        } else if (groupedResultsByPrincipal.length === 0) {
            setActiveTab('');
        }
    }, [groupedResultsByPrincipal, activeTab]);

    // Effect to auto-switch tab and scroll when a new topic is added
    useEffect(() => {
        if (newlyAddedTopicId) {
            const group = results.find(r => r.id === newlyAddedTopicId);
            if (group) {
                // If the new topic is in a different tab, switch to it
                if (group.titulo_principal !== activeTab) {
                    setActiveTab(group.titulo_principal);
                }
                // Note: TopicCard handles its own scrollIntoView, 
                // but switching the tab ensures it's rendered to be scrolled to.
            }
        }
    }, [newlyAddedTopicId, results, activeTab]);

    const activeGroupOfTopics = groupedResultsByPrincipal.find(([title]) => title === activeTab)?.[1] || [];
    const activeTabIndex = useMemo(() => groupedResultsByPrincipal.findIndex(([title]) => title === activeTab), [activeTab, groupedResultsByPrincipal]);

    const handleNavClick = (direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev' ? activeTabIndex - 1 : activeTabIndex + 1;
        if (newIndex >= 0 && newIndex < groupedResultsByPrincipal.length) {
            setActiveTab(groupedResultsByPrincipal[newIndex][0]);
            scrollToTop(); // Smooth scroll to top when navigating via buttons
        }
    };

    const handleTabClick = (title: string) => {
        setActiveTab(title);
        scrollToTop(); // Smooth scroll to top when switching tabs
    };

    const handleAddNewTopicWithSearchClear = () => {
        if (searchQuery) {
            setSearchQuery('');
        }
        onAddNewGroup();
        // Auto scroll will be handled by the useEffect observing newlyAddedTopicId
    };

    return (
        <div className="space-y-8">
            {/* Main Title */}
            <div className="pb-2">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">Análise de Relatórios TCE/MA</h2>
                <p className="text-sm text-gray-500">Gerenciamento de justificativas e evidências</p>
            </div>

            {/* Dashboard Header Card */}
            <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">

                    {/* Entity Info */}
                    <div className="flex items-center">
                        <input
                            type="file"
                            ref={logoInputRef}
                            onChange={handleLogoFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg"
                        />
                        <div className="relative group mr-5">
                            {entityLogo ? (
                                <img
                                    src={entityLogo}
                                    alt="Logo"
                                    className="w-16 h-16 object-contain rounded-lg shadow-sm border border-gray-100 bg-white"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}
                            <div
                                className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                onClick={handleLogoUploadClick}
                            >
                                <span className="text-xs text-white font-medium">Alterar</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    PNTP 2024
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{sessionName || 'Análise Sem Título'}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Tribunal de Contas do Estado do Maranhão</p>
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="flex space-x-8 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8">
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Avaliação Final</p>
                            <div className="flex items-baseline justify-end space-x-2">
                                <span className="text-3xl font-bold font-display text-gray-900">
                                    {newAvaliacaoScore.toFixed(2).replace('.', ',')}%
                                </span>
                                {originalScores && (
                                    <span className="text-xs text-gray-400 line-through decoration-red-400">
                                        {originalScores.avaliacao.toFixed(2).replace('.', ',')}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Essenciais</p>
                            <div className="flex items-baseline justify-end space-x-2">
                                <span className={`text-3xl font-bold font-display ${newEssentialScore >= 100 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                    {newEssentialScore.toFixed(2).replace('.', ',')}%
                                </span>
                                {originalScores && (
                                    <span className="text-xs text-gray-400 line-through decoration-red-400">
                                        {originalScores.essenciais.toFixed(2).replace('.', ',')}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Controls & Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Search */}
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Filtrar tópicos e critérios..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow shadow-sm"
                        />
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleAddNewTopicWithSearchClear}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2 text-gray-400" />
                        Novo Tópico
                    </button>
                </div>

                {/* Clean Tabs */}
                {groupedResultsByPrincipal.length > 0 && (
                    <div className="border-b border-gray-200 overflow-x-auto">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            {groupedResultsByPrincipal.map(([title]) => (
                                <button
                                    key={title}
                                    onClick={() => handleTabClick(title)}
                                    className={`whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === title
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {title.replace(/^\d+\s*-\s*/, '')}
                                </button>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Main Content Area with Fade Transition */}
            <div className="min-h-[300px]">
                <div key={activeTab} className="space-y-6 animate-fade-in duration-200">
                    {results.length > 0 ? (
                        activeGroupOfTopics.length > 0 ? (
                            activeGroupOfTopics.map(topic => {
                                const hasUnattended = topic.criteria.some(c => !c.isSelected);
                                return (
                                    <TopicCard
                                        key={topic.id}
                                        topic={topic}
                                        onUpdateTopic={onUpdateGroup}
                                        onDeleteTopic={onDeleteGroup}
                                        isNewlyAdded={topic.id === newlyAddedTopicId}
                                        onImagePreview={onImagePreview}
                                        hasUnattended={hasUnattended}
                                    />
                                )
                            })
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                                <div className="mx-auto h-12 w-12 text-gray-300 flex items-center justify-center rounded-full bg-gray-50 mb-3">
                                    <SearchIcon className="h-6 w-6" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
                                <p className="mt-1 text-sm text-gray-500">{searchQuery ? 'Tente ajustar os filtros de busca.' : 'Selecione outra aba ou adicione um tópico.'}</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Aguardando dados...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {activeGroupOfTopics.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                        onClick={() => handleNavClick('prev')}
                        disabled={activeTabIndex <= 0}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Anterior
                    </button>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Seção {activeTabIndex + 1} de {groupedResultsByPrincipal.length}
                    </span>
                    <button
                        onClick={() => handleNavClick('next')}
                        disabled={activeTabIndex >= groupedResultsByPrincipal.length - 1}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Próximo
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </button>
                </div>
            )}

            {/* Floating Action Bar (Sticky Bottom) */}
            <div className="sticky bottom-4 z-20 bg-white/90 backdrop-blur-md border border-gray-200 shadow-float rounded-2xl p-3 px-6 mx-auto max-w-fit flex items-center gap-4 animate-fade-in-up">


                <button
                    onClick={onPreview}
                    disabled={selectedCount === 0}
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-brand-600 px-2 py-1 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50"
                >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Visualizar ({selectedCount})
                </button>

                <button
                    onClick={onDownloadPMQ}
                    disabled={unselectedCount === 0}
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-amber-600 px-2 py-1 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    PMQ
                </button>

                <button
                    onClick={onDownloadReanalysis}
                    disabled={selectedCount === 0}
                    className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Baixar Reanálise ({selectedCount})
                </button>
            </div>
        </div>
    );
};

export default AnalysisResults;