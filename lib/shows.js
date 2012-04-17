/**
 * Show functions to be exported from the design doc.
 */

var querystring = require('querystring'),
    db = require('db'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    smsforms = require('views/lib/smsforms'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    pagination = require('kujua-pagination/pagination'),
    cookies = require('cookies'),
    moment = require('moment'),
    logger = utils.logger,
    jsDump = require('jsDump'),
    _ = require('underscore')._;

exports.sms_forms = function (doc, req) {

    events.on('afterResponse', function() {

        var db = require('db').current(),
            isAdmin = utils.isUserAdmin(req.userCtx),
            baseURL = require('duality/core').getBaseURL(),
            district = utils.getUserDistrict(req.userCtx),
            q = {startkey: [district], endkey: [district,{}], group: true};

        $('.page-header h1').text('SMS Forms Data');
        $('.nav *').removeClass('active');
        $('.nav .home').addClass('active');
        $('.page-header .controls').hide();

        // render available downloads based on data available
        // user must either be admin or have associated district to view records
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            db.getView(
                'kujua-export',
                'data_records_valid_by_district_and_form',
                q,
                renderDownloadForms);
        } else {
            renderDownloadForms(null, []);
        }
    });

    return {
        title: 'SMS Forms',
        content: templates.render('sms_forms.html', req, {})
    };
};

var renderDownloadForms = function(err, data) {

    var req = dutils.currentRequest();

    if (err) {
        return alert(err);
    }

    var forms = _.map(data.rows, function(row) {
        var dh_id = row.key[0],
            form = row.key[1],
            dh_name = row.key[2],
            q = db.stringifyQuery({
                    startkey: [dh_id, form],
                    endkey: [dh_id, form, {}],
                    form: form,
                    include_docs: true,
                    reduce: false,
                    dh_name: dh_name});
        return {
            dh_id: dh_id,
            form: form,
            dh_name: dh_name,
            title: row.key[3],
            total: row.value,
            isAdmin: utils.isUserAdmin(req.userCtx),
            q: querystring.stringify(q)};
    });

    $('#forms').html(
        templates.render('sms_forms_data.html', {}, {
            forms: forms.length > 0 ? forms : null
        })
    );

    // adjust download options based on locale value.  currently only
    // supporting French. TODO use locale value in cookie instead of query
    // param.
    //logger.debug(['hi cookie', req.cookie]);
    //logger.debug(['hi locale', req.cookie.kujua_locale]);
    //making french xml default for now
    //if (req.cookie.kujua_locale && req.cookie.kujua_locale.match(/^fr/i)) {
      $('.form option').each(function(idx, el) {
          var option = $(el);
          var val = option.attr('value').split('.')[1];
          if (val.match(/xml\?locale=fr/)) {
            option.attr('selected','selected');
          }
      });
    //}
};

var renderDoc = function(data, textStatus, jqXHR) {

    $('#docs-body').html(sd.makeHtml(data));
    var title = $('#docs-body h1:first-child').text();
    $('#docs-body h1:first-child').remove();
    $('.page-header h1').text(title);
    $('.page-header .controls').hide();
    $('.nav *').removeClass('active');
    $('.nav .docs').addClass('active');

    // render TOC unless no sub headers
    if ($('#docs-body h2').get(0)) {
      var ul = $('<ul/>');
      $('#docs-body h2, #docs-body h3').each(function(idx, el) {
        var header = $(el),
            title = header.text(),
            id = header.attr('id');
        if (el.tagName === 'H2') {
          ul.append(
            $('<li/>').append(
              $('<a/>').attr('href', '#'+id).text(title)));
        } else {
          ul.append(
            $('<li class="subhead"/>').append(
              $('<a/>').attr('href', '#'+id).text(title)));
        }
      });
      $('.sections').append(ul);
      $('.sections').show();
    } else {
      $('.sections').hide();
    }

    // make large images zoomable
    $('#docs-body img').each(function(idx, el) {
        var t =  $("<img/>"),
            width = 0,
            height = 0;
        t.attr("src", $(el).attr("src"));
        t.load(function() {
            width = this.width;
            height = this.height;
            $(el).parent().addClass('images');
            if (width > 960) {
              $(el).parent().addClass('zoom');
              $(el).parent().bind('click', function() {
                var p = $(this);
                if (p.attr('style')) {
                  p.attr('style',null);
                } else {
                  p.css({'width': width});
                }
              });
            };
        });
    });

    // wrap code with overflow auto
    var limit = 860;
    $('#docs-body code').each(function(idx, el) {
        var _el  = $(this);
        var width = _el.width();
        if (_el.hasClass('shorten')) {
            _el.wrap($('<div/>').addClass('scroll-short'));
        } else if (width > limit) {
            _el.wrap($('<div/>').addClass('scroll'));
        }
    });
};

exports.docs = function (doc, req) {

    var page = req.query.page,
        dir = req.query.dir,
        baseURL = require('duality/core').getBaseURL(),
        url = baseURL + '/static/docs/';

    // todo support more subdirs
    if (dir && page) {
        url += dir + '/' + page + '.md';
    } else if (dir) {
        url += dir + '/index.md';
    } else if (page) {
        url += page + '.md';
    } else {
        url += 'index.md';
    }

    /*
     * strange bug, this needs to be called with 'once' otherwise it gets
     * called on every request there after.
     */
    events.once('afterResponse', function() {

        $.ajax({
            url: url,
            success: renderDoc,
            error: function(jqXHR, textStatus, errorThrown) {
              alert(textStatus + ' ' + errorThrown);
            }
        });

    });

    return {
        title: 'Docs',
        content: templates.render('docs.html', req, {})
    };
};

var fieldsToHtml = function(keys, labels, data_record) {
    var fields = {
        headers: [],
        data: []
    };

    _.each(keys, function(key) {
        if(_.isArray(key)) {
            fields.headers.push({head: utils.titleize(key[0])});
            fields.data.push(_.extend(
                fieldsToHtml(key[1], labels, data_record[key[0]]),
                {isArray: true}
            ));
        } else {
            fields.headers.push({head: labels.shift()});
            fields.data.push({
                isArray: false,
                value: data_record[key]
            });
        }
    });

    return fields;
};

exports.makeDataRecordReadable = function(doc, locale) {
    var data_record = doc;
    var sms_message = data_record.sms_message;
    if(false && sms_message) {
        sms_message.short_message = sms_message.message.substr(0, 40) + '...';
        sms_message.message = sms_message.message.replace(
                                new RegExp('#', 'g'), "<br />");
    }

    if(data_record.form) {
        var keys = sms_utils.getFormKeys(data_record.form);
        var labels = sms_utils.getLabels(keys, data_record.form, 'en');
        data_record.fields = fieldsToHtml(keys, labels, data_record);
    }

    if(data_record.reported_date) {
        var m = moment(data_record.reported_date);
        data_record.reported_date = m.format('DD, MMM YYYY, hh:mm:ss');
    }

    return data_record;
};

// display district filter
var updateControls = function(userCtx) {

    var db = require('db').current(),
        req = dutils.currentRequest(),
        baseURL = require('duality/core').getBaseURL(req);

    if(userCtx.name) {
        $('.page-header .controls').show();
    }

    if(!utils.isUserAdmin(userCtx)) {
        return;
    }

    var q = {group: true};

    db.getView('kujua-export', 'data_records_by_district', q, function(err, data) {
        if (err) { return alert(err); }

        $('.dropdown-menu.district-hospitals').closest('div').show();
        $('.dropdown-menu.district-hospitals').html('');

        // update district-filter button to show current district name
        if (req.query.dh_name) {
            $('#district-filter a.btn').html(
                'District: <b>'
                +req.query.dh_name+'</b> <span class="caret"></span>');
        } else {
            $('#district-filter a.btn').html(
                'District <span class="caret"></span>');
        };

        _.each(data.rows, function(dh, idx) {
            var filter = dh.key[0],
                name = dh.key[1] || dh.key[0],
                q = db.stringifyQuery({
                        filter: filter,
                        dh_name: name});
            var li = '<li><a href="'+baseURL+'/data_records?'
                         + querystring.stringify(q)
                         + '">' + name + '</a></li>';
            $('.dropdown-menu.district-hospitals').append(li);
        });
    });
};

var urlParams = function(perPage, filter) {
    return '?perPage=' + perPage +
    '&amp;filter=' + filter +
    '&amp;limit=' + (parseInt(perPage, 10) + 1) +
    '&amp;startkey=%5B%22' + filter + '%22%5D';
};

var dataRecords = {
    db: null,
    timeoutID: null,
    nextStartKey: null,
    firstRender: true,
    lastRecord: null,
    viewName: '',
    viewQuery: {},
    limit: 50,
    district: '',
    phones: {health_centers: [], district_hospitals: [], clinics: []},
    renderRecords: function() {
        logger.debug('firing dataRecords.renderRecords');
        var self = this,
            q = self.viewQuery;

        if(self.nextStartKey) {
            q['startkey'] = self.nextStartKey;
        }

        var render = function(err, data) {
            if (err) { return alert(err); }
            logger.debug('firing render');
            if (data.rows && data.rows.length === 1) {
                self.lastRecord = data.rows[0];
                self.nextStartKey = null;
                $('.reached-last-record').show();
            } else if (data.total_rows < self.limit) {
                self.lastRecord = data.rows[data.rows.length - 1];
            } else if (data.rows) {
                self.nextStartKey = data.rows.pop().key;
            }
            var rows = _.map(data.rows, function(row, idx) {
                var r = exports.makeDataRecordReadable(row.value);
                r._key = row.key;
                return r;
            });
            // render base template if this is the first render or we have no
            // rows.
            if(self.firstRender) {
                logger.debug('rendering first render');
                $('#loader').html(
                    templates.render(
                        'data_records_table.html', {}, {data_records: rows}
                    )
                );
                self.firstRender = false;
            } else {
                logger.debug('rendering update');
                $('#data-records .wrap').append(
                    templates.render(
                        'data_records_rows.html', {}, {data_records: rows}
                    )
                );
            }
            delete self.timeoutID;
            $('.ajax-loader').hide();
        };
        if(!self.viewName) {
            render(null, []);
        } else if(!self.lastRecord) {
            self.db.getView(
                'kujua-export',
                self.viewName,
                q,
                render);
        };
    },
    loadPhones: function() {
        var self = this,
            q = {group:true};
        if (this.filter) {
            q['startkey'] = [this.filter];
            q['endkey'] = [this.filter,{}];
        };
        this.db.getView(
            'kujua-export',
            'phones_by_district_and_health_center',
            q,
            function(err, data) {
                if (err) {
                    return alert(err);
                }
                for (var i in data.rows) {
                    var row = data.rows[i];
                    self.phones.health_centers.push(
                        [row.key[4], row.key[3], row.key[2]].join(', '));
                        //row.key[4]);
                }
            }
        );
        this.db.getView(
            'kujua-export',
            'phones_by_district_and_clinic',
            q,
            function(err, data) {
                if (err) {
                    return alert(err);
                }
                for (var i in data.rows) {
                    var row = data.rows[i];
                    self.phones.clinics.push(
                        [row.key[4], row.key[3], row.key[2]].join(', '));
                        //row.key[4]);
                }
            }
        );
        this.db.getView(
            'kujua-export',
            'phones_by_district',
            q,
            function(err, data) {
                if (err) {
                    return alert(err);
                }
                for (var i in data.rows) {
                    var row = data.rows[i];
                    self.phones.district_hospitals.push(
                        [row.key[4], row.key[3], row.key[2]].join(', '));
                        //row.key[4]);
                }
            }
        );
    },
    cancel: function() {
        logger.debug('firing cancel');
        logger.debug(['this.timeoutID', this.timeoutID]);
        if(typeof this.timeoutID === "number") {
            window.clearTimeout(this.timeoutID);
            delete this.timeoutID;
        };
    },
    setup: function() {
        logger.debug('firing setup');
        this.cancel();
        var self = this;
        if(!self.lastRecord) {
            $('.ajax-loader').show();
            this.timeoutID = window.setTimeout(
                function(msg) {self.renderRecords();}, 700);
        }
    },
    addListeners: function() {
        logger.debug('addListeners');
        var self = this;
        $(window).scroll(function () {
            if ($(window).scrollTop() >= $(document).height()
                    - $(window).height() - 10) {
                logger.debug('firing scroll');
                logger.debug(['self.timeoutID', self.timeoutID]);
                self.setup();
            };
        });
        // bind to: field error marks so they can be updated
        $(document).on('click', '.tasks-referral .error-missing-phone',
            function(ev) {
                $(this).hide();
                var form = $(this).siblings('form');
                form.css({display: 'inline'});
                // configure bootstrap typeahead effect
                $('[name=phone]', form).typeahead({
                    source: self.phones.health_centers,
                    items: 20,
                    highlighter: function (item) {
                        //override default highlighter to escape '+'s
                        var q = this.query.replace(/[\\+]+/, '\\\\+');
                        return item.replace(new RegExp('(' + q + ')', 'ig'),
                            function ($1, match) {
                                return '<strong>' + match + '</strong>'
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
            self.db.getDoc(id, function(err, data) {
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
                };
                logger.debug(data);
                self.db.saveDoc(data, function(err, data) {
                    if (err) { return alert(err); }
                    if(!data.ok) {
                        return alert('saveDoc failed.');
                        console.log('saveDoc failed data: '+ data);
                    }
                    //once doc is saved changes listener will update the row
                });
            });
        });
        var showEdit = function(ev) {
            logger.debug('fire showEdit');
            $(this).find('.row-controls').show();
            //$(this).toggleClass('active');
        };

        var hideEdit = function(ev) {
            logger.debug('fire hideEdit');
            var div = $(this).find('.row-controls');
            div.hide();
            //$(this).toggleClass('active');
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
            table.toggle();
        });

        $(document).on('click', '[data-dismiss=extended]', function(ev) {
            $(this).closest('.extended').hide();
        });

        // bind to edit row button
        $(document).on('click', '.row-controls .edit', function(ev) {
            ev.preventDefault();
            $(this).siblings('form').toggle();
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
                self.db.removeDoc({_id: _id, _rev: _rev}, function(err, resp) {
                    if (err) {
                        return alert(err);
                    }
                    // doing actual delete in changes feed sub instead of here
                    // to avoid race condition
                    //$('[rel='+_id+']').fadeOut(
                    //    500, function() { $(this).remove(); });
                });
            } else {
                tds.removeClass('warning');
            }
        });
    },
    removeListeners: function() {
        $(window).off('scroll');
        $(document).off('click', '.tasks-referral .to .error');
        $(document).off('mouseenter', '#data-records tr.main');
        $(document).off('mouseleave', '#data-records tr.main');
    },
    // return boolean true if the record matches the logged in user
    isInDistrict: function(record) {
        if(this.isAdmin) { return true; }

        if (record.related_entities.clinic &&
            record.related_entities.clinic.parent &&
            record.related_entities.clinic.parent.parent &&
            record.related_entities.clinic.parent.parent._id) {

            var district = record.related_entities.clinic.parent.parent._id;
            return district === this.district;

        } else {
            return false;
        }
    },
    subChanges: function() {
        var self = this;
        this.db.changes({include_docs:true}, function(err,data){
            logger.debug([err,data]);
            if (err) { console.log(err); return; }
            if (!data || !data.results) { return; }
            // update rows
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
                if (!self.isInDistrict(result.doc)) { return; }

                // render new/updated records
                var doc = exports.makeDataRecordReadable(result.doc),
                    html = templates.render(
                        'data_records_rows.html', {}, {data_records: [doc]});
                if(div.length > 0) {
                    div.replaceWith(html);
                } else {
                    $(html).insertBefore('#data-records .data-record:first')
                        .hide().fadeIn(500);
                }
            });
        });
    },
    init: function(req, callback) {
        this.district = utils.getUserDistrict(req.userCtx);
        this.isAdmin = utils.isUserAdmin(req.userCtx);
        this.filter = this.district ? this.district : req.query.filter;
        var q = _.extend(req.query, {
                limit: this.limit || 50, // enforced limit for now
                descending: true,
            });

        if (this.filter) {
            q['startkey'] = [this.filter,{}];
            q['endkey'] = [this.filter];
        };

        this.db = require('db').current(req);

        // we need these reset for the initial show
        this.nextStartKey = null;
        this.lastRecord = null;
        this.firstRender = true;

        // user must either be admin or have associated district to view
        // records also show records by reported_date if no district filter is
        // applied.
        if (this.isAdmin && !this.filter) {
            this.viewName = 'data_records_by_reported_date';
            this.viewQuery = q;
        } else if (this.isAdmin || this.district) {
            this.viewName = 'data_records_by_district_and_reported_date';
            this.viewQuery = q;
        }
        this.renderRecords();
        this.loadPhones();
        this.subChanges();
    }
};

exports.data_records = function(head, req) {

    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.
        var district = utils.getUserDistrict(req.userCtx),
            isAdmin = utils.isUserAdmin(req.userCtx),
            filter = district ? district : req.query.filter,
            db = require('db').current();

        var q = _.extend(req.query, {
                descending: true,
        });

        if (filter) {
            q['startkey'] = [filter,{}];
            q['endkey'] = [filter];
        };

        $('.page-header h1').text('Records');
        $('.nav > *').removeClass('active');
        $('.nav .records').addClass('active');

        updateControls(req.userCtx);
        dataRecords.init(req);
        dataRecords.addListeners();
        $('.dropdown-toggle').siblings().hide();
    });

    return {
        content: templates.render('data_records.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};

exports.facilities = function (doc, req) {
    events.once('afterResponse', function () {

        $('.page-header h1').text('Facilities');
        $('.nav > *').removeClass('active');
        $('.nav .facilities').addClass('active');

        var db = require('db').current();
        var q = {
            startkey: ['clinic'],
            endkey: ['clinic', {}],
            include_docs: true
        };
        db.getView('kujua-export', 'facilities', q, function (err, data) {
            if (err) {
                return console.log(err);
            }
            var docs = _.map(data.rows, function (row) {
                return row.doc;
            });
            $('#facilities').spreadsheet({
                columns: [
                    {
                        label: 'Name and Surname',
                        property: ['clinic', 'contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Health Center',
                        property: ['clinic', 'parent', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Village',
                        property: ['clinic', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'RC Code',
                        property: ['clinic', 'contact', 'refid'],
                        type: 'string'
                    },
                    {
                        label: 'Phone',
                        property: ['clinic', 'contact', 'phone'],
                        type: 'string'
                    }
                ],
                data: docs,
                save: function (doc, callback) {
                    db.saveDoc(doc, function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        doc._rev = res.rev;
                        callback(null, doc);
                    });
                }
            });
        });
    });
    return {
        title: 'Facilities',
        content: templates.render('facilities.html', req, {})
    };
};
