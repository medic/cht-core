module.exports = (req, res, next) => {
  req.wantsJson = true;
  next();
};
