# Devspaces import of medic

## [Medic](https://medicmobile.org/)
[https://medicmobile.org/](https://medicmobile.org/)

Medic Mobile combines messaging, data collection, and analytics for health workers and health systems in hard-to-reach areas with or without internet connectivity. [Read More](https://medicmobile.org/). <br> 
An indepth information about all of the medic tools is available [here](https://medicmobile.org/tools)

## [Medic Repository](https://github.com/trilogy-group/medic-webapp)
https://github.com/trilogy-group/medic-webapp

## Artifacts
1. [Dockerfile](Dockerfile)<br>
    This file contains the instructions to build the docker image. Start from the base image of node. Then
    installs nginx. This is needed as by default the repo of the product needs the database (couchdb). To be reunning
    at localhost. 
    Then is installs the correct version of yarn, grunt needed to run the product. As mentioned [here](readme.md). So this configuration assumes couchdb to be running at couchdb:5984. [Read More](https://docs.docker.com/engine/reference/builder/#usage)

2. [docker-nginx.conf](docker-nginx.conf)<br>
    This file contains instructions for the nginx tool. To proxy the coucdb container. As the product assumes it to be running on localhost:5984. Whereas its running in a separate container and can be reached at couchdb:5984. <br>
    The admin configuration ui of couchdb runs at 5986 and thats the another post nginx forwards. [Read More](http://nginx.org/en/docs/beginners_guide.html#conf_structure)

3. [docker-run.sh](docker-run.sh)<br>
    This is the script that runs by default in the container as the `CMD` instruction. This script primarily does the following things. <br>
    1. Waits for the couchdb server to start. 
    2. Waits for the coudb instance to start. 
    3. Sets up the couchdb instance. As mentioned [here](readme.md). 
    4. Installs the products dependencies.
    5. Runs the product. 
    
4. [docker-readme.md](docker-readme.md)<br>
    Has instructions on how to use the above mentioned artifacts.

5. [devspaces.yml](devspaces.yml)<br>
    This file has all the instructions to run the development enviornment of the product. This has instructions to create 2 configs. One for couchdb and one for medic. [Read More](http://devspaces-docs.ey.devfactory.com/collections/yaml.html)

6. [devspaces-script.sh](devspaces-script.sh) **(optional)**
    This file contains the command you would require to the setup the devspaces enviornment using the `cndevspaces` command line tool.

7. [devspaces-script-win.ps1](devspaces-script-win.ps1) / [devspaces-script-lin.sh](devspaces-script-lin.sh) **(optional)**<br>
    Both of these script files are optional. and contain the command for building the docker image on the devfactory docker hub. 

8. [.stignore](.stignore)<br>
    This file contains the file names and patterns. Which should not be synced to the devspaces enviornment. [Read more](http://devspaces-docs.ey.devfactory.com/optimizing_sync.html?highlight=stignore)

9. [devspaces-readme.md](devspaces-readme.md)<br>
    File containing instructions to build the devspaces development enviornment. 

## [Devspaces Instructions](devspaces-readme.md)
**For installing and configuring the `cndevspaces` tool please read the [documentation](http://devspaces-docs.ey.devfactory.com/installation/index.html).**

You can choose to either create a new collection devspace from scratch using the provided devspaces.yml file. Or import an existing collection.

### I. Creating new collection from devspaces.yml file. using the script [devspaces-script.sh](devspaces-script.sh) (using the artifacts)
1. `git clone https://github.com/trilogy-group/medic-webapp.git`<br>
2. `cd medic-webapp`
3. **Copy the artifcats provided, in the repository directory**
4. `./devspaces-script.sh medic medic`. If you are using ubuntu subsystem on windows 10 then the command `ubuntu run ./devspaces-script.sh medic medic` can be used instead.

### II. Creating new collection from devspaces.yml file. Without using the script (using the artifacts).
***This is the manual version of step I.***
1. `git clone https://github.com/trilogy-group/medic-webapp.git`<br>
2. `cd medic-webapp`
3. **Copy the artifcats provided, in the repository directory**
4. `cndevspaces collections create -f devspaces.yml`
5. `cndevspaces bind -C medic -c medic`<br>
    Binds the current directory with the devspaces. This syncs the source code / files in the repo with the host running devspaces. [Read More](http://devspaces-docs.ey.devfactory.com/collections/commands.html#bind)
6. `cndevspaces exec /opt/docker-run.sh`<br>
    This execute the provided command inside the container. If `exec` is called without any command then by default it opens the interactive terminal. [Read More](http://devspaces-docs.ey.devfactory.com/quickstart.html)

#### Using your own image
If there are any changes required in the Dockerfile. Then after making those changes a new image can be uploaded to any open docker registry and the values of `image->name` and `image->url` should be changes in devspaces.yml file. 
```yml
- name: medic
  url: registry2.swarm.devfactory.com/medic/medic
``` 

### III. Importing existing collection (Without using the artifacts / via importing the devspaces identified by uuid )
1. `git clone https://github.com/trilogy-group/medic-webapp.git`<br>
2. `cd medic-webapp`
3. **`cndevspaces import 1615cef0-45e3-4aed-9f30-f019579f1805 medic`<br>
    Imports the collections at the uuid into your account. [Read more](http://devspaces-docs.ey.devfactory.com/collections/sharing.html?highlight=import#import)**
4. `cndevspaces bind -C medic -c medic`<br>
    Binds the current cirectory with the devspaces. This syncs the source code / files in the repo with the host running devspaces. [Read More](http://devspaces-docs.ey.devfactory.com/collections/commands.html#bind)
5. `cndevspaces exec /opt/docker-run.sh`<br>
    This execute the provided command inside the container. If `exec` is called without any command then by default it opens the interactive terminal. [Read More](http://devspaces-docs.ey.devfactory.com/quickstart.html)

After the enviornment is verified to be working. This working enviornment can be shared using the following instructions
1. `cndevspaces save`<br>
    This command saves the running collection so that it can be shared amonst team members / fellow developers. 
2. `cndevspaces export`<br>
    This will give a ***uuid*** which can be then used by anyone this is shared with using the instructions provided above. 