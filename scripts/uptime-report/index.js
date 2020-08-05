require('dotenv').config({ path: __dirname + '/.env' });

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
  if (response.pagination.total === response.pagination.limit) {
    throw new Error('Gareth was too lazy to implement pagination...');
  }
  calculate(response.monitors);
})();
