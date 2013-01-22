var sms_utils = require('kujua-sms/utils'),
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
    , viewName = ''
    , viewQuery = {}
    , limit = 50
    , district = ''
    , cache = {phones: []}
    , dh_id = null
    , form = null
    , locale;


var renderRecords = function() {
    var q = viewQuery;

    if(nextStartKey) {
        q['startkey'] = nextStartKey;
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

    if(!viewName) {
        render(null, []);
    } else if(!lastRecord) {
        db.getView(ddoc, viewName, q, render);
    }
};

var loadPhones = function(callback) {
    var q = {},
        view = 'facilities',
        phones = [];

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
exports.addListeners = function() {
    exports.removeListeners();

    $(window).scroll(function () {
        if ($(window).scrollTop() >= $(document).height()
                - $(window).height() - 10) {
            //log('scroll');
            setup();
        }
    });
    $(document).on('click', '#patient-id-filter .btn', function(ev) {
        ev.preventDefault();
        $(ev.target).closest('form').submit();
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
            // purge removed tasks
            for (var i in data.scheduled_tasks) {
                var task = data.scheduled_tasks[i];
                if (typeof task === 'undefined')
                    data.scheduled_tasks.splice(i,1);
            }
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
                    return delete data.scheduled_tasks[remove_idx];
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

exports.removeListeners = function() {
    $(window).off('scroll');
    $(document).off('click', '#patient-id-filter .btn');
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
            );

        });
    });
};

exports.init = function(req, _district, _isAdmin, _dh_id, _form, _valid, _patient_id) {
    district = _district,
    isAdmin = _isAdmin,
    // null form key is used to query for records without a matching form def
    hasForm = _form === "null" || _form,
    form = _form === "null" ? null : _form,
    valid = _valid,
    dh_id = district ? district : _dh_id,
    patient_id = _patient_id,
    db = require('db').current(req),
    locale = utils.getUserLocale(req);

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
    if (dh_id) {
        q.startkey.unshift(dh_id);
        q.endkey.unshift(dh_id);
    }
    // patient id trumps the other filters
    if (patient_id) {
        q.startkey = [patient_id,{}];
        q.endkey = [patient_id];
    }

    // we need these reset for the initial show
    nextStartKey = null;
    lastRecord = null;
    firstRender = true;

    // user must either be admin or have associated district to view
    // records also show records by reported_date if no district filter is
    // applied.

    var filters = {
        none: 'data_records_by_reported_date',
        form: 'data_records_by_form_and_reported_date',
        valid: 'data_records_by_valid_and_reported_date',
        form_valid: 'data_records_by_form_valid_and_reported_date',
        patient_id: 'data_records_by_patient_id_and_reported_date',
        by_district: {
            none: 'data_records_by_district_and_reported_date',
            form: 'data_records_by_district_form_and_reported_date',
            valid: 'data_records_by_district_valid_and_reported_date',
            form_valid: 'data_records_by_district_form_valid_and_reported_date',
            patient_id: 'data_records_by_district_patient_id_and_reported_date'
        }
    };

    if (isAdmin && !dh_id && !hasForm && !valid && !patient_id) {
        viewName = filters.none;
        viewQuery = q;
    } else if (isAdmin || district) {
        if (hasForm && dh_id && valid) {
            viewName = filters.by_district.form_valid;
        } else if (hasForm && dh_id) {
            viewName = filters.by_district.form;
        } else if (valid && dh_id) {
            viewName = filters.by_district.valid;
        } else if (valid && hasForm && !dh_id) {
            viewName = filters.form_valid;
        } else if (hasForm && !dh_id) {
            viewName = filters.form;
        } else if (valid && !dh_id) {
            viewName = filters.valid;
        } else if (!valid && !hasForm && dh_id) {
            viewName = filters.by_district.none;
        } else if (patient_id && dh_id) {
            viewName = filters.by_district.patient_id;
        } else if (patient_id && !dh_id) {
            viewName = filters.patient_id;
        }
        viewQuery = q;
    }

    renderRecords();
    subChanges();
}
