import React, { useRef, useState, useEffect, DragEvent, useCallback, ClipboardEvent } from 'react';
import type { GroupedAnalysisResultTopic, Criterion, TopicTag } from '../types';
import { XIcon, TrashIcon, LinkIcon, WarningIcon, ClipboardIcon, ChevronDownIcon, ChevronUpIcon, ImageIcon } from './icons';

interface CriterionItemProps {
  criterion: Criterion;
  onUpdateCriterion: (updatedCriterion: Criterion) => void;
  onImagePreview: (url: string) => void;
}

const CriterionItem: React.FC<CriterionItemProps> = ({ criterion, onUpdateCriterion, onImagePreview }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [linkPreviews, setLinkPreviews] = useState<Record<number, string | null>>({});
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);

  const getFaviconUrl = useCallback((link: string): string | null => {
    let urlString = link.trim();
    if (!urlString) return null;
    if (!/^(https?:\/\/)/i.test(urlString)) {
        urlString = 'https://' + urlString;
    }
    try {
        const url = new URL(urlString);
        if (!url.hostname || url.hostname.indexOf('.') === -1) return null;
        return `https://www.google.com/s2/favicons?sz=32&domain=${url.hostname}`;
    } catch (e) {
        return null;
    }
  }, []);
  
  useEffect(() => {
    const newPreviews: Record<number, string | null> = {};
    criterion.referenceLinks.forEach((link, index) => {
        newPreviews[index] = getFaviconUrl(link);
    });
    setLinkPreviews(newPreviews);
  }, [criterion.referenceLinks, getFaviconUrl]);

  const handleToggle = (isSelected: boolean) => {
    onUpdateCriterion({ ...criterion, isSelected });
  };

  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateCriterion({ ...criterion, editedResposta: e.target.value });
  };
  
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length > 0) {
      const uniqueNewFiles = fileArray.filter(
        (file) => !criterion.images.some(existingFile => 
          existingFile.name === file.name && existingFile.size === file.size
        )
      );
      if (uniqueNewFiles.length > 0) {
        onUpdateCriterion({ ...criterion, images: [...criterion.images, ...uniqueNewFiles] });
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setDeletingImageIndex(indexToRemove);
    setTimeout(() => {
        onUpdateCriterion({
            ...criterion,
            images: criterion.images.filter((_, index) => index !== indexToRemove),
        });
        setDeletingImageIndex(null);
    }, 300);
  };

  const handleAddLink = () => {
    let linkToAdd = newLink.trim();
    if (linkToAdd) {
        if (!/^(https?:\/\/)/i.test(linkToAdd)) {
            linkToAdd = 'https://' + linkToAdd;
        }
        if (!criterion.referenceLinks.includes(linkToAdd)) {
            onUpdateCriterion({
                ...criterion,
                referenceLinks: [...criterion.referenceLinks, linkToAdd],
            });
        }
        setNewLink('');
    }
  };
  
  const handleRemoveLink = (indexToRemove: number) => {
    onUpdateCriterion({
      ...criterion,
      referenceLinks: criterion.referenceLinks.filter((_, index) => index !== indexToRemove),
    });
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isOver: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(isOver);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    handleFilesSelected(e.dataTransfer.files);
  };
  
  const handlePasteFromClipboard = async () => {
    try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' as any });
        if (permission.state === 'denied') {
            throw new Error('Permissão negada.');
        }
        const clipboardItems = await navigator.clipboard.read();
        const imageFiles: File[] = [];
        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
                    imageFiles.push(file);
                }
            }
        }
        if (imageFiles.length > 0) {
            handleFilesSelected(imageFiles);
        } else {
            alert('Nenhuma imagem encontrada na área de transferência.');
        }
    } catch (err) {
        alert('Não foi possível colar. Use Ctrl+V dentro da área de imagens.');
    }
  };

  const handlePasteEvent = (e: ClipboardEvent<HTMLDivElement>) => {
    if (e.clipboardData.files.length > 0) {
        handleFilesSelected(e.clipboardData.files);
        e.preventDefault();
    }
  };

  return (
    <div className="p-6 first:pt-0">
        {/* Header do Critério */}
        <div className="flex items-start gap-5 mb-5">
            <div className="flex-1">
                 <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Não Atendido</span>
                 </div>
                <h4 className="text-base font-semibold text-gray-900 leading-snug">{criterion.criterio_nao_atendido}</h4>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{criterion.observacao_auditor}</p>
            </div>
            
            {/* Toggle Switch */}
            <div className="flex flex-col items-end flex-shrink-0 pl-4 border-l border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Status</label>
                <div className="flex items-center cursor-pointer" onClick={() => handleToggle(!criterion.isSelected)}>
                     <span className={`mr-3 text-sm font-medium transition-colors duration-200 ${criterion.isSelected ? 'text-brand-600' : 'text-gray-400'}`}>
                        {criterion.isSelected ? 'Resolvido' : 'Pendente'}
                    </span>
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${criterion.isSelected ? 'bg-brand-600' : 'bg-gray-200'}`}>
                        <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${criterion.isSelected ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Area de Edição */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${criterion.isSelected ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                
                {/* Coluna Esquerda: Links & Imagens */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Links Section */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Links de Evidência</label>
                        <div className="space-y-2 mb-3">
                             {criterion.referenceLinks.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum link adicionado.</p>}
                            {criterion.referenceLinks.map((link, index) => (
                                <div key={index} className="group flex items-center justify-between bg-white border border-gray-200 px-3 py-2 rounded-md shadow-sm hover:border-brand-300 transition-colors">
                                    <div className="flex items-center min-w-0 overflow-hidden">
                                        <img src={linkPreviews[index] || ""} onError={(e) => e.currentTarget.style.display='none'} className="w-3.5 h-3.5 mr-2 flex-shrink-0 opacity-60" alt="" />
                                        <a 
                                            href={link} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-brand-600 hover:text-brand-800 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded px-1 truncate transition-colors"
                                        >
                                            {link}
                                        </a>
                                    </div>
                                    <button onClick={() => handleRemoveLink(index)} className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex shadow-sm">
                            <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLink()} className="flex-grow w-full px-3 py-1.5 bg-white border border-gray-300 border-r-0 rounded-l-md text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500" placeholder="Cole a URL aqui..." />
                            <button onClick={handleAddLink} className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-300 rounded-r-md hover:bg-gray-200 text-xs font-medium transition-colors">Adicionar</button>
                        </div>
                    </div>

                    {/* Images Section */}
                    <div 
                        className={`group relative bg-white rounded-lg border-2 border-dashed transition-all duration-200 ${isDraggingOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'}`}
                        onDragEnter={(e) => handleDragEvents(e, true)} 
                        onDragLeave={(e) => handleDragEvents(e, false)} 
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleDrop} 
                        onPaste={handlePasteEvent}
                    >
                        <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFilesSelected(e.target.files)} className="hidden" accept="image/*" />
                        
                        {criterion.images.length === 0 ? (
                            <div className="p-6 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-10 h-10 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-xs font-medium text-gray-900">Clique ou arraste prints</p>
                                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG (Cole com Ctrl+V)</p>
                            </div>
                        ) : (
                            <div className="p-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {criterion.images.map((image, index) => (
                                        <div key={`${image.name}-${index}`} className={`relative group/img aspect-square rounded-lg overflow-hidden border border-gray-200 ${deletingImageIndex === index ? 'opacity-0 scale-90' : ''} transition-all`}>
                                            <img 
                                                src={URL.createObjectURL(image)} 
                                                alt="" 
                                                loading="lazy"
                                                onClick={() => onImagePreview(URL.createObjectURL(image))} 
                                                className="w-full h-full object-cover cursor-zoom-in" 
                                            />
                                            <button 
                                                onClick={() => handleRemoveImage(index)} 
                                                className="absolute top-1 right-1 p-1 bg-white/90 text-gray-500 rounded shadow-sm opacity-0 group-hover/img:opacity-100 hover:text-red-500 transition-all"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition-colors">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mb-1"><span className="text-gray-500 text-lg leading-none">+</span></div>
                                        <span className="text-[10px] text-gray-400">Add</span>
                                    </button>
                                </div>
                            </div>
                        )}
                         {/* Paste Overlay Hint */}
                         {isDraggingOver && <div className="absolute inset-0 bg-brand-50/90 flex items-center justify-center rounded-lg pointer-events-none"><p className="text-brand-600 font-medium text-sm">Solte para enviar</p></div>}
                    </div>
                </div>

                {/* Coluna Direita: Texto de Defesa */}
                <div className="lg:col-span-7">
                    <div className="h-full flex flex-col">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Texto de Justificativa</label>
                        <textarea 
                            value={criterion.editedResposta} 
                            onChange={handleResponseChange} 
                            className="flex-grow w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all resize-none leading-relaxed"
                            style={{ minHeight: '200px' }}
                            placeholder="Descreva como o critério foi atendido..." 
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] text-gray-400">Suporta Markdown básico</p>
                            <div className="flex space-x-2">
                                 <button onClick={handlePasteFromClipboard} className="text-xs flex items-center text-gray-500 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-gray-100">
                                    <ClipboardIcon className="w-3 h-3 mr-1.5" />
                                    Colar Imagem
                                 </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};


