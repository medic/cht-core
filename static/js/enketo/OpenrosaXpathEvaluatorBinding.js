var ExtendedXpathEvaluator = require('extended-xpath');
var openrosa_xpath_extensions = require( 'openrosa-xpath-extensions');

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
        var val, evaluator;
        evaluator = new ExtendedXpathEvaluator(
                function wrappedXpathEvaluator(v) {
                    var doc = contextPath.ownerDocument;
                    return doc.evaluate(v, contextPath, namespaceResolver,
                            // We pretty much always want to get a String in
                            // the java rosa functions, and we don't want to
                            // pass the top-level expectation all the way
                            // down, so it's fairly safe to hard-code this,
                            // especially considering we handle NUMBER_TYPEs
                            // manually.
                            // TODO what is `result` for?  Should it be
                            // replaced in this call?
                            XPathResult.STRING_TYPE, result);
                            //resultType, result);
                },
                openrosa_xpath_extensions);
        val = evaluator.evaluate(e);
        return val;
    };
    window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
