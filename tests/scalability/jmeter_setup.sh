#!/bin/bash

echo Cloning cht-core to /cht-core
git clone --single-branch --branch master https://github.com/medic/cht-core.git;

cd cht-core/tests/scalability
export NODE_TLS_REJECT_UNAUTHORIZED=0 

sudo apt-get update

echo installing JAVA
sudo apt-get install default-jre -y

echo installing node
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "npm install for jmeter suite"
npm install
echo "jmeter install"
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.4.1.tgz -O ./apache-jmeter.tgz && 
mkdir ./jmeter && tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1
echo "Installing Plugins" && 
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar &&
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar &&
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller &&
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults &&
echo ""
echo " ----------------------- "
echo "JMETER installed successfully"
echo " ----------------------- "
echo ""