interface TopicCardProps {
  topic: GroupedAnalysisResultTopic;
  onUpdateTopic: (updatedTopic: GroupedAnalysisResultTopic) => void;
  onDeleteTopic: (id: string) => void;
  isNewlyAdded?: boolean;
  onImagePreview: (url: string) => void;
  hasUnattended?: boolean;
}

const getTagStyles = (tag: TopicTag) => {
    switch (tag) {
        case 'Essencial': return 'bg-rose-50 text-rose-700 border-rose-100';
        case 'Obrigatória': return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'Recomendada': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
};

const TopicCard: React.FC<TopicCardProps> = ({ topic, onUpdateTopic, onDeleteTopic, isNewlyAdded, onImagePreview, hasUnattended }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isCollapsible = topic.criteria.length > 1;
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    if (isNewlyAdded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isNewlyAdded]);

  const handleUpdateCriterion = (updatedCriterion: Criterion) => {
    const newCriteria = topic.criteria.map(c => c.id === updatedCriterion.id ? updatedCriterion : c);
    onUpdateTopic({ ...topic, criteria: newCriteria });
  };
  
  return (
    <div ref={cardRef} className={`bg-white border border-gray-200 rounded-xl shadow-card transition-shadow duration-300 hover:shadow-md ${isNewlyAdded ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}>
      <div 
        className="px-6 py-5 flex items-center justify-between w-full cursor-pointer select-none border-b border-transparent hover:bg-gray-50/50 rounded-t-xl transition-colors"
        onClick={(e) => {
             // Só expande se clicar fora dos botões de ação
            if (!(e.target as HTMLElement).closest('button') && isCollapsible) {
                setIsExpanded(!isExpanded);
            }
        }}
      >
        <div className="flex items-center min-w-0 gap-4">
             <div 
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${hasUnattended ? 'bg-amber-50' : 'bg-gray-50'}`}
                title={hasUnattended ? "Contém pendências" : undefined}
             >
                {hasUnattended ? (
                    <WarningIcon className="w-5 h-5 text-amber-500" />
                ) : (
                   <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                )}
             </div>

            <div>
                <div className="flex items-center mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getTagStyles(topic.tag)}`}>
                        {topic.tag}
                    </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{topic.titulo}</h3>
            </div>
        </div>

        <div className="flex items-center gap-2">
             {isCollapsible && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                </button>
            )}
            <button onClick={() => onDeleteTopic(topic.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors" title="Excluir tópico">
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="border-t border-gray-100 divide-y divide-gray-100">
            {topic.criteria.map((criterion) => (
            <CriterionItem
                key={criterion.id}
                criterion={criterion}
                onUpdateCriterion={handleUpdateCriterion}
                onImagePreview={onImagePreview}
            />
            ))}
        </div>
      </div>
    </div>
  );
};

export default TopicCard;