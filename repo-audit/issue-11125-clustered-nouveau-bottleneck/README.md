# Clustered deployments route Nouveau work through one CouchDB node

## Verdict

**Priority:** 2 of 3  
**Type:** Availability and scalability defect  
**Upstream issue:** [medic/cht-core#11125](https://github.com/medic/cht-core/issues/11125)  
**Expected fix size:** 60–80 changed lines, including a rendered-chart test

This is not merely a search optimization. The replication authorization path
queries a Nouveau index, so concentrating Nouveau on one node can bottleneck
or interrupt offline-user synchronization in a deployment that was explicitly
scaled to multiple CouchDB nodes.

## Evidence in the current checkout

Three independent settings force all work to node 1:

- `couchdb/10-docker-default.ini:48` hard-codes
  `url = http://nouveau:5987`.
- The clustered branch of
  `scripts/build/helm/templates/couchdb/deployment.yaml` creates the Nouveau
  sidecar only when `$nodeNumber` is 1 (around lines 151–162).
- `scripts/build/helm/templates/nouveau/service.yaml:15` selects
  `cht.service: couchdb-1`.

Meanwhile, `api/src/services/replication/authorization.js` queries
`medic/_nouveau/docs_by_replication_key`. CouchDB services that query Nouveau
therefore converge on the single service endpoint even when CouchDB itself is
clustered.

## Impact

- Node 1 carries all indexing and query load for Nouveau.
- Losing node 1 can break Nouveau-backed requests even while other CouchDB
  nodes remain healthy.
- Adding CouchDB nodes does not scale this part of the offline-sync path.
- A slow index query delays replication authorization and directly affects
  community health workers waiting to synchronize.

## Reproduction

1. Render the Helm chart with `clusteredCouchEnabled=true` and three nodes.
2. Inspect the deployments: only `cht-couchdb-1` contains a
   `cht-couchdb-nouveau` container.
3. Inspect the `nouveau` Service selector: it targets `couchdb-1`.
4. Query a Nouveau-backed endpoint through each CouchDB node.
5. Observe that every node uses the same Nouveau service rather than a local
   sidecar.

## Proposed solution

Keep Nouveau colocated with each CouchDB node and make CouchDB's Nouveau URL
node-specific.

1. Add a `NOUVEAU_URL` environment override in `couchdb/docker-entrypoint.sh`
   using the existing safe configuration-rewrite pattern.
2. Render a `cht-couchdb-nouveau` sidecar for every clustered CouchDB
   deployment, with each sidecar using that node's persistent volume.
3. Set `NOUVEAU_URL=http://localhost:5987` on each clustered CouchDB
   container, so traffic stays within its pod.
4. Preserve the current single-node behavior for backward compatibility.
5. Extend Helm validation to render a three-node chart and assert that every
   CouchDB pod has one Nouveau sidecar and the local URL override.

An active upstream patch contains 48 changed lines but has no regression test.
The rendered-chart assertion is required for a complete solution and brings
the change into the requested medium-size band.

### Change budget

| Area | Estimated changed lines |
|---|---:|
| CouchDB entrypoint URL override | 10–15 |
| Clustered Helm deployment changes | 30–35 |
| Rendered-chart regression assertion | 20–30 |
| **Total** | **60–80** |

## Acceptance criteria

- A three-node chart renders exactly three CouchDB containers and three
  Nouveau sidecars.
- Every CouchDB container uses its pod-local Nouveau endpoint.
- Each Nouveau sidecar mounts only its corresponding node's storage.
- Single-node Docker and Helm deployments continue to work.
- Stopping one CouchDB pod does not remove Nouveau service from the remaining
  CouchDB nodes.

## Risk boundary

Do not load-balance independent Nouveau data directories behind one Service.
Each CouchDB node must address the Nouveau instance paired with its own
storage; otherwise index state and requests can be routed inconsistently.
