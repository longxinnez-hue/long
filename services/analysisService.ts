import type {
  AnalysisIssue,
  AnalysisResult,
  CharacterDefinition,
  Scene,
  ScriptData,
  VisualPlanShot,
} from '../types';
import { IssueSeverity, IssueType } from '../types';

// --- NEW SHARED SFX LOGIC ---
const intelligentSfxMap: {
  keywords: string[];
  sfx: string;
  context?: string[];
}[] = [
  { keywords: ['whip pan'], sfx: 'sfx_camera_whip_pan_fast' },
  {
    keywords: ['chasing', 'chases', 'darting', 'scampers'],
    sfx: 'sfx_light_scamper_grass',
    context: ['grass', 'garden', 'forest', 'lawn', 'lush'],
  },
  {
    keywords: ['chasing', 'chases', 'darting', 'scampers'],
    sfx: 'sfx_light_scamper_wood',
    context: ['wood', 'floor', 'rock'],
  },
  { keywords: ['chasing', 'chases', 'darting', 'scampers'], sfx: 'sfx_light_scamper_generic' }, // Default
  {
    keywords: ['jumps', 'pounce', 'hops'],
    sfx: 'sfx_kitten_pounce_grass',
    context: ['grass', 'lawn', 'soft', 'mossy'],
  },
  {
    keywords: ['jumps', 'pounce', 'hops'],
    sfx: 'sfx_light_impact_rock',
    context: ['rock', 'stone', 'path'],
  },
  { keywords: ['jumps', 'pounce', 'hops'], sfx: 'sfx_light_impact_wood' }, // Default
  { keywords: ['flies', 'fly', 'flutter', 'dragonfly', 'butterfly'], sfx: 'sfx_wings_flutter_light' },
  { keywords: ['licking', 'cleans'], sfx: 'sfx_cat_licking_fur_light' },
  {
    keywords: ['nudge', 'nudges'],
    sfx: 'sfx_fabric_rustle_light',
    context: ['cloth', 'fabric', 'blanket'],
  },
  { keywords: ['nudge', 'nudges'], sfx: 'sfx_fur_on_fur_rustle' }, // Default
];

const lowQualitySfx = new Set(['sfx_generic_footstep', 'sfx_impact', 'sfx_rustle', 'sfx_generic_wing_flap']);
// --- END NEW SHARED SFX LOGIC ---

const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return NaN;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return NaN;
};

const detectPhysicsErrors = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const physicsKeywords = /(fly|flies|flew|flying|soars|floats|hovers)/i;
  const justificationKeywords = /(jumps|falls|throws|leaps|wind|magic|levitates|is thrown)/i;
  const waterWalkKeywords = /(wade|shallow|frozen)/i;

  shots.forEach((shot) => {
    const prompt = shot.compositionPrompt.toLowerCase();
    if (physicsKeywords.test(prompt) && !justificationKeywords.test(prompt)) {
      issues.push({
        id: `${shot.shotId}-physics-fly`,
        type: IssueType.Physics,
        severity: IssueSeverity.Critical,
        shotId: shot.shotId,
        message: 'Nhân vật có thể đang bay mà không có nguyên nhân vật lý hoặc lý do rõ ràng.',
        suggestion:
          "Thêm một hành động hợp lý hóa như 'nhảy và', 'bị ném bởi', hoặc đề cập đến một lực lượng phép thuật.",
        isFixable: true,
        originalPrompt: shot.compositionPrompt,
      });
    }
    if (prompt.includes('falling upward')) {
      issues.push({
        id: `${shot.shotId}-physics-fall`,
        type: IssueType.Physics,
        severity: IssueSeverity.Critical,
        shotId: shot.shotId,
        message: "Đối tượng được mô tả là 'rơi lên trên', điều này vi phạm luật hấp dẫn.",
        suggestion: "Sửa lại hướng rơi. Sử dụng 'đang đi lên' hoặc 'trôi nổi' cho chuyển động hướng lên.",
        isFixable: false,
        originalPrompt: shot.compositionPrompt,
      });
    }
    if (prompt.includes('walks on water') && !waterWalkKeywords.test(prompt)) {
      issues.push({
        id: `${shot.shotId}-physics-water`,
        type: IssueType.Physics,
        severity: IssueSeverity.Critical,
        shotId: shot.shotId,
        message: "Nhân vật 'đi trên mặt nước' mà không có lời giải thích.",
        suggestion: "Cung cấp bối cảnh như 'đi trên mặt hồ đóng băng' hoặc 'lội qua vùng nước nông'.",
        isFixable: false,
        originalPrompt: shot.compositionPrompt,
      });
    }
  });
  return issues;
};

const detectCharacterIssues = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const characterTracker: { [charId: string]: { lastAppearance: any; shotId: string } } = {};

  shots.forEach((shot) => {
    shot.character_definitions?.forEach((charDef) => {
      const { id, appearance } = charDef;
      if (id && characterTracker[id]) {
        const last = characterTracker[id].lastAppearance;
        const changedAttributes = Object.keys(appearance).filter(
          (key) => last[key] && last[key] !== appearance[key]
        );

        if (changedAttributes.length > 0) {
          const changes = changedAttributes
            .map((key) => `${key} thay đổi từ '${last[key]}' thành '${appearance[key]}'`)
            .join(', ');
          issues.push({
            id: `${shot.shotId}-char-${id}`,
            type: IssueType.Character,
            severity: IssueSeverity.Critical,
            shotId: shot.shotId,
            message: `Nhân vật '${id}' có ngoại hình không nhất quán.`,
            suggestion: `Kiểm tra các thuộc tính: ${changes}. Đảm bảo tính nhất quán hoặc giải thích sự thay đổi trong kịch bản.`,
            isFixable: false,
            originalPrompt: shot.compositionPrompt,
            details: {
              previousShot: characterTracker[id].shotId,
              changes,
            },
          });
        }
      }
      if (id) {
        characterTracker[id] = { lastAppearance: appearance, shotId: shot.shotId };
      }
    });
  });
  return issues;
};

