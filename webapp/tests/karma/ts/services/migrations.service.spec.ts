import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { MigrationsService } from '@mm-services/migrations.service';
import { TargetCheckpointerMigration } from '@mm-services/migrations/target-checkpointer.migration';
import { DbService } from '@mm-services/db.service';

describe('Migrations service', () => {
  let dbService;
  let targetCheckpointerMigration;
  let service:MigrationsService;

  beforeEach(() => {
    dbService = {};
    targetCheckpointerMigration = {
      hasRun: sinon.stub(),
      run: sinon.stub(),
      setHasRun: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: TargetCheckpointerMigration, useValue: targetCheckpointerMigration },
      ]
    });
    service = TestBed.inject(MigrationsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should run all migrations', async () => {
    targetCheckpointerMigration.hasRun.resolves(false);
    targetCheckpointerMigration.run.resolves();
    targetCheckpointerMigration.setHasRun.resolves();

    await service.runMigrations();

    expect(targetCheckpointerMigration.hasRun.args).to.deep.equal([[dbService]]);
    expect(targetCheckpointerMigration.run.args).to.deep.equal([[]]);
    expect(targetCheckpointerMigration.setHasRun.args).to.deep.equal([[dbService]]);
  });

  it('should not run mirations that ran previously', async () => {
    targetCheckpointerMigration.hasRun.resolves(true);

    await service.runMigrations();

    expect(targetCheckpointerMigration.hasRun.args).to.deep.equal([[dbService]]);
    expect(targetCheckpointerMigration.run.callCount).to.equal(0);
    expect(targetCheckpointerMigration.setHasRun.callCount).to.equal(0);
  });

  it('should throw migration has run errors', async () => {
    targetCheckpointerMigration.hasRun.rejects(new Error('omg'));

    await expect(service.runMigrations()).to.be.rejectedWith(Error, 'omg');
    expect(targetCheckpointerMigration.run.callCount).to.equal(0);
    expect(targetCheckpointerMigration.setHasRun.callCount).to.equal(0);
  });

  it('should throw run errors', async () => {
    targetCheckpointerMigration.hasRun.resolves(false);
    targetCheckpointerMigration.run.rejects(new Error('did not run'));

    await expect(service.runMigrations()).to.be.rejectedWith(Error, 'did not run');
    expect(targetCheckpointerMigration.setHasRun.callCount).to.equal(0);
  });

  it('should throw sethasrun errors', async () => {
    targetCheckpointerMigration.hasRun.resolves(false);
    targetCheckpointerMigration.run.resolves();
    targetCheckpointerMigration.setHasRun.rejects(new Error('failed'));

    await expect(service.runMigrations()).to.be.rejectedWith(Error, 'failed');
  });
});
