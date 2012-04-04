var pagination = require('kujua-pagination/pagination'),
    querystring = require('querystring'),
    _ = require('underscore')._;


exports.paginate = function (test) {
    var baseURL = require('duality/core').getBaseURL({}),
        head,
        req,
        rows;

    var link = {
        hidden: false,
        url: '',
        hide: function() { this.hidden = true; },
        show: function() { this.hidden = false; },
        attr: function(key, val) { this.url = val; return this; }
    };

    var originalDollar = $,
        nextLink = _.clone(link),
        prevLink = _.clone(link);

    $ = function(selector) {
        if(selector === ".next") {
            return nextLink;
        } else if(selector === ".prev") {
            return prevLink;
        }
    };

    var records = [
        {key: '1'}, {key: '2'}, {key: '3'},
        {key: '4'}, {key: '5'}, {key: '6'},
        {key: '7'}, {key: '8'}, {key: '9'}
    ];

    test.expect(23);

    // paginate on start page

    head = {total_rows: records.length, offset: 0};
    req = {query: {}};

    rows = pagination.prepare(
            req, [records[0], records[1], records[2], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22');


    // go up to second page

    head = {total_rows: records.length, offset: 3};
    req = {query: {}};

    rows = pagination.prepare(
            req, [records[3], records[4], records[5], records[6]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(prevLink.hidden, false);
    test.same(
            prevLink.url,
            baseURL + '/sms_messages?limit=4&startkey=%224%22&descending=true');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%227%22');


    // go up to third page

    head = {total_rows: records.length, offset: 6};
    req = {query: {}};

    rows = pagination.prepare(
            req, [records[6], records[7], records[8]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(prevLink.hidden, false);
    test.same(
            prevLink.url,
            baseURL + '/sms_messages?limit=4&startkey=%227%22&descending=true');
    test.same(nextLink.hidden, true);


    // go down to second page

    head = {total_rows: records.length, offset: 2};
    req = {query: {descending: true}};

    rows = pagination.prepare(
            req, [records[6], records[5], records[4], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(prevLink.hidden, false);
    test.same(
            prevLink.url,
            baseURL + '/sms_messages?limit=4&startkey=%224%22&descending=true');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%227%22');


    // go down to first page

    head = {total_rows: records.length, offset: 5};
    req = {query: {descending: true}};

    rows = pagination.prepare(
            req, [records[3], records[2], records[1], records[0]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22');


    // test pagination with other parameters
    // coming in through the url (e.g. for sorting)

    head = {total_rows: records.length, offset: 0};
    req = {query: {sortBy: 'form'}};

    rows = pagination.prepare(
            req, [records[0], records[1], records[2], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(
            nextLink.url,
            baseURL + '/sms_messages?sortBy=form&limit=4&startkey=%224%22');


    // perPage query overwrites given perPage

    head = {total_rows: records.length, offset: 0};
    req = {query: {sortBy: 'form', perPage: 4}};

    rows = pagination.prepare(
            req,
            [records[0], records[1], records[2], records[3], records[4]],
            {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(
            nextLink.url,
            baseURL + '/sms_messages?sortBy=form&perPage=4&limit=5&startkey=%225%22');


    // filter complex key and paginate

    records = [
        {key: ['c', -1331724438195, 'x']},
        {key: ['c', -1331724438195, 'y']},
        {key: ['c', -1331724438195, 'z']},
        {key: ['a', -1331724438195, '1']},
        {key: ['a', -1331724438195, '2']},
        {key: ['a', -1331724438195, '3']},
        {key: ['a', -1331724438195, '4']},
        {key: ['b', -1331724438195, '5']},
        {key: ['b', -1331724438195, '6']},
        {key: ['b', -1331724438195, '7']}
    ];


    head = {total_rows: records.length, offset: 3};
    req = {query: {}};

    rows = pagination.prepare(
            req,
            [records[3], records[4], records[5], records[6]],
            {perPage: 3, filter: 'a'});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(nextLink.hidden, false);
    test.same(
            nextLink.url,
            baseURL + '/sms_messages?limit=4&'
            + 'startkey=%5B%22a%22%2C-1331724438195%2C%224%22%5D');


    head = {total_rows: records.length, offset: 6};
    req = {query: {}};

    rows = pagination.prepare(
            req,
            [records[6], records[7], records[8], records[9]],
            {perPage: 3, filter: 'a'});
    pagination.paginate(head, req, '/sms_messages', rows);

    test.same(nextLink.hidden, true);
    test.same(rows, [records[6]]);

    //
    // NOTE:
    //
    // There will be a bug when filtering and going down
    // which cannot be easily fixed.
    //
    // When we see records[3] as last record we cannot know if records[2]
    // matches the filter or doesn't. So we will get an empty page.
    //
    // We might be able to fix this in the future by getting one more
    // or something, but it will be complex.
    //

    $ = originalDollar;

    test.done();
};
