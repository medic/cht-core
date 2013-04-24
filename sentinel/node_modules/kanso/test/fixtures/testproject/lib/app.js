exports.testproperty = "test property";

exports.rewrites = [
    {from: '/', to: '_show/testshow'}
];

exports.shows = {
    testshow: function (doc, req) {
        return "test";
    }
};

exports.lists = {
    testlist: function (head, req) {
        return "test";
    }
};

exports.updates = {
    testupdate: function (doc, req) {
        return [doc, "test"];
    }
};

exports.filters = {
    testfilter: function (doc, req) {
        return true;
    }
};

exports.validate_doc_update = function (doc, req) {
    return;
};

exports.no_proxy_function = function (){return "test";};

exports.no_proxy_obj = {
    fn1: function (){return "one";},
    fn2: function (){return "two";}
};
