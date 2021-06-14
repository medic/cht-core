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
  const cookieArray = utils.parseCookieResponse(resp.headers['set-cookie']);

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
