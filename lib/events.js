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
    $('.dropdown-toggle').on('click', function(ev) {
      ev.preventDefault();
      $(this).siblings('.dropdown-menu').toggle(300);
    });

    var showEdit = function(ev) {
        logger.debug('fire showEdit');
        $(this).find('.row-controls').show();
        //$(this).toggleClass('active');
    };

    var hideEdit = function(ev) {
        logger.debug('fire hideEdit');
        var div = $(this).find('.row-controls');
        div.hide();
        //$(this).toggleClass('active');
    };

    // bind events when in edit mode button
    $('.edit-mode').toggle(function(ev) {
        $(document).on('mouseenter', '#data-records tr.main', showEdit);
        $(document).on('mouseleave', '#data-records tr.main', hideEdit);
        $(this).addClass('active');
    }, function(ev) {
        $(document).off('mouseenter', '#data-records tr.main');
        $(document).off('mouseleave', '#data-records tr.main');
        $(this).removeClass('active');
    });

    $(document).on('click', '#data-records tr.main', function(ev) {
        ev.preventDefault();
        var table = $(this).parents('table').next();
        table.show();
    });

    $(document).on('click', '[data-dismiss=extended]', function(ev) {
        $(this).closest('.extended').hide();
    });

    // bind to edit row button
    $(document).on('click', '.row-controls .edit', function(ev) {
        ev.preventDefault();
        $(this).siblings('form').toggle();
    });

    // bind to delete buttons
    $(document).on('click', 'form[data-ajax=removeDoc]', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var form = $(this),
            _id = form.find('[name=_id]').val(),
            _rev = form.find('[name=_rev]').val();
        if(confirm('Remove permanently?')) {
            db.removeDoc({_id: _id, _rev: _rev}, function(err, resp) {
                if (err) {
                    return alert(err);
                }
                form.closest('table').next().fadeOut();
                form.closest('table').fadeOut();
            });
        }
    });

    // bind to form download buttons in export screen
    $(document).on('click', '#forms form [type=submit]', function(ev) {
        ev.preventDefault();
        var url = $(this).closest('form').find('option:selected').attr('value');
        $(location).attr('href', url);
    });
    
    // bind to update phone text input
    $(document).on('click', '[data-ajax=updatePhone]', function(ev) {
    });

    // bind to: field error marks so they can be updated
    $(document).on('click', '.tasks-referral .to .error', function(ev) {
        $(this).hide();
        $(this).siblings('[data-ajax=updatePhone]').show();
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
        $('.dropdown-toggle', el).click(function (ev) {
            ev.preventDefault();
            $(this).siblings('.dropdown-menu').toggle(300);
        });
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

        $('.login', el).click(function (ev) {
            ev.preventDefault();
            m.modal({show: true, backdrop: 'static'});
            $('#id_username').focus();
            return false;
        });
    }
    $('#session_menu').replaceWith(el);
});


/**
 * The updateFailure event fires when an update function returns a document as
 * the first part of an array, but the client-side request to update the
 * document fails.
 */

duality_events.on('updateFailure', function (err, info, req, res, doc) {
    alert(err.message || err.toString());
});
