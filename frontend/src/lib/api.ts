import type {
  ApprovalRequest,
  ApprovalResponse,
  GenerateReportResponse,
  GetWorkflowStateResponse,
  IncidentReport,
  ListScenariosResponse,
  Recommendation,
  ScenarioSummary,
  SimulateScenarioRequest,
  SimulateScenarioResponse,
  StartInvestigationRequest,
  StartInvestigationResponse,
  WorkflowState,
} from "../types";

/**
 * Single base URL for backend. When running purely on mock data, this is unused,
 * but the same typed signatures are used so component logic never differs.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ApiError(
        `HTTP_${res.status}`,
        res.statusText,
        undefined,
        res.status
      );
    }
    const errBody = body as {
      error?: { code?: string; message?: string; details?: Record<string, unknown> };
    };
    throw new ApiError(
      errBody.error?.code ?? `HTTP_${res.status}`,
      errBody.error?.message ?? res.statusText,
      errBody.error?.details,
      res.status
    );
  }
  return (await res.json()) as T;
}

export const api = {
  async listScenarios(): Promise<ScenarioSummary[]> {
    const res = await fetch(`${API_BASE}/scenarios`);
    const json = (await handle<ListScenariosResponse>(res)) as ListScenariosResponse;
    return json.scenarios;
  },

  async startInvestigation(
    body: StartInvestigationRequest
  ): Promise<StartInvestigationResponse> {
    const res = await fetch(`${API_BASE}/investigations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle<StartInvestigationResponse>(res);
  },

  async getInvestigationState(
    investigationId: string
  ): Promise<WorkflowState> {
    const res = await fetch(`${API_BASE}/investigations/${investigationId}`);
    const json = (await handle<GetWorkflowStateResponse>(res)) as GetWorkflowStateResponse;
    return json.state;
  },

  async simulateTick(
    body: SimulateScenarioRequest
  ): Promise<SimulateScenarioResponse> {
    const res = await fetch(`${API_BASE}/simulation/tick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle<SimulateScenarioResponse>(res);
  },

  async approve(
    investigationId: string,
    body: ApprovalRequest
  ): Promise<ApprovalResponse> {
    const res = await fetch(
      `${API_BASE}/investigations/${investigationId}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return handle<ApprovalResponse>(res);
  },

  async getReport(investigationId: string): Promise<IncidentReport> {
    const res = await fetch(`${API_BASE}/investigations/${investigationId}/report`);
    const json = (await handle<GenerateReportResponse>(res)) as GenerateReportResponse;
    return json.report;
  },
};

/**
 * Used by the Report viewer to render approval-gated action chips in order.
 * Pulled from the live state.
 */
export function recommendationFromState(
  state: WorkflowState
): Recommendation | null {
  return state.recommendation;
}