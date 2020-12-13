describe('Updated Password Controller', () => {

    let $window;
    let createController;

    beforeEach(function() {
        module('inboxApp');
        $window = {location: {reload: sinon.stub()}};

        module($provide => {
            $provide.value('$window', $window);
        });

        inject($controller => {
            createController = () => {
                return $controller('UpdatedPasswordCtrl', {});
            };
        });
    });

    describe('ctrl.submit', () => {
        it('should reload the page', () => {
            const ctrl = createController();
            ctrl.submit();
            chai.expect($window.location.reload.called).to.equal(true);
            chai.expect($window.location.reload.getCall(0).args[0]).to.equal(true);
        });
    });
});
