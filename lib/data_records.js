var db = require('db'),
    sms_utils = require('kujua-sms/utils'),
    reporting = require('kujua-reporting/shows'),
    querystring = require('querystring'),
    utils = require('kujua-utils'),
    _ = require('underscore'),
    _s = require('underscore-string'),
    settings = require('settings/root'),
    async = require('async'),
    audit = require('couchdb-audit/kanso'),
    session = require('session'),
    url = require('url'),
    ddoc = settings.name;

/*
 * TODO use proper/consistent style here, camel case only for functions,
 * underscores for vars.
 * */
var RE_PHONE = /.*?(\+?[\d]{5,15}).*/;

var db = null,
    district = '',
    cache = {revs_info:{}},
    $modal,
    user,
    locale,
    isAdmin,
    baseURL,
    dataChanges = {};

// close modal after changes feed updates records, but only if modal has
// triggered the change. TODO
var closeModal = function() {
    if ($modal) {
        $modal.modal('hide');
        enableModal();
        $modal = null;
    }
}

var setupModalClose = function(data) {
    var errors = _.filter(data, function(result) {
        return !result.ok;
    });
    if (errors.length)  {
        handleModalError(errors);
    } else {
        checkDataChanges(data, false);    
    }
};

var startDataChangesListener = function() {
    $(document).on('data-record-updated', onRecordUpdate);
};

var stopDataChangesListener = function() {
    $(document).off('data-record-updated', onRecordUpdate);
};

var onRecordUpdate = function(ev, changesData) {
    checkDataChanges(changesData.results, true);
};

/**
 * Close dialog iff change request has returned and change notification
 * listener has fired.
 *
 * @param data The result of the request or listener event
 * @param changeNotification Whether or not this is a result of the
 *      change notification listener firing
 */
var checkDataChanges = function(data, changeNotification) {
    var key = _.pluck(data, 'id').sort().join(',');
    var value = dataChanges[key];
    if (!value) {
        dataChanges[key] = {
            changeNotification: changeNotification
        }
    } else if(value.changeNotification != changeNotification) {
        dataChanges = {};
        closeModal();
        stopDataChangesListener();
    }
};

function getSelectedDocs(options) {
    var docs = [],
        extra = options && options.extra;

    $('#data-records [name=select-row-checkbox]:checked').each(function(idx, el) {
        var div = $(el).parents('.data-record'),
            record  = div.data().dataRecord;

        if (record && record._id && record._rev) {
            if (extra && extra !== null) {
                docs.push( _.extend(record, extra) );
            } else {
                docs.push(record);
            }
        }
    });

    return docs;
}

var onModalCancel = function(ev) {
    ev.preventDefault();
    closeModal();
}

var disableModal = function() {
    if ($modal) {
        $modal.find('.submit').text('Updating...');
        $modal.find('.btn, [name]').prop('disabled', true);
    }
}

var enableModal = function() {
    if ($modal) {
        $modal.find('.submit').text('Submit');
        $modal.find('.btn, [name]').prop('disabled', false);
    }
}

// keep modal in foreground until update occurs, depending on how many
// records are updated it can take a while. This gets called by changes feed
// listener that updates screen and closes modal windows.
var updateInModalMode = function(callback) {
    disableModal();
    startDataChangesListener();
    callback();
}

// set buttons and fields back to normal to allow for another try at submit
var handleModalError = function(err) {
    stopDataChangesListener();
    enableModal();
    alert('Errors: ' + JSON.stringify(err));
    console.error(err);
}


// update related_entities property on data record, ignores facility if it's a
// district.
var updateFacility = function(docs, facility) {
    docs.forEach(function(record) {
        if (!record.related_entities)
            record.related_entities = {clinic: {}};
        if (!record.related_entities.clinic)
            record.related_entities.clinic = {};
        if (facility.type === 'health_center')
            record.related_entities.clinic = {parent: facility}
        else
            record.related_entities.clinic = facility
        record.errors = _.reduce(record.errors, function(errors, error) {
          if (!(error.code === 'sys.facility_not_found' && record.related_entities.clinic)) {
            errors.push(error);
          }
          return errors;
        }, []);
    });
};

