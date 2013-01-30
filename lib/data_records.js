var sms_utils = require('kujua-sms/utils'),
    querystring = require('querystring'),
    jsonforms = require('views/lib/jsonforms'),
    utils = require('kujua-utils'),
    logger = utils.logger,
    templates = require('duality/templates'),
    _ = require('underscore')._,
    moment = require('moment'),
    settings = require('settings/root'),
    ddoc = settings.name;

/*
 * TODO use proper/consistent style here, camel case only for functions,
 * underscores for vars.
 * */

var RE_PHONE = /.*(\+\d{11,15}).*/;

var db = null
    , timeoutID = null
    , nextStartKey = null
    , firstRender = true
    , lastRecord = null
    , limit = 50
    , district = ''
    , cache = {}
    , dh_id = null
    , cl_id = null
    , form = null
    , locale;


var renderRecords = function(options) {

    if (!options) return;

    if(nextStartKey) {
        options.query['startkey'] = nextStartKey;
    }

    var render = function(err, data) {
        var updateData;

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
        var rows = _.map(data.rows, function(row, idx) {
            return sms_utils.makeDataRecordReadable(row.value);
        });
        // render base template if this is the first render or we have no
        // rows.
        if(firstRender) {
            $('#loader').html(
                templates.render(
                    'data_records_table.html', {}, {
                      'Clinic': $.kansoconfig('Clinic'),
                      'Clinic_Contact': $.kansoconfig('Clinic Contact'),
                      'Health_Center': $.kansoconfig('Health Center'),
                      'RC_Code': $.kansoconfig('RC Code'),
                      'Facility': $.kansoconfig('Facility'),
                      'District': $.kansoconfig('District'),
                      data_records: rows
                    }
                )
            );
            firstRender = false;
            if (!nextStartKey && rows.length > 0)
                $('.reached-last-record').show();
        } else {
            $('#data-records .wrap').append(
                templates.render(
                    'data_records_rows.html', {}, {data_records: rows}
                )
            );
            if (!nextStartKey)
                $('.reached-last-record').show();
        }
        updateData = _.reduce(data.rows, function(result, row) {
          result[row.value._id] = sms_utils.makeDataRecordOriginal(row.value);
          return result;
        }, {});

        $('#data-records .data-record').each(function(index, el) {
          var key = el.getAttribute('rel'); // direct access for speed
          if (updateData[key])
            $(el).data('data-record', updateData[key]);
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

var loadPhones = function(callback) {
    var q = {},
        view = 'facilities',
        phones = [];

    cache.phones = cache.phones ? cache.phones : [];

    if (cache.phones.length !== 0)
        return callback(null, cache.phones);

    if (district) {
        q['startkey'] = [district];
        q['endkey'] = [district, {}];
        view = 'facilities_by_district';
    }

    db.getView(ddoc, view, q, function(err, data) {
        if (err) return callback(err);
        data.rows.forEach(function(row) {
            var vals = [];
            for (var k in row.value) {
                if (row.value[k]) {
                    if (row.value[k].name)
                        vals.push(row.value[k].name);
                    else
                        vals.push(row.value[k]);
                }
            }
            cache.phones.push(vals.join(', '));
        });
        callback(null, cache.phones);
    });
};

var cancel = function() {
    if(typeof timeoutID === "number") {
        window.clearTimeout(timeoutID);
        delete timeoutID;
    }
};

var setup = function() {
    cancel();
    if(!lastRecord) {
        $('.ajax-loader').show();
        timeoutID = window.setTimeout(
            function(msg) {renderRecords();}, 700);
    }
};

var highlightRows = function($divs, bool) {

    bool = bool === undefined ? true : bool;

    if (bool)
        $divs.find('.main td').addClass('warning');
    else
        $divs.find('.main td').removeClass('warning');

};

/*
 * TODO move all listeners into object so they are named and can be
 * removed/added with iterator.
 **/
var addListeners = function() {

    removeListeners();

    $(window).scroll(function () {
        if ($(window).scrollTop() >= $(document).height()
                - $(window).height() - 10) {
            //log('scroll');
            setup();
        }
    });
    $(document).on('data-record-updated', function(ev) {
        console.debug('data_records heard event record-updated');
    });
    // for some reason bootstrap does not clear error on textareas
    $(document).on('focus', 'textarea', function(ev) {
        $(ev.target).closest('.control-group').removeClass('error');
    });
    // bind to: field error marks so they can be updated
    $(document).on('click', '.tasks-data_record .error-missing-phone',
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
    $(document).on( 'focus', '.tasks-data_record .control-group [type=text]', function(ev) {
            $(this).closest('.control-group').removeClass('error');
    });
    // handle updating of 'to' field in message task
    $(document).on('click', '.tasks-data_record [type=submit]', function(ev) {
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

    var handleSelectRow = function(ev) {
        var checkbox = $(this);
        ev.stopPropagation();
        highlightRows(checkbox.parents('.data-record'), checkbox.prop('checked'));
    }

    var handleSelectAllRows = function(ev) {
        var val = $(this).prop('checked');
        highlightRows(
            $('#data-records [name=select-row-checkbox]').prop('checked', val)
                .parents('.data-record'), val
        );
    }

    var doBulkEdit = function(options, callback) {
        var docs = [],
            extra = options && options.extra;

        $('#data-records [name=select-row-checkbox]:checked').each(function(idx, el) {
            var div = $(el).parents('.data-record');
            var record  = div.data().dataRecord;
            if (record && record._id && record._rev) {
                if (extra && extra !== null) {
                    docs.push( _.extend(record, extra) );
                } else {
                    docs.push(record);
                }
            }
        });

        if (docs.length === 0)
            return callback('No rows selected.');

        callback(null, docs);
    };

    var handleClearInvalid = function(ev) {
        ev.preventDefault();

        var options = {};

        doBulkEdit(options, function(err, docs) {
            if (err)
                return alert(err);
            if(!confirm('Update '+docs.length+' records?'))
                return;
            for (var i in docs) {
                docs[i].errors = [];
            }
            db.bulkSave(docs, function(err, data) {
                if (err)
                    return alert('Save failed. ' + err);
                //changes listener will update screen
            });
        });
    }
    var handleMarkInvalid = function(ev) {
        ev.preventDefault();

        var docs = [],
            $m;

        var close = function() {
            $m.modal('hide');
            $m.remove();
        }
        var handleCancel = function(ev) {
            ev.preventDefault();
            close();
        }
        var handleSubmit = function(ev) {
            ev.preventDefault();
            var $el = $(this),
                msg = $m.find('textarea').val().trim();

            if (!msg) {
                $m.find('.control-group').addClass('error');
                $m.find('.error-msg').show();
                return;
            }
            for (var i in docs) {
                docs[i].errors.push({
                    code:'marked_invalid',
                    message: msg
                });
            }
            db.bulkSave(docs, function(err, data) {
                if (err)
                    return alert('Save failed. ' + err);
                close();
                //changes listener will update screen
            });
        }

        var options = {};
        doBulkEdit(options, function(err, _docs) {
            if (err)
                return alert(err);
            if(confirm('Update '+_docs.length+' records?')) {
                // setup modal
                $m = $(templates.render('edit_invalid.html', {}, {}));
                $m.modal('show');
                $m.on('click','.cancel', handleCancel);
                $m.on('click','.submit', handleSubmit);
                docs = _docs;
            }
        });
    }

    var handleEditDelete = function(ev) {
        ev.preventDefault();

        var options = {extra: {_deleted: true}};

        doBulkEdit(options, function(err, docs) {

            if (err)
                return alert(err);

            if(confirm('Permanently remove '+docs.length+' records?')) {

                db.bulkSave(docs, function(err, data) {
                    if (err)
                        return alert(err);
                    //changes listener will update screen
                });

            }
        });

    }

    var handleEditUpdateFacility = function(ev) {
        ev.preventDefault();

        doBulkEdit(null, function(err, docs) {

            if (err)
                return alert(err);

            var options = {data:docs};
            if (district)
                options.url = 'facilities.json/' + district;
            new Kujua.ClinicsView(options);
        });
    }

    $(document).on(
        'click', '#data-records [name=select-row-checkbox]', handleSelectRow
    );
    $(document).on(
        'click', '#data-records [name=select-all-rows]', handleSelectAllRows
    );
    $(document).on(
        'click', '.controls .edit-mode .edit-update', handleEditUpdateFacility
    );
    $(document).on(
        'click', '.controls .edit-mode .edit-delete', handleEditDelete
    );
    $(document).on(
        'click', '.controls .edit-mode .mark-invalid', handleMarkInvalid
    );
    $(document).on(
        'click', '.controls .edit-mode .clear-invalid', handleClearInvalid
    );

    $(document).on('click', '#data-records tr.main', function(ev) {
        ev.preventDefault();
        var table = $(this).parents('table').next();
        table.toggleClass('hide');
    });

    $(document).on('click', '[data-toggle=extended]', function(ev) {
        $(this).siblings('.extended').toggle();
    });

    $(document).on('click', '[data-dismiss=extended]', function(ev) {
        $(this).closest('.extended').addClass('hide');
    });

    //
    // schedule editing
    //
    var setupPhoneTypeahead = function($el) {
        // setup typeahead on tasks-to field.  $el should jquery list of input
        // fields
        loadPhones(function(err, data) {
            if (err)
                return alert("Warning: problem getting phone data.\n" + err);
            $el.typeahead({
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
    $(document).on('click', '.tasks-data_record .group-header .edit', function(ev) {
        ev.preventDefault();
        var el = $(ev.target),
            table = el.closest('table');
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
    $(document).on('click', '.tasks-data_record .group-header .cancel', function(ev) {
        // undo changes for group
        ev.preventDefault();
        var table = $(ev.target).closest('table');

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
    $(document).on('click', '.tasks-data_record .remove', function(ev) {
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
    $(document).on('click', '.tasks-data_record .add-new', function(ev) {
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
    $(document).on('click', '.tasks-data_record .group-header .save', function(ev) {
        ev.preventDefault();
        //save scheduled tasks data
        var button = $(ev.target),
            id = button.closest('[rel]').attr('rel'),
            table = button.closest('table');

        // disable while we do IO
        button.attr('disabled', 'disabled');
        button.siblings('.cancel').attr('disabled', 'disabled');

        function finalize(err, data) {
            button.removeAttr('disabled');
            button.siblings('.cancel').removeAttr('disabled', 'disabled');
            if (err) return alert("Save failed. " + err);
            var keep_tasks = [];
            // purge removed tasks
            // originally used .splice here to remove but had issues
            for (var i in data.scheduled_tasks) {
                if (data.scheduled_tasks[i])
                    keep_tasks.push(data.scheduled_tasks[i]);
            }
            data.scheduled_tasks = keep_tasks;
            db.saveDoc(data, function(err, data) {
                if (err) return alert('Save failed. ' + err);
                toggleEditMode(table);
                //once doc is saved changes listener will update the row
            });
        };

        var tasks = table.find('[data-tasks-idx]'),
            new_tasks = table.find('.new-task'),
            group,
            type;

        if (tasks.length === 0 && new_tasks.length === 0)
            return finalize('Nothing to update.');

        db.getDoc(id, function(err, data) {

            if (err) return finalize(err);

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
                    return data.scheduled_tasks[remove_idx] = null;
                }

                // state
                var task_field = task.find('.tasks-state'),
                    val = task_field.find('[data-save-val]').attr('data-save-val'),
                    orig = task_field.find('[data-orig-val]').attr('data-orig-val');
                if (!val) {
                    valid.push('State value is empty.');
                    task_field.find('.control-group').addClass('error');
                }
                if (val && data.scheduled_tasks[task_idx].state !== val) {
                    data.scheduled_tasks[task_idx].state = val;
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
                if (val && data.scheduled_tasks[task_idx].due !== val) {
                    data.scheduled_tasks[task_idx].due = val;
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
                if (val && data.scheduled_tasks[task_idx].messages[0].to !== val) {
                    data.scheduled_tasks[task_idx].messages[0].to = val;
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
                if (val && data.scheduled_tasks[task_idx].messages[0].message !== val) {
                    data.scheduled_tasks[task_idx].messages[0].message = val;
                    updated = true;
                }

                // save the type and group the same as siblings
                if (!type || !group) {
                    type = data.scheduled_tasks[task_idx].type;
                    group = data.scheduled_tasks[task_idx].group;
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
                data.scheduled_tasks.push(task);
                updated = true;
            }

            if (valid.length !== 0)
                return finalize('Data is not valid:\n  '+valid.join('\n  '));

            if (!updated)
                return finalize('Nothing was changed.');

            return finalize(null, data);
        });
    });
    $(document).on('click', '.tasks-data_record .tasks-state .dropdown-menu a', function(ev) {
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
};

var removeListeners = function() {
    $(window).off('scroll');
    $(document).off('focus', 'textarea');
    $(document).off('click', '#data-records tr.main');
    $(document).off('click', '.tasks-data_record .to .error');
    $(document).off('click', '.tasks-data_record [type=submit]');
    $(document).off('mouseenter', '#data-records tr.main');
    $(document).off('mouseleave', '#data-records tr.main');
    $(document).off('click', '#data-records [name=select-row-checkbox]');
    $(document).off('click', '#data-records [name=select-all-rows]');
    $(document).off('click', '.controls .edit-mode .edit-update');
    $(document).off('click', '.controls .edit-mode .edit-delete');
    $(document).off('click', '.controls .edit-mode .mark-invalid');
    $(document).off('click', '.controls .edit-mode .clear-invalid');
    $(document).off('click', '.tasks-data_record .group-header .cancel');
    $(document).off('click', '.tasks-data_record .group-header .edit');
    $(document).off('click', '.tasks-data_record .remove');
    $(document).off('click', '.tasks-data_record .add-new');
    $(document).off('click', '.tasks-data_record .group-header .save');
    $(document).off('click', '.tasks-data_record .tasks-state .dropdown-menu a');
};

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

var subChanges = function() {
    db.changes({include_docs: true}, function(err,data) {
        if (err) { logger.error(err); return; }
        if (!data || !data.results) { return; }
        console.log('sub\'ing to changes feed');

        _.each(data.results, function(result) {
            var type = result.doc.type;

            // only handle changes for data records
            if (!result.doc || !result.doc.type ||
                !result.doc.type.match(/^data_record/)) { return; }

            var div = $('[rel='+result.id+']');

            // remove deleted records
            if (result.deleted && div.length > 0) {
                div.fadeOut(500, function() { $(this).remove(); });
                return;
            }

            // if not deleted, then only update for this district
            if (!isInDistrict(result.doc)) { return; }

            // render new/updated records
            var html = templates.render( 'data_records_rows.html', {},
                {
                    data_records: [
                        sms_utils.makeDataRecordReadable(result.doc)
                    ]
                }
            );

            if(div.length > 0) {
                // preserve expando visibility
                var css = div.children('.extended').attr('class');
                div.replaceWith(function() {
                    var newDiv = $(html);
                    newDiv.children('.extended').attr('class',css);
                    return newDiv;
                });
            } else {
                $(html).insertBefore('#data-records .data-record:first')
                    .hide().fadeIn(500);
            }

            // attach original doc to element with jquery data api. use
            // separate jquery call, for some reason chaining failed.
            $('[rel='+result.doc._id+']').data(
                'data-record',
                sms_utils.makeDataRecordOriginal(result.doc)
            ).trigger('data-record-updated');

        });
    });
};


//
// user must either be admin or have associated district to view records.
// show records by reported_date if no district filter is applied.
//
// returns options for renderRecords function
//
var getViewOptionsForFilter = function(req) {

    if (!req) return;

    // null form key is used to query for records without a matching form def
    var hasForm = req.query.form === "null" || req.query.form,
        form = req.query.form === "null" ? null : req.query.form,
        valid = req.query.valid,
        dh_id = district ? district : req.query.dh_id,
        patient_id = req.query.patient_id,
        cl_id = req.query.cl_id;

    // always check for admin or enforce district filtering.
    if (!isAdmin && !district) return {};
    if (!isAdmin && !dh_id && !district) return {};

    var q = _.extend(req.query, {
        limit: limit || 50,
        descending: true,
        startkey: [{}],
        endkey: []
    });

    if(valid) {
        q.startkey.unshift(valid === 'true');
        q.endkey.unshift(valid === 'true');
    }
    if(hasForm) {
        q.startkey.unshift(form);
        q.endkey.unshift(form);
    }
    if (cl_id) {
        q.startkey.unshift(cl_id);
        q.endkey.unshift(cl_id);
    }
    if (dh_id) {
        q.startkey.unshift(dh_id);
        q.endkey.unshift(dh_id);
    }
    // patient id trumps the other filters
    if (patient_id) {
        q.startkey = [patient_id,{}];
        q.endkey = [patient_id];
    }

    var getViewName = function() {

        // no filters are set
        if (!hasForm && !valid && !patient_id && !cl_id)
            return dh_id ?
                'data_records_by_district_and_reported_date':
                'data_records_by_reported_date';

        // patient_id
        // trumps other filters except enforced district
        if (patient_id)
            return dh_id ?
                'data_records_by_district_patient_id_and_reported_date':
                'data_records_by_patient_id_and_reported_date';

        // clinic
        // district is trumped when filtering by clinic
        if (cl_id && !valid && !hasForm)
            return dh_id ?
                'data_records_by_district_clinic_and_reported_date':
                'data_records_by_clinic_and_reported_date';

        // clinic & form
        if (cl_id && hasForm && !valid)
            return dh_id ?
                'data_records_by_district_clinic_form_and_reported_date':
                'data_records_by_clinic_form_and_reported_date';

        // clinic & valid
        if (cl_id && valid && !hasForm)
            return dh_id ?
                'data_records_by_district_clinic_valid_and_reported_date':
                'data_records_by_clinic_valid_and_reported_date';

        // clinic & form & valid
        if (cl_id && valid && hasForm)
            return dh_id ?
                'data_records_by_district_clinic_form_valid_and_reported_date':
                'data_records_by_clinic_form_valid_and_reported_date';

        // form
        if (hasForm && !cl_id && !valid)
            return dh_id ?
                'data_records_by_district_form_and_reported_date':
                'data_records_by_form_and_reported_date';

        // valid
        if (valid && !hasForm && !cl_id)
            return dh_id ?
                'data_records_by_district_valid_and_reported_date':
                'data_records_by_valid_and_reported_date';

        //form & valid
        if (valid && hasForm && !cl_id)
            return dh_id ?
                'data_records_by_district_form_valid_and_reported_date':
                'data_records_by_form_valid_and_reported_date';
    }

    console.log('getViewName returns',getViewName());
    return {query:q, view:getViewName()};

}

var li_template = function(query, title, baseURL) {
    if (!baseURL)
        baseURL = require('duality/core').getBaseURL();
    return '<li><a href="' + baseURL + '/data_records?' +
        querystring.stringify(query) + '">'
        + title + '</a></li>';
};

var updateDistrictsControl = function(query) {

    var q = _.clone(query),
        view = 'data_records_by_district',
        baseURL = require('duality/core').getBaseURL();

    // unhide
    $('#district-filter').show().find('a.btn').html(
        $.kansoconfig('District') + (q.dh_name ? ': <b>' + q.dh_name + '</b>' : '') +
        ' <span class="caret"></span>'
    );

    // remove query params that can't be combined with dh
    delete q.dh_name;
    delete q.dh_id;
    delete q.cl_id;
    delete q.cl_name;
    delete q.patient_id;

    // show all option
    $('.dropdown-menu.district-hospitals a').attr(
        'href', baseURL + '/data_records?' + querystring.stringify(q)
    );

    var update = function(err, rows) {
        if (err) return alert(err);
        $dd = $('.dropdown-menu.district-hospitals');
        _.each(rows, function(dh) {
            var p = _.extend(q, {
                dh_id: dh.key[0],
                dh_name: dh.key[1] || "Undefined"
            });
            $dd.append(
                li_template(p, p.dh_name, baseURL)
            );
        });
    }

    var opts = {q: {group:true}};
    getCachedView(view, opts, update);

}

//
// take query params and update clinics dropdown button on data records screen
//
var updateClinicsControl = function(query) {

    var q = _.clone(query),
        view_q = {group: true},
        view = 'data_records_by_district_and_clinic',
        baseURL = require('duality/core').getBaseURL();

    // enforce district filter
    if (dh_id)
        view_q = {startkey: [], endkey: [dh_id,{}], group: true};

    // unhide control
    $('#clinics-filter').show().find('a.btn').html(
        $.kansoconfig('Clinic Contact') + (q.cl_name ? ': <b>' + q.cl_name + '</b>' : '') +
        ' <span class="caret"></span>'
    );

    // remove query params that can't be combined with cl query
    delete q.cl_name;
    delete q.cl_id;
    delete q.dh_id;
    delete q.dh_name;
    delete q.patient_id;

    // update show all option
    $('.dropdown-menu.clinics a').attr(
        'href', baseURL + '/data_records?' + querystring.stringify(q)
    );

    var update = function(err, rows) {
        if (err) return alert(err);
        var $dd = $('.dropdown-menu.clinics');
        rows.forEach(function(row) {
            var p = _.extend(q, {
                cl_id: row.key[1],
                cl_name: [row.key[2], row.key[3]].join(', ')
            });
            $dd.append(li_template(p, p.cl_name, baseURL));
        });
    }

    getCachedView(view, {q: view_q}, update);

}

var updateFormsControl = function(query) {

    var q = _.clone(query),
        view = 'data_records_by_district_and_form',
        baseURL = require('duality/core').getBaseURL();

    delete q.patient_id;
    // show filter
    $('#form-filter').show().find('a.btn').html(
        'Form' + (q.form ? ': <b>' + q.form + '</b>' : '') +
        ' <span class="caret"></span>'
    );

    // update the show all link
    delete q.form;
    $('.dropdown-menu.forms a').attr(
        'href', baseURL + '/data_records?' + querystring.stringify(q)
    );

    var update = function(err, rows) {
        if (err) return alert(err);
        var $dd = $('.dropdown-menu.forms');
        rows.forEach(function(row) {
            var code = row.key[1];
            var p = _.extend(q, {
                form: code + '' // make null -> "null"
            });
            $dd.append(li_template(p, p.form, baseURL));
        });
    }

    // populate forms filter
    var opts = {q:{group: true}, uniq: ['key',1]};
    getCachedView(view, opts, update);

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
            console.log('bind submit button on patient id search');
            $('#patient-id-filter .btn').off('click');
            $('#patient-id-filter .btn').on('click', function(ev) {
                ev.preventDefault();
                console.log('call submit button on patient id search');
                $(ev.target).closest('form').submit();
            });
        }
    }

    if (cache[view])
        return update(null, cache[view]);

    getCachedView(view, {q:{limit:1}}, update);


}

var getCachedView = function(view, options, callback) {

    if (!view || !callback) return;
    cache[view] = cache[view] ? cache[view] : [];
    options = options ? options : {q:{}};

    if (cache[view] && cache[view].length > 0) {
        console.info('using cache for',view);
        return callback(null, cache[view]);
    }

    // populate cache
    db.getView(ddoc, view, options.q, function(err, data) {
        if (err) return callback(err);
        console.log('populating cache', view);
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
var updateControls = function(req) {

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

    if(!isAdmin && !isDistrictAdmin) return;

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

    var q3 = _.clone(q);
    delete q3.valid;
    $('.dropdown-menu.valid a').attr(
        'href', baseURL + '/data_records?' + querystring.stringify(q3)
    );

    // append addl links for valid filter
    _.each(['true','false'], function(val) {
        var p = _.extend(_.clone(q), {valid: val});
        $('.dropdown-menu.valid').append(li_template(p, val));
    });

    // update controls that use caching
    updateFormsControl(q);
    if (isAdmin) updateDistrictsControl(q);
    updateClinicsControl(q);
    updatePatientIDControl(q);

    $(document).unbind('update-facilities');
    $(document).bind('update-facilities', function(ev, data) {
      var docs = data.docs;
      // revalidate facilities ... should be a util function somehow?
      for (var i in docs) {
          var record = docs[i];
          record.errors = _.reduce(record.errors, function(errors, error) {
            if (!(error.code === 'sys.facility_not_found' && record.related_entities.clinic)) {
              errors.push(error);
            }
            return errors;
          }, []);
      }
      db.bulkSave(docs, function(err, data) {
          if (err)
              return alert(err);
          //changes listener will update screen
      });
    });
};

exports.init = function(req, options) {
    if (!options) return;
    district = options.district;
    isAdmin = options.isAdmin;
    locale = utils.getUserLocale(req);
    db = require('db').current(req);

    // we need these reset for the initial show
    nextStartKey = null;
    lastRecord = null;
    firstRender = true;
    console.log('data_records firstRender is',firstRender);

    var options = getViewOptionsForFilter(req);
    renderRecords(options);
    subChanges();
    updateControls(req);
    addListeners();
}
