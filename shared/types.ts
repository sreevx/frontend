/**
 * AquaSentinel — Shared TypeScript Interfaces
 * Single source of truth for backend + frontend.
 * DO NOT duplicate these types elsewhere. Import from this file only.
 * No `any` types permitted anywhere in this file.
 */

// ============================================================
// ENUMS / LITERAL UNIONS
// ============================================================

export type AgentName =
  | "sensing"
  | "hydrodynamic"
  | "regulatory"
  | "mitigation";

export type WorkflowStatus =
  | "idle"
  | "running"
  | "awaiting_approval"
  | "escalated"
  | "completed"
  | "failed";

export type ApprovalDecision = "approve" | "reject";

export type ApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected"
  | "timed_out";

export type ContaminantType =
  | "heavy_metal"
  | "industrial_solvent"
  | "agricultural_runoff"
  | "sewage"
  | "unknown";

export type SeverityLevel = "low" | "moderate" | "high" | "critical";

export type ToolName =
  | "sensor_reader"
  | "weather_tool"
  | "satellite_analysis"
  | "factory_database"
  | "chemical_database"
  | "hydrodynamic_calculator"
  | "incident_report_generator";

export type SSEEventType =
  | "workflow.started"
  | "workflow.completed"
  | "agent.started"
  | "agent.completed"
  | "tool.called"
  | "tool.completed"
  | "reasoning.updated"
  | "confidence.updated"
  | "state.updated"
  | "approval.requested"
  | "simulation.completed";

// ============================================================
// DOMAIN ENTITIES
// ============================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SensorReading {
  sensorId: string;
  stationName: string;
  location: Coordinates;
  timestamp: string; // ISO 8601
  ph: number;
  turbidityNTU: number;
  dissolvedOxygenMgL: number;
  conductivityUsCm: number;
  temperatureC: number;
  detectedContaminants: ContaminantType[];
  anomalyScore: number; // 0-1
}

export interface WatershedNode {
  nodeId: string;
  name: string;
  location: Coordinates;
  type: "river_segment" | "tributary" | "reservoir" | "estuary" | "coastal_outlet";
  flowRateM3s: number;
  connectedTo: string[]; // downstream node IDs
}

export interface WatershedNetwork {
  basinName: string;
  nodes: WatershedNode[];
}

export interface WeatherSnapshot {
  timestamp: string;
  location: Coordinates;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  temperatureC: number;
  recentRainfallTrend: "rising" | "falling" | "stable";
}

export interface Factory {
  factoryId: string;
  name: string;
  location: Coordinates;
  industryType: string;
  permittedContaminants: ContaminantType[];
  permittedDischargeLimits: Record<string, number>; // contaminant -> max allowed mg/L
  lastInspectionDate: string;
  complianceHistoryFlags: number; // count of prior violations
}

export interface RegulatoryViolation {
  violationId: string;
  factoryId: string;
  contaminant: ContaminantType;
  measuredValueMgL: number;
  legalLimitMgL: number;
  exceedanceFactor: number; // measured / limit
  confidence: number; // 0-1
}

export interface AffectedLocation {
  nodeId: string;
  name: string;
  location: Coordinates;
  estimatedArrivalTime: string; // ISO 8601
  predictedConcentrationMgL: number;
  severity: SeverityLevel;
}

export interface EvidenceItem {
  evidenceId: string;
  sourceAgent: AgentName;
  sourceTool: ToolName | null;
  description: string;
  confidenceContribution: number; // -1 to 1
  timestamp: string;
}

export interface ReasoningStep {
  stepId: string;
  agent: AgentName;
  iteration: number;
  thought: string;
  toolUsed: ToolName | null;
  observation: string | null;
  conclusion: string;
  confidenceAfter: number;
  timestamp: string;
}

export interface ToolCallRecord {
  callId: string;
  agent: AgentName;
  tool: ToolName;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}

export interface MitigationAction {
  actionId: string;
  title: string;
  description: string;
  urgency: SeverityLevel;
  estimatedEnvironmentalImpact: string;
  requiresHumanApproval: boolean;
}

export interface Recommendation {
  summary: string;
  primaryHypothesis: string;
  suspectedFactoryId: string | null;
  contaminant: ContaminantType;
  overallSeverity: SeverityLevel;
  actions: MitigationAction[];
  requiresApproval: boolean;
}

// ============================================================
// SHARED WORKFLOW STATE (LangGraph state shape)
// ============================================================

export interface WorkflowState {
  investigationId: string;
  scenarioId: string;
  status: WorkflowStatus;