function toggleDropdownLink(cls, enable) {
    var $el = $('.controls .edit-mode ' + cls).parent('li');

    $el.toggleClass('disabled', !enable);
    if (enable) {
        $el.attr('href', '#');
    } else {
        $el.removeAttr('href');
    }
}

var createMessageDoc = function(facility) {
    var user = exports.user,
        phone = user && user.phone,
        name = user && user.name,
        doc = {
            errors: [],
            form: null,
            from: phone,
            reported_date: Date.now(),
            related_entities: {},
            tasks: [],
            kujua_message: true,
            type: 'data_record',
            sent_by: name || 'unknown'
        };

    if (facility && facility.type) {
        doc.related_entities[facility.type] = facility;
    }

    return doc;
};

exports.countChars = function($modal) {
    // TODO When UCS-2 mode is triggered (message contains a character that
    // can't be encoded in one byte) then max characters per message is 70.
    var count = $modal.find('[name=message]').val().length;
    var msg = '';
    if (count > 50) {
        msg = count + '/160 ' + $.kansotranslate('characters');
    }
    $modal.find('.modal-footer .note').text(msg);
}

/**
 * Validate phone numbers and return a result with whether or not
 * the value is `valid`, and the error `message` if any.
 */
var validatePhoneNumbers = function(recipients) {

    // recipients is mandatory
    if (!recipients || recipients.length === 0) {
        return {
            valid: false,
            message: 'Please include a valid phone number, '
                + 'e.g. +9779875432123'
        };
    }

    // all recipients must have a valid phone number
    var errors = _.filter(recipients, function(data) {
        if (data.everyoneAtFacility) {
            return !_.some(data.docs, function(doc) {
                return doc.contact && RE_PHONE.test(doc.contact.phone);
            });
        }
        return !RE_PHONE.test(data.phone);
    });
    if (errors.length > 0) {
        var errorRecipients = _.map(errors, function(error) {
            return error.text;
        }).join(', ');
        return {
            valid: false,
            message: 'These recipients do not have a valid ' + 
                'contact number: ' + errorRecipients
        }
    }

    return {
        valid: true,
        message: '',
        value: recipients
    }
};

exports.validateMessage = function(message) {
    return {
        valid: !!message,
        message: 'Please include a message.'
    }
};

/**
 * Validate SMS fields and update control-group with error message.
 */
exports.validateSms = function($phoneField, $messageField) {

    function updateValidationResult(fn, elem, value) {

        var result = fn.call(this, value);
        elem.closest('.control-group')
            .toggleClass('error', !result.valid)
            .find('.help-block')
            .text(result.message)
            .toggle(!result.valid);

        return result.valid;
    };

    var phone = updateValidationResult(
        validatePhoneNumbers,
        $phoneField, 
        $phoneField.select2('data')
    );
    var message = updateValidationResult(
        exports.validateMessage, 
        $messageField, 
        $messageField.val().trim()
    );

    return phone && message;

};

exports.formatRecipients = function(recipients) {
    return _.uniq(
        _.flatten(_.map(recipients, function(r) {
            if (r.everyoneAtFacility) {
                var ret = [];
                _.each(r.docs, function(d) {
                    if (d.contact && d.contact.phone) {
                        ret.push({
                            phone: d.contact.phone,
                            facility: d
                        });
                    }
                });
                return ret;
            } else {
                return [{
                    phone: r.phone,
                    facility: r.doc
                }];
            }
        })),
        false,
        function(r) {
            return r.phone;
        }
    );
};

