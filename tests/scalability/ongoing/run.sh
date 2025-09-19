#!/bin/bash
set -e

if [[ ! $1 = 'local' || -z $1 ]]
then
  RUN_LOCAL=false
else
  RUN_LOCAL=true
fi

if [ $RUN_LOCAL = false ]
then
  sudo shutdown -P +60
  echo Cloning cht-core to /cht-core
  git clone --single-branch --branch "$TAG_NAME" https://github.com/medic/cht-core.git;
  cd cht-core/tests/scalability/ongoing
fi

export NODE_TLS_REJECT_UNAUTHORIZED=0

if [ -z "$BASE_URL" ]
then
    echo "Please pass the base URL via BASE_URL environment variable (e.g., https://192.168.86.250:10449)"
    exit 1
fi

if [ -z "$ADMIN_USER" ]
then
    echo "Please pass the admin username via ADMIN_USER environment variable (e.g., medic)"
    exit 1
fi

if [ -z "$ADMIN_PASSWORD" ]
then
    echo "Please pass the admin password via ADMIN_PASSWORD environment variable (e.g., password)"
    exit 1
fi

ADMIN_INSTANCE_URL="https://${ADMIN_USER}:${ADMIN_PASSWORD}@${BASE_URL#https://}"
BASE_INSTANCE_URL="$BASE_URL"

if [ -z "$DATA_DIR" ]
then
    echo "Please pass the path to the desired data directory via DATA_DIR environment variable"
    exit 1
fi

mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR"/dbs

echo "npm install for jmeter suite"
npm ci

unset NODE_OPTIONS VSCODE_INSPECTOR_OPTIONS
node ./generate-data.js "$ADMIN_INSTANCE_URL" "$DATA_DIR"

echo "jmeter install"
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz -O "$DATA_DIR"/apache-jmeter.tgz
mkdir "$DATA_DIR"/jmeter && tar -xf "$DATA_DIR"/apache-jmeter.tgz -C "$DATA_DIR"/jmeter --strip-components=1
echo "Installing Plugins" &&
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O "$DATA_DIR"/jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O "$DATA_DIR"/jmeter/lib/cmdrunner-2.2.jar
java -cp "$DATA_DIR"/jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
"$DATA_DIR"/jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults
echo "jmeter do it!"
which node

OPTIMAL_THREADS=$(node calculate-threads.js 2>/dev/null | grep -E '^[0-9]+$' | head -1)
echo "Calculated optimal threads from config.js: $OPTIMAL_THREADS"

# Ensure clean environment for JMeter execution (no debugger inheritance)
env -u NODE_OPTIONS -u VSCODE_INSPECTOR_OPTIONS "$DATA_DIR"/jmeter/bin/jmeter -n  -t ./sync.jmx -Jworking_dir=./ -Jnode_binary="$(which node)" -Jdata_dir="$DATA_DIR" -Jinstance_url="$BASE_INSTANCE_URL" -Jskip=1 -Jnumber_of_threads="$OPTIMAL_THREADS" -l ./report/cli_run.jtl -e -o ./report
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