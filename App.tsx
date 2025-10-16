import React, { useState, useCallback, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import Dashboard from './components/Dashboard';
import { performVEO3Analysis, autoFixScript, stabilizeSceneV2 } from './services/analysisService';
import type { ScriptData, AnalysisResult, AnalysisIssue, VisualPlanShot, CharacterDefinition } from './types';
import { Film } from 'lucide-react';

const App: React.FC = () => {
    const [scriptData, setScriptData] = useState<ScriptData | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [view, setView] = useState<'upload' | 'dashboard'>('upload');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

     useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleFileUpload = useCallback((data: ScriptData) => {
        setIsLoading(true);
        setError(null);
        setSelectedShotId(null);
        setTimeout(() => { 
            try {
                setScriptData(data);
                const result = performVEO3Analysis(data);
                setAnalysisResult(result);
                setView('dashboard');
            } catch (e) {
                console.error("Analysis Error:", e);
                setError("Không thể phân tích kịch bản. Vui lòng đảm bảo tệp có định dạng chính xác.");
                setView('upload');
            } finally {
                setIsLoading(false);
            }
        }, 2000);
    }, []);

    const handleAutoFix = useCallback(() => {
        if (!scriptData || !analysisResult) return;
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                const fixableIssues = analysisResult.issues.filter(i => i.isFixable);
                const { fixedScript, fixesApplied } = autoFixScript(scriptData, fixableIssues);
                setScriptData(fixedScript);
                const newResult = performVEO3Analysis(fixedScript);
                setAnalysisResult(newResult);
                setNotification({ message: `${fixesApplied} lỗi đã được tự động sửa!`, type: 'success' });
            } catch (e) {
                console.error("Auto-fix Error:", e);
                setError("Đã xảy ra lỗi trong quá trình tự động sửa.");
            } finally {
                setIsLoading(false);
            }
        }, 500);
    }, [scriptData, analysisResult]);

    const handleAutoFixSingle = useCallback((issueToFix: AnalysisIssue) => {
        if (!scriptData) return;
        try {
            const { fixedScript, fixesApplied } = autoFixScript(scriptData, [issueToFix]);
            if (fixesApplied > 0) {
                setScriptData(fixedScript);
                const newResult = performVEO3Analysis(fixedScript);
                setAnalysisResult(newResult);
                setNotification({ message: `Đã áp dụng sửa lỗi cho cảnh ${issueToFix.shotId}.`, type: 'success' });
            }
        } catch (e) {
            console.error("Single auto-fix Error:", e);
            setNotification({ message: "Không thể tự động sửa lỗi này.", type: 'error' });
        }
    }, [scriptData]);

     const handleApplySuggestion = useCallback((shotId: string, template: string) => {
        if (!scriptData) return;
        
        const newScriptData = JSON.parse(JSON.stringify(scriptData));
        let promptUpdated = false;

        for (const scene of newScriptData.script) {
            if (scene.visualPlan) {
                const shot = scene.visualPlan.find((s: VisualPlanShot) => s.shotId === shotId);
                if (shot) {
                    shot.compositionPrompt = shot.compositionPrompt.trim() + template;
                    promptUpdated = true;
                    break;
                }
            }
        }

        if (promptUpdated) {
            setScriptData(newScriptData);
            const newResult = performVEO3Analysis(newScriptData);
            setAnalysisResult(newResult);
            setNotification({ message: `Đã áp dụng gợi ý cho cảnh ${shotId}.`, type: 'success' });
        }
    }, [scriptData]);

    const handleApplyJsonPatch = useCallback((shotId: string, jsonString: string) => {
        if (!scriptData) return;

        try {
            const patch = JSON.parse(jsonString);
            const newScriptData = JSON.parse(JSON.stringify(scriptData));
            let shotFoundAndPatched = false;

            const patchShot = (shot: VisualPlanShot, patch: Partial<VisualPlanShot>): VisualPlanShot => {
                const newShot = { ...shot };
                for (const key in patch) {
                    if (Object.prototype.hasOwnProperty.call(patch, key)) {
                        const typedKey = key as keyof VisualPlanShot;
                        const shotValue = newShot[typedKey];
                        const patchValue = patch[typedKey as keyof typeof patch];
                        
                        if (
                            shotValue && typeof shotValue === 'object' && !Array.isArray(shotValue) &&
                            patchValue && typeof patchValue === 'object' && !Array.isArray(patchValue)
                        ) {
                            (newShot as any)[typedKey] = { ...shotValue, ...patchValue };
                        } else {
                            (newShot as any)[typedKey] = patchValue;
                        }
                    }
                }
                return newShot;
            };

            for (const scene of newScriptData.script) {
                if (scene.visualPlan) {
                    const shotIndex = scene.visualPlan.findIndex((s: VisualPlanShot) => s.shotId === shotId);
                    if (shotIndex > -1) {
                        scene.visualPlan[shotIndex] = patchShot(scene.visualPlan[shotIndex], patch);
                        shotFoundAndPatched = true;
                        break;
                    }
                }
            }

            if (shotFoundAndPatched) {
                setScriptData(newScriptData);
                const newResult = performVEO3Analysis(newScriptData);
                setAnalysisResult(newResult);
                setNotification({ message: `Đã áp dụng bản vá JSON cho cảnh ${shotId}.`, type: 'success' });
            } else {
                setNotification({ message: `Không tìm thấy cảnh ${shotId} để áp dụng bản vá.`, type: 'error' });
            }

        } catch (e) {
            console.error("JSON Patch Error:", e);
            setNotification({ message: "Không thể áp dụng bản vá JSON. Định dạng không hợp lệ.", type: 'error' });
        }
    }, [scriptData]);


    const handleStabilizeAndEnforceContinuity = useCallback(() => {
        if (!scriptData) return;
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                const newScriptData = JSON.parse(JSON.stringify(scriptData));
                let shotsStabilized = 0;
                let definitionsConsolidated = 0;

                // --- NEW: Character Definition Consolidation ---
                const masterCharacterDefs = new Map<string, CharacterDefinition>();

                // First pass: establish the master definition from the first appearance.
                for (const scene of newScriptData.script) {
                    if (scene.visualPlan) {
                        for (const shot of scene.visualPlan) {
                            if (shot.character_definitions) {
                                for (const charDef of shot.character_definitions) {
                                    if (!masterCharacterDefs.has(charDef.id)) {
                                        masterCharacterDefs.set(charDef.id, JSON.parse(JSON.stringify(charDef)));
                                    }
                                }
                            }
                        }
                    }
                }

                // Second pass: enforce the master definition across all shots.
                for (const scene of newScriptData.script) {
                    if (scene.visualPlan) {
                        scene.visualPlan = scene.visualPlan.map((shot: VisualPlanShot) => {
                            if (shot.character_definitions) {
                                const originalDefsJSON = JSON.stringify(shot.character_definitions);
                                shot.character_definitions = shot.character_definitions.map(charDef => {
                                    const masterDef = masterCharacterDefs.get(charDef.id);
                                    return masterDef ? masterDef : charDef;
                                });
                                const newDefsJSON = JSON.stringify(shot.character_definitions);
                                if (originalDefsJSON !== newDefsJSON) {
                                    definitionsConsolidated++;
                                }
                            }
                            return shot;
                        });
                    }
                }
                // --- END: Character Definition Consolidation ---

                for (const scene of newScriptData.script) {
                    if (scene.visualPlan) {
                        scene.visualPlan = scene.visualPlan.map((shot: VisualPlanShot) => {
                            const originalShotJSON = JSON.stringify(shot);
                            const { fixedShot, error } = stabilizeSceneV2(shot);
                            if (error) {
                                console.error(`Could not stabilize shot ${shot.shotId}: ${error.message}`);
                                return shot;
                            }
                            if (fixedShot) {
                                if (originalShotJSON !== JSON.stringify(fixedShot)) {
                                    shotsStabilized++;
                                }
                                return fixedShot;
                            }
                            return shot;
                        });
                    }
                }

                if (shotsStabilized > 0 || definitionsConsolidated > 0) {
                    setScriptData(newScriptData);
                    const newResult = performVEO3Analysis(newScriptData);
                    setAnalysisResult(newResult);
                    
                    const consolidationMessage = definitionsConsolidated > 0 ? `${definitionsConsolidated} định nghĩa nhân vật đã được hợp nhất` : '';
                    const stabilizationMessage = shotsStabilized > 0 ? `${shotsStabilized} cảnh đã được ổn định` : '';
                    
                    const finalMessage = [consolidationMessage, stabilizationMessage].filter(Boolean).join(' và ') + '!';

                    setNotification({ message: finalMessage, type: 'success' });
                } else {
                    setNotification({ message: 'Không có cảnh nào được thay đổi sau khi chạy ổn định.', type: 'error' });
                }
            } catch (e) {
                console.error("Stabilization Error:", e);
                setError("Đã xảy ra lỗi trong quá trình tự động ổn định.");
            } finally {
                setIsLoading(false);
            }
        }, 500);
    }, [scriptData]);
    
     useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
                event.preventDefault();
                handleStabilizeAndEnforceContinuity();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleStabilizeAndEnforceContinuity]);

    const handleReset = useCallback(() => {
        setScriptData(null);
        setAnalysisResult(null);
        setError(null);
        setSelectedShotId(null);
        setView('upload');
    }, []);

    return (
        <div className="min-h-screen bg-bg-main font-sans">
            <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-bg-main/80 backdrop-blur-sm z-10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Film className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-100 tracking-tight">Trợ lý Sản xuất Video AI</h1>
                </div>
                 {view === 'dashboard' && (
                    <button 
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-semibold bg-bg-card hover:bg-white/10 border border-white/10 rounded-md transition-colors duration-200"
                    >
                        Phân tích Kịch bản mới
                    </button>
                )}
            </header>
            <main className="p-4 sm:p-6 lg:p-8">
                {isLoading && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-4">
                            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg font-medium text-white">Đang phân tích kịch bản...</p>
                        </div>
                    </div>
                )}
                {notification && (
                    <div className={`fixed top-24 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${notification.type === 'success' ? 'bg-success' : 'bg-critical'}`}>
                        {notification.message}
                    </div>
                )}
                {view === 'upload' ? (
                    <UploadScreen onFileUpload={handleFileUpload} error={error} />
                ) : (
                    analysisResult && scriptData && (
                        <Dashboard 
                            analysisResult={analysisResult} 
                            scriptData={scriptData} 
                            onAutoFix={handleAutoFix} 
                            onAutoFixSingle={handleAutoFixSingle}
                            onApplySuggestion={handleApplySuggestion}
                            onApplyJsonPatch={handleApplyJsonPatch}
                            selectedShotId={selectedShotId}
                            onSelectShot={setSelectedShotId}
                            onStabilizeAllShots={handleStabilizeAndEnforceContinuity}
                        />
                    )
                )}
            </main>
        </div>
    );
};

export default App;