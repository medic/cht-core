COMPOSE_FILE=docker-compose.test.yml

docker_build:
	docker build --target test_nginx .

start: docker_build
	env BUILD_TARGET=cht-nginx docker compose -f ${COMPOSE_FILE} up --wait --wait-timeout 15 --build

test: start
	bats tests/compose.bats
	$(MAKE) stop

stop:
	docker compose -f ${COMPOSE_FILE} stop	
