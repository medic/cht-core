var exec = require('child_process').exec;

var commit_rev_cmd = "git rev-list HEAD --max-count=1";
var uncommitted_cmd = "git status --porcelain"


function addUncommitted (doc, callback) {
    exec(uncommitted_cmd, function(err, stdout, stderr) {
        var uncommitted = stdout.trim();
        doc.kanso.git.uncommitted = uncommitted.split('\n');
        if (doc.kanso.git.uncommitted && doc.kanso.git.uncommitted.length == 1 && doc.kanso.git.uncommitted[0] == "") {
            doc.kanso.git.uncommitted = [];
        }

        callback(null, doc);
    });
}


module.exports = {
    run : function(root, path, settings, doc, callback) {
        exec(commit_rev_cmd, function(error, stdout, stderr) {
            if (!doc.kanso) doc.kanso = {};

            doc.kanso.git = {}
            doc.kanso.git.commit = stdout.trim();


            if (settings.git_info && settings.git_info.skip_uncommitted) {
                return callback(null, doc);
            }
            addUncommitted(doc, callback);

        })
    }
}