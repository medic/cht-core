var sms_utils = require('kujua-sms/utils'),
    querystring = require('querystring'),
    jsonforms = require('views/lib/jsonforms'),
    utils = require('kujua-utils'),
    logger = utils.logger,
    templates = require('duality/templates'),
    _ = require('underscore'),
    _s = require('underscore-string'),
    moment = require('moment'),
    settings = require('settings/root'),
    ddoc = settings.name;

/*
 * TODO use proper/consistent style here, camel case only for functions,
 * underscores for vars.
 * */

var RE_PHONE = /.*?(\+?[\d]{10,15}).*/;

var db = null
    , timeoutID = null
    , nextStartKey = null
    , firstRender = true
    , lastRecord = null
    , limit = 50
    , district = ''
    , cache = {revs_info:{}}
    , dh_id = null
    , cl_id = null
    , form = null
    , locale
    , $modal
    , isAdmin;


var renderRecords = function(options) {

    if (!options) {
        if (cache.viewOptions)
            options = cache.viewOptions;
        else
            return;
    }

    if(nextStartKey) {
        options.query['startkey'] = nextStartKey;
    }

    var render = function(err, data) {

        if (err) { return alert(err); }

        if (data.rows && data.rows.length === 1) {
            lastRecord = data.rows[0];
            nextStartKey = null;
        } else if (data.total_rows < limit) {
            lastRecord = data.rows[data.rows.length - 1];
        } else if (data.rows && data.rows.length < limit) {
            lastRecord = data.rows[data.rows.length - 1];
            nextStartKey = null;
        } else if (data.rows && data.rows.length > 1) {
            nextStartKey = data.rows.pop().key;
        }
        var rows = _.map(data.rows, function(row) {
            return sms_utils.makeDataRecordReadable(row.doc || row.value);
        });

        // render base template if this is the first render or we have no rows.
        if(firstRender) {
            $('#loader').html(
                templates.render(
                    'data_records_table.html', {}, {
                      data_records: rows
                    }
                )
            );
            firstRender = false;
            if (!nextStartKey && rows.length > 0)
                $('.reached-last-record').show();
        } else {
            $('#data-records .wrap-rows').append(
                templates.render(
                    'data_records_rows.html', {}, {
                      data_records: rows
                    }
                )
            );
            if (!nextStartKey)
                $('.reached-last-record').show();
        }

        // update data api values as well
        _.each(rows, function(row) {
            if (!row._id) return;
            $('[rel='+row._id+']').data(
                'data-record', sms_utils.makeDataRecordOriginal(row)
            );
        });

        delete timeoutID;
        $('.ajax-loader').hide();
    };

    if(!options.view) {
        render(null, []);
    } else if(!lastRecord) {
        db.getView(ddoc, options.view, options.query, render);
    }
};

function loadPhones(callback) {
    var q = {},
        view = 'facilities',
        phones = [];

    cache.phones = cache.phones ? cache.phones : [];

    if (cache.phones.length !== 0) {
        return callback(null, cache.phones);
    }

    if (district) {
        _.extend(q, {
            startkey: [district],
            endkey: [district, {}]
        });
        view = 'facilities_by_district';
    }

    db.getView(ddoc, view, q, function(err, data) {
        if (err) {
            return callback(err);
        }

        _.each(data.rows, function(row) {
            var vals = [];

            _.each(row.value, function(value, key) {
                if (_.isString(value) && value) {
                    vals.push(_s.trim(value));
                } else if (_.isObject(value) && value.name) {
                    vals.push(_s.trim(value.name));
                }
            });
            cache.phones.push(vals.join(', '));
        });
        cache.phones.sort();

        callback(null, cache.phones);
    });
}

function highlightRows($divs, flag) {
    flag = flag === undefined ? true : flag;

    $divs.toggleClass('highlight', flag);
}

/*
 * take result from changes feed or doc as argument and update screen
 */
var renderRecord = function(result) {

    if (!result) return;

    var doc = result.doc,
        div = $('[rel='+ result.id +']'),
        newDiv;

    // remove deleted records
    if (result.deleted && div.length)
        return div.fadeOut(500, function() { $(this).remove(); });

    // also only update for this district or _admin
    if (!isInDistrict(doc)) return;

    // render new/updated records
    var html = templates.render( 'data_records_rows.html', {}, {
        data_records: [
            sms_utils.makeDataRecordReadable(doc)
        ]
    });

    newDiv = $(html.trim()); // jQuery gets confused at leading line return

    if(div.length) {
        // preserve expando visibility
        var css = div.removeClass('highlight').attr('class');
        div.replaceWith(function() {
            newDiv.attr('class', css);
            return newDiv;
        });
    } else {
        newDiv.insertBefore('#data-records .data-record:first')
            .hide().fadeIn(500);
    }

    // attach original doc to element with jquery data api. use separate
    // jquery call, for some reason chaining failed.  and undo
    // makeDataRecordReadable.
    newDiv.data('data-record', sms_utils.makeDataRecordOriginal(doc));
};

var onDataRecordUpdated = function(ev, data) {

    if (!data) return;

    _.each(data.results, function(result) {
        if (cache.revs_info[result.id])
            delete cache.revs_info[result.id];
        renderRecord(result);
    });

}

// close modal after changes feed updates records, but only if modal has
// triggered the change. TODO
var closeModal = function() {
    if ($modal) {
        $modal.modal('hide');
        $modal.remove();
        $modal = null;
    }
}

var cancelScroll = function() {
    if(typeof timeoutID === "number") {
        window.clearTimeout(timeoutID);
        delete timeoutID;
    }
};

var setupScroll = function() {
    cancelScroll();
    if(!lastRecord) {
        $('.ajax-loader').show();
        timeoutID = window.setTimeout(function() {
            renderRecords();
        }, 700);
    }
};

var handleSelectRow = function(ev) {
    var checkbox = $(this);
    ev.stopPropagation();
    highlightRows(checkbox.parents('.data-record'), checkbox.prop('checked'));
}

function toggleRows(checked) {
    var rows = $('#data-records .data-record');

    rows.find('[name=select-row-checkbox]').prop('checked', checked);

    highlightRows(rows, checked);
}
function handleSelectAllRows() {
    toggleRows(true);
}

function handleUnselectAllRows(ev) {
    toggleRows(false);
}

// verify changes feed reflects same docs in bulk update response, so we can
// verify when the browser screen has received update from the changes feed
// after a bulk update. couldn't figure out a better way to do this.
var isBulkUpdateDone = function(changesData, data) {
    var valid = true;
    var ids = _.map(changesData.results, function(el) { return el._id; });
    _.each(data, function(el) {
        if (ids.indexOf(el._id) === -1) valid = false;
    });
    return valid;
};

// close modal when a changes feed sends in a result with same amount of
// records changed.  this avoids closing modal based on a event from unrelated
// record updated.
var setupModalClose = function(data) {

    // check errors
    var errors = [];
    _.each(data, function(result) {
        if (result.ok) return;
        errors.push(result);
    });

    if (errors.length)  {
        handleModalError(errors);
    }

    // setup close
    function onRecordUpdate(ev, changesData) {
        if (isBulkUpdateDone(changesData, data)) {
            closeModal();
            $(document).off('data-record-updated', onRecordUpdate);
        } else {
            console.error('changesData does not match', changesData, data);
        }
    }

    $(document).on('data-record-updated', onRecordUpdate);
}

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

function doBulkEdit(options, callback) {
    var docs = getSelectedDocs(options);

    if (docs.length === 0) {
        return callback('No rows selected.');
    }

    callback(null, docs);
};



var onModalCancel = function(ev) {
    ev.preventDefault();
    closeModal();
}

// keep modal in foreground until update occurs, depending on how many
// records are updated it can take a while. This gets called by changes feed
// listener that updates screen and closes modal windows.
var updateInModalMode = function(callback) {
    if ($modal) {
        $modal.find('.submit').text('Updating...');
        $modal.find('.btn').attr('disabled','disabled');
        $modal.find('[name]').attr('disabled','disabled');
    }
    callback();
}

// set buttons and fields back to normal to allow for another try at submit
var handleModalError = function(err) {
    $modal.find('.submit').text('Submit');
    $modal.find('.btn').removeAttr('disabled');
    $modal.find('[name]').removeAttr('disabled');
    alert('Bulk Edit Errors: ' + JSON.stringify(err));
    console.error('bulk edit errors', err);
}

var handleMarkInvalid = function(ev) {
    ev.preventDefault();

    var docs = [],
        msg;

    var validate = function($form) {
        var valid = true;
        $form.find(':input').each(function(idx, el) {
            var $el = $(el);
            if (!$el.val().trim()) {
                $el.closest('.control-group').addClass('error');
                $form.find('.error-msg').show();
                valid = false;
            }
        });
        return valid;
    };

    var onSubmit = function(ev) {
        ev.preventDefault();
        var $el = $(this),
            $form = $el.closest('.modal').find('form');

        if (!validate($form)) return;

        var reason = $form.find('[name=reason]').val().trim();

        for (var i in docs) {
            docs[i].errors.push({
                code:'marked_invalid',
                message: reason
            });
        }

        updateInModalMode(function() {
            db.bulkSave(docs, function(err, data) {
                if (err) return handleModalError(err);
                setupModalClose(data);
                //changes listener will update screen
            });
        });
    }

    var options = {};

    doBulkEdit(options, function(err, _docs) {
        if (err) return alert(err);
        // setup modal
        var note = 'Updating '+_docs.length+' records';
        $modal = $(templates.render('modal_edit_invalid.html', {}, {note: note}));
        $modal.modal('show');
        $modal.on('click','.cancel', onModalCancel);
        $modal.on('click','.submit', onSubmit);
        $('#invalid-reason').focus();
        docs = _docs;
    });
}