function sendMessage(e, $form, doc) {
    e.preventDefault();
    $phone = $form.find('[name=phone]');
    $message = $form.find('[name=message]');
    recipients = $phone.select2('data');

    if ($(e.target).is('[disabled=disabled]')) {
        return;
    }

    if (!exports.validateSms($phone, $message)) {
        return;
    }

    /*
     * Assigning first facility in recipient list to record since that
     * property determines who can view the record. Not sure how to handle
     * the record's permissions with a mult-recipient case yet.  Mabye
     * reduce the recipients list into the most common parent.
     * related_entities on the record probably needs to be converted into a
     * list eventually so a record can belong to more than one district?
     * But this is a major architecural change and would require changes
     * throughout the code base.
     */
    if (!doc) {
        doc = createMessageDoc(
            _.find(recipients, function(data) {
                return data.doc && data.doc.type;
            })
        );
    }

    var explodedRecipients = exports.formatRecipients(recipients);

    $modal = $('#send-message');
    /*
     * Add tasks.messages object for each recipient on the record.
     */
    updateInModalMode(function() {
        _.each(explodedRecipients, function(data, idx) {
            db.newUUID(100, function (err, uuid) {
                var user = exports.user;
                if (err) {
                    return handleModalError(err);
                }
                var task = {
                    messages: [{
                        from: user && user.phone,
                        sent_by: user && user.name || 'unknown',
                        to: data.phone,
                        facility: data.facility,
                        message: $message.val().trim(),
                        uuid: uuid
                    }]
                };
                utils.setTaskState(task, 'pending');
                doc.tasks.push(task);
                // save doc only after all tasks have been added.
                if (idx+1 === explodedRecipients.length) {
                    audit.saveDoc(doc, function(e, data) {
                        if (err) {
                            handleModalError(e);
                        } else {
                            setupModalClose([data]);
                        }
                    });
                }
            });
        });
    });
}

function setupPhoneTypeahead($el, requirePhone) {

    configureControl({
        el: $el,
        query: function(query) {
            query.requirePhone = !!requirePhone;
            query.everyoneAtFacilityOption = true;
            queryContacts(query);
        },
        initSelection: function($el, callback) {

            var numbers = _.filter($el.val().split(','), function(number) {
                return number.trim().length > 0;
            });
            async.map(
                numbers,
                function(number, callback) {
                    queryContacts({
                        callback: function(data) {
                            callback(null, _.first(data && data.results));
                        },
                        useView: true,
                        create: true,
                        term: number.trim()
                    });
                },
                function(err, results) {
                    callback(results);
                }
            );
            callback(_.map(numbers, function(number) {
                return {
                    id: number,
                    phone: number,
                    text: number
                };
            }));

        },
        createSearchChoice:function(term, data) {
            var results = $(data).filter( function() {
                return this.text.localeCompare(term) === 0;
            });

            if (/^\+?\d*$/.test(term) && results.length === 0) {
                return {
                    id: term,
                    phone: term,
                    text: term
                };
            }
        },
        onSelectChange: function(ev) {
            if (ev.added && ev.added.everyoneAtFacility) {
                var parentId = ev.added.everyoneAtFacility.id;
                db.getView(ddoc, 'facility_by_parent', {
                    include_docs: true,
                    startkey: [parentId],
                    endkey: [parentId, {}]
                }, function(err, result) {
                    if (err) {
                        return alert('Failed adding everyone at facility: ' + err);
                    }
                    ev.added.docs = _.map(result.rows, function(child) {
                        return child.doc;
                    });
                });
            }
        },
        multiple: true
    });

}

/*
 * get revs_info (exclusive with fetching rev)
 */
var fetchRevsInfo = function(id, callback) {
    if (!id || !callback) {
        return;
    } else if (cache.revs_info[id]) {
        return callback(cache.revs_info[id]);
    }
    audit.get(id, function(err, auditDoc) {
        if (err) {
            return alert('Error fetching document.', err);
        }
        cache.revs_info[id] = auditDoc ? auditDoc.doc : {};
        callback(cache.revs_info[id]);
    });
};

/*
 * optional rev
 */
var fetchDoc = function(id, rev, callback) {
    var q = {};
    if (!id) return;
    if (typeof(rev) === 'function' && !callback) {
        callback = rev;
        rev = undefined;
    }
    if (rev) q = {rev: rev};
    db.getDoc(id, q, callback);
};

function isInitialRev(rev) {
    return rev.indexOf('1-') === 0;
}

