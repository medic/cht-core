var SHORT = 10,
    LONG = 100;

/** @return a mock form ready for putting in #dbContent */
function mockEnketoForm(formInternalId, docId) {
  return {
    id: docId||'form-0',
    doc: {
      internalId: formInternalId,
      _attachments: { xml: blob() },
    },
  };
}

/** @return a mock form ready for putting in #dbContent */
function mockJsonForm() {
  return { doc: { _attachments: {} } };
}

/** Create an instance of `Blob`, to keep `createObjectURL` happy */
function blob(name) {
  return new Blob(['<some-blob name="' + name + '"/>'],
      { type: 'text/xml' });
}

function xmlDoc(xmlString) {
  return new DOMParser().parseFromString(xmlString, 'application/xml');
}

$.fn.attrArray = function(attrName) {
  return this.map(function(i, e) {
    return $(e).attr(attrName);
  }).get();
};

describe('Enketo service', function() {
  'use strict';

  var assert = chai.assert,
      service,
      dbContent;

  beforeEach(function() {
    module('inboxApp');

    dbContent = {};

    module(function($provide) {
      $provide.value('$http', {
          get:function() { return { then:function() {} }; } });
      $provide.value('DB', {
        get: function() {
          return {
            getAttachment: function(docId, attachmentName) {
              if(!/^form-\d+$/.test(docId)) {
                return KarmaUtils.mockPromise('Unknown docId: ' + docId);
              }
              switch(attachmentName) {
                case 'example':
                case 'xml': return KarmaUtils.mockPromise(null, blob(attachmentName));
                default: return KarmaUtils.mockPromise('Unkown attachment ' + attachmentName + ' for doc ' + docId);
              }
            },
            get:function(docId) {
              return KarmaUtils.mockPromise('Unkown docId: ' + docId);
            },
            query:function(q) {
              switch(q) {
                case 'medic/forms': return KarmaUtils.mockPromise(null, { rows:dbContent.forms });
                default: return KarmaUtils.mockPromise('Unexpected DB query: ' + q);
              }
            },
          };
        },
      });
      $provide.value('DbNameService', function() {
        return 'BASEURL/DB';
      });
    });
    inject(function(Enketo) {
      service = Enketo;
    });
  });

  afterEach(function() {
    KarmaUtils.restore();
  });

  describe('#transformXml()', function() {
    it('should not work if processors are not available', function() {
      // when
      var result = service.transformXml(xmlDoc('<some-xml/>'));

      // then
      assert.isUndefined(result);
    });
  });

  describe('#withFormByFormInternalId()', function() {
    it('should inot call back if form cannot be found', function(done) {
      // given only irrelevant forms are available
      dbContent.forms = [ mockJsonForm('not-defined'), mockEnketoForm('irrelevant') ];

      // when
      service.withFormByFormInternalId('not-defined', function() {
        done('Should not be performing callback!');
      });

      // then
      setTimeout(done, LONG);
    });

    it('should call callback with form if it can be found in DB', function(done) {
      // given
      var original = mockEnketoForm('ok', 'form-9');
      dbContent.forms = [ mockEnketoForm('bad'), mockJsonForm('ok'), original, mockJsonForm('bad') ];
      // when
      service.withFormByFormInternalId('ok', function(docId, xml) {
        try {
          assert.equal(docId, 'form-9');
          assert.equal(new XMLSerializer().serializeToString(xml), '<some-blob name="xml"/>');
          done();
        } catch(e) {
          done(e);
        }
      });

      // then
      setTimeout(function() { done('done() should be called by withFormByFormInternalId()\'s callback.'); }, LONG);
    });
  });

  describe('#withAllForms()', function() {
    it('should get all forms from DB, but only pass on ones with XML attachment', function(done) {
      // given
      var testForms = [
        mockEnketoForm(),
        mockJsonForm(),
        mockJsonForm(),
        mockEnketoForm(),
        mockEnketoForm(),
      ];
      dbContent.forms = testForms;

      // when
      service.withAllForms(function(forms) {
        try {
          assert.equal(forms.length, 3);
          assert.equal(forms[0], testForms[0].doc);
          assert.equal(forms[1], testForms[3].doc);
          assert.equal(forms[2], testForms[4].doc);
          done();
        } catch(e) {
          done(e);
        }
      });
    });
  });

  describe('#replaceJavarosaMediaWithLoaders()', function() {
    describe('img', function() {
      it('.src should be prefixed with # iff it starts with jr://', function() {
        // given
        var e = $('<div><img src="http://example.com"/><img src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        assert.deepEqual(e.find('img').attrArray('src'),
            ['http://example.com', '#jr://example']);
      });
      it('should be wrapped with loader iff it starts with jr://', function() {
        // given
        var e = $('<div class="container"><img src="http://example.com"/><img src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        var img = $(e.find('img')[1]);
        assert.equal(img.css('visibility'), 'hidden');
        assert.isTrue(img.parent().hasClass('loader'));
        assert.isFalse(img.parent().hasClass('container'));
        assert.isTrue(img.parent().parent().hasClass('container'));
      });
    });
    describe('audio', function() {
      it('.src should be prefixed with # iff it starts with jr://', function() {
        // given
        var e = $('<div><audio src="http://example.com"/><audio src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        assert.deepEqual(e.find('audio').attrArray('src'),
            ['http://example.com', '#jr://example']);
      });
      it('should be wrapped with loader iff it starts with jr://', function() {
        // given
        var e = $('<div class="container"><audio src="http://example.com"/><audio src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        var audio = $(e.find('audio')[1]);
        assert.equal(audio.css('visibility'), 'hidden');
        assert.isTrue(audio.parent().hasClass('loader'));
        assert.isFalse(audio.parent().hasClass('container'));
        assert.isTrue(audio.parent().parent().hasClass('container'));
      });
    });
    describe('video', function() {
      it('.src should be prefixed with # iff it starts with jr://', function() {
        // given
        var e = $('<div><video src="http://example.com"/><video src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        assert.deepEqual(e.find('video').attrArray('src'),
            ['http://example.com', '#jr://example']);
      });
      it('should be wrapped with loader iff it starts with jr://', function() {
        // given
        var e = $('<div class="container"><video src="http://example.com"/><video src="jr://example"/></div>');

        // when
        service.replaceJavarosaMediaWithLoaders(e);

        // then
        var video = $(e.find('video')[1]);
        assert.equal(video.css('visibility'), 'hidden');
        assert.isTrue(video.parent().hasClass('loader'));
        assert.isFalse(video.parent().hasClass('container'));
        assert.isTrue(video.parent().parent().hasClass('container'));
      });
    });
  });

  describe('#embedJavarosaMedia()', function() {
    describe('img', function() {
      it('should not be unwrapped if image is not available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><img src="#jr://bad-example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-1', doc);

        setTimeout(function() {
          // then
          var e = doc.find('img');
          assert.equal(e.css('visibility'), 'hidden');
          assert.isTrue(e.parent().hasClass('loader'));
          assert.isFalse(e.parent().hasClass('container'));
          assert.isTrue(e.parent().parent().hasClass('container'));
          done();
        }, SHORT);
      });
      it('should be unwrapped if wrapped with loader and image is available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><img src="#jr://example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-2', doc);

        setTimeout(function() {
          // then
          var e = doc.find('img');
          assert.include(['visible', ''], e.css('visibility'));
          assert.isFalse(e.parent().hasClass('loader'));
          assert.isTrue(e.parent().hasClass('container'));
          assert.equal(e.parent().parent().length, 0);
          done();
        }, SHORT);
      });
    });
    describe('audio', function() {
      it('should not be unwrapped if audio is not available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><audio src="#jr://bad-example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-1', doc);

        setTimeout(function() {
          // then
          var e = doc.find('audio');
          assert.equal(e.css('visibility'), 'hidden');
          assert.isTrue(e.parent().hasClass('loader'));
          assert.isFalse(e.parent().hasClass('container'));
          assert.isTrue(e.parent().parent().hasClass('container'));
          done();
        }, SHORT);
      });
      it('should be unwrapped if wrapped with loader and audio is available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><audio src="#jr://example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-2', doc);

        setTimeout(function() {
          // then
          var e = doc.find('audio');
          assert.include(['visible', ''], e.css('visibility'));
          assert.isFalse(e.parent().hasClass('loader'));
          assert.isTrue(e.parent().hasClass('container'));
          assert.equal(e.parent().parent().length, 0);
          done();
        }, SHORT);
      });
    });
    describe('video', function() {
      it('should not be unwrapped if video is not available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><video src="#jr://bad-example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-1', doc);

        setTimeout(function() {
          // then
          var e = doc.find('video');
          assert.equal(e.css('visibility'), 'hidden');
          assert.isTrue(e.parent().hasClass('loader'));
          assert.isFalse(e.parent().hasClass('container'));
          assert.isTrue(e.parent().parent().hasClass('container'));
          done();
        }, SHORT);
      });
      it('should be unwrapped if wrapped with loader and video is available', function(done) {
        // given
        var doc = $('<div class="container"><div class="loader"><video src="#jr://example" style="visibility:hidden"/></div></div>');

        // when
        service.embedJavarosaMedia('form-2', doc);

        setTimeout(function() {
          // then
          var e = doc.find('video');
          assert.include(['visible', ''], e.css('visibility'));
          assert.isFalse(e.parent().hasClass('loader'));
          assert.isTrue(e.parent().hasClass('container'));
          assert.equal(e.parent().parent().length, 0);
          done();
        }, SHORT);
      });
    });
  });
});


