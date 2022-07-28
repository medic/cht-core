# BRAC Data Scalability testing suite

## Introduction

This suite is to test the scalability of CHT-Core.
Tests initial replication and workflow replication.

## Requirements

- Java
- NodeJS
- a target medic instance

## Run

To run locally: 

1. Go to `/tests/scalability/brac` and run `npm ci`.
2. [optional] Edit the `config.json` to change doc counts.
3. Export required environment variables: 
   1. `INSTANCE_URL` should point to your instance. ```export INSTANCE_URL=http://admin:pass@localhost```
   2. `DATA_DIR` should point to a non-existent writable path ```export DATA_DIR=./data```. This folder will host jmeter, the generated json docs before upload and PouchDb LevelDb data.  
4. Run `./run.sh local`
5. `index.html` report is generated in the `report` directory.

To run in CI: 

1. Go to `/tests/scalability/brac` and run `npm ci`.
2. Export required environment variables:
   1. `INSTANCE_URL` should point to your instance. ```export INSTANCE_URL=http://admin:pass@localhost```
   2. `DATA_DIR` should point to a non-existent writable path ```export DATA_DIR=./data```. This folder will host the generated json docs before upload and PouchDb LevelDb data.
3. Run `./run.sh`
