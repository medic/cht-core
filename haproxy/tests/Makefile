.PHONY: test
test: setup test_scripts test_with_docker_compose

.PHONY: setup
setup:
	npm install --no-save

.PHONY: test_scripts
test_scripts:
	npm run test:errors

.PHONY: test_with_docker_compose
test_with_docker_compose:
	docker compose up --build --wait
	npm run test:integration
	docker compose down

.PHONY: clean
clean:
	docker compose down --rmi local || :
	rm -rf js/node_modules
