ARG PYTHON_VERSION=3.11.6
FROM python:${PYTHON_VERSION}-alpine

WORKDIR /app

COPY requirements/base-freeze.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

COPY check.py /app/check.py

CMD "/app/check.py"
