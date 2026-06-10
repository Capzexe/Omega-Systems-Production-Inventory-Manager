
import React, { useState } from 'react';
import { Sparkles, MessageCircle, Send, Loader2 } from 'lucide-react';
import { getEquipmentAdvice } from '../services/geminiService';

const AISidebar: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetAdvice = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        const result = await getEquipmentAdvice(prompt);
        setAdvice(result);
        setLoading(false);
    };

    return (
        <aside className="w-80 border-l border-slate-800 bg-slate-900/30 flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 animate-pulse">
                    <Sparkles className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold">CineBot</h2>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">AI Production Assistant</p>
                </div>
            </div>

            <div className="flex-1 space-y-6">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-xs text-slate-300 leading-relaxed">
                        I can help you build your equipment list. Just describe the scene or visual look you're aiming for.
                    </p>
                </div>

                <div className="space-y-3">
                    <textarea 
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 transition-all placeholder:text-slate-600"
                        placeholder="e.g. A low-light cinematic interview with neon accents..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button 
                        onClick={handleGetAdvice}
                        disabled={loading || !prompt.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Get AI Specs
                    </button>
                </div>

                {advice && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <MessageCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">AI Recommendation</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm prose prose-invert prose-sm max-w-none">
                            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{advice}</p>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(advice);
                                    setPrompt('');
                                    alert('Equipment specifications copied to clipboard! You can now paste them directly into any project description or draft manifest.');
                                } catch (err) {
                                    console.error('Failed to copy text: ', err);
                                }
                            }}
                            className="w-full py-2.5 bg-indigo-600/10 hover:bg-slate-800 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                            Copy Spec List to Clipboard
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Powered by Gemini 3 Pro</p>
            </div>
        </aside>
    );
};

export default AISidebar;
