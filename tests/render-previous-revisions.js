var db = require('db').current(),
  data_record = require('lib/data_records'),
  sinon = require('sinon');

exports.tearDown = function(callback) {
  if (db.getDoc.restore) {
    db.getDoc.restore();
  }
  callback();
}

exports['handle when no audit log exists'] = function(test) {
  test.expect(6);
  var currentRev = '7-ca1084e22780a3bcd6ee83831367e306';
  var $div = $(
    '<div rel="cce651f82d1e09214db96838c91e2ee6" data-rev="' + currentRev + '">' + 
      '<div class="data-record-revisions">' + 
        '<button class="prev"></button>' + 
        '<button class="next"></button>' + 
      '</div>' + 
    '</div>'
  );
  sinon.stub(db, 'getDoc').callsArgWith(2, null, {_revs_info: [{rev: currentRev}]});
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

exports['handle when available previous revision'] = function(test) {
  test.expect(6);
  var previousRev = '6-sa1084e22780a3bcd6ee83831367e306';
  var currentRev = '7-ca1084e22780a3bcd6ee83831367e306';
  var $div = $(
    '<div rel="cce651f82d1e09214db96838c91e2ee6" data-rev="' + currentRev + '">' + 
      '<div class="data-record-revisions">' + 
        '<button class="prev"></button>' + 
        '<button class="next"></button>' + 
      '</div>' + 
    '</div>'
  );
  sinon.stub(db, 'getDoc').callsArgWith(2, null, {_revs_info: [
    {rev: currentRev},
    {rev: previousRev, status: 'available'}
  ]});
  data_record.setDb(db);

  data_record.updateRevNav($div);

  var prev = $div.find('.prev');
  var next = $div.find('.next');
  test.equals(prev.attr('disabled'), undefined);
  test.equals(prev.data('rev'), previousRev);
  test.equals(prev.attr('title'), 'Previous revision');
  test.equals(next.attr('disabled'), 'disabled');
  test.equals(next.data('rev'), undefined);
  test.equals(next.attr('title'), 'No next revision');
  test.done();
}; 

exports['handle when available next revision'] = function(test) {
  test.expect(6);
  var currentRev = '7-ca1084e22780a3bcd6ee83831367e306';
  var nextRev = '8-sa1084e22780a3bcd6ee83831367e306';
  var $div = $(
    '<div rel="cce651f82d1e09214db96838c91e2ee6" data-rev="' + currentRev + '">' + 
      '<div class="data-record-revisions">' + 
        '<button class="prev"></button>' + 
        '<button class="next"></button>' + 
      '</div>' + 
    '</div>'
  );
  sinon.stub(db, 'getDoc').callsArgWith(2, null, {_revs_info: [
    {rev: nextRev},
    {rev: currentRev},
  ]});
  data_record.setDb(db);

  data_record.updateRevNav($div);

  var prev = $div.find('.prev');
  var next = $div.find('.next');
  test.equals(prev.attr('disabled'), 'disabled');
  test.equals(prev.data('rev'), undefined);
  test.equals(prev.attr('title'), 'No previous revision');
  test.equals(next.attr('disabled'), undefined);
  test.equals(next.data('rev'), nextRev);
  test.equals(next.attr('title'), 'Next revision');
  test.done();
};
