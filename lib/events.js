/**
 * Bindings to Kanso events
 */

var duality_events = require('duality/events'),
    dutils = require('duality/utils'),
    querystring = require('querystring'),
    templates = require('duality/templates'),
    session = require('session'),
    cookies = require('cookies'),
    users = require('users'),
    moment = require('moment'),
    settings = require('settings/root'),
    _ = require('underscore'),
    shows = require('./shows'),
    appinfo = require('views/lib/appinfo'),
    objectpath = require('views/lib/objectpath'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    url = require('url'),
    app_settings = {
        translate: function(value) {
            return value;
        }
    };


var initBootstrap = function() {
    var $dropdowns = $('.dropdown-toggle');
    if (typeof $dropdowns.dropdown === 'function') {
        $dropdowns.dropdown();
    }
}

// wrap code spans with overflow auto. typically called after docsLoaded event
// is triggered.
var wrapCodeBlocks = function() {
    $('#docs-body code').each(function(idx, el) {
        var limit = 860,
            _el  = $(this),
            width = _el.width();
        if (_el.hasClass('shorten')) {
            _el.wrap($('<div/>').addClass('scroll-short'));
        } else if (width > limit) {
            _el.wrap($('<div/>').addClass('scroll'));
        }
    });
};

/**
 * The init method fires when the app is initially loaded from a page rendered
 * by CouchDB.  These should only be executed once when the app loads.
 */
duality_events.on('init', function () {

    try {
        app_settings = appinfo.getAppInfo.call(this);
    } catch(e) {
        shows.render500('Failed to retrieve settings.');
        console.error('Failed to retrieve settings.');
        throw e;
    }
    
    require('./dust-helpers');
    
    // render top nav labels
    $('#topnav .nav .settings a').append(' ' + $.kansotranslate('Settings'));
    $('#topnav .nav .schedules a').append(' ' + $.kansotranslate('Schedules'));
    $('#topnav .nav .sms-forms-data a').append(' ' + $.kansotranslate('Export'));
    $('#topnav .nav .users a').append(' ' + $.kansotranslate('Users'));
    $('#topnav .nav .facilities a').append(' ' + $.kansotranslate('Facilities'));
    $('#topnav .nav .logout a').append(' ' + $.kansotranslate('Log Out'));

    $('#logout').on('click', function(e) {
      e.preventDefault();
      session.logout(function() {
        window.location.reload();
      });
    });

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // patch dropdown to fire an event
    $.fn.dropdown.Constructor.prototype.toggle = _.wrap($.fn.dropdown.Constructor.prototype.toggle, function(fn, e) {
        fn.call(this, e);
        $(this).trigger('toggle');
    });

    // hack to bind to dynamic elements. Executes far too often. We can do better.
    $(document).on('mouseenter', initBootstrap);

    // add handler to docsPageLoader event for #supportedforms + p elements
    $(document).on('docsPageLoaded', wrapCodeBlocks);

    // our version of bootstrap does not clear error on textareas
    $(document).on('focus', 'textarea', function(ev) {
        $(ev.target).closest('.control-group').removeClass('error');
    });

});

/**
 * The sessionChange event fires when the app is first loaded and the user's
 * session information becomes available. It is also fired whenever a change
 * to the user's session is detected, for example after logging in or out.
 */

// stores a reference to the modal dialog
var m;

session.on('change', function (userCtx) {
    var isAdmin = utils.isUserAdmin(userCtx);

    var setCookies = function(values) {
        _.each(_.pairs(values), function(pair) {
            cookies.setBrowserCookie(dutils.currentRequest(), {
                name: pair[0],
                value: pair[1] || ''
            });
        });
    };

    // update user district cookie
    if (userCtx.name) {
        users.get(userCtx.name, function (err, user) {
            if (err) {
                // TODO handle better
                utils.logger.error('Error with user doc: ' + err.message || err.toString());
                return;
            }
            if (!user) {
                utils.logger.error('User not found');
                return;
            }
            setCookies({
                facility_id: user.facility_id,
                kujua_locale: user.locale
            });
        });
    } else {
        // clear cookies
        setCookies({
            facility_id: '',
            kujua_locale: ''
        });
    }

});


/**
 * The updateFailure event fires when an update function returns a document as
 * the first part of an array, but the client-side request to update the
 * document fails.
 */

duality_events.on('updateFailure', function (err, info, req, res, doc) {
    alert(err.message || err.toString());
});
