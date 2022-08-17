FROM python:3.10.5-slim

COPY check-entrypoint.sh /app/check-entrypoint.sh

COPY check.py /app/check.py

ENTRYPOINT "/app/check-entrypoint.sh"
