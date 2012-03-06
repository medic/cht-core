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
        {_id: '1'}, {_id: '2'}, {_id: '3'},
        {_id: '4'}, {_id: '5'}, {_id: '6'},
        {_id: '7'}, {_id: '8'}, {_id: '9'}
    ];
    
    
    
    // test.expect(20);
    
    
    // paginate on start page
    
    var head = {total_rows: records.length, offset: 0};
    var req = {query: {}};
    
    pagination.paginate(head, req, records[0], records[3], '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey="4"');
    
    
    // go up to second page
    
    var head = {total_rows: records.length, offset: 3};
    var req = {query: {}};
    
    pagination.paginate(head, req, records[3], records[6], '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&descending=true&startkey="4"');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey="7"');
    
    
    // go up to third page
    
    var head = {total_rows: records.length, offset: 6};
    var req = {query: {}};
    
    pagination.paginate(head, req, records[6], records[8], '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&descending=true&startkey="7"');
    test.same(nextLink.hidden, true);
    
    
    // go down to second page
    
    var head = {total_rows: records.length, offset: 2};
    var req = {query: {descending: true}};
    
    pagination.paginate(head, req, records[3], records[6], '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, false);
    test.same(prevLink.url, baseURL + '/sms_messages?limit=4&descending=true&startkey="4"');
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey="7"');
    
    
    // go down to first page

    var head = {total_rows: records.length, offset: 5};
    var req = {query: {descending: true}};
    
    pagination.paginate(head, req, records[0], records[3], '/sms_messages', {perPage: 3});
    
    test.same(prevLink.hidden, true);
    test.same(nextLink.hidden, false);
    test.same(nextLink.url, baseURL + '/sms_messages?limit=4&startkey="4"');
    
    
    // test pagination with other parameters
    // coming in through the url (e.g. for sorting)
    
    
    
    
    $ = originalDollar;
    
    test.done();    
};