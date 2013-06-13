(function() {
    var getBrowser = function() {

        function testCSS(prop) {
            return prop in document.documentElement.style;
        }

        var isOpera = !!(window.opera && window.opera.version);  // Opera 8.0+
        var isFirefox = testCSS('MozBoxSizing');                 // FF 0.8+
        var isSafari = Object.prototype.toString.call(
                            window.HTMLElement).indexOf('Constructor') > 0;
        // At least Safari 3+: "[object HTMLElementConstructor]"
        var isChrome = !isSafari && testCSS('WebkitTransform');  // Chrome 1+
        var isIE = /*@cc_on!@*/false || testCSS('msTransform');  // At least IE6

        if (isOpera) return 'opera';
        if (isFirefox) return 'firefox';
        if (isSafari) return 'safari';
        if (isChrome) return 'chrome';
        if (isIE) return 'ie';

    }
    var b = getBrowser();
    if (b !== 'chrome' && b !== 'firefox' && b !== 'safari') {
        alert(
            'Warning Kujua Lite does not support your browser.\n'
            + 'Use Firefox, Chrome or Safari.'
        );
    }
})();
