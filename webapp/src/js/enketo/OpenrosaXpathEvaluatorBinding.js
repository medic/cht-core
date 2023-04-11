const ExtendedXpathEvaluator = require('extended-xpath');
const openrosaExtensions = require('openrosa-extensions');
const medicExtensions = require('./medic-xpath-extensions');
const translator = require('./translator');

module.exports = function() {
  const ore = openrosaExtensions(translator.t);
  ore.func = Object.assign(ore.func, medicExtensions.func);
  ore.process = Object.assign(ore.process, medicExtensions.process);
  const evaluator = new ExtendedXpathEvaluator(new XPathEvaluator(), ore);
  this.xml.jsEvaluate = evaluator.evaluate;
};
