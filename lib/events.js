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
    utils = require('kujua-utils');

var initDropdown = function() {
    $('.dropdown-toggle').dropdown();
};

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
 * by CouchDB.
 */
duality_events.on('init', function () {

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // bind to form download buttons in export screen
    $(document).on('click', '#forms form [type=submit]', function(ev) {
        ev.preventDefault();
        var url = $(this).closest('form').find('option:selected').attr('value');

        url += '&kansoconfig=' + encodeURIComponent(JSON.stringify($.kansoconfig()));
        $(location).attr('href', url)
    });

    // hack to bind to dynamic elements
    $(document).on('mouseenter', initDropdown);

    // add handler to docsPageLoader event for #supportedforms + p elements
    $(document).on('docsPageLoaded', '#supportedforms + p', wrapCodeBlocks);

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
                    '<b class="icon-chevron-down"></b>' +
                '</a>' +
                '<ul class="dropdown-menu">' +
                    '<li><a class="logout" href="#">Logout</a></li>' +
                '</ul>' +
            '</li>'
        );
        $('.logout', el).click(function (ev) {
            ev.preventDefault();
            session.logout(function(err, resp) {
                location.href = dutils.getBaseURL();
            });
            return false;
        });
        if (isAdmin) {
            $('.dropdown-menu', el).append(
                '<li><a href="'+dutils.getBaseURL()+'/test">Run Tests</a></li>');
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
        $('.btn-close', m).click(function () {
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

    // hide the facilities nav item from non-admin users
    if (_.indexOf(userCtx.roles, 'district_admin') === -1 &&
        _.indexOf(userCtx.roles, 'national_admin') === -1 &&
        _.indexOf(userCtx.roles, '_admin') === -1) {

        $('.navbar .nav li.facilities').hide();
    }
    else {
        $('.navbar .nav li.facilities').show();
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
