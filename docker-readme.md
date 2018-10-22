# Dockerization of Medic

## [Medic](https://medicmobile.org/)
[https://medicmobile.org/](https://medicmobile.org/)

Medic Mobile combines messaging, data collection, and analytics for health workers and health systems in hard-to-reach areas with or without internet connectivity. [Read More](https://medicmobile.org/). <br> 
An indepth information about all of the medic tools is available [here](https://medicmobile.org/tools)

## [Medic Repository](https://github.com/trilogy-group/medic-webapp)
https://github.com/trilogy-group/medic-webapp

## Docker Requirements
 1. Docker version 18.06.1-ce
 2. Docker compose version 1.22.0

## Runtime Depedencies
 1. [node 9](https://nodejs.org/download/release/v9.0.0/), node:9-stretch is being used as teh base docker image. 
 2. [couchdb](http://couchdb.apache.org/), Here is the [Dockerfile](https://github.com/apache/couchdb-docker/blob/f429c1ccf22fe8cf7717383462fbf2f56e6d0301/2.2.0/Dockerfile)
 3. [yarn 1.7](https://yarnpkg.com/en/)
 4. [grunt](https://gruntjs.com/)
 5. [nginx](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/) (optional). This tool though not required officially by the product. Is being used to forward all requests from localhost:5984 and localhost:5986 form medic container to couchdb containers on the same number of port respectively. 

## Artifacts
1. [Dockerfile](Dockerfile)<br>
    This file contains the instructions to build the docker image. Start from the base image of node. Then
    installs nginx. This is needed as by default the repo of the product needs the database (couchdb). To be reunning
    at localhost. 
    Then is installs the correct version of yarn, grunt needed to run the product. As mentioned [here](readme.md). So this configuration assumes couchdb to be running at couchdb:5984. [Read More](https://docs.docker.com/engine/reference/builder/#usage)

2. [docker-compose.yml](docker-compose.yml)<br>
    This file contains the instructions to run all the development dependencies. Required by the product. [Read More](https://docs.docker.com/compose/overview/#compose-documentation). Basically creates two containers. 
     * couchdb (database)
     * medic (product)

3. [docker-nginx.conf](docker-nginx.conf)<br>
    This file contains instructions for the nginx tool. To proxy the coucdb container. As the product assumes it to be running on localhost:5984. Whereas its running in a separate container and can be reached at couchdb:5984. <br>
    The admin configuration ui of couchdb runs at 5986 and thats the another post nginx forwards. [Read More](http://nginx.org/en/docs/beginners_guide.html#conf_structure)

4. [docker-run.sh](docker-run.sh)<br>
    This is the script that runs by default in the container as the `CMD` instruction. This script primarily does the following things. <br>
    1. Waits for the couchdb server to start. 
    2. Waits for the coudb instance to start. 
    3. Sets up the couchdb instance. As mentioned [here](readme.md). 
    4. Installs the products dependencies.
    5. Runs the product. 
    
5. [docker-readme.md](docker-readme.md)<br>
    Has instructions on how to use the above mentioned artifacts. 

**Other artifacts present are related to devspaces import.** **Read about devspaces instructions from [devspaces-readme.md](devspaces-readme.md)**

## Steps
1. `git clone https://github.com/trilogy-group/medic-webapp.git`
2. copy the artifacts in the repo directory
3. `docker-compose up`
4. open http://localhost:5988 to see medic login ui
5. open http://localost:5984 to see fauxton ui. This can be used to configure couchdb instance running in couchdb container.


## Medic Technical references
1. [Architecture](https://github.com/medic/medic-docs/blob/master/development/architecture.md)
2. [Database Scheme](https://github.com/medic/medic-docs/blob/master/development/db-schema.md)
3. [SMS Statuses](https://github.com/medic/medic-docs/blob/master/user/message-states.md)