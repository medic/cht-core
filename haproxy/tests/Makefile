# Prevent parallel execution to avoid port conflicts
.NOTPARALLEL:

# Docker Compose configuration files
COMPOSE_CLUSTER := compose-cluster.yml
COMPOSE_SINGLE := compose-single.yml

.PHONY: test
test: test_scripts test_with_couch_cluster test_with_couch_single

.PHONY: test_scripts
test_scripts:
	npm run test:errors || exit 1

.PHONY: test_with_couch_cluster
test_with_couch_cluster:
	docker compose -f $(COMPOSE_CLUSTER) up --build --wait
	npm run test:integration || { docker compose -f $(COMPOSE_CLUSTER) logs && docker compose -f $(COMPOSE_CLUSTER) down && exit 1; }
	docker compose -f $(COMPOSE_CLUSTER) down

.PHONY: test_with_couch_single
test_with_couch_single:
	docker compose -f $(COMPOSE_SINGLE) up --build --wait
	npm run test:integration || { docker compose -f $(COMPOSE_SINGLE) logs && docker compose -f $(COMPOSE_SINGLE) down && exit 1; }
	docker compose -f $(COMPOSE_SINGLE) down

.PHONY: clean
clean:
	docker compose -f $(COMPOSE_SINGLE) down --rmi local || :
	docker compose -f $(COMPOSE_CLUSTER) down --rmi local || :

# Cleanup handler
.PHONY: emergency-cleanup
emergency-cleanup:
	-docker compose -f $(COMPOSE_SINGLE) down
	-docker compose -f $(COMPOSE_CLUSTER) down
