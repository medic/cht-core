#
#echo "jmeter install"
#wget https://dlcdn.apache.org/jmeter/binaries/apache-jmeter-5.6.tgz -O ./apache-jmeter.tgz
#mkdir -p ./jmeter
#tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1
#
#echo "Installing Plugins"
#wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
#wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar
#java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
#./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults

echo "jmeter do it!"
tmp_dir=$(mktemp -d -t -p ./ report-$(date +%F-%H-%M-%S)-XXXXXXXXXX)
./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir=$tmp_dir -Jnode_binary=$(which node) -Jnumber_of_threads=10 -l $tmp_dir/cli_run.jtl -e -o $tmp_dir
mv ./jmeter.log $tmp_dir/jmeter.log
