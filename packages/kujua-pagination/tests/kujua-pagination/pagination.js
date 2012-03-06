var pagination = require('kujua-pagination/pagination'),
    querystring = require('querystring'),
    _ = require('underscore')._;


exports.paginate = function (test) {
    var baseURL = require('duality/core').getBaseURL({});
    
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
    
    
    
    test.expect(18);
    
    
    // paginate on start page
    
    var head = {total_rows: records.length, offset: 0};
    var req = {query: {}};
    
    pagination.prepare(req, [records[0], records[1], records[2], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22');
    
    
    // go up to second page
    
    var head = {total_rows: records.length, offset: 3};
    var req = {query: {}};
    
    pagination.prepare(req, [records[3], records[4], records[5], records[6]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22&descending=true');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%227%22');
    
    
    // go up to third page
    
    var head = {total_rows: records.length, offset: 6};
    var req = {query: {}};
    
    pagination.prepare(req, [records[6], records[7], records[8]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&startkey=%227%22&descending=true');
    test.same(nextLink.hidden, true);
    
    
    // go down to second page
    
    var head = {total_rows: records.length, offset: 2};
    var req = {query: {descending: true}};
    
    pagination.prepare(req, [records[6], records[5], records[4], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22&descending=true');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%227%22');
    
    
    // go down to first page

    var head = {total_rows: records.length, offset: 5};
    var req = {query: {descending: true}};
    
    pagination.prepare(req, [records[3], records[2], records[1], records[0]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey=%224%22');
    
    
    // test pagination with other parameters
    // coming in through the url (e.g. for sorting)
    
    var head = {total_rows: records.length, offset: 0};
    var req = {query: {sortBy: 'form'}};
    
    pagination.prepare(req, [records[0], records[1], records[2], records[3]], {perPage: 3});
    pagination.paginate(head, req, '/sms_messages', {perPage: 3});
    
    test.same(nextLink.url, baseURL + '/sms_messages?sortBy=form&limit=4&startkey=%224%22');
    
    
    $ = originalDollar;
    
    test.done();    
};