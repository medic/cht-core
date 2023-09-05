.PHONY: test
test:
	bats nginx_error_pages_generate.bats

	docker compose up --wait --build
	bats with_mock.bats
	docker compose down