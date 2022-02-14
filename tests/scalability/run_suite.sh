#!/bin/bash
sudo shutdown -P +60
# echo Cloning cht-core to /cht-core
# git clone --single-branch --branch $TAG_NAME https://github.com/medic/cht-core.git;

cd cht-core/tests/scalability
export NODE_TLS_REJECT_UNAUTHORIZED=0

sudo apt-get update

echo install Hub
sudo snap install --classic hub
git config --global hub.protocol https
git config --global user.name $GITHUB_ACTOR

echo Cloning cht-core to /cht-core
#hub clone --single-branch --branch $TAG_NAME cht-core.git
git clone --single-branch --branch $TAG_NAME https://github.com/medic/cht-core.git;

# echo installing JAVA
# sudo apt-get install default-jre -y

# echo installing node
# curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
# sudo apt-get install -y nodejs

# echo "Changing config to match url arg"
# node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$MEDIC_URL/medic'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});"
# echo "npm install for jmeter suite"
# npm install
# echo "jmeter install"
# wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.4.3.tgz -O ./apache-jmeter.tgz &&
# mkdir ./jmeter && tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1
# echo "Installing Plugins" &&
# wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar &&
# wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar &&
# java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller &&
# ./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults &&
# echo "jmeter do it!"
# ./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -l ./report/cli_run.jtl -e -o ./report
# mv ./jmeter.log ./report/jmeter.log
# echo "Installing AWS CLI"
# sudo apt-get install unzip -y
# curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
# unzip awscliv2.zip
# sudo ./aws/install
# echo "Uploading logs and screenshots to ${S3_PATH}..."
# /usr/local/bin/aws s3 cp ./report "$S3_PATH" --recursive
# mv report/cli_run.jtl previous_results/${TAG_NAME}.jtl
# git add report/*
# git commit -m'Adding jmeter restults'
# zip -r report.zip report
# git add report.zip
# git commit -m'Adding zip report'
#git push
touch testing-ci.txt
git add testing-ci.txt
git commit -m'Adding some restults'
hub pull-request --no-edit --force
echo "FINISHED! "