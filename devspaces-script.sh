#!/usr/bin/env bash
echo "*** Checking current status of the devspaces env ***"
INFO=`cndevspaces info`

if echo $INFO | grep -q "does not match";
then

echo "*** No Collection exists ***"
echo "*** Creating Collection : $1 and Config : $2 ***"
cndevspaces collections create -f devspaces.yml
echo "*** Collection created ***"
cndevspaces bind -C $1 -c $2

# Uncomment following lines to force updating of the devspace env using the yaml file
else
echo "*** Updating collection ***"

    # Uncomment below lines to force unbind if the directory is already bound to a devspace
    cndevspaces stop
    cndevspaces unbind
    rm -r .stfolder

cndevspaces collections update -f devspaces.yml
echo "*** Updated collection ***"
cndevspaces bind -C $1 -c $2
# -------

fi

cndevspaces info

echo "*** Now you will be able to acccess the container terminal ***"
cndevspaces exec -C $1 -c $2 /opt/docker-run.sh

echo "*** Exited terminal saving state now ***"
cndevspaces save

echo "*** Generating Unique Id of the state so that it can be shared ***"
echo "*** By using cndevspaces import <UUID> ***"
cndevspaces export --collection $1