const detectLocationIssues = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const illogicalJumps: { [from: string]: string[] } = {
    sewer: ['sky', 'penthouse'],
    underground: ['ocean', 'desert'],
    indoor: ['ocean', 'desert'],
  };
  const abruptJumps: { [from: string]: string[] } = {
    forest: ['cave'],
    street: ['building'],
    room: ['hallway'],
  };

  for (let i = 1; i < shots.length; i++) {
    const prevShot = shots[i - 1];
    const currentShot = shots[i];

    if (!prevShot.location?.id || !currentShot.location?.id) {
      continue;
    }

    const prevLoc = prevShot.location.id.toLowerCase();
    const currentLoc = currentShot.location.id.toLowerCase();

    if (prevLoc === currentLoc) continue;

    let issueFound = false;
    for (const from of Object.keys(illogicalJumps)) {
      if (prevLoc.includes(from) && illogicalJumps[from].some((to) => currentLoc.includes(to))) {
        issues.push({
          id: `${shots[i].shotId}-location-critical`,
          type: IssueType.Location,
          severity: IssueSeverity.Critical,
          shotId: shots[i].shotId,
          message: `Bước nhảy địa điểm phi logic từ '${prevLoc}' đến '${currentLoc}'.`,
          suggestion: 'Thêm một cảnh chuyển tiếp hoặc xem xét lại việc thay đổi địa điểm.',
          isFixable: false,
          originalPrompt: shots[i].compositionPrompt,
        });
        issueFound = true;
        break;
      }
    }

    if (issueFound) continue;

    for (const from of Object.keys(abruptJumps)) {
      if (prevLoc.includes(from) && abruptJumps[from].some((to) => currentLoc.includes(to))) {
        issues.push({
          id: `${shots[i].shotId}-location-warning`,
          type: IssueType.Location,
          severity: IssueSeverity.Warning,
          shotId: shots[i].shotId,
          message: `Thay đổi địa điểm đột ngột từ '${prevLoc}' đến '${currentLoc}'.`,
          suggestion: 'Đảm bảo có một sự chuyển tiếp mượt mà được thể hiện hoặc ngụ ý giữa các địa điểm này.',
          isFixable: false,
          originalPrompt: shots[i].compositionPrompt,
        });
        break;
      }
    }
  }
  return issues;
};

const detectTimelineIssues = (scenes: Scene[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  let lastEndTime = 0;

  scenes.forEach((scene, index) => {
    if (!scene.timeline || !scene.timeline.includes(' - ')) return;
    const [startStr, endStr] = scene.timeline.split(' - ');
    const startTime = parseTimeToSeconds(startStr);
    const endTime = parseTimeToSeconds(endStr);

    if (isNaN(startTime) || isNaN(endTime)) return;

    if (scene.visualPlan && scene.visualPlan.length > 0) {
      if (index > 0 && startTime > lastEndTime) {
        const gap = startTime - lastEndTime;
        issues.push({
          id: `${scene.visualPlan[0].shotId}-timeline`,
          type: IssueType.Timeline,
          severity: IssueSeverity.Critical,
          shotId: scene.visualPlan[0].shotId,
          message: `Phát hiện lỗ hổng thời gian ${gap} giây trước cảnh này.`,
          suggestion: `Điều chỉnh thời gian bắt đầu của cảnh để liên tục với thời gian kết thúc của cảnh trước.`,
          isFixable: true,
          details: {
            previousEndTime: lastEndTime,
            currentStartTime: startTime,
            gapInSeconds: gap,
          },
        });
      }
    }
    lastEndTime = endTime;
  });
  return issues;
};

const detectPlotInconsistencies = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const plotState: {
    characters: { [id: string]: { status: 'ok' | 'captured' | 'injured' | 'dead'; shot: string } };
    objects: { [id: string]: { status: 'ok' | 'broken'; shot: string } };
  } = { characters: {}, objects: {} };

  shots.forEach((shot) => {
    const prompt = shot.compositionPrompt.toLowerCase();

    // --- CHARACTER STATE CHECKS ---
    shot.character_definitions?.forEach((charDef) => {
      const id = charDef.id;
      if (!plotState.characters[id]) plotState.characters[id] = { status: 'ok', shot: shot.shotId };
      const state = plotState.characters[id];

      if (
        state.status === 'captured' &&
        (prompt.includes('walks freely') || prompt.includes('explores') || prompt.includes('runs'))
      ) {
        issues.push({
          id: `${shot.shotId}-plot-captured`,
          type: IssueType.Plot,
          severity: IssueSeverity.Critical,
          shotId: shot.shotId,
          message: `Nhân vật '${id}' được thể hiện đang hành động tự do trong khi lẽ ra phải bị bắt giữ.`,
          suggestion: `Nhân vật đã bị bắt trong cảnh ${state.shot}. Hành động này không nhất quán. Nhân vật phải được giải thoát trước.`,
          isFixable: false,
          originalPrompt: shot.compositionPrompt,
        });
      }

      if (
        (state.status === 'injured' || state.status === 'dead') &&
        (prompt.includes('runs energetically') || prompt.includes('jumps') || prompt.includes('is healthy'))
      ) {
        issues.push({
          id: `${shot.shotId}-plot-injury`,
          type: IssueType.Plot,
          severity: IssueSeverity.Critical,
          shotId: shot.shotId,
          message: `Nhân vật '${id}' đang hành động khỏe mạnh mặc dù trước đó đã bị ${state.status}.`,
          suggestion: `Nhân vật đã được đánh dấu là ${state.status} trong cảnh ${state.shot}. Cần có cảnh hồi phục hoặc sửa lại trạng thái.`,
          isFixable: false,
          originalPrompt: shot.compositionPrompt,
        });
      }

      if (prompt.includes('is rescued') || prompt.includes('is saved')) {
        if (state.status !== 'captured' && state.status !== 'injured') {
          issues.push({
            id: `${shot.shotId}-plot-rescue`,
            type: IssueType.Plot,
            severity: IssueSeverity.Critical,
            shotId: shot.shotId,
            message: `Nhân vật '${id}' được giải cứu mà không bị bắt giữ hoặc gặp nguy hiểm rõ ràng trước đó.`,
            suggestion: 'Đảm bảo một cảnh trước đó cho thấy nhân vật bị bắt hoặc gặp nguy hiểm.',
            isFixable: false,
            originalPrompt: shot.compositionPrompt,
          });
        }
        plotState.characters[id] = { status: 'ok', shot: shot.shotId };
      }
    });

    // --- OBJECT STATE CHECKS & UPDATES ---
    const objectRegex = /the (\w+ crystal|magic sword|ancient scroll)/g;
    let match;
    while ((match = objectRegex.exec(prompt)) !== null) {
      const objectId = match[1].replace(' ', '_');
      const state = plotState.objects[objectId];

      if (
        state?.status === 'broken' &&
        (prompt.includes(`uses the ${match[1]}`) || prompt.includes(`wields the ${match[1]}`))
      ) {
        issues.push({
          id: `${shot.shotId}-plot-object`,
          type: IssueType.Plot,
          severity: IssueSeverity.Critical,
          shotId: shot.shotId,
          message: `Có một nỗ lực sử dụng một đối tượng đã bị hỏng: '${match[1]}'.`,
          suggestion: `Đối tượng đã bị hỏng trong cảnh ${state.shot}. Nó không thể được sử dụng trừ khi được sửa chữa.`,
          isFixable: false,
          originalPrompt: shot.compositionPrompt,
        });
      }

      if (prompt.includes(`breaks the ${match[1]}`) || prompt.includes(`shatters the ${match[1]}`)) {
        plotState.objects[objectId] = { status: 'broken', shot: shot.shotId };
      }
    }

    // --- CHARACTER STATE UPDATES (must happen after checks) ---
    shot.character_definitions?.forEach((charDef) => {
      const id = charDef.id;
      if (prompt.includes('is captured') || prompt.includes('is trapped')) {
        plotState.characters[id] = { status: 'captured', shot: shot.shotId };
      }
      if (prompt.includes('is injured') || prompt.includes('is hurt')) {
        plotState.characters[id] = { status: 'injured', shot: shot.shotId };
      }
      if (prompt.includes('dies') || prompt.includes('is killed')) {
        plotState.characters[id] = { status: 'dead', shot: shot.shotId };
      }
    });
  });
  return issues;
};

