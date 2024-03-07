.venv:
	python3 -m venv .venv
	.venv/bin/pip install -r requirements/test-freeze.txt

.PHONY: fix
fix: .venv
	.venv/bin/isort .
	.venv/bin/ruff format .
	.venv/bin/ruff check --fix-only .
	shfmt -w requirements/update.sh || :
	
.PHONY: clean
clean:
	rm -rf *.egg-info/ .*_cache/ .venv/ __pycache__/ test/__pycache__/ build/


.PHONY: test
test: .venv
	.venv/bin/pytest --mypy --ruff
