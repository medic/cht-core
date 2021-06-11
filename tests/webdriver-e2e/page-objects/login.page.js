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
  await utils.setupUserDoc(username);
  await browser.url('/');
};

const open = () => {
  return browser.url();
};


module.exports = {
  open,
  login,
  cookieLogin
};
