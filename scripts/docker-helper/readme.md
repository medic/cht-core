# CHT Docker Compose Helper

## Introduction

These scripts help start CHT instances using `docker-compose` to develop CHT apps on:

![](helper.png?8.12.21a)

This document is a placeholder while this beta version is out for testing.  These documents should and need to be moved to the [docs site](https://docs.communityhealthtoolkit.org/) when this script leaves beta.

Please do not use this script for production hosting. See [Medic's "Hosting" section](https://docs.communityhealthtoolkit.org/apps/guides/hosting/) in our documentation for more information.   

## Prerequisites 

### OS 

The main requirement is Ubuntu OS and this script has only been tested on Ubuntu.  It likely will work on Windows WSL2.  It will not work on MacOS as it's missing the `ip` command.

### Software

The script will check and require these commands. All but the first two should be installed by default on Ubuntu:

* docker
* docker-compose
* nc
* curl
* tr
* awk
* grep
* cut

Optionally you can install `jq` so that the script can parse JSON and tell you  

### Docker compose file and helper scripts

An up-to-date clone of [cht-core](https://github.com/medic/cht-core/) has everything you need including:

* `docker-compose-developer.yml`
* `cht-docker-compose.sh`
* `docker-status.sh`

## Using

### Syntax

The helper script is run by calling `./cht-docker-compose.sh`.  It accepts one required and one optional arguments:

* `-e | --env-file` - path to the environment file. Required
* `-d | --docker_action` - docker action to run: `up`, `down` or `destory`. Optional, defaults to `up`  

### Nomenclature 

Docker containers, networks and volumes are always named after the project you're using.  So if your project is called `my_first_project`, you will see:
* Two containers: `my_first_project_medic-os_1` and `my_first_project_haproxy_1`
* One storage volume: `my_first_project_medic-data`
* One network: `my_first_project_medic-net`

### First Run

These steps assume:

* the first project is `my_first_project`
* one `.env_docker` environment file per project
* `my_first_project` and `cht-core` directories are next to each other in the same parent directory
* you have Internet connectivity (*See [booting with no connectivity](./readme.md#booting-with-no-connectivity)*)

Follow these steps to create your first developer instance. You can create as many as you'd like:

1. create `./my_first_project/.env_docker` with the contents:
   ```
   COMPOSE_PROJECT_NAME=my_first_project
   CHT_HTTP=8080
   CHT_HTTPS=8443   
   ```
2. Change into the `docker-help` directory: `cd ./cht-core/scripts/docker-helper/`
3. Run the helper script and specify your `.env_docker` file:
   ```
   ./cht-docker-compose.sh -e ../../../my_first_project/.env_docker
   ```
4. Your CHT instance will be started when you see the text:
   > Successfully started project my_first_project

### Second Run

When you're done with an instance, be sure to shut it down:

```
./cht-docker-compose.sh -e ../../../my_first_project/.env_docker -d down
```

All information will be saved and it should be quick to start for the Nth time.  

To start an existing instance again, just run the command from the "First Run" section:

```
./cht-docker-compose.sh -e ../../../my_first_project/.env_docker 
```

This command is safe to run as many times as you'd like if  you forget the state of your project's Docker containers.

### Last Run

When you're done with a project and want to completely destroy it, run `destroy`:

```
./cht-docker-compose.sh -e ../../../my_first_project/.env_docker -d destroy
```

***NOTE*** - Be sure you want to run `destroy`. The script will _not_ prompt "are you sure?" and it will just delete all your project's data.

## Caveats

## Cookie collisions

The CHT stores its cookies based on the domain.  This means if you're running two concurrent instances on `https://192-168-68-40.my.local-ip.co:8443` and `https://192-168-68-40.my.local-ip.co:8440` (note different ports), the CHT would write the cookie under the same `192-168-68-40.my.local-ip.co` domain. When logging out of one instance, you would get logged out of both and other consistencies.

To avoid this collision of cookies, you can use different IP addresses to access the instances.  This works because of two reasons:
1. the TLS certificate being used is valid for any subdomain of `*.my.local-ip.co`. Further, the URL always resolves to the IP passed in the `*` section, so you can use any IP
2. the IPs that are available to reference your `localhost` are actually a `/8` netmask, meaning [there are 16 million addresses](https://en.wikipedia.org/wiki/Localhost#Name_resolution) to choose from!

Using the above two reasons, these URLs could work to avoid the cookie colission:

* `https://127-0-0-1.my.local-ip.co:8443`
* `https://127-0-0-2.my.local-ip.co:8440`

This would result in the domains being `127.0.0.1` and `127.0.0.2` from the CHT's perspective. When using a mobile device for testing, you're limited to use the LAN ip output in the helper and can not use the `127.x.x.x` IPs. 

### Running without the `ip` utility

If you're on MacOS, or other OS with out the `ip` utility, your IP address will always show as `127.0.0.1`.  You can not connect to this IP from a mobile client on your LAN because it always references the host it's on, not a foriegn host.  

To work around this, you can find out your IP on your LAN and just replace the `127-0-0-1` part of the `https://127-0-0-1.my.local-ip.co:8443` URL to be your IP addres.  So if your local IP was `192.168.0.22` your URL would be `https://192-168-0-22.my.local-ip.co:8443`

### Booting with no connectivity

This script can work without connectivity after the initial boot.  However, it needs connectivity to do DNS lookups for the *.my.local-ip.co URLs.  To work around this, when you have no connectivity, add an entry in your `/etc/hosts` for the URL showing up in the script. For example, if you're seeing `https://127-0-0-1.my.local-ip.co:8443` as your IP, add this line to the top of your `/etc/hosts` file. 

```shell script
127.0.0.1   127-0-0-1.my.local-ip.co
```

_**NOTE**_ - You need connectivity on the initial boot of the VM to connect to `staging.dev.medicmobile.org` to download the base version of the CHT. Subsequent boots do not require connectivity. 


### Port conflicts

If you have two `.env_docker` files that have the same ports or re-use the same project name, bad things will happen.  Don't do this.

Medic recommends setting up unique project names and unique ports for each project.  Commit these `.env_docker` files to your app config's revision control so all app developers use the same `.env_docker` files.  

### Slow downloads and wait periods

During testing on an Internet connection with high latency (>1000ms) and packet loss, this script had trouble booting the CHT instance because it was taking too long to download the assets from staging.dev.medicmobile.org.  Each version is about 38MB.  

To account for this, the wait time is multiplied times the boot iteration for each time it reboots.  It starts at 100 seconds and then 200, 300, 400 up to the fifth time it will wait 500 seconds. 

## Too many containers

If you're on a resource constrained computer, like a very old or very slow laptop, be sure to watch the total number of containers you're running.  More than one or two projects (2 or 4 containers) and you may notice a slow down. You can use the `./docker-status.sh` script if you forgot which projects you have running:

![](docker.status.png?8.12.21a)


## Troubleshooting

This script's raison d'être is to avoid troubleshooting!  Hopefully you don't have any problems, but please report them if you do. As well, see "Caveats" above.

If any scripts fail to exit, you can hit hold down the control key and press "c" (`ctrl + c`) to quit out of the script.

### "Device '' does not exist'" and "Could not resolve host" errors

If you see either of these errors, you're very likely off-line such that you effectively cannot reach the Internet. The script will not work as is.  See the "Booting with no connectivity" section above for work-arounds.

### Resetting everything

If you REALLY get stuck and want to destroy _**ALL**_ docker containers/volumes/networks, even those not started by this script, run this (but be  _**extra**_ sure that's what you want to do):

```
docker stop $(docker ps -q)&&docker system prune&&docker volume prune
```
