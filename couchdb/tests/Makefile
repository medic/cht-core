BACKSLASH := \$ #
COUCHDB_PASSWORD := test_~!@\#$$%^&*_-+=`|$(BACKSLASH)(){}[]:;"'<>,.?/_pw
COUCHDB_USER := medic-test-admin
export COUCHDB_PASSWORD 
export COUCHDB_USER

.phony: test
test:
	docker compose down -v --remove-orphans
	docker compose up --build couch-test
	docker compose down
.phony: clean
clean:
	docker compose down --rmi local || :
