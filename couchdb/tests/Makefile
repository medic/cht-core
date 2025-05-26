BACKSLASH := \$ #
COUCHDB_PASSWORD := test_~!@\#$$%^&*_-+=|$(BACKSLASH)(){}[]:;<>,.?/_pw
COUCHDB_USER := medic-test-admin
export COUCHDB_PASSWORD 
export COUCHDB_USER

.PHONY: test wait-for-couchdb

wait-for-couchdb:
	@echo "Waiting for CouchDB containers to be ready..."
	@for i in 1 2 3; do \
		until curl -s -f -u "$(COUCHDB_USER):$(COUCHDB_PASSWORD)" http://localhost:$${i}5984/_up > /dev/null; do \
			echo "Waiting for couchdb$$i..."; \
			sleep 2; \
		done; \
	done
	@echo "Waiting for cluster setup..."
	@until [ "$$(curl -s -f -u "$(COUCHDB_USER):$(COUCHDB_PASSWORD)" http://localhost:15984/_membership | jq -r '.cluster_nodes | length')" -eq "3" ]; do \
		echo "Waiting for cluster formation..."; \
		sleep 2; \
	done
	@echo "All CouchDB containers and cluster are ready"

test: 
	docker compose down -v --remove-orphans
	docker compose up -d couchdb1 couchdb2 couchdb3
	$(MAKE) wait-for-couchdb
	npm test
	docker compose down

.PHONY: clean
clean:
    docker compose down --rmi local || :
	