import test from 'node:test';
import assert from 'node:assert/strict';
import {approveReviewCandidate, createReviewQueue, editReviewCandidate, exportApprovedReviewManifest, rejectReviewCandidate, reviewSummary} from '../enrichment-review.js';
import {createCloudStore} from '../cloud-store.js';

const candidate = {id: 'tech-data', label: 'Data Scientist', family: 'technology', source: 'generated', reviewStatus: 'pending', weight: .62};

test('review queue keeps candidates separate and summarizes status', () => {
  const queue = createReviewQueue([candidate], {operation: 'Expand'});
  assert.deepEqual(reviewSummary(queue), {pending: 1, approved: 0, rejected: 0});
  assert.equal(queue.operation, 'Expand');
  assert.equal(candidate.reviewStatus, 'pending');
});

test('editing and approving a candidate is explicit and immutable', () => {
  const queue = createReviewQueue([candidate], {createdAt: '2026-09-14T00:00:00.000Z'});
  const edited = editReviewCandidate(queue, 'tech-data', {weight: .7, rationale: 'Strong technical overlap.'});
  const approved = approveReviewCandidate(edited, 'tech-data');
  assert.equal(queue.candidates[0].weight, .62);
  assert.equal(approved.candidates[0].weight, .7);
  assert.equal(approved.candidates[0].reviewStatus, 'approved');
});

test('rejected candidates stay out of the approved manifest', () => {
  const queue = createReviewQueue([candidate, {...candidate, id: 'tech-security', label: 'Cybersecurity Analyst'}]);
  const reviewed = rejectReviewCandidate(approveReviewCandidate(queue, 'tech-data'), 'tech-data', 'Too narrow for this pack');
  const manifest = exportApprovedReviewManifest(reviewed, {exportedAt: '2026-09-14T00:00:00.000Z'});
  assert.deepEqual(manifest.candidates.map(item => item.id), []);
  assert.equal(reviewSummary(reviewed).rejected, 1);
});

test('review queues persist through local and cloud adapters', async () => {
  const queue = createReviewQueue([candidate], {operation: 'Expand'});
  const storage = new Map();
  const local = createCloudStore({local: {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)}});
  await local.saveReviewQueue(queue, 'local-user');
  assert.deepEqual(await local.loadReviewQueue('local-user'), queue);
  let payload = null;
  const cloud = createCloudStore({client: {from: () => ({upsert: async value => { payload = value; return {error: null}; }, select: () => ({})})}});
  await cloud.saveReviewQueue(queue, 'cloud-user');
  assert.deepEqual(payload.queue, queue);
});
