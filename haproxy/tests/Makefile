.PHONY: test
test: test_scripts test_with_docker_compose

.PHONY: test_scripts
test_scripts:
	bats errors_generate.bats

.PHONY: test_with_docker_compose
test_with_docker_compose:
	docker compose up --build --wait
	bats with_mock.bats
	docker compose down