  telemetry: SensorReading[];
  watershedNetwork: WatershedNetwork;
  weather: WeatherSnapshot[];
  factories: Factory[];

  evidence: EvidenceItem[];
  violations: RegulatoryViolation[];
  affectedLocations: AffectedLocation[];

  confidence: number; // 0-1, current overall confidence
  reasoningHistory: ReasoningStep[];
  toolHistory: ToolCallRecord[];

  workflowIteration: number;
  maxIterations: number;

  approvalStatus: ApprovalStatus;
  approvalNotes: string | null;

  recommendation: Recommendation | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================
// REST API — REQUEST / RESPONSE BODIES
// ============================================================

export interface StartInvestigationRequest {
  scenarioId: string;
}

export interface StartInvestigationResponse {
  investigationId: string;
  status: WorkflowStatus;
  createdAt: string;
}

export interface GetWorkflowStateResponse {
  state: WorkflowState;
}

export interface SimulateScenarioRequest {
  scenarioId: string;
  investigationId: string;
}

export interface SimulateScenarioResponse {
  investigationId: string;
  ticksProcessed: number;
  status: WorkflowStatus;
}

export interface ApprovalRequest {
  decision: ApprovalDecision;
  notes?: string;
}

export interface ApprovalResponse {
  investigationId: string;
  approvalStatus: ApprovalStatus;
  status: WorkflowStatus;
}

export interface IncidentReport {
  reportId: string;
  investigationId: string;
  generatedAt: string;
  title: string;
  executiveSummary: string;
  timeline: ReasoningStep[];
  evidenceSummary: EvidenceItem[];
  violations: RegulatoryViolation[];
  affectedLocations: AffectedLocation[];
  recommendation: Recommendation;
  approvalRecord: {
    status: ApprovalStatus;
    decidedAt: string | null;
    notes: string | null;
  };
}

export interface GenerateReportResponse {
  report: IncidentReport;
}

export interface ScenarioSummary {
  scenarioId: string;
  name: string;
  description: string;
  expectedSeverity: SeverityLevel;
}

export interface ListScenariosResponse {
  scenarios: ScenarioSummary[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================
// SERVER-SENT EVENTS — PAYLOAD SHAPES
// ============================================================

export interface BaseSSEEvent {
  type: SSEEventType;
  investigationId: string;
  timestamp: string;
}

export interface WorkflowStartedEvent extends BaseSSEEvent {
  type: "workflow.started";
  payload: { scenarioId: string };
}

export interface WorkflowCompletedEvent extends BaseSSEEvent {
  type: "workflow.completed";
  payload: { status: WorkflowStatus; recommendation: Recommendation | null };
}

export interface AgentStartedEvent extends BaseSSEEvent {
  type: "agent.started";
  payload: { agent: AgentName; iteration: number };
}

export interface AgentCompletedEvent extends BaseSSEEvent {
  type: "agent.completed";
  payload: { agent: AgentName; iteration: number; durationMs: number };
}

export interface ToolCalledEvent extends BaseSSEEvent {
  type: "tool.called";
  payload: { agent: AgentName; tool: ToolName; input: Record<string, unknown> };
}

export interface ToolCompletedEvent extends BaseSSEEvent {
  type: "tool.completed";
  payload: { agent: AgentName; tool: ToolName; output: Record<string, unknown>; durationMs: number };
}

export interface ReasoningUpdatedEvent extends BaseSSEEvent {
  type: "reasoning.updated";
  payload: { step: ReasoningStep };
}

export interface ConfidenceUpdatedEvent extends BaseSSEEvent {
  type: "confidence.updated";
  payload: { previousConfidence: number; newConfidence: number; agent: AgentName };
}

export interface StateUpdatedEvent extends BaseSSEEvent {
  type: "state.updated";
  payload: { changedFields: string[] };
}

export interface ApprovalRequestedEvent extends BaseSSEEvent {
  type: "approval.requested";
  payload: { recommendation: Recommendation };
}

export interface SimulationCompletedEvent extends BaseSSEEvent {
  type: "simulation.completed";
  payload: { scenarioId: string; ticksProcessed: number };
}

export type SSEEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | AgentStartedEvent
  | AgentCompletedEvent
  | ToolCalledEvent
  | ToolCompletedEvent
  | ReasoningUpdatedEvent
  | ConfidenceUpdatedEvent
  | StateUpdatedEvent
  | ApprovalRequestedEvent
  | SimulationCompletedEvent;
