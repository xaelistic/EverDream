/**
 * Dream Asset Generation & VR Module
 *
 * Complete pipeline for generating rich media from dream content:
 * - Depth maps, skyboxes, 3D meshes, parallax video
 * - VR Home gallery environment
 * - Interactive gamified dream elements
 * - n8n batch processing workflows
 */

export {
  // Pipeline
  generateDepthMap,
  generateDepthMapFromBase64,
  generateSkybox,
  pollSkyboxStatus,
  generateSkyboxBlocking,
  generate3DMesh,
  pollMeshyStatus,
  generate3DMeshBlocking,
  generate3DMeshTripo,
  pollTripoStatus,
  generateParallaxVideo,
  generateMultiViewImages,
  DEFAULT_CAMERA_VIEWS,
  generateAssetPrompts,
  createAssetJob,
  processAssetStep,
} from './pipeline';

export type {
  AssetType,
  AssetStatus,
  DreamAsset,
  AssetGenerationJob,
  SkyboxRequest,
  SkyboxResult,
  MeshyMeshRequest,
  MeshyMeshResult,
} from './pipeline';

// ============================================================
// Dream Elements (Interactive VR)
// ============================================================

export {
  processInteraction,
  createDreamElements,
  createInterpretationSession,
  updateSessionDepth,
  exportInsightsAsJournalEntry,
} from './dreamElements';

export type {
  InteractionType,
  DreamElement,
  InteractionRecord,
  Insight,
  DreamInterpretationSession,
} from './dreamElements';

// ============================================================
// n8n Workflows
// ============================================================

export {
  DREAM_ASSET_WORKFLOW,
  WEEKLY_INSIGHTS_WORKFLOW,
  INTERACTION_ANALYSIS_WORKFLOW,
  VR_PIPELINE_WORKFLOW,
  RECOMMENDED_SCHEDULES,
  WEBHOOK_SCHEMAS,
} from '../n8n/workflows';

// ============================================================
// Components (lazy imports recommended)
// ============================================================

export { default as DreamAssetViewer } from '../../components/assets/DreamAssetViewer';
export { default as DreamAssetGenerator } from '../../components/assets/DreamAssetGenerator';
export { default as VRHome } from '../../components/vr/VRHome';
export { default as WebXRViewer } from '../../components/vr/WebXRViewer';
export type { VRHomeProps, VRDreamAsset, VRHomeConfig } from '../../components/vr/VRHome';
export type { WebXRViewerProps, WebXRAsset } from '../../components/vr/WebXRViewer';
