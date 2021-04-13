const child_process = require('child_process');
const fs = require('../lib/sync-fs');
const google = require('googleapis').google;
const info = require('../lib/log').info;
const userPrompt = require('../lib/user-prompt');
const warn = require('../lib/log').warn;

const SECRETS_FILE = './.gdrive.secrets.json';
const TOKENS_FILE = './.gdrive.session.json';

module.exports = () => {
  const client = oauthClient();

  if(!fs.exists(TOKENS_FILE)) return newSessionFor(client);

  client.setCredentials(fs.readJson(TOKENS_FILE));

  if(client.credentials.expiry_date < Date.now()) return newSessionFor(client);

  return Promise.resolve(client);
};

function newSessionFor(client) {
  const authUrl = client.generateAuthUrl({
    scope: 'https://www.googleapis.com/auth/drive.readonly'
  });

  openBrowserAt(authUrl);
  const accessCode = userPrompt.question(`Enter access code from browser: `);

  return new Promise((resolve, reject) => {
    client.getToken(accessCode, function (err, tokens) {
      if(err) return reject(err);

      fs.writeJson(TOKENS_FILE, tokens);

      client.setCredentials(tokens);

      resolve(client);
    });
  });
}

function oauthClient() {
  let configFile;
  try {
    configFile = fs.readJson(SECRETS_FILE);
  } catch(e) {
    info('Failed to load google drive secrets from file.', e);
    configFile = {};
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || configFile.client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || configFile.client_secret;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      (configFile.redirect_uris && configFile.redirect_uris[0]);

  /* eslint-disable no-bitwise */
  const missingConfig =
      checkRequired(clientId, 'client_id', 'GOOGLE_CLIENT_ID') |
      checkRequired(clientSecret, 'client_secret', 'GOOGLE_CLIENT_SECRET') |
      checkRequired(redirectUri, 'redirect_uris', 'GOOGLE_REDIRECT_URI');

  if(missingConfig) throw new Error('Missing required config for google drive access.  Please check warnings.');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function openBrowserAt(url) {
  info(`Should open browser at: ${url}`);
  child_process.exec(`open "${url}" || firefox "${url}" || chromium-browser "${url}" || chrome "${url}"`);
}

function checkRequired(value, jsonKey, envVar) {
  if(value) return;

  warn(`Missing .${jsonKey} in ${SECRETS_FILE} or env var ${envVar}!`);
  return true;
}
