param($name="medic", $ownername="medic")

docker -H build.swarm.devfactory.com build -t $ownername/$name .
docker -H build.swarm.devfactory.com tag $ownername/$name registry2.swarm.devfactory.com/$ownername/$name
docker -H build.swarm.devfactory.com push registry2.swarm.devfactory.com/$ownername/$name
docker pull registry2.swarm.devfactory.com/$ownername/$name
docker tag registry2.swarm.devfactory.com/$ownername/$name $name
# docker-compose build

# # Uncomment the following line to run in docker-compose locally
# docker-compose up

# # Uncomment the following line to run in devspaces
ubuntu run "chmod 777 devspaces-script.sh && ./devspaces-script.sh medic medic" 