function updateRevNav($div) {
    var id = $div.attr('rel'),
        rev = $div.attr('data-rev'),
        $nav = $div.find('.data-record-revisions'),
        $fwd = $nav.find('.next'),
        $back = $nav.find('.prev');

    fetchRevsInfo(id, function(doc) {
        var entry,
            index,
            next,
            prev;

        if (doc.history) {
            entry = _.find(doc.history, function(history) { 
                return history.doc._rev === rev;
            }) || _.last(doc.history);
            index = _.indexOf(doc.history, entry);
            next = doc.history[index + 1];
            prev = doc.history[index - 1];
        }
        
        if (next) {
            $fwd.prop('disabled', false)
                .attr('data-rev', next.doc._rev)
                .attr('title', 'Next revision');
        } else {
            $fwd.prop('disabled', true)
                .removeAttr('rev')
                .attr('title', 'No next revision');
        }
        if (prev) {
            $back.prop('disabled', false)
                .attr('data-rev', prev.doc._rev)
                .attr('title', 'Previous revision');
        } else {
            var title = isInitialRev(rev) ? 
                'No previous revision' : 'Previous revision is unavailable';
            $back.prop('disabled', true)
                .removeAttr('rev')
                .attr('title', title);
        }
    });
};

// exposed for testing
exports.updateRevNav = updateRevNav;

var updateMessage = function(messageId, options, updateFn) {
    if (!updateFn) {
        updateFn = options;
        options = {};
    }
    var update = function (callback) {
        db.getDoc(messageId, function(err, message) {
            if (err) {
                return console.log(err);
            }
            updateFn(message, function(err, updated) {
                if (err) {
                    return console.log(err);
                }
                audit.saveDoc(updated, callback);
            });
        });
    };
    if (options.modal) {
        updateInModalMode(function() {
            update(function(err, data) {
                if (err) {
                    stopDataChangesListener();
                    return console.log(err);
                }
                checkDataChanges([data], false);
            });
        });
    } else {
        update(function(err, data) {
            if (err) {
                return console.log(err);
            }
        });
    }
};

var updateVerified = function(e, verified) {
    e.preventDefault();
    var link = $(e.target).closest('a');
    if (link.is('.mm-icon-disabled')) {
        return;
    }
    var messageId = link.attr('data-record-id');
    updateMessage(messageId, function(message, callback) {
        message.verified = verified;
        callback(null, message);
    });
};

var markRead = function(options) {
    updateMessage(options.messageId, function(message, callback) {
        if (!message.read) {
            message.read = [];
        }

        var index = message.read.indexOf(options.username);
        if ((index !== -1) === options.read) {
            console.log('right state', index, options.read);
            // nothing to update, return without calling callback
            return;
        }

        if (options.read) {
            message.read.push(options.username);
        } else {
            message.read.splice(index, 1);
        }

        callback(null, message);
    });
};

var setupInboxListeners = function() {
    $('body').on('updateMessages', function(e, options) {
        if (options.query) {
            var params = {
                district: district,
                isAdmin: isAdmin,
                q: options.query,
                skip: options.skip || 0
            };
            var callback = options.callback || function(err) {
                if (err) console.log(err);
            };
            inboxQuery(params, callback);
        }
    });
    $('body').on('renderReports', function() {
        reporting.render_page();
    });
    $('body').on('markRead', function(e, options) {
        markRead(options);
    });
    setupPhoneTypeahead($('#send-message [name=phone]'), true);
    $('#send-message .submit').on('click', function(e) {
        sendMessage(e, $('#send-message form'), null);
    });
    $('#verify').on('click', function(e) {
        updateVerified(e, true);
    });
    $('#unverify').on('click', function(e) {
        updateVerified(e, false);
    });
    $('#delete-confirm .submit').on('click', function(e) {
        e.preventDefault();
        $modal = $('#delete-confirm');
        var messageId = $modal.data('record-id');
        updateMessage(messageId, {modal: true}, function(message, callback) {
            message._deleted = true;
            callback(null, message);
        });
    });
    $('#update-facility .submit').on('click', function(e) {
        e.preventDefault();
        $modal = $('#update-facility');
        var messageId = $modal.find('[name=messageId]').val();
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
            $modal.find('.modal-footer .note').text('Please select a facility');
            return;
        }
        updateMessage(messageId, {modal: true}, function(message, callback) {
            db.getDoc(facilityId, function(err, facility) {
                if (err) {
                    return callback(err);
                }
                updateFacility([message], facility);
                callback(null, message);
            });
        });
    });
    $('#logout').on('click', function(e) {
        e.preventDefault();
        session.logout(function() {
            location.reload(false);
        });
    });
    var $sendMessageModal = $('#send-message')
    $sendMessageModal.find('[name=message]').on('keyup', function() {
        exports.countChars($sendMessageModal);
    });
    $('#edit-user-profile .submit').on('click', function(e) {
        e.preventDefault();
        $modal = $('#edit-user-profile');
        disableModal();
        var userDb = require('db').use('_users');
        userDb.getDoc('org.couchdb.user:' + user, function(err, updated) {
            updated.fullname = $('#edit-user-profile #fullname').val();
            updated.email = $('#edit-user-profile #email').val();
            updated.phone = $('#edit-user-profile #phone').val();
            updated.language = $('#edit-user-profile #language').val();
            userDb.saveDoc(updated, function(err, data) {
                if (err) {
                    enableModal();
                    return console.log(err);
                }
                closeModal();
            });
        });
    });
    session.on('change', function (userCtx) {
        if (!userCtx.name) {
            window.location = '/dashboard/_design/dashboard/_rewrite/login' +
                '?redirect=' + window.location;
        }
    });
};


