#!/bin/bash
# set -e
sudo shutdown -P +60
echo Set up github credentials for $GITHUB_ACTOR
git config --global user.name $GITHUB_ACTOR

git clone --single-branch --branch $TAG_NAME https://github.com/medic/cht-core.git;


cd cht-core/tests/scalability
export NODE_TLS_REJECT_UNAUTHORIZED=0

sudo apt-get update

echo installing JAVA
sudo apt-get install default-jre -y

echo installing node
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Changing config to match url arg"
node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$MEDIC_URL/medic'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});"
echo "npm install for jmeter suite"
npm install
echo "jmeter install"

wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.4.3.tgz -O ./apache-jmeter.tgz &&
mkdir ./jmeter && tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1
echo "Installing Plugins" &&
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar &&
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar &&
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller &&
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults &&
echo "jmeter do it!"
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -l ./report/cli_run.jtl -e -o ./report
mv ./jmeter.log ./report/jmeter.log
echo "Installing AWS CLI"
sudo apt-get install unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --upgrade
echo "Uploading logs and screenshots to ${S3_PATH}..."
/usr/local/bin/aws s3 cp ./report "$S3_PATH" --recursive
#create new branch from
git checkout -b jmeter-results-test-${TAG_NAME}
echo $TAG_NAME | cut -d "-" -f1
mv report/cli_run.jtl previous_results/${TAG_NAME}_gha.jtl
git add previous_results/*
git commit -m'Adding jmeter restults'
# zip -r report.zip report
# git add report.zip
# git commit -m 'adding report zip'
git commit --amend --reset-author
git push --set-upstream origin jmeter-results-test-${TAG_NAME}
#git push --set-upstream https://$GITHUB_TOKEN@github.com/medic/cht-core.git jmeter-results-test-${TAG_NAME}

echo "FINISHED! "