#!/bin/bash
set -e

if [[ ! $1 = 'local' || -z $1 ]]
then
  RUN_LOCAL=false
else
  RUN_LOCAL=true
fi

THREADS=30
BATCHES=3
THREADS_IN_BATCH=$(($THREADS/$BATCHES))
SKIP=0

if [ $RUN_LOCAL = false ]
then
  sudo shutdown -P +60
  echo Cloning cht-core to /cht-core
  git clone --single-branch --branch $TAG_NAME https://github.com/medic/cht-core.git;
  cd cht-core/tests/scalability/ongoing
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

mkdir -p $DATA_DIR
mkdir -p $DATA_DIR/dbs

echo "npm install for jmeter suite"
npm ci

node ./generate-data.js $INSTANCE_URL $DATA_DIR
for BATCH in $(seq 0 $(($BATCHES-1)))
do
  for THREAD in $(seq 1 $THREADS_IN_BATCH)
  do
    CURRENT_THREAD=$(($THREADS_IN_BATCH*$BATCH+$THREAD))
    echo "Initial replication ${CURRENT_THREAD} of $(($THREADS))"
    node ./initial-replication.js $INSTANCE_URL $DATA_DIR $CURRENT_THREAD &
  done
  wait
done
#
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

if [ $RUN_LOCAL = false ]
then
  echo "Installing AWS CLI"
  sudo apt-get install unzip -y
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  sudo ./aws/install
  echo "Uploading logs and screenshots to ${S3_PATH}..."
  /usr/local/bin/aws s3 cp ./report "$S3_PATH" --recursive
  echo "FINISHED! "
fi