const detectCharacterLocks = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const positionWords = /(left|right|center|foreground|background|beside|between|next to)/i;

  shots.forEach((shot) => {
    // 1. Check for missing lock syntax for each character
    shot.character_definitions?.forEach((charDef) => {
      const lockRegex = new RegExp(`[\\[{(<]${charDef.id}[\\])}>]`);
      if (!lockRegex.test(shot.compositionPrompt)) {
        issues.push({
          id: `${shot.shotId}-lock-${charDef.id}`,
          type: IssueType.CharacterLock,
          severity: IssueSeverity.Warning,
          shotId: shot.shotId,
          message: `Nhân vật '${charDef.id}' chưa được khóa trong prompt.`,
          suggestion: `Thêm '{${charDef.id}}' vào prompt để đảm bảo tính nhất quán của nhân vật.`,
          isFixable: true,
          originalPrompt: shot.compositionPrompt,
          details: { characterId: charDef.id },
        });
      }
    });

    // 2. Check for positioning if multiple characters are present
    if (shot.character_definitions && shot.character_definitions.length > 1) {
      if (!positionWords.test(shot.compositionPrompt)) {
        const charIds = shot.character_definitions.map(c => c.id);
        const suggestion_template = ` In the foreground, {${charIds[0]}} is on the left and {${charIds[1]}} is on the right.`;

        issues.push({
          id: `${shot.shotId}-lock-positioning`,
          type: IssueType.CharacterLock,
          severity: IssueSeverity.Warning,
          shotId: shot.shotId,
          message: 'Nhiều nhân vật trong cảnh quay nhưng thiếu các từ chỉ định vị trí.',
          suggestion: "Thêm các từ chỉ định vị trí như 'bên trái', 'bên cạnh', 'ở hậu cảnh' để làm rõ bối cảnh.",
          suggestion_template: suggestion_template,
          isFixable: false,
          originalPrompt: shot.compositionPrompt,
        });
      }
    }
  });
  return issues;
};

