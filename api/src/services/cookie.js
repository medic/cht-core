module.exports = {
  get: (req, name) => {
    const cookies = req.headers && req.headers.cookie;
    if (!cookies) {
      return;
    }
    const prefix = name + '=';
    const cookie = cookies.split(';').find(cookie => cookie.startsWith(prefix));
    return cookie && cookie.substring(prefix.length);
  }
};
