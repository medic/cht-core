var async = require('async'),
    config = require('../config'),
    mustache = require('mustache'),
    utils = require('../lib/utils'),
    _ = require('underscore'),
    messages = require('../lib/messages');

module.exports = {
    filter: function(doc) {
        return !!(doc.form && doc.patient_id);
    },
    getConfig: function() {
        return _.extend({}, config.get('notifications'));
    },
    modifyRegistration: function(options, callback) {
        var mute = options.mute,
            registration = options.registration,
            db = options.db;

        if (mute) {
            utils.muteScheduledMessages(registration);
        } else {
            utils.unmuteScheduledMessages(registration);
        }
        db.saveDoc(registration, callback);
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            patient_id = doc.patient_id,
            options = module.exports.getConfig(),
            mute;

        if (!options.on_form && !options.off_form) {
            // not configured; bail
            return callback(null, false);
        } else if (options.on_form === doc.form) {
            mute = false;
        } else if (options.off_form === doc.form) {
            mute = true;
        } else {
            // transition does not apply; return false
            return callback(null, false);
        }

        // get registrations
        utils.getRegistrations({
            db: db,
            id: patient_id
        }, function(err, registrations) {

            if (err) {
                callback(err);
            } else if (registrations.length) {
                if (mute && options.confirm_deactivation) {
                    messages.addError(doc, options.confirm_deactivation_message);
                    messages.addReply(doc, options.on_mute_message);
                } else {
                    messages.addReply(doc, options.on_unmute_message);
                }
                async.each(registrations, function(registration, callback) {
                    module.exports.modifyRegistration({
                        db: db,
                        mute: mute,
                        registration: registration
                    }, callback);
                }, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, true);
                    }
                });
            } else {
                messages.addError(doc, options.patient_not_found);
                callback(null, true);
            }
        });
    }
};
