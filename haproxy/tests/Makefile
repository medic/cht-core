.PHONY: test
test: test_scripts test_with_docker_compose

.PHONY: test_scripts
test_scripts:
	npm run test:errors

.PHONY: test_with_docker_compose
test_with_docker_compose:
	docker compose up --build --wait || { docker logs tests-haproxy-1  && exit 1; }
	npm run test:integration
	docker compose down

.PHONY: clean
clean:
	docker compose down --rmi local || :
