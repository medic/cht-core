const users = require('./users');

const ssoLogin = async username => {
  const user = await users.getUser(username);

  if (!user || !user.id) {
    new Error(`Could not sso login in user: {username}`);
  }

  const password = await users.resetPassword(username);
  return { user: user.username, password };
};

module.exports = {
  ssoLogin
};