var inboxQuery = function(options, callback) {
    if (!db.getFTI) {
        require('views/lib/couchfti').addFTI(db);
    }
    db.getFTI(
        ddoc,
        'data_records',
        {
            limit: 50,
            q: options.q,
            skip: options.skip,
            sort: '\\reported_date',
            include_docs: true
        },
        function(err, data) {
            if (err) {
                return callback(err);
            }
            data.rows = _.map(data.rows, function(row) {
                return sms_utils.makeDataRecordReadable(row.doc, sms_utils.info);
            });
            callback(null, data);
        }
    );
}

function configureControl(options) {
    var el = options.el;

    el.parent().show();

    if (options.placeholder) {
        options.placeholder = $.kansotranslate(options.placeholder);
    }
    _.defaults(options, {
        allowClear: true
    });

    el.select2(options);
    el.on('change', function(ev) {
        options.onSelectChange(ev);
    });
}

function sortSelect2Data(a, b) {
    return a.text.localeCompare(b.text);
}

function handleSelectChange(q, e, options) {
    var val = e.val,
        removeKeys = options.removeKeys || [];

    // fix for null & select2 for form filtering
    if (options.idKey === 'form' && val === '_messages') {
        val = 'null';
    }

    if (val && e.type !== 'select2-removed') {
        q[options.idKey] = val;
        if (options.textKey) {
            q[options.textKey] = options.text;
        }
        removeKeys = _.without(removeKeys, options.idKey, options.textKey);
    } else {
        q = _.omit(q, options.idKey);
        if (options.textKey) {
            q = _.omit(q, options.textKey);
        }
    }
    q = _.omit(q, removeKeys);


    require('duality/core').handleUrl(e, baseURL + '/?' + querystring.stringify(q));
}

function mapContactResult(row) {

    var doc = row.doc,
        contact = doc.contact,
        name = doc.name,
        contactName = contact && contact.name,
        code = contact && contact.rc_code,
        phone = contact && contact.phone,
        result;

    result = [name, contactName, code, phone];

    return {
        id: row.id,
        doc: doc,
        contactName: contactName,
        code: code,
        phone: phone,
        name: name,
        text: _.compact(result).join(', '),
        type: doc.type
    }
}

function handleContactResult(err, result, query) {
    var data;

    if (err) {
        if (Math.floor(err.status / 100) === 5 && !query.useView) {
            query.useView = true;
            queryContacts(query);
        } else {
            query.callback({
                results: []
            });
        }
    } else {
        result.rows = _.filter(result.rows, function(row) {
            return !!row.doc;
        });
        if (result.rows.length === 0 && query.create) {
            data = [{
                id: query.term,
                phone: query.term,
                text: query.term
            }];
        } else {
            data = _.map(result.rows, mapContactResult);
        }
        if (query.doSort) {
            data.sort(sortSelect2Data);
        }
        if (query.everyoneAtFacilityOption) {
            for (var i = data.length - 1; i >= 0; i--) {
                var item = data[i];
                if (item.type === 'health_center') {
                    data.splice(i + 1, 0, {
                        id: item.id + '.*',
                        text: 'Everyone at ' + item.name,
                        everyoneAtFacility: {
                            id: item.id
                        }
                    });
                }
            }
        }
        if (query.requirePhone) {
            data = _.filter(data, function(item) {
                return !!item.phone || 
                    (item.type === 'health_center' && query.everyoneAtFacilityOption);
            });
        }
        query.callback({
            results: data
        });
    }
}

