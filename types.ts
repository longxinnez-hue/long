import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Code,
  Drama,
  Link,
  Lock,
  Map,
  MapPin,
  MessageCircleQuestion,
  Move,
  Puzzle,
  ShieldCheck,
  Sun,
  Timer,
  User,
  UserCheck,
  Volume2,
  Wind,
  Zap,
} from 'lucide-react';

export interface ScriptData {
  script: Scene[];
}

export interface Scene {
  timeline: string;
  hostDialogue: string;
  visualPlan: VisualPlanShot[];
}

export interface ContinuitySettings {
  scene_anchor?: string;
  reference_scene?: string;
  environment_inherit?: boolean;
  lighting_inherit?: boolean;
  character_state_inherit?: string[];
  prop_state_inherit?: string[];
}

export interface PropDefinition {
  id: string;
  type: string;
  appearance: string;
  continuity?: 'persistent';
  seed?: number;
  [key: string]: any;
}

export interface VisualPlanShot {
  shotId: string;
  compositionPrompt: string;
  character_definitions?: CharacterDefinition[];
  location: { id: string };
  sync: {
    duration: string;
    camera: any;
    lighting: any;
    audio: { sfx: string[] };
  };
  environment?: any;
  animation?: any;
  technical?: any;
  props?: PropDefinition[];
  props_reference?: string[];
  continuity?: ContinuitySettings;
  // Golden Rules additions
  prop_state_override?: Record<string, string>;
  anchors?: Record<string, { xy: [number, number] }>;
  screen_direction?: string;
  parallax_lock?: boolean;

  // New Comprehensive Continuity Fields
  // Spatial
  anchors_inherit?: boolean;
  prop_lock?: string[];
  scale_inherit?: boolean;
  scale_variation?: string;
  geometry_lock?: boolean;

  // Temporal
  state_persistence?: string[];
  state_decay_rate?: string;
  auto_sync_audio?: boolean;
  audio_latency_correction?: string;

  // Camera
  camera_axis_lock?: boolean;
  mirror_flip?: boolean;
  'lens.match_previous'?: boolean;
  lens_variation?: string;
  camera_height_lock?: boolean;
  eye_line_match?: string;

  // Lighting
  white_balance_variation?: string;
  exposure_lock?: boolean;
  contrast_match?: string;
  light_direction_lock?: string;
  shadow_persistence?: boolean;

  // Physics
  physics_gravity_lock?: boolean;
  collision_refinement?: boolean;
  reflection_consistency?: boolean;
  reflection_ref?: string;

  // Narrative
  emotion_curve?: string;
  emotion_inherit?: boolean;
}

export interface CharacterDefinition {
  id: string;
  appearance: {
    [key: string]: string | number;
    fur_color?: string;
    eye_color?: string;
    height?: string;
    build?: string;
  };
  scale?: number;
  position?: string;
  pose?: string;
  seed?: number;
}

export enum IssueType {
  Physics = 'Lỗi Vật lý',
  Character = 'Thiếu nhất quán Nhân vật',
  Location = 'Bước nhảy Địa điểm',
  Timeline = 'Lỗi Thời gian',
  Plot = 'Lỗi Logic Cốt truyện',
  CharacterLock = 'Lỗi Khóa Nhân vật',
  Sfx = 'Lỗi Âm thanh (SFX)',
  Continuity = 'Lỗi Thiếu nhất quán',
  Prop = 'Lỗi Đạo cụ',
  Lighting = 'Lỗi Ánh sáng',
  Camera = 'Lỗi Máy quay',
  Spatial = 'Lỗi Không gian',
  Narrative = 'Lỗi Logic Tường thuật',
}

export enum IssueSeverity {
  Critical = 'Critical',
  Warning = 'Warning',
}

export interface AnalysisIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  shotId: string;
  message: string;
  suggestion: string;
  suggestion_template?: string; // New field for actionable templates
  isFixable: boolean;
  originalPrompt?: string;
  details?: Record<string, any>;
}

export interface AnalysisResult {
  stats: {
    totalShots: number;
    veo3Ready: number;
    criticalIssues: number;
    warnings: number;
  };
  issueCounts: Record<IssueType, number>;
  issues: AnalysisIssue[];
  shots: VisualPlanShot[];
}