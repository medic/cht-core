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
    appinfo = require('views/lib/appinfo'),
    objectpath = require('views/lib/objectpath'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    url = require('url'),
    app_settings = {};


var initBootstrap = function() {
    var $dropdowns = $('.dropdown-toggle');
    if (typeof $dropdowns.dropdown === 'function') {
        $dropdowns.dropdown();
    }
    var $popovers = $('[rel=popover]');
    if (typeof $popovers.popover === 'function') {
        $popovers.popover().click(function(ev) {
            ev.preventDefault();
        });
    }
    $('body').click(function(ev) {
        var $btn = $(ev.target);
        if (!$btn.data('popover')) {
            $popovers.popover('hide');
        } else {
            $popovers.not($btn).popover('hide');
        }
    });
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

exports.addHelpers = function() {
    // add helpers
    templates.addHelpers({
        translate: function(chunk, context, bodies, params) {
            var value = this.tap(params.value, chunk, context);

            return chunk.write($.kansotranslate(value));
        },
        formatDate: function(chunk, context, bodies, params) {
            var timestamp = Number(this.tap(params.timestamp, chunk, context)),
                format = this.tap(params.format, chunk, context);

            if (_.isNaN(timestamp)) {
                timestamp = this.tap(params.timestamp, chunk, context);
            }

            // todo use data_format setting if format is not passed in
            format = format || 'DD, MMM YYYY, HH:mm:ss ZZ';

            return chunk.write(moment(timestamp).format(format));
        },
        formName: function(chunk, context, bodies, params) {
            var form = this.tap(params.form, chunk, context);

            return chunk.write(sms_utils.getFormTitle(form));
        },
        contact: function(chunk, context, bodies, params) {
            var entities = this.tapObject(params.entities, chunk, context),
                to = this.tap(params.to, chunk, context),
                verbose = this.tap(params.verbose, chunk, context),
                from = this.tap(params.from, chunk, context),
                contact,
                clinic;

            if (!contact && entities) {
                contact = objectpath.get(
                        entities,
                        app_settings.contact_display_short
                );
                if (!contact) {
                    contact = entities.clinic && entities.clinic.name;
                }
                if (!contact && entities.contact && entities.contact.name) {
                    contact = entities.contact.name;
                }
            }

            if (!contact) {
                contact = from;
            }
            if (!contact) {
                contact = to;
            }
            if (!contact) {
                contact = '<i class="icon-question-sign" title="Unknown"></i>';
            }

            if (verbose && entities) {
                var names = [],
                    sep = '&raquo;',
                    str = '';
                /*
                 * Supports the following structures:
                 *
                 *  <entities>
                 *  {clinic: <entities>}
                 *  {health_center: <entities>}
                 *
                 */
                if (entities.clinic) {
                    entities = entities.clinic;
                } else if (entities.health_center) {
                    entities = entities.health_center;
                }
                str = objectpath.get(entities, 'parent.parent.name');
                if (str) {
                    names = names.concat(str, sep);
                }
                str = objectpath.get(entities, 'parent.name');
                if (str) {
                    names = names.concat(str, sep);
                }
                if (entities.name) {
                    names = names.concat(entities.name, sep);
                }
                str = objectpath.get(entities, 'contact.rc_code');
                names = str ? names.concat('['+str+']') : names;
                str = objectpath.get(entities, 'contact.name');
                names = str ? names.concat(str) : names;
                if (to) {
                    names.push(to);
                } else {
                    str = objectpath.get(entities, 'contact.phone');
                    names = str ? names.concat(str) : names;
                }
                contact = names.length ? names.join(' ') : contact;
            }

            return chunk.write(contact);
        },
        tasksByState: function(chunk, context, bodies, params) {
            var array = this.tapArray(params.array, chunk, context),
                state = this.tap(params.state, chunk, context),
                matches;

            matches = _.filter(array, function(item) {
                return item.state === state;
            });

            return bodies.block(chunk, context.push(matches));
        },
        ifHasState: function(chunk, context, bodies, params) {
            var array = this.tapArray(params.array, chunk, context),
                state = this.tap(params.state, chunk, context),
                body = bodies.block,
                skip = bodies['else'],
                cond;

            cond = _.find(array, function(item) {
                return item && item.state === state;
            });


            if (cond) {
                return chunk.render( bodies.block, context );
            } else if (skip) {
                return chunk.render( bodies['else'], context );
            } else {
                return chunk;
            }
        },
        countByState: function(chunk, context, bodies, params) {
            var array1 = this.tapArray(params.array1, chunk, context),
                state = this.tap(params.state, chunk, context),
                matches,
                array = [];

            if (params.array2) {
                array1 = array1.concat(
                    this.tapArray(params.array2, chunk, context)
                );
            }

            matches = _.filter(array1, function(item) {
                return item && item.state === state;
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
        },
        if: function(chunk, context, bodies, params) {
            var body = bodies.block,
                skip = bodies['else'];

            if( params && params.cond){
                var cond = params.cond;

                cond = this.tap(cond, chunk, context);
                // eval expressions with given dust references
                if(eval(cond)){
                    if(body) {
                        return chunk.render( bodies.block, context );
                    }
                    else {
                        _console.log( "Missing body block in the if helper!" );
                        return chunk;
                    }
                }
                if(skip){
                    return chunk.render( bodies['else'], context );
                }
            }
            // no condition
            else {
                _console.log( "No condition given in the if helper!" );
            }
            return chunk;
        }
    });

}

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

    exports.addHelpers();

    // render top nav labels
    $('#topnav .nav .activity a').append(' ' + $.kansotranslate('Activity'));
    $('#topnav .nav .sms-forms-data a').append(' ' + $.kansotranslate('Export'));
    $('#topnav .nav .facilities a').append(' ' + $.kansotranslate('Facilities'));

    // Set version on all pages
    $('.version').text(settings.version);

    // Dynamic year for footer copyright
    $("#year").text(new Date().getFullYear());

    // patch dropdown to fire an event
    $.fn.dropdown.Constructor.prototype.toggle = _.wrap($.fn.dropdown.Constructor.prototype.toggle, function(fn, e) {
        fn.call(this, e);
        $(this).trigger('toggle');
    });

    // hack to bind to dynamic elements
    $(document).on('mouseenter', initBootstrap);

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
    $(document).on('click', '.add-message button, .add-message a', data_records.handleSendMessage);

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
        userCtx: userCtx
    });

    // update user district cookie
    if (userCtx.name) {
        users.get(userCtx.name, function (err, user) {
            var $iframe,
                muvuku;

            if (err) {
                // TODO handle better
                utils.logger.error(
                    'Error with user doc: ' + err.message || err.toString());
            } else if (user) {
                cookies.setBrowserCookie(dutils.currentRequest(), {
                    name: 'facility_id',
                    value: user.facility_id || ''
                });
                cookies.setBrowserCookie(dutils.currentRequest(), {
                    name: 'kujua_locale',
                    value: user.locale || ''
                });
                _.extend(data_records, {
                    user: user
                });

                // set url for muvuku iframe once we have a chance to get the user's number
                $iframe = $('#add-record-panel iframe');

                muvuku = url.parse($iframe.attr('data-src'), true); // split out query params
                muvuku.search = null; // remove existing search

                if (user.phone) {
                    muvuku.query._gateway_num = user.phone;
                }

                $iframe.attr('src', url.format(muvuku));
                data_records.setupAddRecordButton();
            }
        });
    }
    else {
        // clear cookies
        cookies.setBrowserCookie(dutils.currentRequest(), {
            name: 'facility_id',
            value: ''
        });
        cookies.setBrowserCookie(dutils.currentRequest(), {
            name: 'kujua_locale',
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
                    '<li><a href="'+dutils.getBaseURL()+'/reminders">' +
                    $.kansotranslate('Reminder Log') +
                    '</a></li>' +
                '</ul>' +
            '</li>'
        );
    }
    if (utils.isDbAdmin(userCtx)) {
        $('.dropdown-menu', el).append(
            '<li><a href="'+dutils.getBaseURL()+'/users">' +
            $.kansotranslate('Manage Users') +
            '</a></li>' +
            '<li><a href="'+dutils.getBaseURL()+'/test">' +
            $.kansotranslate('Run Tests') +
            '</a></li>'
        );
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
