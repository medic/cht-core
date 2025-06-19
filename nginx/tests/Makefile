.PHONY: test
test:
	docker compose up --build --wait --remove-orphans
	sleep 3
	docker compose logs nginx-tests
	docker compose down

.PHONY: clean
clean:
	docker compose down --rmi local || :
