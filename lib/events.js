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
    settings = require('settings/root'),
    _ = require('underscore')._,
    shows = require('./shows'),
    data_records = require('./data_records'),
    utils = require('kujua-utils');

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

var initDropdown = function() {
    $('.dropdown-toggle').dropdown();
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

    // TODO no userCtx is available here

    // add helpers
    templates.addHelpers({
        translate: function(chunk, context, bodies, params) {
            var value = this.tap(params.value, chunk, context);

            return chunk.write($.kansoconfig(value));
        }
    });

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // hack to bind to dynamic elements
    $(document).on('mouseenter', initDropdown);

    // add handler to docsPageLoader event for #supportedforms + p elements
    $(document).on('docsPageLoaded', wrapCodeBlocks);

    if (['chrome','safari','firefox'].indexOf(getBrowser()) === -1) {
        alert(
            'Warning Kujua Lite does not support your browser.\n'
            + 'Use Firefox, Chrome or Safari.'
        );
    }
    $(document).on('click', '.spreadsheet-help .icon-question-sign', function (ev) {
        var el = $(ev.target);
        el.siblings('ul').toggle();
    });

    // our version of bootstrap does not clear error on textareas
    $(document).on('focus', 'textarea', function(ev) {
        $(ev.target).closest('.control-group').removeClass('error');
    });

    $(document).on('click', '.add-message button', data_records.handleSendMessage);

    data_records.onDualityInit();

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

    data_records.username = userCtx.name;

    // update user district cookie
    if (userCtx.name) {
        users.get(userCtx.name, function (err, user) {
            if (err) {
                // TODO handle better
                utils.logger.error(
                    'Error with user doc: ' + err.message || err.toString());
            }
            if (user) {
                cookies.setBrowserCookie(dutils.currentRequest(), {
                    name: 'kujua_facility',
                    value: user.kujua_facility || ''
                });
                cookies.setBrowserCookie(dutils.currentRequest(), {
                    name: 'kujua_locale',
                    value: user.locale || 'en'
                });
            }
        });
    }
    else {
        // clear user district value
        cookies.setBrowserCookie(dutils.currentRequest(), {
            name: 'kujua_facility',
            value: ''
        });
    }

    var el;
    if (userCtx.name) {
        el = $(
            '<li id="session_menu" class="dropdown">' +
                '<a class="dropdown-toggle" data-toggle="dropdown">' +
                    '<i class="icon-user"></i> ' + userCtx.name + ' ' +
                    '<b class="caret"></b>' +
                '</a>' +
                '<ul class="dropdown-menu">' +
                    '<li><a href="'+dutils.getBaseURL()+'/reminders"><i class="icon-list-alt"></i> Reminder Log</a></li>' +
                '</ul>' +
            '</li>'
        );
        /* moved to gardener/topbar
        $('.logout', el).click(function (ev) {
            ev.preventDefault();
            session.logout(function(err, resp) {
                location.href = dutils.getBaseURL();
            });
            return false;
        });
        */
        if (isAdmin) {
            $('.dropdown-menu', el).append(
                '<li><a href="'+dutils.getBaseURL()+'/test"><i class="icon-cogs"></i> Run Tests</a></li>');
        }
    }
    else {
        el = $(
            '<li id="session_menu">' +
                '<a class="login" href="#">Login</a>' +
            '</li>'
        );

        if (m) {
            // clear previous modal dialog
            m.modal('hide');
            m.data('modal', null);
            m.remove();
        }
        m = $(templates.render('login_modal.html', {userCtx: userCtx}, {}));

        var submitHandler = function(ev) {
            ev.preventDefault();

            var username = $('#id_username', m).val();
            var password = $('#id_password', m).val();

            $('.alert', m).remove();
            $('.help-inline', m).remove();
            $('.control-group', m).removeClass('error');
            $('.controls', m).show(); // sometimes these get hidden

            var username_cg = $('#id_username').parents('.control-group');
            var password_cg = $('#id_password').parents('.control-group');
            var errors = false;

            if (!username) {
                username_cg.addClass('error');
                $('#id_username').after(
                    '<span class="help-inline">Required</span>'
                );
                errors = true;
            }
            if (!password) {
                password_cg.addClass('error');
                $('#id_password').after(
                    '<span class="help-inline">Required</span>'
                );
                errors = true;
            }
            if (errors) {
                return false;
            }

            session.login(username, password, function (err) {
                if (err) {
                    var msg = err.toString();
                    $('form', m).before(
                        '<div class="alert alert-error">' + msg + '</div>'
                    );
                }
                else {
                    m.modal('hide');
                    location.href = dutils.getBaseURL();
                }
            });
            return false;
        };

        // this is broken for some reason, I suspect the bootstrap-modal
        // plugin is doing preventDefault on events inside the modal
        //$('form', m).submit(submitHandler);

        // fake form submit event
        $('input', m).keyup(function (ev) {
            if (ev.keyCode === 13) {
                return submitHandler.apply(this, arguments);
            }
        });

        $('.btn-primary', m).click(submitHandler);
        $('.btn-close', m).click(function (ev) {
            ev.preventDefault();
            m.modal('hide');
        });

        $('.login', el).click(function (ev) {
            ev.preventDefault();
            m.modal('show');
            $('#id_username').focus();
            return false;
        });
    }
    $('#session_menu').replaceWith(el);

    // hide the nav items from non-admin users
    if (_.indexOf(userCtx.roles, 'district_admin') === -1 &&
        _.indexOf(userCtx.roles, 'national_admin') === -1 &&
        _.indexOf(userCtx.roles, '_admin') === -1) {

        $('.navbar .nav li').hide();
        $('.navbar .nav .docs').show();
        $('#session-menu').show();
    }
    else {
        $('.navbar .nav li').show();
    }
    $('#topnav .pull-right').append(el);
});


/**
 * The updateFailure event fires when an update function returns a document as
 * the first part of an array, but the client-side request to update the
 * document fails.
 */

duality_events.on('updateFailure', function (err, info, req, res, doc) {
    alert(err.message || err.toString());
});
