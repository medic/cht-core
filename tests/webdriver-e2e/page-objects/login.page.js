const utils = require('../../utils');

const login = async (username, password) => {
  await (await this.inputUsername).setValue(username);
  await (await this.inputPassword).setValue(password);
  await (await this.btnSubmit).click();
};

const cookieLogin = async (username, password) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password },
    port: 5988,
    method: 'POST',
    simple: false,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const resp = await utils.request(opts);
  const cookieArray = [];
  let cookie = resp.headers['set-cookie'].find(x => x.includes('Auth')).split(';');
  cookieArray.push({
    name: cookie[0].split('=')[0],
    value: cookie[0].split('=')[1]
  });

  cookie = resp.headers['set-cookie'].find(x => x.includes('userCtx')).split(';');
  cookieArray.push({
    name: cookie[0].split('=')[0],
    value: cookie[0].split('=')[1]
  });

  await browser.setCookies(cookieArray);
  await browser.url('/');
};

// curl 'http://localhost:5988/medic/login' \
//   -H 'Connection: keep-alive' \
//   -H 'sec-ch-ua: " Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36' \
//   -H 'Content-Type: application/json' \
//   -H 'Accept: */*' \
//   -H 'Origin: http://localhost:5988' \
//   -H 'Sec-Fetch-Site: same-origin' \
//   -H 'Sec-Fetch-Mode: cors' \
//   -H 'Sec-Fetch-Dest: empty' \
//   -H 'Referer: http://localhost:5988/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2F' \
//   -H 'Accept-Language: en-US,en;q=0.9' \
//   -H 'Cookie: locale=en; grafana_session=2811c43ac1b2934970fe37d60af66854' \
//   --data-raw '{"user":"medic","password":"Secret_1","locale":"en"}' \
//   --compressed


const open = () => {
  return browser.url();
};


module.exports = {
  open,
  login,
  cookieLogin
};
