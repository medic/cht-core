# Scalability testing suite 2

## Introduction

This suite is to test the scalability of CouchDB so we can check what our limits are and ensure we don't regress on performance.

Initially it tests a number of users (thread),to replicates a number of documents to the server during a period of time.  Using a previously created brac data in `main_script_data_directory` by the first phase script `./generate_brac_data/generate-brac-data.js`.

## Requirements

- jMeter
- a target medic instance
- multiple test users (generated in the first phase script)
- realistic data (places, persons, reports generated in the first phase script `./generate_brac_data/generate-brac-data.js`)

## Setup

### GUI
1. Go to `/tests/scalability/replicate-brac-docs`
3. Load jMeter and open the `add-docs.jmx` file.
4. In the Test Plan configure the `working_dir` and `node_binary` variables.
5. In the Test Plan > Thread Group configure the number of threads you want to execute based on the numbers of users generated in the first phase script.
6. Run it!
