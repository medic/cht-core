#!/bin/bash
set -e

THREADS=100
if [ -z $SKIP ]
then
    SKIP=0
fi

export NODE_TLS_REJECT_UNAUTHORIZED=0

if [ -z $INSTANCE_URL ]
then
    echo "Please pass the instance url via INSTANCE_URL environment variable"
    exit 1
fi

if [ -z $DATA_DIR ]
then
    echo "Please pass the path to the desired data directory via DATA_DIR environment variable"
    exit 1
fi

echo "npm install for jmeter suite"
npm ci

echo "jmeter install"
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.4.3.tgz -O $DATA_DIR/apache-jmeter.tgz
mkdir $DATA_DIR/jmeter && tar -xf $DATA_DIR/apache-jmeter.tgz -C $DATA_DIR/jmeter --strip-components=1
echo "Installing Plugins" &&
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O $DATA_DIR/jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O $DATA_DIR/jmeter/lib/cmdrunner-2.2.jar
java -cp $DATA_DIR/jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
$DATA_DIR/jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults
echo "jmeter do it!"
echo $(which node)
$DATA_DIR/jmeter/bin/jmeter -n  -t ./ongoing_sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -Jdata_dir=$DATA_DIR -Jinstance_url=$INSTANCE_URL -Jskip=SKIP -Jnumber_of_threads=$THREADS -l ./report/cli_run.jtl -e -o ./report
mv ./jmeter.log ./report/jmeter.log
echo "FINISHED! "