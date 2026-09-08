import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";
import { getCachedUser } from "../utils/auth";

const departments = [
  "Billing and Payments",
  "Customer Service",
  "General Inquiry",
  "Human Resources",
  "IT Support",
  "Product Support",
  "Returns and Exchanges",
  "Sales and Pre-Sales",
  "Service Outages and Maintenance",
  "Technical Support",
];

const urgencies = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

const statusMap = {
  QUEUED: "QUEUED",
  "AWAITING HUMAN REVIEW": "AWAITING HUMAN REVIEW",
  PROCESSED: "PROCESSED",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
  FAILED: "FAILED",
};

const asDepartment = (value) =>
  departments.includes(value)
    ? value
    : "General Inquiry";

const asUrgency = (value) =>
  urgencies.includes(value)
    ? value
    : "Medium";

const asArray = (value) =>
  Array.isArray(value)
    ? value
    : [];

const asObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : { full_response_text: value };
    } catch {
      return { full_response_text: value };
    }
  }
  return {};
};

const asNumber = (value, fallback = 0) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const asOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const millisecondsBetween = (start, end) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime)
    ? Math.max(0, endTime - startTime)
    : null;
};

const asString = (value, fallback = "") =>
  value === null ||
    value === undefined
    ? fallback
    : String(value);

