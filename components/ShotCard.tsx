
import React, { useState, useMemo } from 'react';
import type { VisualPlanShot, AnalysisIssue } from '../types';
import { IssueSeverity } from '../types';
import { generateVEO3ShotJSON } from '../services/analysisService';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { translatePrompt } from '../services/translationService';
import { ChevronDown, AlertTriangle, ShieldCheck, Clipboard, ClipboardCheck, Code, User, MapPin } from 'lucide-react';

interface ShotCardProps {
    shot: VisualPlanShot;
    issues: AnalysisIssue[];
    isSelected: boolean;
    onSelect: () => void;
}

const QualityScore: React.FC<{ score: number }> = ({ score }) => {
    const getColor = (s: number) => {
        if (s <= 4) return 'bg-critical';
        if (s <= 7) return 'bg-warning';
        return 'bg-success';
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{score}/10</span>
            <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getColor(score)}`} style={{ width: `${score * 10}%` }}></div>
            </div>
        </div>
    );
};

const Tag: React.FC<{ text: string; icon: React.ReactNode; color: string; }> = ({ text, icon, color }) => (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${color}`}>
        {icon}
        <span className="font-medium">{text}</span>
    </div>
);


const ShotCard: React.FC<ShotCardProps> = ({ shot, issues, isSelected, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showVietnamese, setShowVietnamese] = useState(true);
    const [copyStatus, copy] = useCopyToClipboard();

    const qualityScore = useMemo(() => {
        let score = 10;
        issues.forEach(issue => {
            score -= issue.severity === IssueSeverity.Critical ? 3 : 1;
        });
        return Math.max(0, score);
    }, [issues]);
    
    const translatedPrompt = useMemo(() => translatePrompt(shot.compositionPrompt), [shot.compositionPrompt]);
    const displayPrompt = showVietnamese ? translatedPrompt : shot.compositionPrompt;

    const isVeo3Ready = !issues.some(i => i.severity === IssueSeverity.Critical);
    const veo3Json = useMemo(() => generateVEO3ShotJSON(shot), [shot]);

    return (
        <div className={`bg-bg-card rounded-lg border transition-all duration-300 ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-white/10'}`}>
            <div className="p-4 cursor-pointer" onClick={onSelect}>
                {/* Card Header */}
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                        <div className="flex items-center gap-3">
                             <span className="font-mono text-sm bg-slate-700 px-2 py-1 rounded">
                                Cảnh {shot.shotId}
                            </span>
                            {isVeo3Ready ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                                    <ShieldCheck className="w-4 h-4" /> Sẵn sàng cho VEO 3
                                </span>
                            ) : (
                                 <span className="flex items-center gap-1.5 text-xs font-medium text-critical">
                                    <AlertTriangle className="w-4 h-4" />
                                    {issues.filter(i => i.severity === IssueSeverity.Critical).length} Lỗi nghiêm trọng
                                </span>
                            )}
                        </div>
                         {/* Scene Summary */}
                        <div className="mt-3 relative p-3 text-sm bg-blue-900/20 border border-info/30 text-blue-200 rounded-md">
                           <button
                                onClick={(e) => { e.stopPropagation(); setShowVietnamese(!showVietnamese); }}
                                className="absolute top-2 right-2 text-xs font-bold bg-slate-900/50 text-slate-300 px-2 py-0.5 rounded-md hover:bg-slate-900 transition-colors"
                                aria-label="Toggle language"
                           >
                               {showVietnamese ? 'EN' : 'VI'}
                           </button>
                           {displayPrompt}
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                       <QualityScore score={qualityScore} />
                       <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 text-gray-400 hover:text-white">
                           <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                       </button>
                    </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {shot.character_definitions?.map(char => (
                         <Tag key={char.id} text={char.id} icon={<User className="w-3.h-3.5"/>} color="bg-primary/20 text-primary" />
                    ))}
                    {shot.location?.id && (
                        <Tag text={shot.location.id} icon={<MapPin className="w-3.h-3.5"/>} color="bg-success/20 text-success" />
                    )}
                </div>
            </div>
            
            {isExpanded && (
                <div className="p-4 border-t border-white/10 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-300">Prompt đầy đủ & Lỗi</h4>
                            <div className="text-sm space-y-3 p-3 bg-black/30 rounded-md border border-white/10">
                                <div>
                                    <strong className="text-gray-400 text-xs">Prompt đầy đủ (Original):</strong> 
                                    <p className="text-gray-200 font-mono text-xs mt-1">{shot.compositionPrompt}</p>
                                </div>
                                <div>
                                    <strong className="text-gray-400 text-xs">Lỗi ({issues.length}):</strong>
                                    {issues.length > 0 ? (
                                        <ul className="pl-4 list-disc mt-1">
                                            {issues.map(i => <li key={i.id} className={`text-xs ${i.severity === IssueSeverity.Critical ? 'text-red-400' : 'text-yellow-400'}`}>{i.message}</li>)}
                                        </ul>
                                    ) : <p className="text-xs text-gray-500 mt-1">Không có lỗi trong cảnh này.</p>}
                                </div>
                            </div>
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-gray-300 flex items-center gap-2">
                                    <Code className="w-5 h-5" />
                                    Xuất JSON VEO 3
                                </h4>
                                <button onClick={() => copy(veo3Json)} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors">
                                    {copyStatus === 'copied' ? <ClipboardCheck className="w-4 h-4 text-success" /> : <Clipboard className="w-4 h-4" />}
                                    {copyStatus === 'copied' ? 'Đã sao chép!' : 'Sao chép'}
                                </button>
                            </div>
                            <pre className="text-xs bg-black/50 p-3 rounded-md max-h-60 overflow-auto">
                                <code>{veo3Json}</code>
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShotCard;