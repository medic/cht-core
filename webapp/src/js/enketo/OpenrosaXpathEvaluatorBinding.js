const ExtendedXpathEvaluator = require('extended-xpath');
const openrosaExtensions = require('openrosa-extensions');
const medicExtensions = require('./medic-xpath-extensions');
const translator = require('./translator');

module.exports = function() {
  // re-implement XPathJS ourselves!
  const evaluator = new XPathEvaluator();
  this.xml.jsCreateExpression = function() {
    return evaluator.createExpression.apply( evaluator, arguments );
  };
  this.xml.jsCreateNSResolver = function() {
    return evaluator.createNSResolver.apply( evaluator, arguments );
  };
  this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
    const extensions = openrosaExtensions(translator.t);
    extensions.func = Object.assign(extensions.func, medicExtensions.func);
    extensions.process = Object.assign(extensions.process, medicExtensions.process);
    const evaluator = new ExtendedXpathEvaluator(contextPath.ownerDocument, extensions);
    return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
  };
  window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
