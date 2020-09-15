require('dotenv').config({ path: __dirname + '/.env' });

if (!process.env.API_KEY) {
  console.error('ERROR: An API_KEY is required. Read the README.md file for more info.');
  process.exit(1);
}

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const URL_REGEX = /https:\/\/(.*)\.app\.medicmobile\.org\/?/;

const getMonitors = async () => {
  const url = 'https://api.uptimerobot.com/v2/getMonitors';
  const params = new URLSearchParams();
  params.append('api_key', process.env.API_KEY);
  params.append('format', 'json');
  params.append('custom_uptime_ratios', '30');
  const res = await fetch(url, { method: 'POST', body: params });
  return res.json();
};

const displayName = url => {
  const match = url.match(URL_REGEX);
  return match ? match[1] : url;
};

const calculate = monitors => {
  const output = monitors.map(monitor => `${displayName(monitor.url)}\t${monitor.custom_uptime_ratio}`);
  output.sort();
  console.log(output.join('\n'));
};

(async function() {
  const response = await getMonitors();
  if (response.stat !== 'ok') {
    console.error('ERROR: UptimeRobot request failed:');
    console.error(JSON.stringify(response, null, 2));
    process.exit(1);
  }
  if (response.pagination.total === response.pagination.limit) {
    console.error('ERROR: We have multiple pages of results - tell Gareth to stop being lazy and implement pagination');
    console.error(JSON.stringify(response.pagination, null, 2));
    process.exit(1);
  }
  calculate(response.monitors);
})();
