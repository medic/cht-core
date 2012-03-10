/**
 * Bindings to Kanso events
 */

var duality_events = require('duality/events'),
    session = require('session'),
    logger = require('kujua-utils').logger;


/**
 * The init method fires when the app is initially loaded from a page rendered
 * by CouchDB.
 */
duality_events.on('init', function () {

    var db = require('db').current();

    // Dynamic year for footer copyright
    $("#year").text( (new Date).getFullYear() );

    // Admin menu control
    $('.dropdown-toggle').on('click', function(ev) {
      ev.preventDefault();
      $(this).siblings('.dropdown-menu').toggle(300);
    });

    // bind click to edit button once on initial page load
    $('.edit').click(function(ev) {
        $('.edit-col').toggle(300);
        $(this).toggleClass('active');
    });

    $('#data-records .extend').live('click', function(ev) {
        ev.preventDefault();
        $(this).parents('tr').next().slideToggle();
    });

    $('form[data-ajax=removeDoc]').live('click', function(ev) {
        ev.preventDefault();
        var form = $(this),
            _id = form.find('[name=_id]').val(),
            _rev = form.find('[name=_rev]').val();
        db.removeDoc({_id: _id, _rev: _rev}, function(err, resp) {
            if (err) {
                return alert(err);
            }
            form.closest('tr').fadeOut();
        });
    });
});


/**
 * The sessionChange event fires when the app is first loaded and the user's
 * session information becomes available. It is also fired whenever a change
 * to the user's session is detected, for example after logging in or out.
 */

/**
 * session.on('change', function (userCtx, req) {
 *     // session change handling code goes here...
 * });
 */


/**
 * The updateFailure event fires when an update function returns a document as
 * the first part of an array, but the client-side request to update the
 * document fails.
 */

duality_events.on('updateFailure', function (err, info, req, res, doc) {
    alert(err.message || err.toString());
});
