const fs = require('fs');
const _ = require('lodash');

const templates = {};

module.exports.getTemplate = async (path) => {
  if (!path) {
    return;
  }

  if (templates[path]) {
    return templates[path];
  }

  const templateContent = await fs.promises.readFile(path, { encoding: 'utf-8' });
  templates[path] = _.template(templateContent);
  return templates[path];
};

module.exports.clear = () => {
  Object.keys(templates).forEach(key => {
    delete templates[key];
  });
};
