#!/bin/bash
# Fail job when script errors
set -e

shutdown -P +60

mkdir -p /cht
chmod 777 /cht
cd cht

echo Cloning cht-core to /cht-core
git clone --single-branch --branch "$TAG" https://github.com/medic/cht-core.git

export NODE_TLS_REJECT_UNAUTHORIZED=0

apt-get update

echo installing JAVA
apt-get install default-jre -y

echo installing node
curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh # install node 22
apt-get install nodejs bzip2

cd cht-core
npm install patch-package
cd webapp && npm ci && cd ../
cd tests/scalability
echo "Changing config to match url arg"
node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$MEDIC_URL'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});"
echo "npm install for jmeter suite"
npm ci

echo "jmeter install"
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz -O ./apache-jmeter.tgz
mkdir -p ./jmeter
tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1

echo "Installing Plugins"
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults

echo "jmeter do it!"
tmp_dir=$(mktemp -d -t -p ./ report-XXXXXXXXXX)
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir="$tmp_dir" -Jnode_binary="$(which node)" -Jnumber_of_threads=10 -l "$tmp_dir"/cli_run.jtl -e -o "$tmp_dir"
mv ./jmeter.log "$tmp_dir"/jmeter.log

cd /cht
remote_repo="https://bot:${GH_TOKEN}@github.com/medic/scalability-results.git"
git clone "$remote_repo"
cd scalability-results
mkdir -p results
cp -r "/cht/cht-core/tests/scalability/$tmp_dir" results/"$DATA_PATH"
git config http.sslVerify false
git add -A
git commit -m "scalability results for $TAG"
git push "$remote_repo" HEAD:"main"

echo "FINISHED! "
