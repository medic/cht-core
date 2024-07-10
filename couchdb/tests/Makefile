BACKSLASH := \$ #
COUCHDB_PASSWORD := test_~!@\#$$%^&*_-+=`|$(BACKSLASH)(){}[]:;"'<>,.?/_pw
COUCHDB_USER := medic-test-admin
export COUCHDB_PASSWORD 
export COUCHDB_USER

.phony: test
test:
	docker compose up --build --wait
	docker compose run --rm sut
	docker compose down

.phony: clean
clean:
	docker compose down --rmi local || :
