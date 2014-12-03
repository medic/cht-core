/**
 * Bindings to Kanso events
 */

var duality_events = require('duality/events'),
    dutils = require('duality/utils'),
    session = require('session'),
    cookies = require('cookies'),
    users = require('users'),
    settings = require('settings/root'),
    _ = require('underscore'),
    feedback = require('feedback'),
    utils = require('kujua-utils');


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
    
    $('body').on('click', '#logout', function(e) {
      e.preventDefault();
      session.logout(function() {
        window.location.reload();
      });
    });

    $('body').on('click', '#feedback .submit', function(e) {
        e.preventDefault();
        $('#feedback .submit').addClass('disabled');
        var message = $('#feedback [name=feedback]').val();
        feedback.submit(message, function(err) {
            $('#feedback .submit').removeClass('disabled');
            if (err) {
                console.log('Error saving feedback', err);
                $('#feedback .modal-footer .note').text('Error sending feedback');
            } else {
                $('#feedback').modal('hide');
            }
        });
    });

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $('#year').text(new Date().getFullYear());

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
                locale: user.language
            });
        });
    } else {
        // clear cookies
        setCookies({
            facility_id: '',
            locale: ''
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
