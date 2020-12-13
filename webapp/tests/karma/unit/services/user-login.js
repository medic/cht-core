describe('UserLogin service', function() {

    'use strict';

    let service;
    let $httpBackend;
    let Location;

    const loginData = JSON.stringify({
        user: 'user.name',
        password: 'password',
        redirect: '',
        locale: ''
    });
    
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const getUrl = function() {
        Location.dbName = 'medicdb';
        return '/' + Location.dbName + '/login';
    };

    beforeEach(function() {
        Location = {};
        module('inboxApp');
        module($provide => {
            $provide.value('Location', Location);
        });
        inject(function($injector) {
            $httpBackend = $injector.get('$httpBackend');
            service = $injector.get('UserLogin');
        });
    });

    it('should call login backend service', function() {
        const url = getUrl();

        $httpBackend
            .expect('POST', url, loginData, headers)
            .respond({ success: true });
        setTimeout($httpBackend.flush);
        return service(loginData);
    });

    it('should  return error call login backend service', function(done) {
        const url = getUrl();
        
        $httpBackend
            .expect('POST', url, loginData, headers)
            .respond(401, 'Not logged in');
        service(loginData)
            .then(function() {
              done(new Error('expected error'));
            })
            .catch(function(err) {
              chai.expect(err.data).to.equal('Not logged in');
              done();
            });
        $httpBackend.flush();
    });
});
