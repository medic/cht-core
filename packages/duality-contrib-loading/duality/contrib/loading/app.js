/**
 * Values exported from this module will automatically be used to generate
 * the design doc pushed to CouchDB.
 */

var events = require('duality/events'),
    isAfterResponse = false,
    settings = require('settings/root'),
    timeout = 10;

if (settings['duality-contrib-loading']) {
    timeout = settings['duality-contrib-loading'].timeout || timeout;
};

events.on('init', function () {

    console.log('duality-contrib-loading app init');
    var div = $('<div id="duality-contrib-loading">Loading...</div>');
    div.hide();
    div.appendTo('body');

    events.on('afterResponse', function () {
        isAfterResponse = true;
        div.fadeOut();
    });

    events.on('beforeResource', function () {
        // only show loading message after the timeout
        isAfterResponse = false;
        setTimeout(function () {
            if (!isAfterResponse) {
                div.show();
            }
        }, timeout);
    });

});
