COMPOSE_FILE=docker-compose.test.yml

start:
	docker compose -f ${COMPOSE_FILE} up --wait --build

test: start
	bats tests/with_mock.bats
	$(MAKE) stop

stop:
	docker compose -f ${COMPOSE_FILE} stop	
