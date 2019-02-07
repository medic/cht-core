describe('showMutedModal directive', () => {

  'use strict';

  let compile,
      scope,
      Modal,
      state;

  beforeEach(() => {
    module('inboxApp');
    module('inboxDirectives');
    Modal = sinon.stub();
    state = { go: sinon.stub() };
    module(function ($provide) {
      $provide.value('Modal', Modal);
      $provide.value('$state', state);
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  afterEach(() => sinon.restore());

  it('should not block clicks when form should not display modal', done => {
    scope.form = { code: 'my-form', showUnmuteModal: false };
    scope.actionBar = {
      right: {
        selected: [ { _id: 'my-contact', name: 'test' } ]
      }
    };
    const element = compile('<my-element ' +
                            'show-muted-modal to-state="contacts.report" ' +
                            'to-state-params="{ id: actionBar.right.selected[0]._id, formId: form.code }"' +
                            '>MyForm</my-element>')(scope);
    scope.$digest();
    element.click();

    setTimeout(() => {
      chai.expect(state.go.callCount).to.equal(1);
      chai.expect(state.go.args[0]).to.deep.equal([ 'contacts.report', { id: 'my-contact', formId: 'my-form' } ]);
      chai.expect(Modal.callCount).to.equal(0);
      done();
    });
  });

  it('should block clicks when form should display modal', done => {
    scope.form = { code: 'my-form', showUnmuteModal: true };
    scope.actionBar = {
      right: {
        selected: [ { _id: 'my-contact', name: 'test' } ]
      }
    };
    Modal.rejects(); // user cancels when modal pops up

    const element = compile('<my-element ' +
                            'show-muted-modal to-state="contacts.report" ' +
                            'to-state-params="{ id: actionBar.right.selected[0]._id, formId: form.code }"' +
                            '>MyForm</my-element>')(scope);
    scope.$digest();
    element.click();

    setTimeout(() => {
      chai.expect(state.go.callCount).to.equal(0);
      chai.expect(Modal.callCount).to.equal(1);
      done();
    });
  });

  it('should continue to state when modal submission is successful', done => {
    scope.form = { code: 'form', showUnmuteModal: true };
    scope.actionBar = {
      right: {
        selected: [ { _id: 'the-contact', name: 'test' } ]
      }
    };
    Modal.resolves(); // user accepts when modal pops up

    const element = compile('<my-element ' +
                            'show-muted-modal to-state="contacts.report" ' +
                            'to-state-params="{ id: actionBar.right.selected[0]._id, formId: form.code }"' +
                            '>MyForm</my-element>')(scope);
    scope.$digest();
    element.click();

    setTimeout(() => {
      chai.expect(Modal.callCount).to.equal(1);
      chai.expect(state.go.callCount).to.equal(1);
      chai.expect(state.go.args[0]).to.deep.equal([ 'contacts.report', { id: 'the-contact', formId: 'form' } ]);
      done();
    });
  });
});
