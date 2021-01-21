mkdir -p tests/logs &&
echo before &&
CHROME_VERSION=`google-chrome-stable --version | grep -Po '(\d+)(?=\.\d+\.\d+\.\d+)'` &&  
echo $CHROME_VERSION &&
CHROMEDRIVER_VERSION=$(curl -sS https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION) &&
echo $CHROMEDRIVER_VERSION &&
./node_modules/.bin/webdriver-manager update --versions.chrome $CHROMEDRIVER_VERSION &&
./node_modules/.bin/webdriver-manager start --versions.chrome $CHROMEDRIVER_VERSION > tests/logs/webdriver.log &
until nc -z localhost 4444; do sleep 1; done