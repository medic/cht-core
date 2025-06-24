.PHONY: test
test:
	docker compose up --build --wait --remove-orphans
	# had to add this sleep because if not the logs would not be visible/ready yet
	# and the docker compose command would have already killed the containers
	sleep 3
	docker compose logs nginx-tests
	docker compose down

.PHONY: clean
clean:
	docker compose down --rmi local || :
