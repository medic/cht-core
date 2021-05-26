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

### Start Medic Script

The script `start_ec2_medic.sh` begins by requesting an ec2 instance in the ca-central-1 region. While it is starting it gets the public DNS name of that instace. The instance is started with `user-data` script located at `cht-core/tests/scalability/medic-os.sh`. AWS cli requires the script be encoded in base64. That step is handled in the start scripts.  This brings up medic-os in docker on that machine using the `prepare.sh` script in the `cht-infrastructure` repo. 

While docker compose is bringing up medic-os. `start_ec2_medic.sh` starts to check for API to be up by curling  `https://$PublicDnsName/api/info` until a version number is returned. 

Medic-conf and it's dependencies are now installed. Medic-conf then uploads standard config and the seed data which are located in `cht-core/config/standard` and `cht-core/tests/scalability/csv`. Then we wait for sentinel to process all these changes by checking the sentinel-meta-data processed sequence against the `_changes`  feed with the since request param. 

From here we get the ddocs update sequences. Stage the branch which is associated to the tag that triggered this whole flow. Then check that the sequence numbers have increased. This is a simple sanity check that the views should have warmed. Then complete the upgrade. 

### Start Jmeter Script

Once the medic script completes we begin setting up for jmeter. The `start_jmeter_ec2.sh` script launches a new ec2 instance with the `user-data` script at `cht-core/tests/scalability/run_suite.sh`. 

The script clones cht-core and navigates to the scalability dir. Then installs java, nodejs, jmeter, and its plugins. Executes the scalability suite which is defined in the `cht-core/tests/scalability/sync.jmx`, and finally it uploads the results to an s3 bucket. 



## Running in tests in Distributed mode.

JMETER allows you to run the same test plan on multiple machines to generate additional load when 1 machine cannot execute enough. One main CAVEAT is that the orchestrator does not send any date to the worker nodes. You need to split the config.json and pass it to each node.

### Triggering through GitHub Actions. 

1. Generate data and user accounts. 
    1. When using a clone, reset all the user passwords using `scripts/bulk-password-change.js` with the `--generateJSON` option. 
2. Split the config.json into equal parts based on the number of runners using  `tests/scalability/ec2_management/split_config.js`
3. Upload the config files to S3 using `tests/scalability/ec2_management/upload_s3.js`
4. Trigger the manual scalability distributed flow. 
5. The tests run.... 


## Manually Setting up 

JMETER allows you to run the same test plan on multiple machines to generate additional load when 1 machine cannot execute enough. One main CAVEAT is that the orchestrator does not send any date to the worker nodes. You need to split the config.json and pass it to each node.


1. Generate data and user accounts. 
    1. When using a clone, reset all the user passwords using `scripts/bulk-password-change.js` with the `--generateJSON` option. 
1. Split the config.json into equal parts based on the number of runners using  `tests/scalability/ec2_management/split_config.js`
1. Spin up at least 2 EC2 instances. 
1. Copy and run the run_suite.sh to each. This install all required softwares
1. Copy the config files to the worker nodes
1. Get the public ip addresses of each worker.
1. Generate an [RMI key](https://jmeter.apache.org/usermanual/remote-test.html#setup_ssl) on the orchestrator.
1. Copy the key to the worker nodes and place it in the scalability folder.
1. Launch jmeter-server on the worker nodes in the scalability directory. The executable is located  `cht-core/tests/scalability/jmeter/bin/jmeter-server`
1. From the orchestrator run your jmeter command. The -r argument takes a comma separated list of worker node ip addresses. 

This will trigger 700 users to replicate ramping up another user every 5 seconds. 

EX: `./jmeter/bin/jmeter -n  -t sync.jmx -Gnumber_of_threads=700 -Gramp_up_period=5 -Gworking_dir=/home/ubuntu/cht-core/tests/scalability/ -Gnode_binary=/usr/bin/node -l ./report_remote/cli_run.jtl -e -o ./report_remote -R 3.8.93.43,3.11.81.213`