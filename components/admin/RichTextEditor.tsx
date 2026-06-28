'use client';

import React, { useState } from 'react';
import { Bold, Italic, Link, Trash2, X } from 'lucide-react';
import type { RichTextEditorProps } from '@/types/admin';

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeight = '120px' }) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [savedSelection, setSavedSelection] = useState<Range | null>(null);

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const execCmd = (cmd: string, val: string = '') => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            return sel.getRangeAt(0);
        }
        return null;
    };

    const restoreSelection = (range: Range | null) => {
        if (range) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };

    const handleLinkButtonClick = () => {
        const selection = saveSelection();
        setSavedSelection(selection);
        setShowLinkInput(prev => !prev);
        setLinkUrl('');
    };

    const confirmLink = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        restoreSelection(savedSelection);
        if (linkUrl.trim()) {
            let url = linkUrl.trim();
            if (!/^https?:\/\//i.test(url) && !url.startsWith('#') && !url.startsWith('/')) {
                url = 'https://' + url;
            }
            execCmd('createLink', url);
        }
        setShowLinkInput(false);
        setLinkUrl('');
        setSavedSelection(null);
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const cancelLink = () => {
        setShowLinkInput(false);
        setLinkUrl('');
        setSavedSelection(null);
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all w-full">
            <style dangerouslySetInnerHTML={{__html: `
                .editor-content:empty::before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    font-weight: 505;
                }
                .editor-content { line-height: 1.6; }
                .editor-content p, .editor-content div { margin-bottom: 12px; }
                .editor-content p:last-child, .editor-content div:last-child { margin-bottom: 0; }
                .editor-content a {
                    color: #7c3aed;
                    text-decoration: underline;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 2px;
                    background-color: rgba(124, 58, 237, 0.07);
                    padding: 0 2px;
                }
                .editor-content a:hover {
                    color: #5b21b6;
                    background-color: rgba(124, 58, 237, 0.14);
                }
            `}} />
            <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 border-b border-slate-200 select-none">
                <button
                    type="button"
                    onClick={() => execCmd('bold')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    title="Negrito"
                >
                    <Bold size={12} />
                </button>
                <button
                    type="button"
                    onClick={() => execCmd('italic')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    title="Itálico"
                >
                    <Italic size={12} />
                </button>
                <button
                    type="button"
                    onClick={handleLinkButtonClick}
                    className={`p-1.5 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ${showLinkInput ? 'text-purple-650 bg-slate-200/80' : 'text-slate-555 hover:text-slate-800'}`}
                    title="Inserir Link"
                >
                    <Link size={12} />
                </button>
                <button
                    type="button"
                    onClick={() => execCmd('removeFormat')}
                    className="p-1.5 text-slate-555 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-all text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ml-auto"
                    title="Limpar Formatação"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {showLinkInput && (
                <form onSubmit={confirmLink} className="flex items-center gap-2 p-2 bg-purple-50/50 border-b border-slate-200 select-none animate-fade-in">
                    <span className="text-[10px] font-bold text-purple-750 uppercase tracking-wider shrink-0">Inserir Link:</span>
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Ex: www.mimochat.com.br"
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 text-slate-700 font-medium"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-2.5 py-1 bg-purple-650 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer"
                    >
                        Confirmar
                    </button>
                    <button
                        type="button"
                        onClick={cancelLink}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 transition-all shrink-0 cursor-pointer"
                    >
                        <X size={12} />
                    </button>
                </form>
            )}

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                data-placeholder={placeholder}
                className="editor-content w-full p-3 text-xs bg-white focus:outline-none overflow-y-auto text-slate-700 font-medium"
                style={{ minHeight, maxHeight: '250px' }}
            />
        </div>
    );
};

export { RichTextEditor };
