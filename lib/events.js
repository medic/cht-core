/**
 * Bindings to Kanso events
 */

var duality_events = require('duality/events'),
    dutils = require('duality/utils'),
    templates = require('duality/templates'),
    session = require('session'),
    cookies = require('cookies'),
    users = require('users'),
    settings = require('settings/root'),
    _ = require('underscore')._,
    shows = require('./shows'),
    utils = require('kujua-utils'),
    logger = utils.logger;



var handleDropdown = function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  
    var $menu = $(this).siblings('.dropdown-menu');
  
    if($menu.is(':visible')) {
        $menu.hide(300);
        $(document).off('click');
    } else {
        $menu.show(300);
        $(document).one('click', function() {
            $menu.hide(300);
        });
    }
};

/**
 * The init method fires when the app is initially loaded from a page rendered
 * by CouchDB.
 */
duality_events.on('init', function () {

    var db = require('db').current();

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // Admin menu control
    $('.dropdown-toggle').on('click', handleDropdown);

    // bind to form download buttons in export screen
    $(document).on('click', '#forms form [type=submit]', function(ev) {
        ev.preventDefault();
        var url = $(this).closest('form').find('option:selected').attr('value');
        $(location).attr('href', url);
    });

});

/*duality_events.on('afterResponse', function() {
    if(!dutils.currentRequest().userCtx.name) {
        $('.login').click();
    }
});*/

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
            cookies.setBrowserCookie(dutils.currentRequest(), {
                name: 'kujua_facility',
                value: user.kujua_facility || ''
            });
            cookies.setBrowserCookie(dutils.currentRequest(), {
                name: 'kujua_locale',
                value: user.locale || 'en'
            });
        });
    }
    else {
        // clear user district value
        cookies.setBrowserCookie(dutils.currentRequest(), {
            name: 'kujua_facility',
            value: ''
        });
    }

    if (!$('#session_menu').length) {
        $('#topnav .pull-right').append(
            '<li id="session_menu" class="dropdown"><li>'
        );
    }
    var el;
    if (userCtx.name) {
        el = $(
            '<li id="session_menu" class="dropdown">' +
                '<a class="dropdown-toggle">' +
                    '<i class="icon-user"></i> ' + userCtx.name + ' ' +
                    '<b class="icon-chevron-down"></b>' +
                '</a>' +
                '<ul class="dropdown-menu">' +
                    '<li><a class="logout" href="#">Logout</a></li>' +
                '</ul>' +
            '</li>'
        );
        $('.dropdown-toggle', el).click(handleDropdown);
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
        _.indexOf(userCtx.roles, 'national_admin') === -1) {

        console.log('hiding facilities');
        $('.navbar .nav li.facilities').hide();
    }
    else {
        console.log('showing facilities');
        $('.navbar .nav li.facilities').show();
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