const detectSfxIssues = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];

  shots.forEach((shot) => {
    const prompt = shot.compositionPrompt.toLowerCase();
    const existingSfx = new Set(shot.sync?.audio?.sfx || []);

    const requiredSfxMap = new Map<string, string>(); // keyword -> sfx
    const keywordGroups: Record<string, { sfx: string; context?: string[] }[]> = {};
    intelligentSfxMap.forEach((rule) => {
      rule.keywords.forEach((kw) => {
        if (!keywordGroups[kw]) keywordGroups[kw] = [];
        keywordGroups[kw].push({ sfx: rule.sfx, context: rule.context });
      });
    });

    // 1. Determine required SFX based on prompt context
    Object.keys(keywordGroups).forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`);
      if (regex.test(prompt)) {
        const rulesForKeyword = keywordGroups[kw];
        let sfxAdded = false;
        for (const rule of rulesForKeyword) {
          if (rule.context && rule.context.some((ctx) => prompt.includes(ctx))) {
            requiredSfxMap.set(kw, rule.sfx);
            sfxAdded = true;
            break;
          }
        }
        if (!sfxAdded) {
          const defaultRule = rulesForKeyword.find((r) => !r.context);
          if (defaultRule) {
            requiredSfxMap.set(kw, defaultRule.sfx);
          }
        }
      }
    });

    const requiredSfx = new Set(requiredSfxMap.values());

    // 2. Find missing SFX
    requiredSfx.forEach((sfx) => {
      if (!existingSfx.has(sfx)) {
        const keywordSource =
          [...requiredSfxMap.entries()].find(([k, v]) => v === sfx)?.[0] || 'hành động';
        issues.push({
          id: `${shot.shotId}-sfx-missing-${sfx}`,
          type: IssueType.Sfx,
          severity: IssueSeverity.Warning,
          shotId: shot.shotId,
          message: `Phát hiện hành động '${keywordSource}' nhưng thiếu SFX phù hợp với bối cảnh.`,
          suggestion: `Thêm hiệu ứng âm thanh '${sfx}' để tăng cường cảnh quay.`,
          isFixable: true,
          originalPrompt: shot.compositionPrompt,
          details: { sfxToAdd: sfx },
        });
      }
    });

    // 3. Find low-quality/mismatched SFX
    existingSfx.forEach((sfx) => {
      if (lowQualitySfx.has(sfx) && requiredSfx.size > 0) {
        issues.push({
          id: `${shot.shotId}-sfx-lowquality-${sfx}`,
          type: IssueType.Sfx,
          severity: IssueSeverity.Warning,
          shotId: shot.shotId,
          message: `Hiệu ứng âm thanh '${sfx}' có chất lượng thấp hoặc quá chung chung.`,
          suggestion: `Nâng cấp bằng SFX cụ thể hơn dựa trên hành động trong cảnh, ví dụ: ${Array.from(
            requiredSfx
          ).join(', ')}.`,
          isFixable: true, // It will be fixed by the stabilization function
          originalPrompt: shot.compositionPrompt,
          details: { sfxToRemove: sfx, sfxToAdd: Array.from(requiredSfx) },
        });
      }
    });
  });

  return issues;
};

const detectContinuityIssues = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  shots.forEach((shot, index) => {
    if (index > 0 && !shot.continuity?.scene_anchor) {
      issues.push({
        id: `${shot.shotId}-continuity-anchor`,
        type: IssueType.Continuity,
        severity: IssueSeverity.Critical,
        shotId: shot.shotId,
        message: "Cảnh quay thiếu 'continuity anchor' để duy trì tính nhất quán với cảnh trước.",
        suggestion:
          "Chạy 'Ổn định & Sửa lỗi nhất quán' để tự động thêm các khối continuity, giúp kế thừa bối cảnh, ánh sáng và trạng thái nhân vật.",
        isFixable: true,
      });
    }
    if (shot.technical?.no_LUT === undefined || shot.technical?.color_space !== 'Rec709') {
      issues.push({
        id: `${shot.shotId}-continuity-color`,
        type: IssueType.Continuity,
        severity: IssueSeverity.Warning,
        shotId: shot.shotId,
        message: 'Không gian màu hoặc cài đặt LUT không được khóa.',
        suggestion:
          "Đảm bảo các cài đặt kỹ thuật như 'color_space' và 'no_LUT' được thiết lập để ngăn ngừa sự thay đổi màu sắc.",
        isFixable: true,
      });
    }
  });
  return issues;
};

const detectComprehensiveSpatialAndTemporalErrors = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  let characterStates: Record<string, { states: Set<string>; shotId: string }> = {};

  for (let i = 1; i < shots.length; i++) {
    const prevShot = shots[i - 1];
    const currentShot = shots[i];
    const prevPrompt = prevShot.compositionPrompt.toLowerCase();
    const currentPrompt = currentShot.compositionPrompt.toLowerCase();

    // Spatial: Scene Mirror Inversion
    if (
      prevShot.anchors &&
      currentShot.anchors &&
      !currentShot.screen_direction?.includes('lock')
    ) {
      const prevAnchorKeys = Object.keys(prevShot.anchors);
      if (prevAnchorKeys.length > 0) {
        const key = prevAnchorKeys[0];
        if (
          prevShot.anchors[key] &&
          currentShot.anchors[key] &&
          prevShot.anchors[key].xy[0] === -currentShot.anchors[key].xy[0]
        ) {
          issues.push({
            id: `${currentShot.shotId}-spatial-mirror`,
            type: IssueType.Spatial,
            severity: IssueSeverity.Critical,
            shotId: currentShot.shotId,
            message: 'Bố cục cảnh có thể đã bị đảo ngược (lật ngang).',
            suggestion: JSON.stringify(
              {
                screen_direction: 'lock_left_to_right',
                parallax_lock: true,
              },
              null,
              2
            ),
            isFixable: false,
          });
        }
      }
    }

    // Temporal: Character State Inconsistency (e.g., wet -> dry -> wet)
    currentShot.character_definitions?.forEach((charDef) => {
      const id = charDef.id;
      if (!characterStates[id]) characterStates[id] = { states: new Set(), shotId: '' };
      let updated = false;
      if (currentPrompt.includes('wet') || currentPrompt.includes('drenched')) {
        if (characterStates[id].states.has('dry')) {
          // Only flag this as an error if a persistence mechanism isn't already defined.
          // If state_persistence exists, we assume the user has handled this logic.
          if (!currentShot.state_persistence) {
            issues.push({
              id: `${currentShot.shotId}-temporal-state-${id}`,
              type: IssueType.Timeline,
              severity: IssueSeverity.Critical,
              shotId: currentShot.shotId,
              message: `Trạng thái của nhân vật '${id}' thay đổi phi logic (khô rồi lại ướt).`,
              suggestion: JSON.stringify(
                {
                  state_persistence: ['wet_fur', 'mud_stains'],
                  state_decay_rate: 'linear',
                },
                null,
                2
              ),
              isFixable: false,
            });
          }
        }
        characterStates[id].states.add('wet');
        characterStates[id].states.delete('dry');
        updated = true;
      }
      if (currentPrompt.includes('dry') || currentPrompt.includes('clean')) {
        if (characterStates[id].states.has('wet')) {
          characterStates[id].states.add('dry');
          characterStates[id].states.delete('wet');
          updated = true;
        }
      }
      if (updated) {
        characterStates[id].shotId = currentShot.shotId;
      }
    });

    // Narrative: Missing Reaction Shot
    if (
      prevPrompt.includes('crow appears') ||
      prevPrompt.includes('sudden noise') ||
      prevPrompt.includes('danger')
    ) {
      if (
        !currentPrompt.includes('reacts') &&
        !currentPrompt.includes('looks up') &&
        !currentPrompt.includes('startled')
      ) {
        issues.push({
          id: `${currentShot.shotId}-narrative-reaction`,
          type: IssueType.Narrative,
          severity: IssueSeverity.Warning,
          shotId: currentShot.shotId,
          message: 'Thiếu cảnh phản ứng của nhân vật sau một sự kiện quan trọng.',
          suggestion:
            'Chèn một cảnh quay cho thấy nhân vật phản ứng với sự kiện ở cảnh trước để duy trì mạch truyện.',
          isFixable: false,
        });
      }
    }
  }

  return issues;
};

const detectCinematographyAndLightingErrors = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];

  for (let i = 1; i < shots.length; i++) {
    const prevShot = shots[i - 1];
    const currentShot = shots[i];

    // Camera: Axis Jump
    // This is a simplified heuristic. Real detection is complex.
    const prevChar = prevShot.character_definitions?.[0];
    const currChar = currentShot.character_definitions?.[0];
    if (
      prevChar &&
      currChar &&
      prevChar.id === currChar.id &&
      prevChar.position?.includes('left') &&
      currChar.position?.includes('right')
    ) {
      issues.push({
        id: `${currentShot.shotId}-camera-axis`,
        type: IssueType.Camera,
        severity: IssueSeverity.Critical,
        shotId: currentShot.shotId,
        message: 'Phát hiện khả năng nhảy trục (vi phạm quy tắc 180 độ).',
        suggestion: JSON.stringify(
          {
            camera_axis_lock: true,
            mirror_flip: false,
          },
          null,
          2
        ),
        isFixable: false,
      });
    }

    // Camera: Lens Drift
    const prevLens = prevShot.sync?.camera?.lens?.focal_length;
    const currLens = currentShot.sync?.camera?.lens?.focal_length;
    if (prevLens && currLens && Math.abs(prevLens - currLens) > 10) {
      issues.push({
        id: `${currentShot.shotId}-camera-lens`,
        type: IssueType.Camera,
        severity: IssueSeverity.Warning,
        shotId: currentShot.shotId,
        message: `Tiêu cự ống kính thay đổi đột ngột từ ${prevLens}mm sang ${currLens}mm.`,
        suggestion: JSON.stringify(
          {
            'lens.match_previous': true,
            lens_variation: '±10mm',
          },
          null,
          2
        ),
        isFixable: false,
      });
    }

    // Lighting: White Balance Jump
    const prevWBStr = prevShot.sync?.lighting?.white_balance || '5600K';
    const currWBStr = currentShot.sync?.lighting?.white_balance || '5600K';
    const prevWB = parseInt(prevWBStr.replace('K', ''));
    const currWB = parseInt(currWBStr.replace('K', ''));
    if (Math.abs(prevWB - currWB) > 300) {
      issues.push({
        id: `${currentShot.shotId}-lighting-wb`,
        type: IssueType.Lighting,
        severity: IssueSeverity.Warning,
        shotId: currentShot.shotId,
        message: `White balance thay đổi đột ngột từ ${prevWB}K sang ${currWB}K.`,
        suggestion: JSON.stringify(
          {
            lighting_inherit: true,
            white_balance_variation: '≤300K',
          },
          null,
          2
        ),
        isFixable: false,
      });
    }
  }
  return issues;
};

const detectAdvancedContinuity = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];

  for (let i = 1; i < shots.length; i++) {
    const prevShot = shots[i - 1];
    const currentShot = shots[i];

    // Prop Continuity Check
    const propsInPrompt = currentShot.compositionPrompt.match(/prop_[\w_]+/g) || [];
    propsInPrompt.forEach((propId) => {
      if (!currentShot.props_reference?.includes(propId)) {
        issues.push({
          id: `${currentShot.shotId}-prop-ref-${propId}`,
          type: IssueType.Prop,
          severity: IssueSeverity.Warning,
          shotId: currentShot.shotId,
          message: `Đạo cụ '${propId}' được đề cập nhưng không được tham chiếu chính thức.`,
          suggestion: JSON.stringify(
            {
              props_reference: [propId],
            },
            null,
            2
          ),
          isFixable: false,
        });
      }
    });
  }

  return issues;
};

const detectSpatialAndPropContinuity = (shots: VisualPlanShot[]): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  const propUsageCount = new Map<string, number>();

  // First pass: collect all prop usage counts from references
  shots.forEach((shot) => {
    shot.props_reference?.forEach((propId) => {
      propUsageCount.set(propId, (propUsageCount.get(propId) || 0) + 1);
    });
  });

  shots.forEach((shot) => {
    // 1. Seed check
    if (!shot.technical?.seed) {
      issues.push({
        id: `${shot.shotId}-spatial-seed-tech`,
        type: IssueType.Spatial,
        severity: IssueSeverity.Warning,
        shotId: shot.shotId,
        message: "Cảnh quay thiếu 'seed' kỹ thuật chung.",
        suggestion: `Thêm "seed": 3001 vào khối 'technical' để đảm bảo kết quả nhất quán. Chạy 'Ổn định' sẽ tự động thêm.`,
        isFixable: true,
      });
    }

    // 2. Persistent Prop Check
    shot.props?.forEach((prop) => {
      if ((propUsageCount.get(prop.id) || 0) > 1 && prop.continuity !== 'persistent') {
        issues.push({
          id: `${shot.shotId}-prop-persistent-${prop.id}`,
          type: IssueType.Prop,
          severity: IssueSeverity.Critical,
          shotId: shot.shotId,
          message: `Đạo cụ tái sử dụng '${prop.id}' thiếu 'continuity: "persistent"'.`,
          suggestion: `Trong định nghĩa của '${prop.id}', hãy thêm "continuity": "persistent" để đảm bảo nó không thay đổi giữa các cảnh.`,
          isFixable: true,
        });
      }
    });

    // 3. Spatial Lock Check
    if (!shot.screen_direction || shot.parallax_lock === undefined) {
      issues.push({
        id: `${shot.shotId}-spatial-lock`,
        type: IssueType.Spatial,
        severity: IssueSeverity.Warning,
        shotId: shot.shotId,
        message: 'Khung cảnh thiếu các khóa không gian để ngăn ngừa sự thay đổi.',
        suggestion: JSON.stringify(
          {
            screen_direction: 'lock_left_to_right',
            parallax_lock: true,
            '//note': 'Thêm các thuộc tính này để giữ cho vị trí tương đối của các đối tượng ổn định.',
          },
          null,
          2
        ),
        isFixable: false,
      });
    }

    // 4. Prop State Override Suggestion
    const stateKeywords = ['wet', 'damp', 'submerged', 'broken', 'dirty', 'rain droplets'];
    const promptLower = shot.compositionPrompt.toLowerCase();
    if (stateKeywords.some((kw) => promptLower.includes(kw))) {
      shot.props_reference?.forEach((propId) => {
        const propNameInPrompt = propId
          .replace('prop_', '')
          .replace(/_[\w\d]+$/, '')
          .replace('_', ' ');
        if (promptLower.includes(propNameInPrompt)) {
          if (!shot.prop_state_override || !shot.prop_state_override[propId]) {
            issues.push({
              id: `${shot.shotId}-prop-state-${propId}`,
              type: IssueType.Prop,
              severity: IssueSeverity.Warning,
              shotId: shot.shotId,
              message: `Trạng thái vật lý của đạo cụ '${propId}' có thể không được khóa.`,
              suggestion: JSON.stringify(
                {
                  prop_state_override: {
                    [propId]: "mô tả trạng thái vật lý ở đây (ví dụ: 'wet with rain droplets')",
                  },
                },
                null,
                2
              ),
              isFixable: false,
            });
          }
        }
      });
    }
  });
  return issues;
};

export const performVEO3Analysis = (data: ScriptData): AnalysisResult => {
  if (!data || !Array.isArray(data.script)) {
    console.error('Invalid script data provided to analysis');
    return {
      stats: { totalShots: 0, veo3Ready: 0, criticalIssues: 0, warnings: 0 },
      issueCounts: {} as Record<IssueType, number>,
      issues: [],
      shots: [],
    };
  }

  const allShots = data.script.flatMap((scene) => scene.visualPlan || []).filter(Boolean);

  let issues = [
    ...detectPhysicsErrors(allShots),
    ...detectCharacterIssues(allShots),
    ...detectLocationIssues(allShots),
    ...detectTimelineIssues(data.script),
    ...detectPlotInconsistencies(allShots),
    ...detectCharacterLocks(allShots),
    ...detectSfxIssues(allShots),
    ...detectContinuityIssues(allShots),
    ...detectAdvancedContinuity(allShots),
    ...detectSpatialAndPropContinuity(allShots),
    ...detectComprehensiveSpatialAndTemporalErrors(allShots),
    ...detectCinematographyAndLightingErrors(allShots),
  ];

  const issuesByShotId: { [key: string]: AnalysisIssue[] } = {};
  for (const issue of issues) {
    if (!issuesByShotId[issue.shotId]) {
      issuesByShotId[issue.shotId] = [];
    }
    issuesByShotId[issue.shotId].push(issue);
  }

  const finalIssues: AnalysisIssue[] = [];
  Object.values(issuesByShotId).forEach((shotIssues) => {
    const continuityTypes = [
      IssueType.Camera,
      IssueType.Lighting,
      IssueType.Continuity,
      IssueType.Prop,
      IssueType.Spatial,
    ];
    const continuityIssuesInShot = shotIssues.filter((i) => continuityTypes.includes(i.type));

    if (continuityIssuesInShot.length >= 3) {
      const combinedFix: Record<string, any> = {};
      continuityIssuesInShot.forEach((issue) => {
        try {
          const fixString = issue.suggestion.replace(/\s*\/\/.*/g, ''); // Remove comments
          const fixObj = JSON.parse(fixString);
          // Simple merge, could be improved with deep merge
          Object.keys(fixObj).forEach((key) => {
            if (typeof fixObj[key] === 'object' && !Array.isArray(fixObj[key]) && combinedFix[key]) {
              combinedFix[key] = { ...combinedFix[key], ...fixObj[key] };
            } else {
              combinedFix[key] = fixObj[key];
            }
          });
        } catch (e) {
          /* ignore parse errors for non-json suggestions */
        }
      });

      finalIssues.push({
        id: `${shotIssues[0].shotId}-continuity-patch`,
        type: IssueType.Continuity,
        severity: IssueSeverity.Critical,
        shotId: shotIssues[0].shotId,
        message: 'Phát hiện nhiều lỗi nhất quán. Đề xuất một bản vá tổng hợp.',
        suggestion: JSON.stringify({ continuity_patch: combinedFix }, null, 2),
        isFixable: false,
      });
      finalIssues.push(...shotIssues.filter((i) => !continuityTypes.includes(i.type)));
    } else {
      finalIssues.push(...shotIssues);
    }
  });

  issues = finalIssues;

  const initialCounts = Object.values(IssueType).reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<IssueType, number>);

  const issueCounts = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, initialCounts);

  const criticalIssues = issues.filter((i) => i.severity === IssueSeverity.Critical).length;
  const warnings = issues.filter((i) => i.severity === IssueSeverity.Warning).length;

  const shotsWithCriticalIssues = new Set(
    issues.filter((i) => i.severity === IssueSeverity.Critical).map((i) => i.shotId)
  );
  const veo3Ready = allShots.length - shotsWithCriticalIssues.size;

  return {
    stats: {
      totalShots: allShots.length,
      veo3Ready,
      criticalIssues,
      warnings,
    },
    issueCounts,
    issues,
    shots: allShots,
  };
};

export const autoFixScript = (
  originalData: ScriptData,
  issuesToFix: AnalysisIssue[]
): { fixedScript: ScriptData; fixesApplied: number } => {
  let fixesApplied = 0;
  const data = JSON.parse(JSON.stringify(originalData));

  const findShot = (shotId: string): VisualPlanShot | undefined => {
    for (const scene of data.script) {
      const shot = scene.visualPlan.find((s: VisualPlanShot) => s.shotId === shotId);
      if (shot) return shot;
    }
    return undefined;
  };

  issuesToFix.forEach((issue) => {
    const shot = findShot(issue.shotId);
    if (!shot) return;

    switch (issue.type) {
      case IssueType.CharacterLock: {
        const charId = issue.details?.characterId;
        if (charId && !shot.compositionPrompt.includes(`{${charId}}`)) {
          let newPrompt = shot.compositionPrompt;
          const charName = charId.replace('char_', '').replace(/_\d+$/, '');
          const nameRegex = new RegExp(`^(${charName})`, 'i');
          if (nameRegex.test(newPrompt)) {
            newPrompt = newPrompt.replace(nameRegex, `{${charId}} $1`);
          } else {
            newPrompt = `{${charId}} ` + newPrompt;
          }
          shot.compositionPrompt = newPrompt;
          fixesApplied++;
        }
        break;
      }

      case IssueType.Physics: {
        if (issue.message.includes('bay mà không') && issue.isFixable) {
          shot.compositionPrompt = shot.compositionPrompt.replace(
            /(fly|flies|flew|flying|soars|floats)/i,
            (match) => `jumps and ${match}`
          );
          fixesApplied++;
        }
        break;
      }

      case IssueType.Sfx: {
        const sfxToAdd = issue.details?.sfxToAdd;
        if (sfxToAdd) {
          if (!shot.sync) shot.sync = {} as any;
          if (!shot.sync.audio) shot.sync.audio = { sfx: [] };
          if (!shot.sync.audio.sfx) shot.sync.audio.sfx = [];
          if (!shot.sync.audio.sfx.includes(sfxToAdd)) {
            shot.sync.audio.sfx.push(sfxToAdd);
            fixesApplied++;
          }
        }
        break;
      }
    }
  });

  const timelineIssues = issuesToFix.filter((i) => i.type === IssueType.Timeline && i.isFixable);
  if (timelineIssues.length > 0) {
    let lastEndTimeSec = 0;
    data.script.forEach((scene: Scene) => {
      if (!scene.timeline || !scene.timeline.includes(' - ')) return;
      const [startStr, endStr] = scene.timeline.split(' - ');
      const startTimeSec = parseTimeToSeconds(startStr);
      const endTimeSec = parseTimeToSeconds(endStr);

      if (isNaN(startTimeSec) || isNaN(endTimeSec)) return;

      const durationSec = endTimeSec - startTimeSec;

      if (startTimeSec > lastEndTimeSec && lastEndTimeSec > 0) {
        const shouldFix = timelineIssues.some((issue) =>
          scene.visualPlan?.some((shot) => shot.shotId === issue.shotId)
        );
        if (shouldFix) {
          const newStartTimeSec = lastEndTimeSec;
          const newEndTimeSec = newStartTimeSec + durationSec;
          const format = (s: number) =>
            `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`;
          scene.timeline = `${format(newStartTimeSec)} - ${format(newEndTimeSec)}`;
          lastEndTimeSec = newEndTimeSec;
          fixesApplied++;
        } else {
          lastEndTimeSec = endTimeSec;
        }
      } else {
        lastEndTimeSec = endTimeSec;
      }
    });
  }

  return { fixedScript: data, fixesApplied };
};

export const generateVEO3ShotJSON = (shot: VisualPlanShot): string => {
  const veo3Object: Record<string, any> = {};

  // Helper to add property if it exists
  const addIfExists = (key: string, value: any) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
        return;
      veo3Object[key] = value;
    }
  };

  const mapCharacter = (char: CharacterDefinition) => {
    const { id, appearance, ...rest } = char;
    // The spec wants appearance fields flattened with id and other properties
    return { id, ...appearance, ...rest };
  };

  // Build object in specified order
  addIfExists('shot_id', shot.shotId);
  addIfExists('prompt', shot.compositionPrompt);
  addIfExists('continuity', shot.continuity);
  addIfExists('anchors', shot.anchors);
  addIfExists('screen_direction', shot.screen_direction);
  addIfExists('parallax_lock', shot.parallax_lock);
  addIfExists('environment', shot.environment);
  addIfExists('camera', shot.sync?.camera);
  addIfExists('lighting', shot.sync?.lighting);
  addIfExists('characters', shot.character_definitions?.map(mapCharacter));
  addIfExists('props', shot.props);
  addIfExists('props_reference', shot.props_reference);
  addIfExists('prop_state_override', shot.prop_state_override);
  addIfExists('audio', shot.sync?.audio);
  addIfExists('animation', shot.animation);

  const mergedTechnical = {
    fps: 24,
    codec: 'H.264',
    negative_prompts: ['low quality', 'blurry', 'watermark'],
    ...shot.technical,
  };
  addIfExists('technical', mergedTechnical);

  return JSON.stringify(veo3Object, null, 2);
};

// --- NEW STABILIZATION FUNCTION ---

const parseDurationToSeconds = (duration: string | undefined): number | null => {
  if (!duration || typeof duration !== 'string') return null;
  const match = duration.match(/^(\d+(\.\d+)?)\s*s$/i);
  return match ? parseFloat(match[1]) : null;
};

export const stabilizeSceneV2 = (
  originalShot: VisualPlanShot
): { fixedShot?: VisualPlanShot; error?: { message: string } } => {
  try {
    const shot = JSON.parse(JSON.stringify(originalShot));

    // Deconstruct Prompt
    const antiAliasTail =
      'Photographic digital capture — clean sensor look, neutral color (Rec709/ACES-like), no vintage effects, no film grain, no anime, no manga, no cel shading, no toon.';
    const oldTailRegex = /Photographic digital capture.*$/;
    let promptCore = shot.compositionPrompt.replace(oldTailRegex, '').trim();

    // Environment Anchor
    shot.environment = {
      location: 'secret garden path',
      time_of_day: 'late afternoon',
      ...shot.environment,
      inherit: true,
      modifications: shot.environment?.modifications || 'minor only (≤10%)',
    };

    // Camera Lock
    shot.sync = shot.sync || ({} as any);
    shot.sync.camera = shot.sync.camera || {};
    shot.sync.camera = {
      stabilization: 'strong',
      rolling_shutter_correction: true,
      focus_mode: 'continuous',
      aperture: 'f/4.0',
      shutter: '1/120',
      iso: 'base',
      auto_exposure: false,
      motion_blur: 'off',
      ...shot.sync.camera,
      'lens.match_previous': shot.sync.camera['lens.match_previous'] !== undefined ? shot.sync.camera['lens.match_previous'] : true,
      camera_axis_lock: shot.camera_axis_lock !== undefined ? shot.camera_axis_lock : true,
      camera_height_lock: shot.camera_height_lock !== undefined ? shot.camera_height_lock : true,
    };

    // Lighting Lock
    shot.sync.lighting = {
      style: 'dynamic, contrasty but realistic',
      ...shot.sync.lighting,
      exposure: 'locked midtone',
      reference: 'previous_scene',
      variation: '0.1',
      white_balance: '5600K',
      exposure_lock: shot.exposure_lock !== undefined ? shot.exposure_lock : true,
      contrast_match: shot.contrast_match || "inherit",
      light_direction_lock: shot.light_direction_lock || "southwest",
      shadow_persistence: shot.shadow_persistence !== undefined ? shot.shadow_persistence : true,
    };

    // Characters Lock
    if (shot.character_definitions) {
      shot.character_definitions.forEach((char, index) => {
        if (char.scale === undefined) char.scale = index === 0 ? 1.0 : undefined;
        if (char.pose === undefined) char.pose = 'natural, non-anthropomorphic posture';
      });
    }
    shot.compositionPrompt = `${promptCore} ${antiAliasTail}`;

    // Motion & Animation Constraints
    shot.animation = shot.animation || {};
    const defaultConstraints = [
      'no anthropomorphic posture',
      'no exaggerated squash/stretch',
      'no collision with camera',
      'no random zooms or reframing',
    ];
    shot.animation.motion_constraints = Array.from(
      new Set([...(shot.animation.motion_constraints || []), ...defaultConstraints])
    );
    
    // Physics Lock
    shot.physics_gravity_lock = shot.physics_gravity_lock !== undefined ? shot.physics_gravity_lock : true;
    shot.collision_refinement = shot.collision_refinement !== undefined ? shot.collision_refinement : true;


    // Technical Block
    shot.technical = shot.technical || {};
    const defaultNegatives = [
      'low quality',
      'blurry',
      'watermark',
      'glowing outlines',
      'random color shift',
      'new environment',
      'reset wardrobe',
    ];
    shot.technical = {
      ...shot.technical,
      color_space: 'Rec709',
      no_LUT: true,
      negative_prompts: Array.from(
        new Set([...(shot.technical.negative_prompts || []), ...defaultNegatives])
      ),
    };

    // --- "GOLDEN RULES" & CONTINUITY PATCH LOGIC ---
    shot.technical.seed = shot.technical.seed || 3001; // Global seed
    if (shot.character_definitions) {
      shot.character_definitions.forEach((char, index) => {
        char.seed = char.seed || 1001 + index; // Per-character seed
      });
    }

    const referencedProps = new Set<string>(shot.props_reference || []);
    const propsInPrompt = shot.compositionPrompt.match(/prop_[\w_]+/g) || [];
    propsInPrompt.forEach((p) => referencedProps.add(p));

    if (shot.props) {
      shot.props.forEach((prop, index) => {
        prop.seed = prop.seed || 2001 + index; // Per-prop seed
        prop.continuity = 'persistent'; // Enforce persistence
      });
    }
    if (referencedProps.size > 0) {
      shot.props_reference = Array.from(referencedProps).sort();
    } else if (shot.props_reference) {
      delete shot.props_reference;
    }

    shot.screen_direction = shot.screen_direction || 'lock_left_to_right';
    shot.parallax_lock = shot.parallax_lock !== undefined ? shot.parallax_lock : true;
    shot.anchors = shot.anchors || {};

    shot.continuity = {
      scene_anchor: 'inherit from previous shot',
      reference_scene: 'prev',
      environment_inherit: true,
      lighting_inherit: true,
      character_state_inherit: shot.character_definitions?.map((c) => c.id) || [],
      prop_state_inherit: shot.props?.map((p: any) => p.id) || [],
      ...shot.continuity,
    };
    
    shot.state_persistence = shot.state_persistence || ["wet_fur", "mud_stains", "exhaustion"];
    
    // Final cleanup of redundant top-level keys if they are in sub-objects
    delete shot.exposure_lock;
    delete shot.camera_axis_lock;

    return { fixedShot: shot };
  } catch (e) {
    console.error('Error in stabilizeSceneV2:', e);
    return { error: { message: 'Lỗi nội bộ khi ổn định cảnh.' } };
  }
};