module.exports = doc => {
  if (!doc.read) {
    return false;
  }
  delete doc.read;
  return true;
};