export function mapTicket(raw) {
  if (!raw) {
    return null;
  }

  const ticketInfo =
    raw.ticket_info ?? {};

  const ragAudit =
    raw.rag_audit_trail ?? {};

  raw = {
    ...raw,
    ...ticketInfo,

    retrieved_docs:
      ragAudit.retrieved_docs ??
      raw.retrieved_docs,

    eval_confidence:
      ragAudit.confidence_score ??
      ragAudit.eval_confidence ??
      raw.eval_confidence,

    has_hallucinations:
      ragAudit.has_hallucinations ??
      raw.has_hallucinations,

    grounding_source_ids:
      ragAudit.grounding_source_ids ??
      raw.grounding_source_ids,

    eval_feedback:
      ragAudit.feedback_for_rewriter ??
      ragAudit.eval_feedback ??
      raw.eval_feedback,
  };

  // USER

  const user =
    raw.user ?? null;

  const userEmail = asString(
    user?.email
  );

  const userTier = asString(
    user?.account_tier ??
    raw.account_tier ??
    "Standard"
  );

  // ID

  const id = asString(
    raw.ticket_id ??
    raw.id
  );

  // STATUS

  const status = asString(
    raw.status,
    "QUEUED"
  );
  const failureReason = asString(
    raw.failure_reason ??
      raw.failureReason ??
      raw.error_message ??
      raw.errorMessage ??
      raw.ticket_check_message ??
      raw.ticketCheckMessage,
  );

  // AI DRAFT (Fixed context reference errors)
  const rawDraft = asObject(raw.ai_draft);

  const greeting = asString(rawDraft.greeting);

  const issueSummary = asString(
    rawDraft.issue_summary ||
    rawDraft.issueSummary
  );

  const rootCause = asString(
    rawDraft.root_cause ||
    rawDraft.rootCause
  );

  const resolutionSteps = asArray(
    rawDraft.resolution_steps ||
    rawDraft.resolutionSteps
  ).map(String);

  const closing = asString(rawDraft.closing);

  const fullResponseText = asString(
    rawDraft.full_response_text ||
    rawDraft.fullResponseText ||
    rawDraft.final_response_text ||
    rawDraft.response ||
    rawDraft.draft
  );

  // Re-build bundled aiDraft object so it can be referenced safely below
  const aiDraft = {
    greeting,
    issueSummary,
    issue_summary: issueSummary,
    rootCause,
    root_cause: rootCause,
    resolutionSteps,
    resolution_steps: resolutionSteps,
    closing,
    fullResponseText,
    full_response_text: fullResponseText
  };

  // RESPONSE TEXT (Safe reference check against fallback variables)
  const responseText = asString(
    raw.final_response_text ||
    raw.finalResponseText ||
    raw.matched_resolution_text ||
    asObject(raw.semantic_cache ?? raw.semanticCache).resolution ||
    fullResponseText
  );

  const ticketBody = asString(
    raw.body ??
    raw.description ??
    raw.original_body,
  );

  // TRIAGE

  const department = asDepartment(
    raw.department
  );

  const priority = asUrgency(
    raw.priority
  );

  const confidence = asNumber(
    raw.confidence
  );

  // TAGS

  const tags = asArray(
    raw.tags
  ).map(String);

  const extractedKeywords = asArray(
    raw.extracted_keywords
  ).map(String);

  // RETRIEVAL

  const groundingSourceIds = asArray(
    raw.grounding_source_ids
  ).map(String);

  const retrievedDocs = asArray(
    raw.retrieved_docs
  ).map((doc) => ({
    ...doc,

    retrieval_method:
      doc?.retrieval_method ??
      "Retrieved Document",
  }));

  // EVALUATION

  const evalConfidence = asNumber(
    raw.eval_confidence
  );

  // Preserve the complete telemetry payload and normalize common field names
  // used by both Tickets Manager and the HITL workspace.
  const rawTelemetry = raw.telemetry_data ?? raw.telemetry ?? null;
  const telemetry = rawTelemetry == null ? null : asObject(rawTelemetry);
  const rawJiraEscalation = asObject(
    raw.jira_escalation ?? telemetry?.jira_escalation,
  );
  const jiraEscalation = {
    issueId: rawJiraEscalation.issueId ?? rawJiraEscalation.issue_id ?? null,
    issueKey: asString(
      rawJiraEscalation.issueKey ?? rawJiraEscalation.issue_key,
    ),
    issueUrl: asString(
      rawJiraEscalation.issueUrl ?? rawJiraEscalation.issue_url,
    ),
  };
  const telemetryData = telemetry && Object.fromEntries(
    Object.entries({
      ...telemetry,
      errorRate: telemetry.errorRate ?? telemetry.error_rate,
      latency: telemetry.latency ?? telemetry.latency_ms,
      requestsPerMin: telemetry.requestsPerMin ?? telemetry.requests_per_min,
    }).filter(([, value]) => value !== undefined),
  );

  const rawSemanticCache = asObject(
    raw.semantic_cache ?? raw.semanticCache ?? raw.cache,
  );
  const matchedTicket = asObject(
    raw.matched_ticket ?? rawSemanticCache.matched_ticket,
  );
  const semanticCache = {
    cacheHit: Boolean(
      raw.cache_hit ?? raw.is_cache_hit ?? rawSemanticCache.cache_hit,
    ),
    matchedTicketId:
      raw.matched_ticket_id ??
      rawSemanticCache.matched_ticket_id ??
      matchedTicket.ticket_id ??
      matchedTicket.id ??
      null,
    similarityScore: asOptionalNumber(
      raw.similarity_score ?? rawSemanticCache.similarity_score,
    ),
    resolution: asString(
      raw.matched_resolution_text ??
        rawSemanticCache.matched_resolution_text ??
        rawSemanticCache.resolution ??
        matchedTicket.final_response_text,
    ),
    department: asString(
      rawSemanticCache.department ?? matchedTicket.department,
    ),
    tags: asArray(rawSemanticCache.tags ?? matchedTicket.tags).map(String),
    sourceCollection: asString(rawSemanticCache.source_collection),
    matchedTicket,
  };

  // LATENCY

  const initialLatency = millisecondsBetween(
    raw.created_at ?? raw.createdAt,
    raw.updated_at ?? raw.updatedAt,
  ) ?? asOptionalNumber(raw.initial_latency ?? raw.initialLatency);

  const totalLatency = asOptionalNumber(
    raw.total_latency ??
    raw.totalLatency ??
    raw.latency
  );

  // RETURN NORMALIZED TICKET
  return {

    // Keep fields added by newer API responses available to every view.
    ...raw,

    // ID / THREAD
    id,
    ticket_id: raw.ticket_id ?? raw.id,
    threadId: asString(raw.thread_id ?? `ticket_thread_${id}`),

    // TICKET DETAILS
    subject: asString(raw.subject),
    ticketBody,
    body: ticketBody,
    description: ticketBody,
    unifiedTicket: asString(raw.unified_ticket),
    status: statusMap[status] ?? status,
    failureReason,
    failure_reason: failureReason,

    // TRIAGE
    department,
    aiPredictedDept: department,
    urgency: priority,
    priority,
    aiConfidence: confidence,
    confidence,

    // USER
    userId: raw.user_id ?? null,
    user,
    userEmail,
    userTier,
    account_tier: userTier,

    aiDraft: aiDraft, // Kept object fallback 
    greeting,
    issueSummary,
    issue_summary: issueSummary,
    rootCause,
    root_cause: rootCause,
    resolutionSteps,
    resolution_steps: resolutionSteps,
    closing,
    imageUrl: raw.image_url ?? raw.imageUrl ?? null,
    image_url: raw.image_url ?? raw.imageUrl ?? null,
    aiImageAnalysis:
      raw.ai_image_analysis ??
      raw.aiImageAnalysis ??
      null,

    // RESPONSE TEXT
    aiDraftText: responseText,
    aiRagSolution: responseText,
    finalResponseText: responseText,

    // SEARCH & TAGS
    searchQuery: asString(raw.search_query),
    search_query: asString(raw.search_query),
    tags,
    extractedKeywords,
    extracted_keywords: extractedKeywords,
    ragRetries: asNumber(raw.retries),
    retries: asNumber(raw.retries),

    // RETRIEVAL / EVALUATION
    retrievedDocs,
    retrieved_docs: retrievedDocs,
    groundingScore: evalConfidence,
    evalConfidence,
    isHallucinated: Boolean(raw.has_hallucinations),
    hasHallucinations: Boolean(raw.has_hallucinations),
    groundingSourceIds,
    evalFeedback: asString(raw.eval_feedback),

    // TELEMETRY / HITL
    telemetry: telemetryData,
    telemetryData,
    jiraEscalation,
    semanticCache,
    cacheHit: semanticCache.cacheHit,
    matchedTicketId: semanticCache.matchedTicketId,
    matchedTicket,
    matchedResolutionText: semanticCache.resolution,
    humanDecision: raw.human_decision ?? null,
    humanEditedText: raw.human_edited_text ?? null,
    userRating: asOptionalNumber(raw.user_rating),
    userFeedback: asString(raw.user_feedback_comment),

    // LATENCY
    latencyMs: totalLatency ?? asOptionalNumber(raw.latency),
    initialLatency: initialLatency,
    totalLatency: totalLatency,
    latency: asNumber(raw.latency ?? totalLatency),

    // TIMESTAMPS / SLA
    createdAt: asString(raw.created_at, new Date().toISOString()),
    created_at: raw.created_at,
    updatedAt: asString(raw.updated_at),
    updated_at: raw.updated_at,
    slaStatus: slaStatus(
      raw.created_at,
      raw.status,
      raw.account_tier ?? user?.account_tier,
      raw.priority
    ),
  };

}

