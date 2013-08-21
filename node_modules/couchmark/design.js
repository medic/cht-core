module.exports = {
    views: {
        stream: {
            map: (function(doc) {
                if (doc.stream && doc.seq_no) {
                    emit([doc.stream, doc.seq_no], doc.seq_no);
                }
            }).toString()
        }
    }
};
