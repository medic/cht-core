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



### Running jmeter against an existing url

#### Changes to github actions

Disable the medic startup in `.github/workflows/scalability.yml`
``` yaml
      - name: Start EC2 and Medics
        run: cd tests/scalability && ./start_ec2_medic.sh $TAG_NAME
```

Set `MEDIC_URL` environment variable in the github action.
``` yaml
      - name: Set MEDIC_URL var
        run: echo "::set-env name=MEDIC_URL::https://gamma.dev.medicmobile.org"
```

Modify the on trigger to run against your branch. [github action config](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#example-using-multiple-events-with-activity-types-or-configuration)
``` yaml
  on:
    # Trigger the workflow on push or pull request,
    # but only for the main branch
    push:
      branches:
      - <branch_name>
```



#### Changes to scripts/config

Set the branch instead of tag name in the `tests/scalability/start_jmeter_ec2.sh` . This is built to normally run against a version tag. Since we want a specific branch need to set to yours or it could be the main branch. 

``` sh
export TAG_NAME=<your_branch_name>
sed -i '2s~^~'S3_PATH=s3://medic-e2e/scalability/$TAG_NAME-$GITHUB_RUN_ID'\n~' run_suite.sh
sed -i '2s~^~'TAG_NAME=$TAG_NAME'\n~' run_suite.sh
```

Specify your users and passwords. 

We run against 10 users and passwords by default. This is controlled by the number of threads in the thread group. When executing the jmeter command specify the `-Jnumber_of_threads=100`. It is important to note that if the number of users in the `config.json` file does not match the number of threads. The test will run but reuses the defined users. So if you had 10 users in `config.json` and specificed 100 threads. You would see the same user log in 10 times and replicate 10 times. 

Example command change:

`./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -Jnumber_of_threads=100 -l ./report/cli_run.jtl -e -o ./report`


`tests/scalability/config.json` is where the usernames and passwords are stored. Specify the number of users to the count of threads being executed. The url in this file is updated by the scripts when running. You can ignore this. 

Once it is complete the tests will log the results to s3 bucket `S3_PATH=s3://medic-e2e/scalability/$TAG_NAME-$GITHUB_RUN_ID`