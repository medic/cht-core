#!/bin/bash

echo  Running Suite 
echo pwd
git clone --single-branch --branch scalability-automation https://github.com/medic/cht-core.git;
cd cht-core/tests/scalability
export NODE_TLS_REJECT_UNAUTHORIZED=0
suite_dir=$(pwd)

cp -r ./csv ../../config/standard/

cd ../../config/standard/

curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

npm install medic-conf -g

MEDIC_CONF_URL=${MEDIC_URL:0:8}medic:medicScalability@${MEDIC_URL:8}

medic-conf --url=$MEDIC_CONF_URL backup-app-settings \
    upload-app-settings \
    convert-app-forms \
    convert-collect-forms \
    convert-contact-forms \
    backup-all-forms \
    delete-all-forms \
    upload-app-forms \
    upload-collect-forms \
    upload-contact-forms \
    upload-resources \
    upload-custom-translations  \
    csv-to-docs \
    upload-docs \
    create-users \

cd $suite_dir

echo "Changing config to match url arg"
node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$MEDIC_URL/medic'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});" 
echo "npm install"
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
