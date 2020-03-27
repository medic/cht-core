describe('sender directive', function() {

  'use strict';

  let compile;
  let scope;

  beforeEach(function() {
    module('inboxApp');
    module('templates');
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  it('should render nothing when no message', function() {
    const element = compile('<mm-sender message="message"></mm-sender>')(scope);
    scope.$digest();
    chai.expect(element.html().trim()).to.equal('<!---->');
  });

  it('should render sender when message has from', function() {
    scope.message = {
      sent_by: '+789',
      from: '+123'
    };

    const element = compile('<mm-sender message="message"/>')(scope);
    scope.$digest();
    chai.expect(element.find('div .name').text()).to.equal('+123');
  });

  it('should render sender when message has sent by', function() {
    scope.message = {
      sent_by: '+789'
    };

    const element = compile('<mm-sender message="message"/>')(scope);
    scope.$digest();
    chai.expect(element.find('div .name').text()).to.equal('+789');
  });

  it('should render sender when message has contact', function() {
    scope.message = {
      sent_by: '+789',
      from: '+123',
      contact: {
        name: 'Clark',
        phone: '+123',
        parent: {
          name: 'Clarks House',
          parent: {
            name: 'Smallville',
            parent: {
              name: 'Metropolis'
            }
          }
        }
      }
    };

    const element = compile('<mm-sender message="message"/>')(scope);
    scope.$digest();
    chai.expect(element.find('div .name').text()).to.equal('Clark');
    chai.expect(element.find('div .phone').text()).to.equal('+123');
    chai.expect(element.find('div .position .lineage li:nth-child(1)').text()).to.equal('Clarks House');
    chai.expect(element.find('div .position .lineage li:nth-child(2)').text()).to.equal('Smallville');
    chai.expect(element.find('div .position .lineage li:nth-child(3)').text()).to.equal('Metropolis');
  });
});
