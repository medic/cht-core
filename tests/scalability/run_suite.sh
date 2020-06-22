echo  Running Suite 

resp=$(curl --write-out %{http_code} --silent --output /dev/null $1/api/info -k --head) 

if [ $resp != '200' ]
  then
    echo "The instance provided did not respond with 200 at $1/api/info"
fi

suite_dir=$(pwd)

cp -r ./csv ../../config/standard/

cd ../../config/standard/

 medic-conf --accept-self-signed-certs --url=$1 backup-app-settings \
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

# Can be removed when finished since server will tear down

rm -rf ./csv

cd $suite_dir

echo "Changing config to match url arg"
node -p "const fs = require('fs');var path = './config.json';var config = JSON.stringify({...require(path), url: '$1'}, null, 2);fs.writeFileSync(path,config,{encoding:'utf8',flag:'w'});" 
# echo "npm install"
# npm install
echo "jmeter install"
wget http://www.gtlib.gatech.edu/pub/apache//jmeter/binaries/apache-jmeter-5.3.tgz -q
tar -xf apache-jmeter-5.3.tgz
mv apache-jmeter-5.3 jmeter
echo "jmeter plugins install"
wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -q
mv jmeter-plugins-manager-1.4.jar ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar -q
java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults   
echo "jmeter do it!"
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=./ -Jnode_binary=$(which node) -l ./previous_results/cli_run.jtl -e -o ./report
