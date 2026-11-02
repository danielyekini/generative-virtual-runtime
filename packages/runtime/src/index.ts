export {
  AUDIO_BUSES,
  AudioSession,
  audioReadiness,
  createSceneAudioSession,
  cueSpanMs,
  cueVoiceAt,
  encodeWav,
  isRequired,
  mixAudio,
  narrationActiveAt,
  sceneAudioReadiness,
  sceneAudioResources,
  sceneAudioSchedule,
  syncSceneAudioCues,
  voicesAt,
} from "./audio";
export type {
  AudioBackend,
  AudioBus,
  AudioCommand,
  AudioCue,
  AudioDiagnostic,
  AudioDiagnosticCode,
  AudioMixSettings,
  AudioReadiness,
  AudioResource,
  AudioResourceState,
  AudioSchedule,
  AudioSessionOptions,
  AudioStartCommand,
  AudioStates,
  AudioSyncInput,
  AudioTriggerRecord,
  AudioVoice,
  DecodedAudio,
  MixOptions,
  SceneAudioOptions,
  SceneAudioResource,
} from "./audio";
export { RuntimeClock } from "./clock";
export { EntityRevisionStore } from "./entities";
export type {
  BehaviourId,
  BehaviourRecord,
  BindingPatchOp,
  ChannelId,
  CompactEntityContext,
  DrawableReuseBudget,
  EntityId,
  EntityPatch,
  EntityPatchCode,
  EntityPatchDiagnostic,
  EntityPatchOp,
  EntityRecord,
  EntityStoreSnapshot,
  ExtendedEntityPatch,
  ExtendedEntityPatchOp,
  GeometryAsset,
  GeometryBinding,
  GeometryId,
  OwnershipGrant,
  WriterClass,
} from "./entities";
export { buildResolvedFrame } from "./frame";
export {
  createSceneInputSession,
  declaredInputChannels,
  hitTest,
  hitTestAll,
  INPUT_CHANNELS,
  InputSession,
  logicalPointFromCss,
  ownershipFromGrants,
  replayInput,
} from "./input";
export type {
  HitResult,
  HitTestOptions,
  InputAction,
  InputBinding,
  InputChannel,
  InputEvent,
  InputOwnership,
  InputSessionOptions,
  InputSignal,
  InputStep,
  InputTarget,
  InputTrigger,
  TextMetrics,
} from "./input";
export { observeStreamingExecution } from "./observation";
export type {
  ObservedDeltaRef,
  StreamingCompileObservationSource,
  StreamingExecutionObservation,
  StreamingObservationSources,
  StreamingPlaybackObservationSource,
  StreamingRuntimeObservationSource,
  StreamingUnitObservation,
  StreamingUnitOutcome,
} from "./observation";
export { PlaybackClock } from "./playback";
export {
  PHYSICS_CHANNELS,
  PhysicsSession,
  solveAuthoredConstraints,
} from "./physics";
export type {
  AuthoredDistanceConstraint,
  PhysicsBody,
  PhysicsBodyKind,
  PhysicsChannel,
  PhysicsCollider,
  PhysicsCost,
  PhysicsDiagnostic,
  PhysicsDiagnosticCode,
  PhysicsDistanceJoint,
  PhysicsEvent,
  PhysicsOwnership,
  PhysicsSessionOptions,
  PhysicsSnapshot,
  PhysicsWrite,
} from "./physics";
export {
  createScenePhysicsSession,
  declaredPhysicsChannels,
  physicsOwnershipFromWorld,
} from "./physics-scene";
export type { ScenePhysicsSession } from "./physics-scene";
export { assessReadiness, PresentationController } from "./presentation";
export type { GeneratedOffer, PresentationPhase, PresentationView, Readiness, SystemCatalogueEntry } from "./presentation";
export type { PlaybackState } from "./playback";
export { AnimationRuntime } from "./runtime";
export type { SampleOverlay } from "./runtime";
export { sampleScene } from "./sample";
export {
  classifySurfacePair,
  clipPolygon,
  findSharedEdge,
  outlineOf,
  resolveSeams,
  splitIntersectingPair,
  unionProjected,
} from "./seams";
export type {
  SeamDiagnostic,
  SeamDiagnosticCode,
  SeamPairClassification,
  SeamPairKind,
  SeamResolveOptions,
  SeamResolveResult,
  SharedEdge,
} from "./seams";
export { StreamingRuntime } from "./streaming";
export {
  DEFAULT_FOCAL_LENGTH,
  DEFAULT_MAX_FRAGMENTS,
  DEFAULT_SEAM_EPSILON,
  DEFAULT_SPATIAL_LIMITS,
  hingeMatrix,
  multiplyMat4,
  orbitCamera,
  projectSpatialFrame,
  projectSurfacePoint,
  spatialLocalMatrix,
  surfaceDragDelta,
  transformPoint4,
  unprojectToSurface,
} from "./spatial";
export type {
  Mat4,
  ProjectedSurface,
  SpatialCamera,
  SpatialDiagnostic,
  SpatialDiagnosticCode,
  SpatialHinge,
  SpatialProjectOptions,
  SpatialSeams,
  SpatialLayer,
  SpatialLimits,
  SpatialProjection,
  SpatialRotation,
  SpatialSurface,
  SpatialTransform,
  SurfaceMode,
  Vec3,
} from "./spatial";
export { layersFromScene, projectSceneSpatial } from "./spatial-scene";
