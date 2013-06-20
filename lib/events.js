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
    data_records = require('./data_records'),
    utils = require('kujua-utils');


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
        },
        formatDate: function(chunk, context, bodies, params) {
            var timestamp = Number(this.tap(params.timestamp, chunk, context)),
                format = this.tap(params.format, chunk, context);

            // todo use data_format setting if format is not passed in
            format = format || 'DD, MMM YYYY, HH:mm:ss ZZ';

            return chunk.write(moment(timestamp).format(format));
        },
        taskClass: function(chunk, context, bodies, params) {
            var tasks = this.tapArray(params.tasks, chunk, context),
                states = _.pluck(tasks, 'state');

            if (_.contains(states, 'pending') || _.contains(states, 'scheduled')) {
                return chunk.write('info');
            } else {
                return chunk.write('success');
            }
        },
        taskMessage: function(chunk, context, bodies, params) {
            var tasks = this.tapArray(params.tasks, chunk, context),
                states,
                keys,
                message;

            states = _.countBy(tasks, function(task) {
                return task.state;
            });
            keys = _.keys(states);

            message = _.map(keys, function(key) {
                return states[key] + ' ' + key;
            });

            return chunk.write(message.join(', ') + ' messages');
        },
        taskIcon: function(chunk, context, bodies, params) {
            var tasks = this.tapArray(params.tasks, chunk, context),
                states = _.pluck(tasks, 'state');

            if (_.contains(states, 'pending') || _.contains(states, 'scheduled')) {
                return chunk.write('<i class="icon-time"></i>');
            } else {
                return chunk.write('');
            }
        },
        formName: function(chunk, context, bodies, params) {
            var form = this.tap(params.form, chunk, context),
                def = require('views/lib/jsonforms')[form],
                label,
                title;

            label = def && def.meta && def.meta.label;

            if (label) {
                title = utils.localizedString(label);
            } else {
                title = '';
            }

            return chunk.write(title);
        },
        contact: function(chunk, context, bodies, params) {
            var entities = this.tapObject(params.entities, chunk, context),
                from = this.tap(params.from, chunk, context),
                to = this.tap(params.to, chunk, context),
                contact,
                clinic;

            if (entities) {
                clinic = entities && entities.clinic;

                contact = clinic && clinic.contact && clinic.contact.name;

                if (!contact) {
                    contact = clinic && clinic.name;
                }
            }

            contact = entities && entities.clinic && entities.clinic.name;
            contact = entities && entities.clinic && entities.clinic.name;

            if (!contact) {
                contact = from;
            }
            if (!contact) {
                contact = to;
            }
            if (!contact) {
                contact = '<i class="icon-question-sign" title="Unknown"></i>';
            }

            return chunk.write(contact);
        },
        countByState: function(chunk, context, bodies, params) {
            var array = this.tapArray(params.array, chunk, context),
                state = this.tap(params.state, chunk, context),
                matches;

            matches = _.filter(array, function(item) {
                return item.state === state;
            });

            return chunk.write(matches.length);
        },
        isAdmin: function(chunk, context, bodies, params) {
            var body = bodies.block,
                skip = bodies['else'];

            if (data_records.isAdmin) {
                return chunk.render(bodies.block, context);
            } else if (skip) {
                return chunk.render(skip, context);
            } else {
                return chunk;
            }
        },
        hasPermission: function(chunk, context, bodies, params) {
            var body = bodies.block,
                skip = bodies['else'],
                permission = this.tap(params.permission, chunk, context);

            if (utils.hasPerm(data_records.userCtx, permission)) {
                return chunk.render(bodies.block, context);
            } else if (skip) {
                return chunk.render(skip, context);
            } else {
                return chunk;
            }
        },
        idx: function(chunk, context, bodies) {
            if (bodies.block) {
                return bodies.block(chunk, context.push(context.stack.index));
            }
            else {
                return chunk;
            }
        }
    });

    // patch dropdown to fire an event
    $.fn.dropdown.Constructor.prototype.toggle = _.wrap($.fn.dropdown.Constructor.prototype.toggle, function(fn, e) {
        fn.call(this, e);
        $(this).trigger('toggle');
    });

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // hack to bind to dynamic elements
    $(document).on('mouseenter', initDropdown);

    // add handler to docsPageLoader event for #supportedforms + p elements
    $(document).on('docsPageLoaded', wrapCodeBlocks);

    $(document).on('click', '.spreadsheet-help .icon-question-sign', function (ev) {
        var el = $(ev.target);
        el.siblings('ul').toggle();
    });

    // our version of bootstrap does not clear error on textareas
    $(document).on('focus', 'textarea', function(ev) {
        $(ev.target).closest('.control-group').removeClass('error');
    });

    $(document).on('click', '.controls .edit-mode .btn', data_records.handleUpdateDropdown);
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

    _.extend(data_records, {
        isAdmin: isAdmin,
        userCtx: userCtx,
        username: userCtx.name
    });

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
    if (userCtx.name && isAdmin) {
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
        $('.dropdown-menu', el).append('<li><a href="'+dutils.getBaseURL()+'/test"><i class="icon-cogs"></i> Run Tests</a></li>');
    }
    $('#session_menu').replaceWith(el);

    // hide the nav items from non-admin users
    if (_.difference(['district_admin', 'national_admin', '_admin'], userCtx.roles).length === 3) {
        $('.navbar .nav li').hide();
        $('.navbar .nav .docs').show();
    } else {
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
