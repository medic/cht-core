#!/bin/bash

readonly CHT_BASE_DIR="/cht"

# Fail job when script errors
set -e

shutdown -P +60

updateSystem() {
  apt-get update

  echo installing JAVA
  apt-get install default-jre -y

  echo installing node
  curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh # install node 22
  apt-get install nodejs bzip2 # some npm dependency needs to be unzipped
}

setupCHT() {
  mkdir -p "$CHT_BASE_DIR"
  chmod 777 "$CHT_BASE_DIR"
  cd "$CHT_BASE_DIR"

  echo Cloning cht-core to /cht-core
  git clone --single-branch --branch "$TAG" https://github.com/medic/cht-core.git

  cd cht-core
  npm install patch-package

  cd webapp && npm ci && cd ../ # the bootstrap scripts have some dependencies (eurodigit for example)

  cd tests/scalability

  # Update the url field using jq and save to the config file
  jq --arg url "$MEDIC_URL" '.url = $url' config.json > temp.json && mv temp.json config.json
  npm ci
}

setupJmeter() {
  echo "Installing JMeter..."
  wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz -O ./apache-jmeter.tgz
  mkdir -p ./jmeter
  tar -xf apache-jmeter.tgz -C ./jmeter --strip-components=1

  echo "Installing JMeter Plugins"
  wget  https://repo1.maven.org/maven2/kg/apc/jmeter-plugins-manager/1.4/jmeter-plugins-manager-1.4.jar -O ./jmeter/lib/ext/jmeter-plugins-manager-1.4.jar
  wget 'http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/2.2/cmdrunner-2.2.jar' -O ./jmeter/lib/cmdrunner-2.2.jar
  java -cp jmeter/lib/ext/jmeter-plugins-manager-1.4.jar org.jmeterplugins.repository.PluginManagerCMDInstaller
  ./jmeter/bin/PluginsManagerCMD.sh install jpgc-mergeresults
}

runJmeterScalabilityTest() {
  echo "Executing JMeter test..."
  export NODE_TLS_REJECT_UNAUTHORIZED=0
  tmp_dir=$(mktemp -d -t -p ./ report-XXXXXXXXXX)
  ./jmeter/bin/jmeter -n  -t sync.jmx -Jworking_dir="$tmp_dir" -Jnode_binary="$(which node)" -Jnumber_of_threads=10 -l "$tmp_dir"/cli_run.jtl -e -o "$tmp_dir"
  mv ./jmeter.log "$tmp_dir"/jmeter.log
}

setupTestDataGenerator() {
  cd "$CHT_BASE_DIR"
  echo "installing test data generator"
  git clone https://github.com/medic/test-data-generator.git
  cd test-data-generator
  npm ci
  export COUCH_URL=$MEDIC_URL_AUTH
  curl -k -sf -X PUT "$MEDIC_URL_AUTH/not-medic"
  npm run generate "$CHT_BASE_DIR"/cht-core/tests/scalability/couchdb-benchmark/tdg-design.js
}

runCouchDbBenchmark() {
  cd "$CHT_BASE_DIR/cht-core/tests/scalability/couchdb-benchmark"
  export COUCH_URL=$MEDIC_URL_AUTH/not-medic
  node index.js
  cd ../
  cp benchmark_results.md "$tmp_dir/benchmark_results.md"
}

uploadResults() {
  cd "$CHT_BASE_DIR"

  remote_repo="https://x-access-token:${GH_TOKEN}@github.com/medic/scalability-results.git"
  git clone "$remote_repo"
  cd scalability-results

  # Configure git
  git config http.sslVerify false
  git config user.name "github-actions[bot]"
  git config user.email "github-actions[bot]@users.noreply.github.com"
  git remote set-url origin "$remote_repo"

  # Copy and commit results
  mkdir -p results
  rsync -rv --exclude='*/' "$CHT_BASE_DIR/cht-core/tests/scalability/$tmp_dir/" results/"$DATA_PATH"
  git add -A
  git commit -m "scalability results for $TAG"
  git push origin main
}

# Main execution
main() {
  updateSystem
  setupCHT

  setupJmeter
  runJmeterScalabilityTest

  setupTestDataGenerator
  runCouchDbBenchmark

  uploadResults
}

main

