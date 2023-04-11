describe('TargetsEditCtrl controller', () => {
  'use strict';

  let dbGet;
  let mockTargetsUnique;
  let scope;
  let Settings;
  let translate;
  let UpdateSettings;

  beforeEach(() => {
    module('adminApp');

    dbGet = sinon.stub().resolves(['medic-clinic', 'medic-person']);
    Settings = sinon.stub().resolves({
      locales: [
        {code: 'en', name: 'English'}
      ],
      tasks: {
        targets: {
          items: [
            {type: 'count', id: 'TargetId', icon: 'medic-clinic', goal: 'goal', name: { content: 'content' }},
            {type: 'count', id: 'TargetId2', icon: 'medic-person', goal: 'goal', name: { content: 'content' }}
          ]
        }
      }
    });
    translate = sinon.stub();
    UpdateSettings = sinon.stub();

    module($provide => {
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          get: dbGet,
        })
      );
      $provide.value('Settings', Settings);
      $provide.value('translate', translate);
      $provide.value('UpdateSettings', UpdateSettings);
    });

    inject((translate, $controller) => {
      const createController = () => {
        scope = {};
        return $controller('TargetsEditCtrl', {
          $q: Q,
          $scope: scope,
          $translate: translate
        }); 
      };
      mockTargetsUnique = () => {
        createController();
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      dbGet,
      Settings,
      UpdateSettings
    );
  });

  describe('targets edit', () => {
    it('validation failure, target id not unique', () => {
      mockTargetsUnique();
      scope.target = {type: 'count', id: 'TargetId', icon: 'medic-clinic', goal: 'goal'};
      return scope.submit().then(() => {
        chai.expect(scope.errors.id).to.equal('analytics.targets.unique.id');
        chai.expect(scope.status).to.equal('Failed validation');
      });
    });
  });
});
