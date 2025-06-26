.PHONY: test
test:
	docker compose up --build --wait --remove-orphans
	npm run test:unit
	docker compose down
	npm run test:integration

.PHONY: clean
clean:
	docker compose down --rmi local || :
