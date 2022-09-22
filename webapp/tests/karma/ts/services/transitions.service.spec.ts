import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { cloneDeep } from 'lodash-es';

import { TransitionsService } from '@mm-services/transitions.service';
import { SettingsService } from '@mm-services/settings.service';
import { MutingTransition } from '@mm-services/transitions/muting.transition';
import { ValidationService } from '@mm-services/validation.service';
import { UserReplaceTransition } from '@mm-services/transitions/user-replace.transition';

describe('Transitions Service', () => {
  let settingsService;
  let mutingTransition;
  let validationService;
  let service: TransitionsService;

  beforeEach(() => {
    settingsService = { get: sinon.stub() };
    mutingTransition = {
      init: sinon.stub(),
      filter: sinon.stub(),
      run: sinon.stub(),
    };
    validationService = { init: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: MutingTransition, useValue: mutingTransition },
        { provide: UserReplaceTransition, useValue: { } },
        { provide: ValidationService, useValue: validationService },
      ]
    });
    service = TestBed.inject(TransitionsService);
  });

  it('should load and run transitions', async () => {
    const settings = {
      transitions: {
        update_clinics: true,
        muting: { client_side: true },
      },
    };
    settingsService.get.resolves(settings);
    mutingTransition.init.returns(true);
    mutingTransition.filter.returns(true);
    mutingTransition.run.callsFake(docs => {
      const clones = cloneDeep(docs);
      clones.forEach(doc => doc.transitioned = true);
      clones.push({ _id: 'other' });
      return Promise.resolve(clones);
    });

    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
    expect(mutingTransition.init.callCount).to.equal(1);

    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);

    expect(mutingTransition.filter.callCount).to.equal(1);
    expect(mutingTransition.filter.args[0]).to.deep.equal([[{ _id: 'a' }, { _id: 'b' }]]);
    expect(mutingTransition.run.callCount).to.equal(1);
    expect(mutingTransition.run.args[0]).to.deep.equal([[{ _id: 'a' }, { _id: 'b' }]]);
    expect(validationService.init.callCount).to.equal(1);

    expect(results).to.deep.equal([
      { _id: 'a', transitioned: true },
      { _id: 'b', transitioned: true },
      { _id: 'other' },
    ]);
  });

  it('should not load transitions when settings are missing', async () => {
    settingsService.get.resolves();

    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
    expect(mutingTransition.init.callCount).to.equal(0);

    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);
    expect(results).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);

    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  it('should not load disabled transitions', async () => {
    settingsService.get.resolves({ transitions: { muting: false } });

    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
    expect(mutingTransition.init.callCount).to.equal(0);

    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);
    expect(results).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);

    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  it('should not load non-client transitions', async () => {
    settingsService.get.resolves({ transitions: { muting: { disable: false, client_side: false } } });

    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
    expect(mutingTransition.init.callCount).to.equal(0);

    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);
    expect(results).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);

    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  it('should not load disabled transitions', async () => {
    settingsService.get.resolves({ transitions: { muting: { disable: true } } });

    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
    expect(mutingTransition.init.callCount).to.equal(0);

    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);
    expect(results).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);

    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  it('should not run transitions pre initialization', async () => {
    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const results = await service.applyTransitions(docs);
    expect(results).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);

    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
    expect(settingsService.get.callCount).to.equal(0);
  });

  it('should not init more than once', async () => {
    settingsService.get.resolves({ transitions: { muting: true } });

    service.init();
    service.init();
    service.init();
    service.init();
    await service.init();

    expect(settingsService.get.callCount).to.equal(1);
  });

  it('should not run transitions that fail initialization', async () => {
    settingsService.get.resolves({ transitions: { muting: { disable: false } } });
    mutingTransition.init.returns(false);

    await service.init();

    expect(mutingTransition.init.callCount).to.equal(1);
    expect(mutingTransition.init.args[0]).to.deep.equal([
      { transitions: { muting: { disable: false } } }
    ]);

    expect(await service.applyTransitions([{ _id: 'a' }])).to.deep.equal([{ _id: 'a' }]);
    expect(mutingTransition.filter.callCount).to.equal(0);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  it('should not run transitions when filtering returns false', async () => {
    settingsService.get.resolves({ transitions: { muting: { disable: false } } });
    mutingTransition.init.returns(true);
    mutingTransition.filter.returns(false);

    await service.init();

    expect(mutingTransition.init.callCount).to.equal(1);
    expect(mutingTransition.init.args[0]).to.deep.equal([
      { transitions: { muting: { disable: false } } }
    ]);

    expect(await service.applyTransitions([{ _id: 'a' }])).to.deep.equal([{ _id: 'a' }]);
    expect(mutingTransition.filter.callCount).to.equal(1);
    expect(mutingTransition.filter.args[0]).to.deep.equal([[{ _id: 'a' }]]);
    expect(mutingTransition.run.callCount).to.equal(0);
  });

  describe('error handling', () => {
    it('should catch settings loading errors', async () => {
      settingsService.get.rejects();

      await service.init();

      expect(settingsService.get.callCount).to.equal(1);
      expect(mutingTransition.init.callCount).to.equal(0);

      expect(await service.applyTransitions([{ _id: 'a'}])).to.deep.equal([{ _id: 'a' }]);
      expect(mutingTransition.filter.callCount).to.equal(0);
      expect(mutingTransition.run.callCount).to.equal(0);
    });

    it('should catch transition loading errors', async () => {
      settingsService.get.resolves({ transitions: { muting: { client_side: true } } });
      mutingTransition.init.throws();

      await service.init();
      expect(settingsService.get.callCount).to.equal(1);
      expect(mutingTransition.init.callCount).to.equal(1);

      expect(await service.applyTransitions([{ _id: 'a'}])).to.deep.equal([{ _id: 'a' }]);
      expect(mutingTransition.filter.callCount).to.equal(0);
      expect(mutingTransition.run.callCount).to.equal(0);
    });

    it('should not run partial transitions', async () => {
      settingsService.get.resolves({ transitions: { muting: true } });
      mutingTransition.init.returns(true);
      mutingTransition.filter.returns(true);
      mutingTransition.run.callsFake((docs) => {
        // mutate the docs and then throw an error
        docs[0].transitioned = true;
        return Promise.reject();
      });

      await service.init();
      const docs = [{ _id: 'a' }];
      const result = await service.applyTransitions(docs);
      expect(result).to.deep.equal([{ _id: 'a' }]);

      expect(mutingTransition.filter.callCount).to.equal(1);
      expect(mutingTransition.run.callCount).to.equal(1);
    });
  });
});
