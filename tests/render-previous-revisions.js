var data_record = require('lib/data_records'),
  sinon = require('sinon');

exports['handle when no audit log exists'] = function(test) {
  test.expect(6);
  var $div = $(
    '<div rel="cce651f82d1e09214db96838c91e2ee6" data-rev="7-ca1084e22780a3bcd6ee83831367e306">' + 
      '<div class="data-record-revisions">' + 
        '<button class="prev"></button>' + 
        '<button class="next"></button>' + 
      '</div>' + 
    '</div>'
  );
  var db = {
    getDoc: function() {}
  };
  sinon.stub(db, 'getDoc').callsArgWith(2, null, {_revs_info: []});
  data_record.setDb(db);

  data_record.updateRevNav($div);

  var prev = $div.find('.prev');
  var next = $div.find('.next');
  test.equals(prev.attr('disabled'), 'disabled');
  test.equals(prev.data('rev'), undefined);
  test.equals(prev.attr('title'), 'No previous revision');
  test.equals(next.attr('disabled'), 'disabled');
  test.equals(next.data('rev'), undefined);
  test.equals(next.attr('title'), 'No next revision');
  test.done();
};
