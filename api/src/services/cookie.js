module.exports = {
  get: (req, name) => {
    const cookies = req.headers && req.headers.cookie;
    if (!cookies) {
      return;
    }
    const prefix = name + '=';
    const cookie = cookies.split(';').find(cookie => cookie.trim().startsWith(prefix));
    return cookie && cookie.trim().substring(prefix.length);
  }
};
