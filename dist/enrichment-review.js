export const REVIEW_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const clone = value => structuredClone(value);
const idFor = (candidate, index) => candidate.id || `candidate-${index + 1}`;

export function createReviewQueue(candidates = [], { operation = null, createdAt = null } = {}) {
  return {
    schemaVersion: 1,
    operation,
    createdAt: createdAt || new Date().toISOString(),
    candidates: candidates.map((candidate, index) => ({
      ...clone(candidate),
      id: idFor(candidate, index),
      reviewStatus: candidate.reviewStatus || 'pending'
    }))
  };
}

function updateCandidate(queue, candidateId, update) {
  let found = false;
  const candidates = queue.candidates.map(candidate => {
    if (candidate.id !== candidateId) return candidate;
    found = true;
    return { ...candidate, ...clone(update) };
  });
  if (!found) throw new Error(`Unknown enrichment candidate: ${candidateId}`);
  return { ...queue, candidates };
}

export function editReviewCandidate(queue, candidateId, changes = {}) {
  const allowed = ['label', 'description', 'relationshipType', 'weight', 'rationale'];
  const update = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  return updateCandidate(queue, candidateId, update);
}

export function approveReviewCandidate(queue, candidateId) {
  return updateCandidate(queue, candidateId, { reviewStatus: 'approved', reviewedAt: new Date().toISOString() });
}

export function rejectReviewCandidate(queue, candidateId, reason = '') {
  return updateCandidate(queue, candidateId, { reviewStatus: 'rejected', rejectionReason: String(reason).trim(), reviewedAt: new Date().toISOString() });
}

export function reviewSummary(queue) {
  return REVIEW_STATUSES.reduce((summary, status) => {
    summary[status] = queue.candidates.filter(candidate => candidate.reviewStatus === status).length;
    return summary;
  }, { pending: 0, approved: 0, rejected: 0 });
}

export function approvedReviewCandidates(queue) {
  return queue.candidates.filter(candidate => candidate.reviewStatus === 'approved').map(clone);
}

export function exportApprovedReviewManifest(queue, { exportedAt = null } = {}) {
  return {
    schemaVersion: 1,
    exportedAt: exportedAt || new Date().toISOString(),
    source: 'enrichment-review',
    operation: queue.operation,
    candidates: approvedReviewCandidates(queue)
  };
}
