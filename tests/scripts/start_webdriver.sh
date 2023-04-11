mkdir -p tests/logs &&
CHROME_VERSION=`google-chrome-stable --version | grep -Po '(\d+)(?=\.\d+\.\d+\.\d+)'` &&
echo 'Detected chrome version ' $CHROME_VERSION &&
CHROMEDRIVER_VERSION=$(curl -sS https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION) &&
echo 'Getting Chrome driver version ' $CHROMEDRIVER_VERSION &&
./node_modules/.bin/webdriver-manager update --versions.chrome $CHROMEDRIVER_VERSION &&
./node_modules/.bin/webdriver-manager start --versions.chrome $CHROMEDRIVER_VERSION --ignore_ssl > tests/logs/webdriver.log &
until nc -z localhost 4444; do sleep 1; done
