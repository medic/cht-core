const k3dBaseConfig = require('./.mocharc-k3d.js');

module.exports = {
  ...k3dBaseConfig,
  spec: require('./specs').sentinel,
};
