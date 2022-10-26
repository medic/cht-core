#!/usr/bin/env bash

set -eu

selectedProject=

# can pass a project .env file as argument
if [ -n "${1-}" ]; then
    if test -f $1; then
        selectedProject=$(echo "$1" | sed "s/\.\///" | sed "s/\.env//")
    else
        echo "File $1 doesnt exist"
    fi
fi

mkdir -p "$HOME/.medic/cht-docker/compose-files"
curl -s -o "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-core.yml" https://staging.dev.medicmobile.org/_couch/builds/medic%3Amedic%3Amaster/docker-compose%2Fcht-core.yml
curl -s -o "$HOME/.medic/cht-docker/compose-files/docker-compose_cht-couchdb.yml" https://staging.dev.medicmobile.org/_couch/builds/medic%3Amedic%3Amaster/docker-compose%2Fcht-couchdb.yml

if [ -z "$selectedProject" ]; then
    projects=$(find . -name "*.env" -type f | sed "s/\.\///" | sed "s/\.env//")

    if [ -z "$projects" ]; then
        echo 'No project found, initialize a project with a "project-name.env" file.'
        read -p "Would you like to initialize one now [y/N]? " yn
        case $yn in
        [Yy]*)
            projectName=
            while [ -z "${projectName}" ]; do
                read -p "How do you want to name the project? " projectName

                if test -f "./${projectName}.env"; then
                    echo "./${projectName}.env already exists"
                    projectName=
                fi
            done

            selectedProject=$projectName
            mkdir -p "$HOME/.medic/cht-docker/${projectName}/couch-${projectName}"
            touch "./${projectName}.env"
            echo "NGINX_HTTP_PORT=8080" >>"./${projectName}.env"
            echo "NGINX_HTTPS_PORT=8443" >>"./${projectName}.env"
            echo "COUCHDB_USER=medic" >>"./${projectName}.env"
            echo "COUCHDB_PASSWORD=password" >>"./${projectName}.env"
            echo "CHT_COMPOSE_PROJECT_NAME=${projectName}" >>"./${projectName}.env"
            echo "DOCKER_CONFIG_PATH=$HOME/.medic/cht-docker/${projectName}" >>"./${projectName}.env"
            echo "COUCHDB_SECRET=$(openssl rand -hex 16)" >>"./${projectName}.env"
            echo "COUCHDB_DATA=$HOME/.medic/cht-docker/${projectName}/couch-${projectName}" >>"./${projectName}.env"
            echo "CHT_COMPOSE_PATH=$HOME/.medic/cht-docker/compose-files" >>"./${projectName}.env"
            ;;
        *) exit ;;
        esac
    else
        echo "Found the following project files, please pick the one you want to use:"
        while [ -z "$selectedProject" ]; do
            select project in $projects; do
                selectedProject=$project
                break
            done
        done
    fi
fi

docker-compose --env-file "./$selectedProject.env" --file "$HOME/app/medic/cht-upgrade-service/docker-compose.yml" down
docker-compose --env-file "./$selectedProject.env" --file "$HOME/app/medic/cht-upgrade-service/docker-compose.yml" up --detach
docker-compose --env-file "./$selectedProject.env" --file "$HOME/app/medic/cht-upgrade-service/docker-compose.yml" logs --follow

echo "Adding local-ip.co certs to Docker container ${selectedProject}_nginx_1"
isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2> /dev/null)
while [ "$isNginxRunning" != "true" ]; do
  echo "Waiting for the container ${selectedProject}_nginx_1 to be running, retrying..."
  sleep 1
  isNginxRunning=$(docker inspect --format="{{.State.Running}}" "${selectedProject}_nginx_1" 2> /dev/null)
done
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o server.pem http://local-ip.co/cert/server.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o chain.pem http://local-ip.co/cert/chain.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "cat server.pem chain.pem > /etc/nginx/private/cert.pem"
docker exec -it "${selectedProject}_nginx_1" bash -c "curl -s -o /etc/nginx/private/key.pem http://local-ip.co/cert/server.key"
docker restart "${selectedProject}_nginx_1"
echo "Added local-ip.co certs to ${selectedProject}_nginx_1 and restarted the container"
