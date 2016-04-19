describe('ResourceIcons service', function() {

  'use strict';

  var get,
      Changes,
      injector,
      jqFind,
      attr;

  beforeEach(function() {
    get = sinon.stub();
    Changes = sinon.stub();
    jqFind = sinon.stub($.fn, 'find');
    attr = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.factory('Changes', function() {
        return Changes;
      });
    });
    inject(function($injector) {
      injector = $injector;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, Changes, jqFind, attr);
  });

  it('returns undefined when given no name', function(done) {
    get.returns(KarmaUtils.mockPromise());
    var service = injector.get('ResourceIcons');
    var actual = service.getImg();
    chai.expect(actual).to.equal(undefined);
    done();
  });

  it('returns undefined when no doc yet', function(done) {
    get.returns(KarmaUtils.mockPromise());
    var service = injector.get('ResourceIcons');
    var actual = service.getImg('delivery');
    chai.expect(actual).to.equal(undefined);
    done();
  });

  it('returns src when resources doc already cached', function(done) {
    var resources = {
      resources: {
        child: 'child.png',
        mother: 'mother.png'
      },
      _attachments: {
        'child.png': {
          content_type: 'image/png',
          data: 'kiddlywinks'
        },
        'mother.png': {
          content_type: 'image/png',
          data: 'mum'
        }
      }
    };
    get.returns(KarmaUtils.mockPromise(null, resources));
    var service = injector.get('ResourceIcons');
    setTimeout(function() {
      var actual = service.getImg('child');
      var expected = 'data:image/png;base64,kiddlywinks';
      chai.expect(actual).to.equal(expected);
      done();
    });
  });

  it('updates images when resources doc updated', function(done) {
    var resources = {
      resources: {
        child: 'child.png'
      },
      _attachments: {
        'child.png': {
          content_type: 'image/png',
          data: 'kiddlywinks'
        }
      }
    };
    get
      .onFirstCall().returns(KarmaUtils.mockPromise())
      .onSecondCall().returns(KarmaUtils.mockPromise(null, resources));

    jqFind.returns({ attr: attr });
    var service = injector.get('ResourceIcons');
    setTimeout(function() {
      var actual1 = service.getImg('child');
      chai.expect(actual1).to.equal(undefined);

      Changes.args[0][0].callback(); // invoke the changes listener
      setTimeout(function() {
        try {
          var actual2 = service.getImg('child');
          var expected = 'data:image/png;base64,kiddlywinks';
          chai.expect(actual2).to.equal(expected);
          chai.expect(get.callCount).to.equal(2);

          // expect existing elements to be updated
          chai.expect(jqFind.callCount).to.equal(1);
          chai.expect(jqFind.args[0][0]).to.equal('img.resource-icon-child');
          chai.expect(attr.args[0][0]).to.equal('src');
          chai.expect(attr.args[0][1]).to.equal('data:image/png;base64,kiddlywinks');
          done();
        } catch(e) {
          done(e);
        }
      });
    });
  });

});