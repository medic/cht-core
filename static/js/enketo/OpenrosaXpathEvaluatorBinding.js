var ExtendedXpathEvaluator = require('extended-xpath');
var openrosa_xpath_extensions = require('openrosa-xpath-extensions');

module.exports = function() {
    // re-implement XPathJS ourselves!
    var evaluator = new XPathEvaluator();
    this.xml.jsCreateExpression = function() {
        return evaluator.createExpression.apply( evaluator, arguments );
    };
    this.xml.jsCreateNSResolver = function() {
        return evaluator.createNSResolver.apply( evaluator, arguments );
    };
    this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
        var evaluator = new ExtendedXpathEvaluator(
                function wrappedXpathEvaluator(v) {
                    var doc = contextPath.ownerDocument;
                    return doc.evaluate(v, contextPath, namespaceResolver, resultType, result);
                },
                openrosa_xpath_extensions);
        return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
    };
    window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