var handleEditDelete = function(ev) {
    ev.preventDefault();
    var docs = [];

    var onSubmit = function(ev) {
        ev.preventDefault();
        var $el = $(this);
        updateInModalMode(function() {
            db.bulkSave(docs, function(err, data) {
                if (err) return handleModalError(err);
                setupModalClose(data);
                //changes listener will update screen
            });
        });
    }

    var options = {extra: {_deleted: true}};
    doBulkEdit(options, function(err, _docs) {
        if (err) return alert(err);
        // setup modal
        var title = 'Permanently remove '+_docs.length+' records?';
        $modal = $(templates.render('modal.html', {}, {title: title}));
        $modal.modal('show');
        $modal.on('click','.cancel', onModalCancel);
        $modal.on('click','.submit', onSubmit);
        docs = _docs;
    });

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

var getFacilityDesc = function(doc) {
  doc = doc || {};
  var parts = [],
      contact = doc.contact;
  if (doc.name) parts.push(doc.name)
  if (contact && contact.name) parts.push(contact.name)
  if (contact && contact.rc_code) parts.push(contact.rc_code)
  if (contact && contact.phone) parts.push(contact.phone)
  return parts.join(', ');
}

function toggleDropdownLink(cls, enable) {
    var $el = $('.controls .edit-mode ' + cls).parent('li');

    $el.toggleClass('disabled', !enable);
    if (enable) {
        $el.attr('href', '#');
    } else {
        $el.removeAttr('href');
    }
}

exports.handleUpdateDropdown = function(ev) {
    var docs = getSelectedDocs(),
        updateable,
        markValid,
        markInvalid;

    ev.preventDefault();

    updateable = !!docs.length;
    markInvalid = _.any(docs, function(doc) {
        return doc.form && (!doc.errors || doc.errors.length === 0);
    });
    markValid = _.any(docs, function(doc) {
        return doc.form && (doc.errors && doc.errors.length > 0);
    });

    toggleDropdownLink('.edit-update', updateable);
    toggleDropdownLink('.edit-delete', updateable);
    toggleDropdownLink('.mark-invalid', markInvalid);
    toggleDropdownLink('.clear-invalid', markValid);
};

function handleUpdateFacility(ev) {
    ev.preventDefault();

    var docs = [];

    var onSubmit = function(ev) {
        ev.preventDefault();
        var $el = $(this),
            formData = $el.closest('.modal').find('form').serializeArray(),
            facility = _.find(viewData.rows, function(row) {
                return row.id === formData[0].value
            });
        updateFacility(docs, facility.doc);
        updateInModalMode(function() {
            db.bulkSave(docs, function(err, data) {
                if (err) return handleModalError(err);
                setupModalClose(data);
                //changes listener will update screen
            });
        });
    }

    var viewData = {};
    var onViewResults = function(err, data) {
        viewData = data;
        $modal.find('form [name=facility]').html(
            _.map(data.rows, function(row) {
                if (row.doc.type === 'district_hospital') return; //ignoring
                return '<option value="'+row.id+'">'
                    + getFacilityDesc(row.value) + '</option>';
            }).join('\n')
        );
    }


    var options = {};
    doBulkEdit(options, function(err, _docs) {
        if (err) return alert(err);
        // setup modal
        var note = 'Update '+_docs.length+' records?';
        $modal = $(templates.render('update_facility_modal.html', {}, {
            note: note
        }));
        $modal.modal('show');
        $modal.on('click','.cancel', onModalCancel);
        $modal.on('click','.submit', onSubmit);
        docs = _docs;
        var view = 'facilities',
            q = {include_docs: true};

        if (district) {
             view = 'facilities_by_district';
             q.startkey = [district];
             q.endkey = [district, {}];
        }

        db.getView(ddoc, view, q, onViewResults);
    });
}

var handleClearInvalid = function(ev) {
    ev.preventDefault();

    var docs = [];

    var onSubmit = function(ev) {
        ev.preventDefault();
        for (var i in docs) {
            docs[i].errors = [];
        }
        updateInModalMode(function() {
            db.bulkSave(docs, function(err, data) {
                if (err) return handleModalError(err);
                setupModalClose(data);
            });
        });
    }

    var options = {};
    doBulkEdit(options, function(err, _docs) {
        if (err) {
            return alert(err);
        }
        // setup modal
        var title = 'Mark as Valid',
            note = _s.sprintf('Update %d records', _docs.length);

        $modal = $(templates.render('modal.html', {}, {
            title: title,
            note: note
        }));

        $modal.modal('show');
        $modal.on('click','.cancel', onModalCancel);
        $modal.on('click','.submit', onSubmit);
        docs = _docs;
    });
}

var handleScheduleGroupUpdate = function(ev) {
    // just handle state changes for now
    ev.preventDefault();
    var el = $(ev.target),
        state_val = el.attr("data-state-val"),
        doc = el.closest('[rel]').data('data-record'),
        tasks = el.closest('tbody').find('[data-tasks-idx]');

    if (!doc) return alert("Failed to find record.");
    if (!tasks) return alert("Failed to find tasks.");

    var onSubmit = function(ev) {
        ev.preventDefault();
        tasks.each(function(i, el) {
            var idx = parseInt($(el).attr('data-tasks-idx'), 10);
            doc.scheduled_tasks[idx].state = state_val;
        });
        updateInModalMode(function() {
            db.saveDoc(doc, function(err, data) {
                if (err) return handleModalError(err);
                setupModalClose([data]);
            });
        });
    }

    // setup modal
    var title = 'Modify Schedule Group';
    var note = 'Update '+tasks.length+' messages?';
    $modal = $(templates.render('modal.html', {}, {
        title: title,
        note: note
    }));
    $modal.modal('show');
    $modal.on('click','.cancel', onModalCancel);
    $modal.on('click','.submit', onSubmit);
};

exports.handleSendMessage = function(ev) {
    ev.preventDefault();

    var el = $(ev.target),
        state_val = el.attr("data-state-val"),
        doc = el.closest('[rel]').data('data-record'),
        $form,
        $phone,
        $message,
        to;

    function countChars(ev) {
        var count = $message.val().length;
        if (count > 100) {
            $modal.find('.modal-footer .note').html(count + ' characters');
        }
    }

    function validate() {
        var valid = true;

        $phone = $form.find('[name=phone]');
        $message = $form.find('[name=message]');
        if (!RE_PHONE.test($phone.val())) {
            $phone.closest('.control-group').addClass('error')
                .find('.help-block').show();
            valid = false;
        } else {
            $phone.closest('.control-group').find('.help-block').hide();
        }
        if (!$message.val().trim()) {
            $message.closest('.control-group').addClass('error')
                .find('.help-block').show();
            valid = false;
        } else  {
            $message.closest('.control-group').find('.help-block').hide();
        }
        return valid;
    };

    function onSubmit(ev) {
        ev.preventDefault();

        if (!validate()) {
            return;
        }

        // creating a message without a document to attach it to
        if (!doc) {
            doc = {
                errors: [],
                form: null,
                reported_date: Date.now(),
                tasks: [],
                kujua_message: true,
                type: 'data_record',
                sent_by: exports.username || 'unknown'
            };
        }

        doc.tasks.push({
            messages: [{
                to: RE_PHONE.exec($phone.val())[1],
                message: $message.val().trim()
            }],
            state: 'pending'
        });

        updateInModalMode(function() {
            db.saveDoc(doc, function(err, data) {
                if (err) {
                    handleModalError(err);
                } else {
                    setupModalClose([data]);
                }
            });
        });
    }

    // setup modal
    to = getFacilityDesc(doc && doc.related_entities.clinic) || (doc && doc.from);
    $modal = $(templates.render('modal_send_message.html', {}, {
        to: to
    }));
    $modal.modal('show');
    $modal.on('click','.cancel', onModalCancel);
    $modal.on('click','.submit', onSubmit);
    $form = $modal.find('form');
    $phone = $form.find('[name=phone]');
    setupPhoneTypeahead($phone);
    $message = $form.find('[name=message]');

    if ($phone.val()) {
        $message.focus();
    } else {
        $phone.focus();
    }

    $message.on('keyup', countChars);
};

function setupPhoneTypeahead($el) {
    // setup typeahead on tasks-to field.  $el should jquery list of input
    // fields
    loadPhones(function(err, data) {
        if (err) {
            return alert("Warning: problem getting phone data.\n" + err);
        }
        $el.typeahead({
            source: data,
            highlighter: function (item) {
                //override default highlighter to escape '+'s
                var q = this.query.replace(/[\\+]+/, '\\\\+');
                return item.replace(new RegExp('(' + q + ')', 'ig'),
                    function ($1, match) {
                        return '<strong>' + match + '</strong>';
                    }
                );
            }
        });
    });
}

var toggleEditMode = function(table) {
    table = $(table);
    if (table.hasClass('read-mode')) {
        table.addClass('edit-mode').removeClass('read-mode')
            .find('.btn-group.menu').hide();
        table.siblings().find('.btn-group.menu').hide();
    } else if (table.hasClass('edit-mode')) {
        table.removeClass('edit-mode').addClass('read-mode')
            .find('.btn-group.menu').show();
        table.siblings().find('.btn-group.menu').show();
    }
    table.find('[data-tasks-remove-idx]')
        .removeAttr('data-tasks-remove-idx')
        .removeClass('tasks-removal-pending');
    table.find('.tasks-removal').remove();
};


var handleScheduleGroupSave = function(ev) {
    ev.preventDefault();
    //save scheduled tasks data
    var button = $(ev.target),
        doc = button.closest('[rel]').data('data-record'),
        table = button.closest('tbody');

    // disable while we do IO
    button.attr('disabled', 'disabled');
    button.siblings('.cancel').attr('disabled', 'disabled');

    var tasks = table.find('[data-tasks-idx]'),
        new_tasks = table.find('.new-task'),
        group,
        type;

    var finalize = function(err, doc) {

        button.removeAttr('disabled');
        button.siblings('.cancel').removeAttr('disabled', 'disabled');

        if (err) return alert("Save failed. " + err);

        // purge removed tasks
        // originally used .splice here to remove but had issues
        var keep_tasks = [];
        for (var i in doc.scheduled_tasks) {
            if (doc.scheduled_tasks[i])
                keep_tasks.push(doc.scheduled_tasks[i]);
        }
        doc.scheduled_tasks = keep_tasks;

        db.saveDoc(doc, function(err, data) {
            if (err) return alert('Save failed. ' + err);
            if (!data.ok) return alert('Save failed.');
            toggleEditMode(table);
            //once doc is saved changes listener will update the row
        });
    };

    if (tasks.length === 0 && new_tasks.length === 0)
        return finalize('Nothing to update.');

    if (!doc)
        return finalize('No data record found.');

    var updated = false,
        valid = [];

    // update existing tasks
    tasks.each(function(idx, el) {
        var task = $(el),
            task_idx = task.attr('data-tasks-idx'),
            remove_idx = task.attr('data-tasks-remove-idx');

        // mark undefined, remove tasks later to not affect index
        // values
        if (remove_idx) {
            updated = true;
            return doc.scheduled_tasks[remove_idx] = null;
        }

        // state
        var task_field = task.find('.tasks-state'),
            val = task_field.find('[data-save-val]').attr('data-save-val'),
            orig = task_field.find('[data-orig-val]').attr('data-orig-val');
        if (!val) {
            valid.push('State value is empty.');
            task_field.find('.control-group').addClass('error');
        }
        if (val && doc.scheduled_tasks[task_idx].state !== val) {
            doc.scheduled_tasks[task_idx].state = val;
            updated = true;
        }

        // due
        task_field = task.find('.tasks-due');
        val = task_field.find('.datepicker')
                .data('datetimepicker').getLocalDate().valueOf();
        orig = task_field.find('[data-orig-val]').attr('data-orig-val');
        if (!val) {
            valid.push('Date is empty.');
            task_field.find('.control-group').addClass('error');
        }
        if (val && doc.scheduled_tasks[task_idx].due !== val) {
            doc.scheduled_tasks[task_idx].due = val;
            updated = true;
        }

        // to/phone
        task_field = task.find('.tasks-to');
        val = task_field.find('input').val();
        orig = task_field.find('.val').text();
        if (!val) {
            valid.push('Phone field is empty.');
            task_field.find('.control-group').addClass('error');
        }
        if (!RE_PHONE.test(val)) {
            valid.push('Failed to parse phone number.');
            task_field.find('.control-group').addClass('error');
        } else {
            val = RE_PHONE.exec(val)[1];
        }
        if (val && doc.scheduled_tasks[task_idx].messages[0].to !== val) {
            doc.scheduled_tasks[task_idx].messages[0].to = val;
            updated = true;
        }

        // message
        task_field = task.find('.tasks-message');
        val = task_field.find('textarea').val();
        orig = task_field.find('.val').text();
        if (!val) {
            valid.push('Message field is empty.');
            task_field.find('.control-group').addClass('error');
        }
        if (val && doc.scheduled_tasks[task_idx].messages[0].message !== val) {
            doc.scheduled_tasks[task_idx].messages[0].message = val;
            updated = true;
        }

        // save the type and group the same as siblings
        if (!type || !group) {
            type = doc.scheduled_tasks[task_idx].type;
            group = doc.scheduled_tasks[task_idx].group;
        }
    });

    for (var i = 0; i < new_tasks.length; i++) {

        var new_task = $(new_tasks.get(i));

        var to = new_task.find('.tasks-to input'),
            match = to.val().match(RE_PHONE),
            state = new_task.find('[data-save-val]').attr('data-save-val'),
            due = new_task.find('.tasks-due input'),
            msg = new_task.find('.tasks-message textarea'),
            msg_val = msg.val();

        if (!due.val()) {
            due.closest('.control-group').addClass('error');
            return finalize('Date is not valid.');
        }
        if (!match) {
            to.closest('.control-group').addClass('error');
            return finalize('Phone number is not valid.');
        }
        if (!msg_val) {
            msg.closest('.control-group').addClass('error');
            return finalize('Please include a message.');
        }

        var task = {
            due: moment(due.val(),'DD-MM-YYYY HH:mm').valueOf(),
            state: state,
            type: type,
            group: group,
            messages: [{
                to: match[1],
                message: msg_val
            }]
        };
        doc.scheduled_tasks.push(task);
        updated = true;
    }

    if (valid.length !== 0)
        return finalize('Data is not valid:\n  '+valid.join('\n  '));

    if (!updated)
        return finalize('Nothing was changed.');

    finalize(null, doc);
};

/*
 * get revs_info (exclusive with fetching rev)
 */
var fetchRevsInfo = function(id, callback) {
    if (cache.revs_info[id])
        return cache.revs_info[id];
    var q = {revs_info: true};
    if (!id || !callback) return;
    db.getDoc(id, q, callback);
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


var handleClickRevision = function(ev) {
    ev.preventDefault();
    var $btn = $(this),
        $div = $($btn.closest('.data-record')),
        doc = $div.data('data-record'),
        rev = $btn.data('rev'),
        revs_info = cache.revs_info[doc._id];

    // disable btn until done processing
    $btn.addClass('disabled');

    function updateRevNav(doc) {

        var $div = $('[rel='+doc._id+']'),
            $nav = $div.find('.data-record-revisions .nav'),
            $fwd = $nav.find('.icon-arrow-right'),
            $back = $nav.find('.icon-arrow-left');

        _.each(revs_info, function(rev, idx) {
            var next = revs_info[idx-1],
                prev = revs_info[idx+1];
            if (doc._rev === rev.rev) {
                $div.find('.data-record-revisions .revision').show();
                if (next) {
                    $fwd.removeClass('disabled');
                    $fwd.data('rev', next.rev);
                } else {
                    $fwd.addClass('disabled');
                    $fwd.data('rev', null);
                }
                if (prev) {
                    $back.removeClass('disabled');
                    $back.data('rev', prev.rev);
                } else {
                    $back.addClass('disabled');
                    $back.data('rev', null);
                }
            }
        });

    };

    function renderPrevRevision(doc) {
        _.each(revs_info, function(rev, idx) {
            var prev = revs_info[idx+1];
            if (doc._rev === rev.rev) {
                if (prev) {
                    fetchDoc(doc._id, prev.rev, function(err, data) {
                        renderRecord({doc:data, id:data._id});
                        updateRevNav(data);
                    });
                }
            }
        });
    };

    // if button has rev data then just render the doc@rev
    if (rev && revs_info) {
        return fetchDoc(doc._id, rev, function(err, data) {
            if (err) return alert('Error fetching document.',err);
            renderRecord({doc:data, id:data._id});
            updateRevNav(data);
        });
    }

    // fetch revs_info if not available in data api. this should be only on
    // first attempt, therafter we save revs_info gets saved along with doc.
    fetchRevsInfo(doc._id, function(err, data) {
        revs_info = cache.revs_info[doc._id] = data._revs_info;
        fetchDoc(doc._id, function(err, data) {
            if (err) return alert('Error fetching document.', err);
            if ($btn.hasClass('icon-arrow-right')) {
                updateRevNav(data);
            } else {
                renderPrevRevision(data);
            }
        });
    });

};

/*
 * TODO move all listeners into object so they are named and can be
 * removed/added with iterator.
 **/
function setupListeners() {
    var $document = $(document),
        $window = $(window),
        onScroll;

    onScroll = _.throttle(function() {
        if (!lastRecord) {
            $('.ajax-loader').show();
            renderRecords();
        }
    }, 700);

    $window.on('scroll', function () {
        if ($window.scrollTop() >= $document.height() - $window.height() - 10) {
            onScroll();
        }
    });

    // update screen from new records in changes feed
    $document.on('data-record-updated', onDataRecordUpdated);

    // bind to: field error marks so they can be updated
    $document.on('click', '.tasks-data_record .error-missing-phone',
        function(ev) {
            $(this).hide();
            var form = $(this).siblings('form');
            form.css({display: 'inline'});
            // configure bootstrap typeahead effect
            loadPhones(function(err, data) {
                if (err) return alert("Error loading phone data.");
                $('[name=phone]', form).typeahead({
                    source: data,
                    //items: 20,
                    highlighter: function (item) {
                        //override default highlighter to escape '+'s
                        var q = this.query.replace(/[\\+]+/, '\\\\+');
                        return item.replace(new RegExp('(' + q + ')', 'ig'),
                            function ($1, match) {
                                return '<strong>' + match + '</strong>';
                            }
                        );
                    }
                }).focus();
            });
    });

    // remove error highlighting on subsequent tries
    $document.on( 'focus', '.tasks-data_record .control-group [type=text]', function(ev) {
            $(this).closest('.control-group').removeClass('error');
    });

    // handle updating of 'to' field in message task
    $document.on('click', '.tasks-data_record [type=submit]', function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var btn = $(this),
            form = btn.closest('form'),
            rev = btn.siblings('input[name=_rev]').val(),
            id = btn.siblings('input[name=_id]').val(),
            tasks_idx = parseInt(
                btn.closest('[data-tasks-idx]').attr('data-tasks-idx'), 10
            ),
            idx = parseInt(btn.siblings('input[name=idx]').val(), 10),
            input = btn.siblings('input[type=text]'),
            match = input.val().match(/.*(\+\d{11,15}).*/),
            phone = match ? match[1] : '';
        if(!phone) {
            btn.closest('.control-group').addClass('error');
            return;
        }
        db.getDoc(id, function(err, data) {
            if (err) { return alert(err); }
            data.tasks[tasks_idx].messages[idx].to = phone;
            data.tasks[tasks_idx].state = 'pending';
            data._rev = rev; // set the rev from the form

            for (var i in data.errors) {
                // remove related errors
                var e = data.errors[i];
                if (e.error === 'Could not find message recipient.') {
                    // legacy error messages
                    data.errors.splice(i, 1);
                } else if (e.code && e.code.match(/recipient_not_found/)) {
                    data.errors.splice(i, 1);
                }
            }

            db.saveDoc(data, function(err, data) {
                if (err) { return alert(err); }
                if(!data.ok) {
                    return alert('saveDoc failed.');
                }
                //once doc is saved changes listener will update the row
            });
        });
    });


    $document.on('click', '#data-records [name=select-row-checkbox]', handleSelectRow);

    $document.on('click', '#data-records [data-action=select-all]', handleSelectAllRows);

    $document.on('click', '#data-records [data-action=unselect-all]', handleUnselectAllRows);

    $document.on('click', '.controls .edit-mode li:not(.disabled) .edit-update', handleUpdateFacility);

    $document.on('click', '.controls .edit-mode li:not(.disabled) .edit-delete', handleEditDelete);

    $document.on('click', '.controls .edit-mode li:not(.disabled) .mark-invalid', handleMarkInvalid);

    $document.on('click', '.controls .edit-mode li:not(.disabled) .clear-invalid', handleClearInvalid);

    $document.on('click', '#data-records .message', function(ev) {
        if ($(ev.target).closest('button').length === 0) {
            ev.preventDefault();
            $(this).parents('.data-record').toggleClass('expanded');
        }
    });

    $document.on('click', '.tasks-data_record .group-header .update', handleScheduleGroupUpdate);

    $document.on('click', '.tasks-data_record .group-header .edit', function(ev) {
        ev.preventDefault();
        var el = $(ev.target),
            table = el.closest('tbody');
        toggleEditMode(table);
        table.find('.tasks-due .datepicker').datetimepicker().each(function(idx, el) {
            var $el = $(el),
                picker = $el.data('datetimepicker'),
                ts = parseInt(
                    $el.closest('.tasks-due').find('[data-orig-val]').attr('data-orig-val'),
                    10
                );
            if (!ts)
                return;
            picker.setLocalDate(new Date(ts));
        });
        setupPhoneTypeahead(table.find('.tasks-to input'));
    });

    $document.on('click', '.tasks-data_record .group-header .cancel', function(ev) {
        // undo changes for group
        ev.preventDefault();
        var table = $(ev.target).closest('tbody');

        if (table.find('.new-task').length !== 0) {
            if (confirm('New rows were created, cancel anyway?'))
                table.find('.new-task').remove();
            else
                return;
        }

        // reset field values to original on cancel
        table.find('.tasks-state').each(function(idx, td) {
            var el = $(td).find('[data-orig-val]'),
                orig_val = el.attr('data-orig-val'),
                save_val = el.attr('data-save-val');

            if (!orig_val) return;
            el.attr('data-save-val', orig_val);
            el.attr('data-orig-val', '');
            el.removeClass('tasks-state-'+save_val);
            el.addClass('tasks-state-'+orig_val);
        });
        table.find('.tasks-to').each(function(idx, td) {
            td = $(td);
            td.find('input').val(td.find('.val').text());
        });
        table.find('.tasks-message').each(function(idx, td) {
            td = $(td);
            td.find('textarea').val(td.find('.val').text());
        });
        toggleEditMode(table);
    });

    $document.on('click', '.tasks-data_record .remove', function(ev) {
        ev.preventDefault();
        var el = $(ev.target),
            row = el.closest('tr');
        if (row.attr('data-tasks-idx')) {
            // setup task for removal or cancel
            row.attr('data-tasks-remove-idx', row.attr('data-tasks-idx'));
            row.addClass('tasks-removal-pending');
            row.after(
                '<tr class="tasks-removal">'
                + '<td colspan="5" class="tasks-removal">'
                + '<p>Save to complete removal.</p>'
                + '</td>'
                + '</tr>'
            );
        } else {
            // just update the DOM if task doesn't exist yet
            row.remove();
        }
    });

    $document.on('click', '.tasks-data_record .add-new', function(ev) {
        ev.preventDefault();
        var el = $(ev.target),
            table = el.closest('table');
        // setup new row
        var new_task = table.find('#new-task-template').clone();
        new_task.removeAttr('id')
            .addClass('new-task')
            .find('.tasks-due .datepicker')
            .datetimepicker();
        el.closest('tr').after(new_task);
        setupPhoneTypeahead(new_task.find('.tasks-to input'));
    });

    $document.on('click', '.tasks-data_record .group-header .save', handleScheduleGroupSave);

    $document.on('click', '.tasks-data_record .tasks-state .dropdown-menu a', function(ev) {
        // maintain data-orig-val and data-save-val on state element. used for
        // saving later on.
        ev.preventDefault();
        var el = $(ev.target),
            changeEl = el.closest('.tasks-state').find('[data-save-val]'),
            new_val = el.closest('a').attr('data-state'),
            orig_val = changeEl.attr('data-orig-val'),
            old_val = changeEl.attr('data-save-val');

        if (!new_val || (new_val === old_val))
            return;

        // on first change save original value for cancel
        if (!orig_val)
            changeEl.attr('data-orig-val', old_val);

        changeEl.attr('data-save-val', new_val);
        changeEl.removeClass('tasks-state-'+old_val);
        changeEl.addClass('tasks-state-'+new_val);
    });

    $document.on('click', '.data-record-revisions a', handleClickRevision);
}

// return boolean true if the record matches the logged in user
var isInDistrict = function(record) {
    if(isAdmin) { return true; }

    if (record.related_entities &&
        record.related_entities.clinic &&
        record.related_entities.clinic.parent &&
        record.related_entities.clinic.parent.parent &&
        record.related_entities.clinic.parent.parent._id) {

        return district === record.related_entities.clinic.parent.parent._id;
    } else {
        return false;
    }
};

//
// user must either be admin or have associated district to view records.
// show records by reported_date if no district filter is applied.
//
// returns options for renderRecords function
//
function getViewOptionsForFilter(req) {
    if (!req) {
        if (cache.viewOptions) {
            return cache.viewOptions;
        } else {
            return;
        }
    }

    // null form key is used to query for records without a matching form def
    var hasForm = req.query.form === "null" || req.query.form,
        form = req.query.form === "null" ? null : req.query.form,
        valid = req.query.valid,
        dh_id = district ? district : req.query.dh_id,
        patient_id = req.query.patient_id,
        cl_id = req.query.cl_id,
        startkey = [1e15],
        endkey = [0],
        view;

    // always check for admin or enforce district filtering.
    if (!isAdmin && !district) {
        return {};
    }

    var q = _.extend(req.query, {
        include_docs: true,
        limit: limit || 50,
        descending: true,
        startkey: startkey,
        endkey: endkey
    });

    if (hasForm) {
        if (form === null) {
            startkey.unshift('null_form');
            endkey.unshift('null_form');
        } else {
            startkey.unshift(form + '');
            endkey.unshift(form + '');
        }
    }
    if (cl_id && dh_id) {
        startkey.unshift(cl_id);
        startkey.unshift(dh_id);
        endkey.unshift(cl_id);
        endkey.unshift(dh_id);
    } else if (cl_id) {
        q.startkey.unshift(cl_id);
        q.endkey.unshift(cl_id);
    } else if (dh_id) {
        q.startkey.unshift(dh_id);
        q.endkey.unshift(dh_id);
    }
    if (valid) {
        startkey.unshift(valid === 'true');
        endkey.unshift(valid === 'true');
    }
    // patient id trumps the other filters
    if (patient_id) {
        q.startkey = [patient_id,{}];
        q.endkey = [patient_id];
    }

    if (patient_id) {
        if (dh_id) {
            view = 'data_records_by_district_patient_id_and_reported_date';
        } else {
            view = 'data_records_by_patient_id_and_reported_date';
        }
    } else {
        view = 'data_records';
    }

    cache.viewOptions = {
        query: q,
        view: view
    };
    return {
        query: q,
        view: view
    };
}

function li_template(query, title, baseURL) {
    baseURL = baseURL || require('duality/core').getBaseURL();

    return _.template('<li><a href="<%=baseURL%>/data_records?<%=query%>"><%-title%></a></li>', {
        baseURL: baseURL,
        query: querystring.stringify(query),
        title: title
    });
}

function configureControl(options) {
    var el = options.el;

    el.parent().show();
    if (options.display) {
        el.val(options.display);
    }

    el.select2({
        allowClear: true,
        data: options.data,
        placeholder: $.kansoconfig(options.placeholder)
    });
    el.on('change select2-removed', options.onSelectChange);
}

function sortSelect2Data(a, b) {
    if (a.text === b.text) {
        return 0;
    } else {
        return a.text < b.text ? -1 : 1;
    }
}

function handleSelectChange(q, e, options) {
    var val = e.val,
        baseURL = require('duality/core').getBaseURL();

    // fix for null & select2 for form filtering
    if (options.idKey === 'form' && val === '_messages') {
        val = 'null';
    }

    if (val && e.type !== 'select2-removed') {
        q[options.idKey] = val;
        if (options.textKey) {
            q[options.textKey] = options.text;
        }
    } else {
        delete q[options.idKey];
        if (options.textKey) {
            delete q[options.textKey];
        }
    }
    require('duality/core').handleUrl(e, baseURL + '/data_records?' + querystring.stringify(q));
}

function updateDistrictsControl(query) {
    var q,
        data = [],
        $select,
        view = 'data_records_by_district';

    // remove query params that can't be combined with dh
    q = _.omit(query, 'cl_id', 'cl_name', 'patient_id');

    $select = $('#district-filter [name=districts]');

    configureControl({
        el: $select,
        data: data,
        placeholder: 'District',
        value: q.dh_id,
        display: q.dh_name,
        onSelectChange: function(e) {
            handleSelectChange(q, e, {
                idKey: 'dh_id',
                textKey: 'dh_name',
                text: ($select.select2('data') || {}).text
            });
        }
    });

    getCachedView(view, {
        q: {
            group: true
        }
    }, function(err, rows) {
        if (err) {
            return alert(err);
        }
        data.splice(0, data.length);
        _.each(rows, function(row) {
            data.push({
                id: row.key[0],
                text: row.key[1] || 'Undefined'
            });
        });
        $select.select2('val', q.dh_id);
        data.sort(sortSelect2Data);
    });
}

//
// take query params and update clinics dropdown button on data records screen
//
function updateClinicsControl(query) {
    var q,
        data = [],
        $select,
        view_q,
        view = 'data_records_by_district_and_clinic';

    // remove query params that can't be combined with cl query
    q = _.omit(query, 'dh_id', 'dh_name', 'patient_id');

    // enforce district filter
    if (district) {
        view_q = {
            startkey: [district],
            endkey: [district, {}],
            group: true
        };
    } else {
        view_q = {
            group: true
        };
    }

    $select = $('#clinics-filter [name=clinics]');

    configureControl({
        el: $select,
        data: data,
        placeholder: 'Clinic Contact',
        display: q.cl_name,
        onSelectChange: function(e) {
            handleSelectChange(q, e, {
                idKey: 'cl_id',
                textKey: 'cl_name',
                text: ($select.select2('data') || {}).text
            });
        }
    })

    getCachedView(view, {
        q: view_q
    }, function(err, rows) {
        if (err) {
            return alert(err);
        }
        // clear old data
        data.splice(0, data.length);
        _.each(rows, function(row) {
            data.push({
                id: row.key[1],
                text: row.key[2] + ', ' + row.key[3]
            });
        });
        $select.select2('val', q.cl_id);
        data.sort(sortSelect2Data);
    });
}

function updateFormsControl(query) {
    var q = _.omit(query, 'patient_id'),
        data = [],
        view = 'data_records_by_district_and_form',
        baseURL = require('duality/core').getBaseURL(),
        form = q.form;

    $select = $('#form-filter [name=forms]');

    configureControl({
        el: $select,
        data: data,
        placeholder: 'Clinic Contact',
        onSelectChange: function(e) {
            handleSelectChange(q, e, {
                idKey: 'form'
            });
        }
    });

    // populate forms filter
    getCachedView(view, {
        q: {
            group: true
        },
        uniq: ['key',1]
    }, function(err, rows) {
        var val = q.form;

        if (err) {
            return alert(err);
        }

        if (q.form === null) {
            val = '_messages';
        }

        // clear old data
        data.splice(0, data.length);
        _.each(rows, function(row) {
            var key = row.key[1] + '';

            data.push({
                id: key,
                text: key
            });
        });
        data.sort(sortSelect2Data);
        data.unshift({
            id: '_messages',
            text: 'Messages'
        });
        data.unshift({
            id: '*',
            text: 'Forms'
        });

        $select.select2('val', val);
    });
}

var updatePatientIDControl = function(query) {

    var q = _.clone(query),
        baseURL = require('duality/core').getBaseURL();

    var view = dh_id ?
        'data_records_by_district_patient_id_and_reported_date' :
        'data_records_by_patient_id_and_reported_date';

    // only show patient id filter if we have some records with patient id field
    var update = function(err, rows) {
        if (err) return alert(err);
        if (rows.length > 0) {
            // show filter
            $('#patient-id-filter').show().find('form').attr(
                'action', baseURL + '/data_records'
            );
            $('#patient-id-filter .btn').off('click');
            $('#patient-id-filter .btn').on('click', function(ev) {
                ev.preventDefault();
                $(ev.target).closest('form').submit();
            });
        }
    }

    if (cache[view])
        return update(null, cache[view]);

    getCachedView(view, {q:{limit:1}}, update);
}

function getCachedView(view, options, callback) {

    if (!view || !callback) return;
    cache[view] = cache[view] ? cache[view] : [];
    options = options ? options : {q:{}};

    if (cache[view] && cache[view].length > 0) {
        return callback(null, cache[view]);
    }

    // populate cache
    db.getView(ddoc, view, options.q, function(err, data) {
        if (err) return callback(err);
        if (!options.uniq) {
            cache[view] = data.rows;
            return callback(null, cache[view]);
        }
        var uniq = {};
        _.each(data.rows, function(row) {
            if (options.uniq) {
                var val = row[options.uniq[0]][options.uniq[1]];
                if (uniq[val]) return;
                uniq[val] = 1; // hack to make unique list
            }
            cache[view].push(row);
        });
        callback(null, cache[view]);
    });

};

// update filters for records screen
function updateControls(req, callback) {
    var baseURL = require('duality/core').getBaseURL(req);

    // gather query params.
    var q = {
        dh_id: req.query.dh_id,
        dh_name: req.query.dh_name,
        cl_id: req.query.cl_id,
        cl_name: req.query.cl_name,
        form: req.query.form === "null" ? null : req.query.form,
        valid: req.query.valid,
        patient_id: req.query.patient_id
    };

    var noneLink = '<li><a href="' + baseURL + '/data_records">Show All</a></li>';

    if(!isAdmin && !district) return;

    $('.page-header .controls').first().html(
        templates.render('data_records_controls.html', req, {query:q})
    ).show();

    // add show all link
    $('.page-header .controls .records-filter')
        .find('.dropdown-menu').html(noneLink);

    $('#valid-filter').show().find('a.btn').html(
        'Valid' + (q.valid ? ': <b>' + q.valid + '</b>' : '') +
        ' <span class="caret"></span>'
    );

    //
    $('.dropdown-menu.valid a').attr(
        'href', baseURL + '/data_records?' + querystring.stringify(_.omit(q, 'valid'))
    );

    // append addl links for valid filter
    _.each(['true', 'false'], function(val) {
        var p = _.extend({}, q, { valid: val });
        $('.dropdown-menu.valid').append(li_template(p, val === 'true' ? 'Valid' : 'Invalid'));
    });

    // update controls that use caching
    updateFormsControl(q);
    if (isAdmin) {
        updateDistrictsControl(q);
    }
    updateClinicsControl(q);
    updatePatientIDControl(q);

    callback();
}

var onChangesFeedError = function() {

    var onSubmit = function(ev) {
        ev.preventDefault();
        window.location.reload();
    }

    var title = 'Lost data feed, please refresh.',
        note = '';

    $modal = $(templates.render('modal_alert.html', {}, {
        title: title,
        note: note
    }));
    $modal.modal('show');
    $modal.on('click','.cancel', onModalCancel);
    $modal.on('click','.submit', onSubmit);
}

var subDataRecordChanges = function() {
    var opts = {include_docs: true, filter:'kujua-lite/data_records'};
    db.changes(opts, function(err, data) {
        if (err) return setTimeout(onChangesFeedError, 3000);
        if (!data || !data.results) return;
        $(document).trigger('data-record-updated', data);
    });
};

exports.onDualityInit = function() {
    db = db || require('db').current();

    setupListeners();
    subDataRecordChanges();
};

exports.init = function(req, options) {
    if (!options) {
        return;
    }
    district = options.district;
    isAdmin = options.isAdmin;
    locale = utils.getUserLocale(req);
    db = require('db').current(req);

    // we need these reset for the initial show
    nextStartKey = null;
    lastRecord = null;
    firstRender = true;

    var options = getViewOptionsForFilter(req);

    updateControls(req, function() {
        renderRecords(options);
    });
}
