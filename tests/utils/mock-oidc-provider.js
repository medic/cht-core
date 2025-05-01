const express = require('express');
const bodyParser = require('body-parser');

const jwt = require('jsonwebtoken');
const { hostURL } = require('@utils');

const redirectUrl = `${hostURL}/login/oidc/get_token`;


const dns = require('node:dns').promises;
const os = require('os');

const getIpAddress = () => {
  const networkInterfaces = os.networkInterfaces();
  const localHostIps = ['127.0.0.1', '127.0.1.1'];

  for (const interface in networkInterfaces) {
    if (!Object.hasOwn(networkInterfaces, interface)) {
      continue;
    }
    const each = networkInterfaces[interface];

    for (let idx = 0; idx < each.length; idx ++) {
      const address = each[idx];
      if (address.family === 'IPv4' && localHostIps.indexOf(address.address) === -1) {
        return address.address;
      }
    }
  }
};

const getOidcBaseUrl = () => {
  return dns.lookup(os.hostname(), { family: 4 })
    .then(() => {
      // const address = `https://${getIpAddress().replace(/\./g, '-')}.local-ip.medicmobile.org:3000`;
      const address = hostURL(3000);
      // const address = `http://host.docker.internal:3000`;
      // const address = `http://localhost:3000`;
      // const address = getIpAddress();
      // const address = 'http://172.17.0.1:3000';
      console.log('addr_name: ', address);
      console.log('host id address', getIpAddress());
      return address;
    });
};

const getJWT_KEYS = (secret = 'secret') => generateKeyPairSync(
  'rsa',
  {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: secret
    }
  }
);

const generateIdToken =  (issuer, secret = 'secret') => {
  const payload = {
    issuer,
    algorithm: 'RS256',
    expiresIn: 3600,
  };
  const { privateKey }  = getJWT_KEYS();
  return jwt.sign(
    {
      preferred_username: 'testuser',
      sub: '12345',
      name: 'John Doe',
      aud: 'cht'
    },
    { key: privateKey.replace(/\\n/gm, '\n'), passphrase: secret },
    payload
  );
};

const mockApp = express();

mockApp.use(bodyParser.json());

mockApp.get('/.well-known/openid-configuration', async (req, res) => {
  const oidcBaseUrl = await getOidcBaseUrl();
  res.json({
    issuer: `${oidcBaseUrl}`,
    authorization_endpoint: `${oidcBaseUrl}/connect/authorize`,
    token_endpoint: `${oidcBaseUrl}/connect/token`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
    token_endpoint_auth_signing_alg_values_supported: ['RS256', 'ES256'],
    userinfo_endpoint: `${oidcBaseUrl}/connect/userinfo`,
    check_session_iframe: `${oidcBaseUrl}connect/check_session`,
    end_session_endpoint: `${oidcBaseUrl}/connect/end_session`,
    jwks_uri: `${oidcBaseUrl}/jwks.json`,
    registration_endpoint: `${oidcBaseUrl}/connect/register`,
    scopes_supported: ['openid', 'profile', 'email'],
    response_types_supported: ['code', 'code id_token', 'id_token', 'id_token token'],
    acr_values_supported: ['urn:mace:incommon:iap:silver', 'urn:mace:incommon:iap:bronze'],
    subject_types_supported: ['public', 'pairwise'],
    userinfo_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
    userinfo_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
    userinfo_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
    id_token_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
    id_token_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
    id_token_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
    request_object_signing_alg_values_supported: ['none', 'RS256', 'ES256'],
    display_values_supported: ['page', 'popup'],
    claim_types_supported: ['normal', 'distributed'],
    claims_supported: [
      'sub', 'iss', 'auth_time', 'acr',
      'name', 'given_name', 'family_name', 'nickname',
      'profile', 'picture', 'website',
      'email', 'email_verified', 'locale', 'zoneinfo',
      'http://example.info/claims/groups'
    ],
    claims_parameter_supported: true,
    service_documentation: 'http://server.example.com/connect/service_documentation.html',
    ui_locales_supported: ['en-US']
  });
});

mockApp.get('/connect/authorize', (req, res) => {
  res.redirect(redirectUrl);
});

mockApp.post('/connect/token', async (req, res) => {
  const oidcBaseUrl = await getOidcBaseUrl();
  res.set('Content-Type', 'application/json');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    access_token: 'SlAV32hkKG',
    token_type: 'Bearer',
    refresh_token: '8xLOxBtZp8',
    expires_in: 3600,
    id_token: generateIdToken(oidcBaseUrl)
  });
});

mockApp.get('/connect/token', (req, res) => {
  res.json({access_token: 'sdfdfdfdf'});
});

const startOidcServer = (callback) => {
  const server = mockApp.listen(3000, () => {
    console.log('server started...');
    callback();
  });
  return server;
};

const stopOidcServer = (server) => {
  server && server.close();
};

module.exports = {
  getOidcBaseUrl,
  startOidcServer,
  stopOidcServer
};
