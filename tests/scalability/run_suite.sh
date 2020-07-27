#!/bin/bash

echo Cloning cht-core to /cht-core
git clone --single-branch --branch scalability-automation https://github.com/medic/cht-core.git;
cd cht-core/tests/scalability
export NODE_TLS_REJECT_UNAUTHORIZED=0

sudo apt-get update

echo installing JAVA
sudo apt-get -q install default-jre -y

echo installing node
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get -q install -y nodejs

echo "Changing config to match url arg"
node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$MEDIC_URL/medic'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});" 
echo "npm install for jmeter suite"
npm install
echo "jmeter install"
wget http://www.gtlib.gatech.edu/pub/apache//jmeter/binaries/apache-jmeter-5.3.tgz -q && 
mkdir ./jmeter && tar -xf apache-jmeter-5.3.tgz -C ./jmeter --strip-components=1
echo "Installing Plugins" && 
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar -q &&
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar -q &&
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller &&
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults &&
echo "jmeter do it!"
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -l ./previous_results/cli_run.jtl -e -o ./report
echo "Installing AWS CLI"
sudo apt-get install unzip -y 
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
S3_PATH=s3://medic-e2e/scalability/$GITHUB_ACTION
echo "Uploading logs and screenshots to ${S3_PATH}..."
/usr/local/bin/aws s3 cp ./report "$S3_PATH" --recursive
echo "FINISHED! "