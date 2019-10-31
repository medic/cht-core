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

### GUI
1. Go to `/tests/scalability` and run `npm install`.
2. Edit the `config.json` doc with the server url and an array of users to test.
3. Load jMeter and open the `sync.jmx` file.
4. In the Test Plan configure the `working_dir` and `node_binary` variables.
5. In the Test Plan > Thread Group configure the number of threads you want to execute. The users configured in step 2 will be used in round robin so you can have more or fewer threads than users.
6. Run it!

### CLI

1. Go to `/tests/scalability` and run `npm install`.
2. Edit the `config.json` doc with the server url and an array of users to test.
3. Run CLI command to execute tests.
4. Index.html report is generated in the report directory specified by the -o param. 


Required Parameters: </br>
`Jworking_dir`</br>
`Jnode_binary`

Optional Parameters:

`loop_count` Default: 1 </br>
`number_of_threads` Default: 10 </br>
`ramp_up_period` Default: 1

Example Command: </br>
`jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=node/v8.12.0/bin/node -l ./previous_results/3.3.0.jtl -e -o ./report`


## Reviewing Previous Runs

### Requirements

Install the plugins manager

https://jmeter-plugins.org/wiki/PluginsManager/

Install Merge Results Plugin

https://jmeter-plugins.org/wiki/MergeResults/

### Merging Results
The data used to run this and environment should hopefully be the same each run. Use CSV to docs to generate data on empty database. Create users with medic-conf in the appropriate place. 

1. Using the jmeter [merge results plug-in](https://jmeter-plugins.org/wiki/MergeResults/). 
2. Open the jmeter 
3. Click jp@gc - Merge Results Element
4. Add a row to the Merge Options for the new test run. Add a prefix label of the version running against.
5. Click Merge
6. Generate the report using command `jmeter -g ./combined/3.3.0-combined -o ./combined-dash`
7. Navigate to combined-dash folder and open index.html to see merged results. 

