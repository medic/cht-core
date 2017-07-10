const url = require('url');
    let auth;

const getKansorc = ()=> {
  try {
    return require('../../.kansorc');
  } catch(e) {}
};

const setAuth = (user, pass)=> {
   auth = {
    user: user,
    pass: pass,
  };
};

module.exports = ()=> {
  if (!auth) {
    const kansorc = getKansorc();
    if (kansorc) {
      const dbUrl = kansorc.env && kansorc.env.default && kansorc.env.default.db;
      if (!dbUrl) {
        throw new Error('.kansorc must have db url configured');
      } else {
        let parsed = url.parse(kansorc.env.default.db).auth;
        if (!parsed) {
          throw new Error('auth component not found in DB url');
        }
        parsed = parsed.split(':');
        setAuth(parsed[0], parsed[1]);
      }
    } else {
      // might be running on travis - create a user
      setAuth('admin', 'pass');
    }
  }
  return auth;
};