describe('Enketo service with available processors', function() {
  'use strict';

  var assert = chai.assert,
      service;

  function staticXsl(xmlString) {
    return xmlDoc(window.MMXSLT.header + '<root>' + xmlString + '</root>' + window.MMXSLT.footer);
  }

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.value('$http', {
        get: function(url) {
          var xsl;
          switch(url) {
            case '/BASEURL/DB/_design/medic/static/xslt/openrosa2html5form.xsl':
              xsl = '<generated-html/>';
              break;
            case '/BASEURL/DB/_design/medic/static/xslt/openrosa2xmlmodel.xsl':
              xsl = '<generated-model/>';
              break;
            default:
              throw new Error('UNEXPECTED URL IN AJAX REQUEST: ' + url);
          }
          return {
            then: function(callback) {
              callback(staticXsl(xsl));
            }
          };
        },
      });
      $provide.value('DbNameService', function() {
        return 'BASEURL/DB';
      });
    });
    inject(function(Enketo) {
      service = Enketo;
    });
  });

  afterEach(function() {
    KarmaUtils.restore();
  });

  describe('#transformXml()', function() {
    describe('with available processors', function() {
      it('should provide model and html translated by the relevant XSL stylesheets', function() {
        // when
        var result = service.transformXml(xmlDoc('<some-xml/>'));

        // then
        assert.equal(result.html, '<generated-html/>');
        assert.equal(result.model, '<generated-model/>');
      });
    });
  });
});
