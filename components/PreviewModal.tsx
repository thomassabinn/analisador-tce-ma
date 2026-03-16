import React, { useEffect, useState, useMemo } from 'react';
import type { GroupedAnalysisResultTopic } from '../types';
import { XIcon } from './icons';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: GroupedAnalysisResultTopic[];
  validationText: string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, results, validationText }) => {

  const selectedGroups = useMemo(() => {
     if (!isOpen) return [];
     return results
      .map(group => ({
          ...group,
          criteria: group.criteria.filter(c => c.isSelected)
      }))
      .filter(group => group.criteria.length > 0);
  }, [isOpen, results]);
  
  const [imageUrls, setImageUrls] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    const newImageUrls = new Map<string, string[]>();
    selectedGroups.forEach(group => {
      group.criteria.forEach(criterion => {
         const urls = criterion.images.map(image => URL.createObjectURL(image));
         newImageUrls.set(criterion.id, urls);
      });
    });
    setImageUrls(newImageUrls);

    return () => {
      newImageUrls.forEach(urls => urls.forEach(url => URL.revokeObjectURL(url)));
    };
  }, [isOpen, selectedGroups]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-lg">
          <h2 id="preview-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Pré-visualização do Relatório</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar pré-visualização">
            <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </header>
        <main className="overflow-y-auto p-6 space-y-8 font-serif text-gray-800 dark:text-gray-300">
          <h1 className="text-3xl font-bold text-center mb-6">RELATÓRIO DE JUSTIFICATIVAS</h1>
          
          {selectedGroups.length > 0 ? selectedGroups.map((group, groupIndex) => (
            <div key={group.id} className="break-words">
              <h2 className="text-xl font-bold mt-6 mb-4 border-b pb-2">{group.titulo}</h2>
              {group.criteria.map((criterion, criterionIndex) => (
                <div key={criterion.id} className="mb-6">
                  <p className="mb-1"><strong className="font-semibold">Observação do Auditor:</strong> {criterion.observacao_auditor}</p>
                  <p className="mb-2"><strong className="font-semibold">Critério não Atendido:</strong> {criterion.criterio_nao_atendido}</p>
                  
                  {criterion.referenceLinks && criterion.referenceLinks.length > 0 && (
                    <div className="mb-2">
                      <strong className="font-semibold">Link(s) de Referência:</strong>
                      <ul className="list-disc list-inside ml-4 text-sm">
                        {criterion.referenceLinks.map((link, linkIndex) => (
                            <li key={linkIndex}>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                                    {link}
                                </a>
                            </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <strong className="font-semibold">Defesa:</strong>
                    <div 
                      className="mt-1 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                    >
                      {criterion.editedResposta}
                    </div>
                  </div>

                  {criterion.images.length > 0 && (
                    <div className="mt-4">
                      <strong className="font-semibold">Evidências:</strong>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(imageUrls.get(criterion.id) || []).map((url, imgIndex) => (
                          <img key={imgIndex} src={url} alt={`Evidência ${imgIndex + 1} para ${criterion.criterio_nao_atendido}`} className="w-full h-auto object-cover rounded border border-gray-300 dark:border-gray-600" />
                        ))}
                      </div>
                    </div>
                  )}

                  {criterionIndex < group.criteria.length - 1 && <hr className="mt-6 border-dashed border-gray-300 dark:border-gray-600" />}
                </div>
              ))}
              {groupIndex < selectedGroups.length - 1 && <hr className="mt-8 border-gray-200 dark:border-gray-600" />}
            </div>
          )) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum critério selecionado para pré-visualização.</p>
          )}

          <footer className="mt-12 pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm italic text-gray-600 dark:text-gray-400">Validação do Modelo: {validationText}</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default PreviewModal;