function slaStatus(createdAt, status, tier, priority) {
  if (String(status) === "RESOLVED") return "Healthy";
  const ageHours =
    (Date.now() - new Date(String(createdAt)).getTime()) / 3_600_000;
  const limit = String(tier).toLowerCase() === "enterprise" ? 4 : 24;
  const isAtRiskAccount =
    String(tier).toLowerCase() === "enterprise" ||
    String(priority).toLowerCase() === "critical";
  return ageHours >= limit
    ? "Breached"
    : isAtRiskAccount && ageHours >= limit * 0.75
      ? "At Risk"
      : "Healthy";
}
export async function fetchTickets() {
  const path =
    getCachedUser()?.role === "admin"
      ? ENDPOINTS.adminTickets.list
      : ENDPOINTS.tickets.mine;
  return (await apiRequest(path)).map(mapTicket);
}
export async function fetchTicketById(
  id,
  admin = getCachedUser()?.role === "admin",
) {
  return mapTicket(
    await apiRequest(
      admin ? ENDPOINTS.adminTickets.byId(id) : ENDPOINTS.tickets.byId(id),
    ),
  );
}
export async function createTicket(input) {
  const form = new FormData();
  form.append("subject", input.subject);
  form.append("body", input.description);
  input.imageFiles?.forEach((file) => form.append("new_ticket_images", file));
  return mapTicket(
    await apiRequest(ENDPOINTS.tickets.create, { method: "POST", body: form }),
  );
}
export async function approveTicket(input) {
  const result = await apiRequest(
    ENDPOINTS.adminTickets.approval(input.id),
    {
      method: "POST",
      body: {
        decision: input.decision ?? "EDIT_AND_SEND",
        edited_text: input.solution,
        department: input.department,
      },
    },
  );
  return mapTicket({
    ...result,
    id: input.id,
    status: "RESOLVED",
    final_response_text: input.solution,
  });
}
export async function rejectTicket(id, threadId) {
  const result = await apiRequest(ENDPOINTS.adminTickets.approval(id), {
    method: "POST",
    body: { decision: "REJECT_AND_ESCALATE" },
  });
  return mapTicket({ ...result, id, status: "ESCALATED" });
}
export async function deleteTicket(id) {
  const result = await apiRequest(ENDPOINTS.adminTickets.delete(id), {
    method: "DELETE",
  });
  return {
    ...mapTicket({
      ...result.ticket,
      id: result.ticket_id ?? id,
      status: "DELETED",
    }),
    deleteMessage: result.message ?? "Ticket deleted successfully.",
  };
}
export function fetchProcessedTickets() {
  return apiRequest(ENDPOINTS.adminTickets.processed);
}
export function resolveProcessedTicket(payload) {
  return apiRequest(ENDPOINTS.adminTickets.resolve(payload.ticket_id), {
    method: "POST",
    body: payload,
  });
}
export function retryFailedTicket(id) {
  return apiRequest(ENDPOINTS.adminTickets.retry(id), {
    method: "POST",
  });
}
export function fetchPendingTickets() {
  return apiRequest(ENDPOINTS.adminTickets.pending);
}
export function fetchIncidentAnalysis() {
  return apiRequest(
    `${ENDPOINTS.adminTickets.analyzeIncidents}?pending=true&include_processed=true`,
  );
}
export function fetchAdminTicketById(id) {
  return apiRequest(ENDPOINTS.adminTickets.byId(id));
}
export async function fetchAdminUserTickets(id) {
  const result = await apiRequest(ENDPOINTS.adminTickets.forUser(id));
  return Array.isArray(result) ? result.map(mapTicket) : result;
}
export function fetchUsers(query = "") {
  const search = query.trim();
  return apiRequest(
    `${ENDPOINTS.users.list}${search ? `?query=${encodeURIComponent(search)}` : ""}`,
  );
}
export async function fetchUserProfile() {
  const result = await apiRequest(ENDPOINTS.users.profile);
  return result && {
    ...result,
    tickets: asArray(result.tickets).map(mapTicket),
  };
}
export async function fetchUserById(id) {
  const result = await apiRequest(ENDPOINTS.users.byId(id));
  return result && {
    ...result,
    tickets: asArray(result.tickets).map(mapTicket),
  };
}
export function fetchTicketStatus(id) {
  return apiRequest(ENDPOINTS.tickets.status(id));
}
export function fetchLatestAlert() {
  return apiRequest(ENDPOINTS.adminTickets.latestAlert);
}
export function fetchInternalTickets(query = "") {
  return apiRequest(
    `${ENDPOINTS.internalAdmin.list}${query ? `?${query}` : ""}`,
  );
}
export function fetchInternalTicketById(id) {
  return apiRequest(ENDPOINTS.internalAdmin.byId(id));
}
export async function fetchInternalUserTickets(id) {
  const result = await apiRequest(ENDPOINTS.internalAdmin.forUser(id));
  return Array.isArray(result) ? result.map(mapTicket) : result;
}
export function submitEngineerResolution(id, body) {
  return apiRequest(ENDPOINTS.adminTickets.engineerResolution(id), {
    method: "PUT",
    body,
  });
}
export function submitTicketReward(id, body) {
  return apiRequest(ENDPOINTS.tickets.reward(id), { method: "PUT", body });
}
export function checkModelHealth() {
  return apiRequest(ENDPOINTS.model.health, { auth: false });
}
export async function fetchAnalytics() {
  const metrics = await apiRequest(ENDPOINTS.adminTickets.analytics);
  return {
    volumes: [],
    totalTickets: Number(metrics.total_tickets ?? 0),
    resolvedWithoutHumanOverride: Number(
      metrics.resolved_without_human_override ?? 0,
    ),
    responseDraftEditedByOperator: Number(
      metrics.response_draft_edited_by_operator ?? 0,
    ),
    jiraEngineeringEscalations: Number(
      metrics.jira_engineering_escalations ?? 0,
    ),
    slaBreaches: Number(metrics.sla_breaches ?? 0),
    lowConfidenceTickets: Number(metrics.low_confidence_tickets ?? 0),
    routingAccuracy: Number.parseFloat(metrics.routing_accuracy ?? "0") / 100,
    aiResolutionRate: Number.parseFloat(metrics.ai_resolution_rate ?? "0"),
    escalationRate: Number.parseFloat(metrics.escalation_rate ?? "0"),
    ragGroundingAvg: Number(metrics.grounding_average ?? 0),
    ragRetryRate: Number.parseFloat(metrics.retry_rate ?? "0") / 100,
    avgSlaResolutionTime: 0,
    p50Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
    ragGroundingAvg: 0,
    ragRetryRate: 0,
  };
}
const authUser = (response, role) => ({
  id: String(response.user.id),
  name:
    response.user.name ?? response.user.business_name ?? response.user.email,
  email: response.user.email,
  role,
  tier: response.user.account_tier,
});
export async function userLogin(email, password) {
  const response = await apiRequest(ENDPOINTS.auth.login, {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  return { user: authUser(response, "user"), token: response.token };
}
export async function adminLogin(email, password) {
  const response = await apiRequest(ENDPOINTS.auth.adminLogin, {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  return { user: authUser(response, "admin"), token: response.token };
}
export async function userSignup(name, email, password) {
  const response = await apiRequest(ENDPOINTS.auth.signup, {
    method: "POST",
    auth: false,
    body: {
      business_name: name,
      email,
      password,
      account_tier: "Standard",
      sla: 24,
    },
  });
  return {
    id: String(response.id),
    name: response.business_name,
    email: response.email,
    role: "user",
    tier: response.account_tier,
  };
}
export async function adminSignup(name, email, password) {
  const response = await apiRequest(ENDPOINTS.auth.adminSignup, {
    method: "POST",
    auth: false,
    body: { name, email, password },
  });
  return authUser({ token: "", user: response }, "admin");
}
