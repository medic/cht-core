var system = require('system');

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3001, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 100); //< repeat check every 250ms
};


if (system.args.length !== 2) {
    console.log('Usage: run-qunit.js URL');
    phantom.exit(1);
}

var page = require('webpage').create();

page.onResourceRequested = function (request) {
    // we do too many of these in our tests
    // console.log('Request ' + JSON.stringify(request, undefined, 4));
};

// Route "console.log()" calls from within the Page context to the main Phantom
// context (i.e. current "this")
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.open(system.args[1], function(status){
    if (status !== "success") {
        console.log("Unable to access network");
        phantom.exit(1);
    } else {
        page.evaluate(function() {
            $("#runall").click();
        });


        waitFor(function(){
            return page.evaluate(function(){
                var el = document.getElementById('nodeunit-testresult');
                if (el && el.innerText.match('completed')) {
                    return true;
                }
                return false;
            });
        }, function(){
            var failed = page.evaluate(function(){
                var el = document.getElementById('nodeunit-testresult');
                console.log(el.innerText);
                try {
                    if ($('#nodeunit-banner').hasClass('fail')) {
                        $('#nodeunit-tests > .fail').each(function(idx, el) {
                            console.log($(el).find('strong').text());
                            $(el).find('li').each(function(i, assertion) {
                                if ($(assertion).is('.fail')) {
                                    console.log('  fail: ' + $(assertion).find('pre').text());
                                } else {
                                    console.log('  pass');
                                }
                            });
                        });
                        return true;
                    };
                    return false;
                } catch (e) {}
                return 10000;
            });
            if (failed) {
                console.log('Tests Failed');
            }
            phantom.exit((failed) ? 1 : 0);
        }, 30000);



    }
});
