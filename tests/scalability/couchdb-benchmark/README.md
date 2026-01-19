# CouchDB 3.5.0 vs 3.5.1 Nouveau Performance Benchmarking

This setup allows side-by-side performance testing of CouchDB 3.5.0 and 3.5.1, specifically focusing on **Nouveau search improvements** mentioned in issue [#10455](https://github.com/medic/cht-core/issues/10455).


## Architecture

### CouchDB 3.5.0 Setup (Ports 6984-6989)
- `couchdb-350` (port 6984): Standard CouchDB 3.5.0 for baseline
- `nouveau-350` (ports 6987-6988): Nouveau search service (HTTP/1.1)
- `couchdb-with-nouveau-350` (port 6985): CouchDB 3.5.0 + Nouveau integration

### CouchDB 3.5.1 Setup (Ports 7984-7989)
- `couchdb-351` (port 7984): Standard CouchDB 3.5.1 for baseline
- `nouveau-351` (ports 7987-7988): Nouveau search service (HTTP/2 enabled via `nouveau-config-351.yaml`)
- `couchdb-with-nouveau-351` (port 7985): CouchDB 3.5.1 + Nouveau integration

**Note**: CouchDB 3.5.1 uses HTTP/2 by default when connecting to Nouveau. The Nouveau service needed to be configured with `type: h2c` (HTTP/2 cleartext) in `nouveau-config-351.yaml` to support this.

## Quick Start

### 1. Test CouchDB 3.5.0

```bash
cd tests/scalability/couchdb-benchmark

# Start 3.5.0 environment
./setup-env.sh 3.5.0

# Populate test data
node populate_test_data.js --port 6985

# Configure Nouveau and create design docs
curl -X PUT 'http://admin:password@localhost:6985/_node/_local/_config/nouveau/enable' -d '"true"'
curl -X PUT 'http://admin:password@localhost:6985/_node/_local/_config/nouveau/url' -d '"http://nouveau-350:5987"'

./create_nouveau_ddocs_350.sh

# Run benchmarks
COUCH_URL=http://admin:password@localhost:6985/medic node index.js

# Save results
mv ../benchmark_results.md ../benchmark_results_3.5.0.md
```

### 2. Test CouchDB 3.5.1

```bash
# Start 3.5.1 environment  
./setup-env.sh 3.5.1

# Populate test data
node populate_test_data.js --port 7985

# Configure Nouveau and create design docs
curl -X PUT 'http://admin:password@localhost:7985/_node/_local/_config/nouveau/enable' -d '"true"'
curl -X PUT 'http://admin:password@localhost:7985/_node/_local/_config/nouveau/url' -d '"http://nouveau-351:5987"'
./create_nouveau_ddocs_351.sh

# Run benchmarks
COUCH_URL=http://admin:password@localhost:7985/medic node index.js

# Save results
mv ../benchmark_results.md ../benchmark_results_3.5.1.md
```