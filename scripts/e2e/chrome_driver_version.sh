#!/bin/bash
chrome_version=$(google-chrome --version | sed 's/[^0-9.]*\([0-9.]*\).*/\1/' |  awk -F '.' '{print $1"."$2"."$3}')
echo 'Detected Chrome Version ' $chrome_version
driver_vers=$(curl https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$chrome_version)
echo 'Got chrome driver version ' $driver_vers
echo $driver_vers
