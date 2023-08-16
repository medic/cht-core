test:
	docker compose up --build --wait
	bats tests/with_mock.bats
	docker compose down
