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

var db = null,
    timeoutID = null,
    nextStartKey = null,
    firstRender = true,
    lastRecord = null,
    viewName = '',
    viewQuery = {},
    limit = 50,
    district = '',
    phones = {health_centers: [], district_hospitals: [], clinics: []},
    dh_id = null,
    form = null,
    locale;


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
            $('.reached-last-record').show();
        } else if (data.total_rows < limit) {
            lastRecord = data.rows[data.rows.length - 1];
        } else if (data.rows && data.rows.length > 1) {
            nextStartKey = data.rows.pop().key;
        }
        var rows = _.map(data.rows, function(row, idx) {
            var r = sms_utils.makeDataRecordReadable(row.value);
            r._key = row.key;
            return r;
        });
        // render base template if this is the first render or we have no
        // rows.
        if(firstRender) {
            $('#loader').html(
                templates.render(
                    'data_records_table.html', {}, {
                      'Clinic': $.kansoconfig('Clinic'),
                      'Health_Center': $.kansoconfig('Health Center'),
                      'District': $.kansoconfig('District'),
                      data_records: rows
                    }
                )
            );
            firstRender = false;
        } else {
            $('#data-records .wrap').append(
                templates.render(
                    'data_records_rows.html', {}, {data_records: rows}
                )
            );
        }
        updateData = _.reduce(rows, function(result, row) {
          result[row._id] = row;
          return result;
        }, {});

        $('#data-records .data-record').each(function(index, el) {
          var key = el.getAttribute('rel'); // direct access for speed
          if (updateData[key]) {
            $(el).data('data-record', updateData[key]);
          }
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

var loadPhones = function() {
    var q = {group:true};

    if (dh_id) {
        q['startkey'] = [dh_id];
        q['endkey'] = [dh_id, {}];
    }

    db.getView(ddoc, 'phones_by_district_and_health_center', q,
        function(err, data) {
            if (err) {
                return alert(err);
            }
            for (var i in data.rows) {
                var row = data.rows[i];
                phones.health_centers.push(
                    [row.key[4], row.key[3], row.key[2]].join(', '));
            }
        }
    );
    db.getView(ddoc, 'phones_by_district_and_clinic', q,
        function(err, data) {
            if (err) {
                return alert(err);
            }
            for (var i in data.rows) {
                var row = data.rows[i];
                phones.clinics.push(
                    [row.key[4], row.key[3], row.key[2]].join(', '));
            }
        }
    );
    db.getView(ddoc, 'phones_by_district', q, function(err, data) {
        if (err) {
            return alert(err);
        }
        for (var i in data.rows) {
            var row = data.rows[i];
            phones.district_hospitals.push(
                [row.key[4], row.key[3], row.key[2]].join(', '));
        }
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

/*
 * TODO move all listeners into object so they are named and can be
 * removed/added with iterator.
 **/
exports.addListeners = function() {
    exports.removeListeners();

    $(window).scroll(function () {
        if ($(window).scrollTop() >= $(document).height()
                - $(window).height() - 10) {
            log('scroll');
            setup();
        }
    });
    // bind to: field error marks so they can be updated
    $(document).on('click', '.tasks-referral .error-missing-phone',
        function(ev) {
            $(this).hide();
            var form = $(this).siblings('form');
            form.css({display: 'inline'});
            // configure bootstrap typeahead effect
            $('[name=phone]', form).typeahead({
                source: phones.health_centers,
                items: 20,
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
    // remove error highlighting on subsequent tries
    $(document).on(
        'focus',
        '.tasks-referral .control-group [type=text]',
        function(ev) {
            $(this).closest('.control-group').removeClass('error');
    });
    // handle updating of 'to' field in referral task
    $(document).on('click', '.tasks-referral [type=submit]', function(ev) {
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
                if (e.error === 'Could not find referral recipient.') {
                    // legacy error messages
                    data.errors.splice(i, 1);
                } else if (e.code === 'recipient_not_found') {
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

    var showEdit = function(ev) {
        logger.debug('fire showEdit');
        $(this).find('.row-controls').show();
    };

    var hideEdit = function(ev) {
        logger.debug('fire hideEdit');
        var div = $(this).find('.row-controls');
        div.hide();
    };

    // bind/unbind events for edit mode
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
        table.toggleClass('hide');
    });

    $(document).on('click', '[data-toggle=extended]', function(ev) {
        $(this).siblings('.extended').toggle();
    });

    $(document).on('click', '[data-dismiss=extended]', function(ev) {
        $(this).closest('.extended').addClass('hide');
    });

    // bind to edit row button
    $(document).on('click', '.row-controls .edit', function(ev) {
        var data = $(this).parents('.data-record').data('data-record'),
            id = data._id;
        ev.preventDefault();
        ev.stopPropagation();
        new Kujua.ClinicsView({ data: data })
    });

    // bind to delete buttons
    $(document).on('click', 'form[data-ajax=removeDoc]', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var form = $(this),
            _id = form.find('[name=_id]').val(),
            _rev = form.find('[name=_rev]').val(),
            tds = $('[rel='+_id+'] .main td');

        // highlight row to warn user
        tds.addClass('warning');

        if(confirm('Remove permanently?')) {
            db.removeDoc({_id: _id, _rev: _rev}, function(err, resp) {
                if (err) {
                    return alert(err);
                }
                // doing actual delete in changes feed sub instead of here
                // to avoid race condition
            });
        } else {
            tds.removeClass('warning');
        }
    });
};

exports.removeListeners = function() {
    $(window).off('scroll');
    $(document).off('click', '#data-records tr.main');
    $(document).off('click', '.tasks-referral .to .error');
    $(document).off('mouseenter', '#data-records tr.main');
    $(document).off('mouseleave', '#data-records tr.main');
    $('.edit-mode').removeClass('active');
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
            var doc = sms_utils.makeDataRecordReadable(result.doc),
                html = templates.render(
                    'data_records_rows.html', {}, {data_records: [doc]});

            if(div.length > 0) {
                div.replaceWith(html);
            } else {
                $(html).insertBefore('#data-records .data-record:first')
                    .hide().fadeIn(500);
            }
            $('[rel=' + doc._id + ']').data('data-record', doc);
        });
    });
};

exports.init = function(req, _district, _isAdmin, _dh_id, _form, _valid) {
    district = _district,
    isAdmin = _isAdmin,
    form = _form,
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
    if(form) {
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

    if (isAdmin && !dh_id && !form && !valid) {
        viewName = filters.none;
        viewQuery = q;
    } else if (isAdmin || district) {
        if (form && dh_id && valid) {
            viewName = filters.by_district.form_valid;
        } else if (form && dh_id) {
            viewName = filters.by_district.form;
        } else if (valid && dh_id) {
            viewName = filters.by_district.valid;
        } else if (valid && form && !dh_id) {
            viewName = filters.form_valid;
        } else if (form && !dh_id) {
            viewName = filters.form;
        } else if (valid && !dh_id) {
            viewName = filters.valid;
        } else if (!valid && !form && dh_id) {
            viewName = filters.by_district.none;
        }
        viewQuery = q;
    }

    renderRecords();
    loadPhones();
    subChanges();
}
