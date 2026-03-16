import React, { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import { UploadIcon, FileIcon, XIcon } from './icons';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  disabled: boolean;
  maxFiles: number;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, disabled, maxFiles }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    if (selectedFiles.length + fileArray.length > maxFiles) {
        alert(`Você só pode adicionar até ${maxFiles} arquivos no total.`);
        return;
    }

    const validFiles: File[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];

    fileArray.forEach(file => {
      // Check if already added
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
         return; // Skip duplicates
      }

      if (file.type !== 'application/pdf') {
        invalidFiles.push({ name: file.name, reason: 'Não é um PDF.' });
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidFiles.push({ name: file.name, reason: 'Excede 50MB.' });
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      const errorMessages = invalidFiles.map(f => `${f.name} (${f.reason})`).join('\n');
      alert(`Os seguintes arquivos não puderam ser adicionados:\n${errorMessages}`);
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) {
      processFiles(e.dataTransfer.files);
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = () => {
    onFilesSelect(selectedFiles);
    setSelectedFiles([]); // Clear local queue after submitting
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf"
        disabled={disabled}
        multiple
      />
      
      {selectedFiles.length === 0 ? (
        <div
            onClick={handleButtonClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-in-out ${
            disabled ? 'cursor-not-allowed bg-gray-50 border-gray-200' :
            isDragging ? 'border-brand-500 bg-brand-50 scale-[1.02]' : 
            'border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50'
            }`}
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-white' : 'bg-brand-50 group-hover:bg-brand-100'}`}>
                <UploadIcon className={`w-8 h-8 ${isDragging ? 'text-brand-600' : 'text-brand-500'}`} />
            </div>
            <p className="mb-2 text-lg text-gray-700 font-medium">
                Clique para selecionar ou arraste
            </p>
            <p className="text-sm text-gray-500 mb-4">
                Suporta múltiplos arquivos PDF (até 50MB)
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                Segurança Enterprise
            </span>
            </div>
        </div>
      ) : (
          <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Arquivos Selecionados ({selectedFiles.length})</h3>
                <button onClick={() => setSelectedFiles([])} className="text-xs text-red-500 hover:text-red-700">Limpar todos</button>
            </div>
            <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                    <li key={index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mr-3 flex-shrink-0">
                                <FileIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => removeFile(index)}
                            className="ml-4 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </li>
                ))}
            </ul>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                 <button
                    onClick={handleButtonClick}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                 >
                    + Adicionar mais
                 </button>
                 <button
                    onClick={handleStartAnalysis}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center"
                 >
                    Iniciar Análise
                 </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default FileUpload;