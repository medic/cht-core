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



# Running tests on AWS

Github actions monitors the cht-core repo for a new beta tag. This triggers the execution of our scalability suite on ec2 instances.  The configuration for github is located in `cht-core/.github/workflows/scalability.yml`.

### Github Action Workflow

The action checks out cht-core and then execute two scripts. One start medic-os related tasks and another to execute jmeter.

### Start CHT Script

The script `start-ec2-cht.sh` begins by requesting an ec2 instance in the ca-central-1 region. While it is starting it gets the public DNS name of that instance. The instance is started with `user-data` script located at `cht-core/tests/scalability/prepare-ec2.sh`. AWS cli requires the script be encoded in base64. That step is handled in the start scripts.  This brings up CHT 4.x in Docker on that machine.

While docker-compose is bringing up CHT, `start-ec2-cht.sh` starts to check for API to be up by curling  `https://$PublicDnsName/api/info` until a version number is returned.

Medic-conf and it's dependencies are now installed. Medic-conf then uploads the seed data which is located in `cht-core/tests/scalability/csv`. Then we wait for sentinel to process all these changes by checking the sentinel-meta-data processed sequence against the `_changes`  feed with the since request param.

### Start Jmeter Script

Once the CHT script completes we begin setting up for jmeter. The `start-ec2-cht.sh` script launches a new ec2 instance with the `user-data` script at `cht-core/tests/scalability/run_suite.sh`.

The script clones cht-core and navigates to the scalability dir. Then installs java, nodejs, jmeter, and its plugins. Executes the scalability suite which is defined in the `cht-core/tests/scalability/sync.jmx`, and finally it uploads the results to an s3 bucket.
