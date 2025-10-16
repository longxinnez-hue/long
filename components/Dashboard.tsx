import React from 'react';
import type { AnalysisResult, ScriptData, VisualPlanShot, AnalysisIssue } from '../types';
import { IssueType, IssueSeverity } from '../types';
import StatCard from './StatCard';
import IssueCard from './IssueCard';
import ShotCard from './ShotCard';
import {
  AlertTriangle,
  BarChart,
  Bot,
  Camera,
  CheckCircle,
  Clock,
  Drama,
  FileJson,
  Grid,
  Link,
  ListChecks,
  Lock,
  Map,
  Move,
  Puzzle,
  ShieldCheck,
  Sun,
  Timer,
  UserCheck,
  Volume2,
  Wand2,
  Wind,
  Zap,
  Box,
} from 'lucide-react';

interface DashboardProps {
  analysisResult: AnalysisResult;
  scriptData: ScriptData;
  onAutoFix: () => void;
  onAutoFixSingle: (issue: AnalysisIssue) => void;
  onApplySuggestion: (shotId: string, template: string) => void;
  onApplyJsonPatch: (shotId: string, jsonString: string) => void;
  selectedShotId: string | null;
  onSelectShot: (id: string | null) => void;
  onStabilizeAllShots: () => void;
}

const issueTypeIcons: Record<IssueType, React.ReactElement> = {
  [IssueType.Physics]: <Wind className="w-4 h-4 text-slate-400" />,
  [IssueType.Character]: <UserCheck className="w-4 h-4 text-info" />,
  [IssueType.Location]: <Map className="w-4 h-4 text-yellow-300" />,
  [IssueType.Timeline]: <Timer className="w-4 h-4 text-orange-400" />,
  [IssueType.Plot]: <Puzzle className="w-4 h-4 text-critical" />,
  [IssueType.CharacterLock]: <Lock className="w-4 h-4 text-purple-400" />,
  [IssueType.Sfx]: <Volume2 className="w-4 h-4 text-cyan-400" />,
  [IssueType.Continuity]: <Link className="w-4 h-4 text-green-400" />,
  [IssueType.Prop]: <Box className="w-4 h-4 text-teal-400" />,
  [IssueType.Lighting]: <Sun className="w-4 h-4 text-amber-400" />,
  [IssueType.Camera]: <Camera className="w-4 h-4 text-rose-400" />,
  [IssueType.Spatial]: <Move className="w-4 h-4 text-sky-400" />,
  [IssueType.Narrative]: <Drama className="w-4 h-4 text-teal-300" />,
};

const Dashboard: React.FC<DashboardProps> = ({
  analysisResult,
  scriptData,
  onAutoFix,
  onAutoFixSingle,
  onApplySuggestion,
  onApplyJsonPatch,
  selectedShotId,
  onSelectShot,
  onStabilizeAllShots,
}) => {
  const { stats, issueCounts, issues } = analysisResult;
  const allShots = scriptData.script.flatMap((scene) => scene.visualPlan);
  const fixableIssuesCount = issues.filter((issue) => issue.isFixable).length;

  const issuesToShow = issues.slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
      {/* Left Sidebar */}
      <aside className="lg:col-span-3 space-y-6 sticky top-24">
        <section>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<ListChecks className="text-slate-400" />}
              title="Tổng số Cảnh quay"
              value={stats.totalShots.toString()}
            />
            <StatCard
              icon={<ShieldCheck className="text-success" />}
              title="Sẵn sàng cho VEO 3"
              value={stats.veo3Ready.toString()}
            />
            <StatCard
              icon={<AlertTriangle className="text-critical" />}
              title="Lỗi nghiêm trọng"
              value={stats.criticalIssues.toString()}
            />
            <StatCard
              icon={<AlertTriangle className="text-warning" />}
              title="Cảnh báo"
              value={stats.warnings.toString()}
            />
          </div>
        </section>

        <div className="bg-bg-card p-5 rounded-lg border border-white/10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Thống kê Lỗi
          </h2>
          <ul className="space-y-3 text-sm">
            {Object.entries(issueCounts)
              .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
              .map(([type, count]) => (
                <li key={type} className="flex justify-between items-center text-gray-300">
                  <span className="flex items-center gap-2.5">
                    {issueTypeIcons[type as IssueType]}
                    {type}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                      Number(count) > 0 ? 'bg-slate-700' : 'bg-success/20 text-success'
                    }`}
                  >
                    {String(count)}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="bg-bg-card p-5 rounded-lg border border-white/10">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Tự động Sửa
          </h2>
          <p className="text-gray-400 mb-4 text-sm">
            Tự động giải quyết {fixableIssuesCount} lỗi có thể sửa được như lỗi khóa nhân vật,
            thiếu SFX, và lỗ hổng thời gian.
          </p>
          <button
            onClick={onAutoFix}
            disabled={fixableIssuesCount === 0}
            className="w-full py-2.5 px-4 bg-primary font-semibold rounded-md hover:bg-purple-700 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Sửa lỗi tự động
          </button>
          <button
            onClick={onStabilizeAllShots}
            className="mt-2 w-full py-2.5 px-4 bg-indigo-600 font-semibold rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
            title="Shortcut: ⌘+Shift+H"
          >
            <Wand2 className="w-5 h-5" />
            Ổn định & Sửa lỗi nhất quán (v3)
          </button>
        </div>
      </aside>

      {/* Right Main Content */}
      <main className="lg:col-span-7 space-y-8">
        {issues.length === 0 && (
          <div className="bg-success/10 border border-success rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Phân tích Hoàn tất!</h2>
            <p className="text-gray-300">
              Không tìm thấy lỗi nào. Kịch bản của bạn đã sẵn sàng để sản xuất.
            </p>
          </div>
        )}

        {issues.length > 0 && (
          <section id="issues">
            <h2 className="text-xl font-bold mb-4">Các lỗi đã phát hiện</h2>
            <div className="space-y-4">
              {issuesToShow.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onAutoFixSingle={onAutoFixSingle} onApplySuggestion={onApplySuggestion} onApplyJsonPatch={onApplyJsonPatch} />
              ))}
              {issues.length > 10 && (
                <p className="text-center text-gray-400 text-sm">
                  ...và còn {issues.length - 10} lỗi khác.
                </p>
              )}
            </div>
          </section>
        )}

        <section id="shots">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Chi tiết Cảnh quay & Xuất VEO 3
          </h2>
          <div className="space-y-3">
            {allShots.map((shot) => {
              const shotIssues = issues.filter((i) => i.shotId === shot.shotId);
              return (
                <ShotCard
                  key={shot.shotId}
                  shot={shot}
                  issues={shotIssues}
                  isSelected={shot.shotId === selectedShotId}
                  onSelect={() => onSelectShot(selectedShotId === shot.shotId ? null : shot.shotId)}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;