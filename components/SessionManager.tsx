import React, { useState, useEffect } from 'react';
import { SaveIcon, TrashIcon, PlusCircleIcon, FolderOpenIcon } from './icons';
import type { SessionMetadata } from '../types';

interface SessionManagerProps {
  sessions: SessionMetadata[];
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
  currentSessionId: string | null;
  onRenameSession: (id: string, newName: string) => void;
  onTriggerSave: (mode: 'save' | 'saveAs') => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ sessions, onLoadSession, onDeleteSession, onNewSession, currentSessionId, onRenameSession, onTriggerSave }) => {
  const [editingSession, setEditingSession] = useState<{id: string; name: string} | null>(null);

  const handleRename = (session: SessionMetadata) => {
    setEditingSession({ id: session.id, name: session.name });
  };

  const handleRenameConfirm = () => {
    if (editingSession && editingSession.name.trim()) {
      onRenameSession(editingSession.id, editingSession.name.trim());
    }
    setEditingSession(null);
  };
  
  const handleRenameCancel = () => {
    setEditingSession(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', day: 'numeric' }).format(date);
  };

  return (
      <div className="flex flex-col h-full bg-[#FCFCFD]">
        <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Espaço de Trabalho</h2>
            </div>
           
            <button
                onClick={onNewSession}
                className="w-full group flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-all shadow-subtle hover:shadow-md"
            >
                <PlusCircleIcon className="w-5 h-5 mr-2 text-white/90" />
                <span className="text-sm font-medium">Nova Análise</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
            <h3 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Histórico</h3>
            <div className="space-y-0.5">
            {sessions.length > 0 ? (
                sessions.map((session) => (
                    <div 
                        key={session.id} 
                        className={`group relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            currentSessionId === session.id 
                            ? 'bg-brand-50 text-brand-700' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        onClick={() => onLoadSession(session.id)}
                        onDoubleClick={() => handleRename(session)}
                    >
                        <FolderOpenIcon className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${currentSessionId === session.id ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        
                        {editingSession?.id === session.id ? (
                          <input
                            type="text"
                            value={editingSession.name}
                            onChange={(e) => setEditingSession({ ...editingSession, name: e.target.value })}
                            onBlur={handleRenameConfirm}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-white border border-brand-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                            <div className="flex-1 min-w-0 flex flex-col">
                                <span className="truncate">{session.name}</span>
                                <span className="text-[10px] text-gray-400 font-normal">{formatDate(session.lastModified)}</span>
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))
            ) : (
                <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">Nenhuma análise salva.</p>
                </div>
            )}
            </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-2">
              <button
                  onClick={() => onTriggerSave('save')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                  <SaveIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                  Salvar
              </button>
              <button
                  onClick={() => onTriggerSave('saveAs')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                  Copiar
              </button>
            </div>
        </div>
      </div>
  );
};

export default SessionManager;