#!/usr/bin/env bash
docker -H build.swarm.devfactory.com build -t $2/$1 .
docker -H build.swarm.devfactory.com tag $2/$1 registry2.swarm.devfactory.com/$2/$1
docker -H build.swarm.devfactory.com push registry2.swarm.devfactory.com/$2/$1
docker pull registry2.swarm.devfactory.com/$2/$1
docker tag registry2.swarm.devfactory.com/$2/$1 $1
# docker-compose build

# # Uncomment the following line to run in docker-compose locally
# docker-compose up

# # Uncomment the following line to run in devspaces
chmod 777 devspaces-script.sh
./devspaces-script.sh medic medic