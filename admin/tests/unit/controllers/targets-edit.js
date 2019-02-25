describe('TargetsEditCtrl controllers', () => {
  'use strict';

  let scope,
    translate,
    Settings,
    UpdateSettings,
    dbGet,
    mockTargetUnique;

  beforeEach(() => {
    module('adminApp');

    UpdateSettings = sinon.stub();
    translate = sinon.stub();
    dbGet = sinon.stub().returns(
      Promise.resolve(
        ['medic-clinic','medic-chw']
      )
    );
    Settings = sinon.stub().returns(
      Promise.resolve({
        locales: [
          {code: 'en', name: 'English'}
        ],
        tasks: {
          targets: {
            items: [
              {type: 'count', id: 'TaskId', icon: 'medic-clinic', goal: 'goal', name: { content: 'content' }},
              {type: 'count', id: 'TaskId2', icon: 'medic-chw', goal: 'goal', name: { content: 'content' }}
            ]
          }
        }
      })
    );

    module($provide => {
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          get: dbGet,
        })
      );
      $provide.value('UpdateSettings', UpdateSettings);
      $provide.value('Settings', Settings);
      $provide.value('translate', translate);
    });

    inject((translate, $controller) => {
      const createController = () => {
        scope = {};
        return $controller('TargetsEditCtrl', {
          $scope: scope,
          $q: Q,
          $translate: translate
        }); 
      };
      mockTargetUnique = () => {
        createController();
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      UpdateSettings,
      Settings,
      dbGet
    );
  });

  describe('target edit', () => {
    it ('failed validation when target id is not nuique', done => {
      mockTargetUnique();
      setTimeout(() => {
        scope.target = {type: 'count', id: 'TaskId', icon: 'medic-clinic', goal: 'goal'};
        scope.submit();
        setTimeout(() => {
          chai.expect(scope.errors.id).to.equal('analytics.targets.unique.id');
          done();
        });
      });
    });
  });
});