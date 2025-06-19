.PHONY: test
test:
	docker compose down -v --remove-orphans
	docker compose up --wait --build
	#bats with_mock.bats
	docker compose down

.PHONY: clean
clean:
	docker compose down --rmi local || :