function queryContacts(query) {
    var term = _s.trim(query.term).toLowerCase().replace(/^[*?]/, ''),
        view = 'contacts_by_id';

    if (query.byId || query.useView || !/[\w\d]/.test(term)) {
        if (query.useView) {
            view = 'contacts';
        }
        db.getView(ddoc, view, {
            include_docs: true,
            limit: 50,
            startkey: [district || null, term],
            endkey: [district || null, term + 'Z']
        }, function(err, result) {
            query.doSort = true;
            handleContactResult(err, result, query);
        });
    } else {
        if (!db.getFTI) {
            require('views/lib/couchfti').addFTI(db);
        }

        if (district) {
            term = 'district:' + district + ' AND ' + term;
        }

        db.getFTI(ddoc, 'contacts', {
            limit: 50,
            q: term.replace(/\*?$/, '*'),
            include_docs: true
        }, function(err, result) {
            handleContactResult(err, result, query);
        });
    }
}

function subDataRecordChanges() {
    db.changes({
        include_docs: true,
        filter:'medic/data_records'
    }, function(err, data) {
        if (!err && data && data.results) {
            $(document).trigger('data-record-updated', data);
        }
    });
}

exports.setupAddRecordButton = function() {
    var $iframe = $('#add-record-panel iframe'),
        src = $iframe.data('src');

    db = db || require('db').current();
    db.request({method:'HEAD', url: src}, function(err, data) {
        // if problem getting iframe src then don't show add record button
        if (err) return;
        /*
         * couldn't hide/unhide because some bootstrap code was causing it to
         * always be visible, decided to modify the DOM instead
         */
        var $btn = $(
            '<li class="add-record">'
              +'<div class="btn-group">'
              +'<button class="btn btn-primary dropdown-toggle" data-toggle="dropdown">'
                  +'<i class="icon-file-alt"></i>'
              +'</button>'
              +'</div>'
            +'</li>'
        );

        var existing = $('#topnav .add-record');

        if (existing.length) {
            existing.replaceWith($btn);
        } else {
            $btn.insertAfter('#topnav .add-message');
        }

        // TODO include sync_url param in iframe src
        $btn.on('click', 'button', function(ev) {
            // toggle add record div
            ev.preventDefault();
            ev.stopPropagation();
            $('#add-record-panel .dropdown-menu').toggle();
            $(this).closest('.btn-group').toggleClass('open');

            if (!$iframe.attr('src')) {
                var phone = $iframe.data('from-phone');
                var muvuku = url.parse($iframe.data('src'), true); 
                muvuku.search = null; // remove existing search
                muvuku.query._gateway_num = phone;
                $iframe.attr('src', url.format(muvuku));
            }

        });
    });

    $('#add-record-panel .close').on('click', function(ev) {
        $(this).closest('.dropdown-menu').hide();
        $('.navbar .add-record .btn-group').removeClass('open');
    });
};

exports.onDualityInit = function() {
    db = db || require('db').current();
    if ($('body').is('.inbox')) {
        setupInboxListeners();
    }
    subDataRecordChanges();
};

// exposed for testing purposes
exports.setDb = function(database) {
    db = database;
    audit = require('couchdb-audit/kanso').withKanso(db);
    cache = {revs_info:{}};
};

exports.init = function(req, options) {
    if (!options) {
        return;
    }
    user = req.userCtx.name;
    locale = utils.getUserLocale(req);
    db = require('db').current(req);
    baseURL = require('duality/core').getBaseURL(req);
    audit = require('couchdb-audit/kanso').withKanso(db);
    district = options.district;
    isAdmin = options.isAdmin;
    sms_utils.info = options.appinfo;
    reporting.init(req);
    if ($('#reports-tab').is('.selected')) {
        reporting.render_page();
    }
    require('db').use('_users').getDoc('org.couchdb.user:' + user, function(err, user) {
        if (err) {
            return console.log('Error fetching user', err);
        }
        $('#edit-user-profile #fullname').val(user.fullname);
        $('#edit-user-profile #email').val(user.email);
        $('#edit-user-profile #phone').val(user.phone);
        $('#edit-user-profile #language').val(user.language);
    });
};
