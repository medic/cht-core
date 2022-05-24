#!/bin/bash
set -e

export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "npm install for jmeter suite"
npm ci
echo "jmeter install"
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.4.3.tgz -O ./apache-jmeter.tgz
mkdir ./jmeter && tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1
echo "Installing Plugins" &&
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults
echo "jmeter do it!"
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -l ./report/cli_run.jtl -e -o ./report
mv ./jmeter.log ./report/jmeter.log
echo "FINISHED! "
