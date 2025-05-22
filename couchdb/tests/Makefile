BACKSLASH := \$ #
COUCHDB_PASSWORD := pass
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
	@echo "All CouchDB containers are ready"

test: 
	docker compose down -v --remove-orphans
	docker compose up -d couchdb1 couchdb2 couchdb3
	$(MAKE) wait-for-couchdb
	npm test
	docker compose down

.PHONY: clean
clean:
    docker compose down --rmi local || :