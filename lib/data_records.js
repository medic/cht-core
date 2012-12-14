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
                if (row.value[k])
                    vals.push(row.value[k]);
            }
            phones.push(vals.join(', '));
        });
        callback(null, phones);
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
    $(document).on(
        'focus',
        '.tasks-data_record .control-group [type=text]',
        function(ev) {
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
            tasks_idx = parseInt(btn.closest('table').attr('data-tasks-idx'), 10),
            idx = parseInt(btn.siblings('input[name=idx]').val(), 10),
            input = btn.siblings('input[type=text]'),
            match = input.val().match(/.*(\+\d{11}).*/),
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

};

exports.removeListeners = function() {
    $(window).off('scroll');
    $(document).off('click', '#data-records tr.main');
    $(document).off('click', '.tasks-data_record .to .error');
    $(document).off('click', '.tasks-data_record [type=submit]');
    $(document).off('mouseenter', '#data-records tr.main');
    $(document).off('mouseleave', '#data-records tr.main');
    $(document).off('click', '#data-records [name=select-row-checkbox]');
    $(document).off('click', '#data-records [name=select-all-rows]');
    $(document).off('click', '.controls .edit-mode .edit-update');
    $(document).off('click', '.controls .edit-mode .edit-delete');
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
            if (result.doc.type &&
                !result.doc.type.match(/^data_record/)) { return; }

            // not design docs
            if (result.id.match(/_design\//)) { return; }

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
                div.replaceWith(html);
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

exports.init = function(req, _district, _isAdmin, _dh_id, _form, _valid) {
    district = _district,
    isAdmin = _isAdmin,
    // null form key is used to query for records without a matching form def
    hasForm = _form === "null" || _form,
    form = _form === "null" ? null : _form,
    valid = _valid,
    dh_id = district ? district : _dh_id,
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
        by_district: {
            none: 'data_records_by_district_and_reported_date',
            form: 'data_records_by_district_form_and_reported_date',
            valid: 'data_records_by_district_valid_and_reported_date',
            form_valid: 'data_records_by_district_form_valid_and_reported_date'
        }
    };

    if (isAdmin && !dh_id && !hasForm && !valid) {
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
        }
        viewQuery = q;
    }

    renderRecords();
    subChanges();
}
