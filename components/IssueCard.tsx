import React, { useState } from 'react';
import type { AnalysisIssue } from '../types';
import { IssueSeverity, IssueType } from '../types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Code,
  Wand2,
} from 'lucide-react';

interface IssueCardProps {
  issue: AnalysisIssue;
  onAutoFixSingle: (issue: AnalysisIssue) => void;
  onApplySuggestion: (shotId: string, template: string) => void;
  onApplyJsonPatch: (shotId: string, jsonString: string) => void;
}

const issueCategoryMap: Record<IssueType, string> = {
  [IssueType.Physics]: 'Vật lý',
  [IssueType.Character]: 'Nhân vật',
  [IssueType.Location]: 'Địa điểm',
  [IssueType.Timeline]: 'Thời gian',
  [IssueType.Plot]: 'Logic',
  [IssueType.CharacterLock]: 'Khóa Nhân vật',
  [IssueType.Sfx]: 'Âm thanh (SFX)',
  [IssueType.Continuity]: 'Nhất quán',
  [IssueType.Prop]: 'Đạo cụ',
  [IssueType.Lighting]: 'Ánh sáng',
  [IssueType.Camera]: 'Máy quay',
  [IssueType.Spatial]: 'Không gian',
  [IssueType.Narrative]: 'Tường thuật',
};

const IssueCard: React.FC<IssueCardProps> = ({ issue, onAutoFixSingle, onApplySuggestion, onApplyJsonPatch }) => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [copyStatus, copy] = useCopyToClipboard();

  const severityStyles = {
    [IssueSeverity.Critical]: {
      icon: <AlertTriangle className="w-5 h-5 text-critical" />,
      textColor: 'text-red-400',
    },
    [IssueSeverity.Warning]: {
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      textColor: 'text-yellow-400',
    },
  };

  const styles = severityStyles[issue.severity];
  const category = issueCategoryMap[issue.type] || issue.type;
  const isCharLockFixable =
    issue.isFixable && issue.type === IssueType.CharacterLock && issue.details?.characterId;
  const isJsonSuggestion = issue.suggestion.trim().startsWith('{');
  const canApplyJsonPatch = isJsonSuggestion && !issue.isFixable && !issue.suggestion_template;

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-bg-card">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <div>
              <p className={`font-semibold ${styles.textColor}`}>
                Cảnh {issue.shotId}: {category}
              </p>
              <p className="text-sm text-gray-300 mt-1">{issue.message}</p>
            </div>
            {issue.isFixable && !isCharLockFixable && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                <Bot className="w-3.5 h-3.5" />
                Có thể tự sửa
              </span>
            )}
          </div>

          <div className="mt-3 p-3 bg-black/30 rounded-md border border-white/10 relative group">
            <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Đề xuất Sửa lỗi
            </p>
            {isJsonSuggestion ? (
              <pre className="text-sm text-gray-300 bg-black/40 p-3 rounded-md overflow-x-auto">
                <code>{issue.suggestion}</code>
              </pre>
            ) : (
              <p className="text-sm text-gray-400">{issue.suggestion}</p>
            )}
            {isJsonSuggestion && (
              <button
                onClick={() => copy(issue.suggestion)}
                className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                {copyStatus === 'copied' ? (
                  <ClipboardCheck className="w-4 h-4 text-success" />
                ) : (
                  <Clipboard className="w-4 h-4" />
                )}
                {copyStatus === 'copied' ? 'Đã sao chép!' : 'Sao chép'}
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
             {isCharLockFixable && (
                <button
                    onClick={() => onAutoFixSingle(issue)}
                    className="flex items-center gap-2 text-sm font-semibold bg-primary/80 text-white px-3 py-1.5 rounded-md hover:bg-primary transition-colors duration-200"
                >
                    <Bot className="w-4 h-4" />
                    Sửa tự động
                </button>
             )}
             {issue.suggestion_template && (
                 <button
                    onClick={() => onApplySuggestion(issue.shotId, issue.suggestion_template!)}
                    className="flex items-center gap-2 text-sm font-semibold bg-indigo-600/80 text-white px-3 py-1.5 rounded-md hover:bg-indigo-600 transition-colors duration-200"
                 >
                    <Wand2 className="w-4 h-4" />
                    Áp dụng Gợi ý
                 </button>
             )}
            {canApplyJsonPatch && (
                 <button
                    onClick={() => onApplyJsonPatch(issue.shotId, issue.suggestion)}
                    className="flex items-center gap-2 text-sm font-semibold bg-indigo-600/80 text-white px-3 py-1.5 rounded-md hover:bg-indigo-600 transition-colors duration-200"
                 >
                    <Wand2 className="w-4 h-4" />
                    Áp dụng Sửa lỗi
                 </button>
             )}
          </div>

          {issue.originalPrompt && (
            <div className="mt-3">
              <button
                onClick={() => setIsDebugOpen(!isDebugOpen)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Hiển thị Prompt Gốc</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDebugOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isDebugOpen && (
                <pre className="mt-2 p-3 bg-black/50 rounded-md text-xs text-gray-300 overflow-x-auto">
                  <code>{issue.originalPrompt}</code>
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCard;