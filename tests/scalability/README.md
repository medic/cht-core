# Scalability testing suite

## Introduction

This suite is to test the scalability of CouchDB so we can check what our limits are and ensure we don't regress on performance.

Initially it only tests replication but should be extended to test other APIs.

## Requirements

- jMeter
- NodeJS
- a target medic instance
- multiple test users
- realistic data (reports, contacts, etc)

## Setup

1. Go to `/tests/scalability` and run `npm install`.
2. Edit the `config.json` doc with the server url and an array of users to test.
3. Load jMeter and open the `sync.jmx` file.
4. In the Test Plan configure the `working_dir` and `node_binary` variables.
5. In the Test Plan > Thread Group configure the number of threads you want to execute. The users configured in step 2 will be used in round robin so you can have more or fewer threads than users.
6. Run it!