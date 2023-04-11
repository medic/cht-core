const { expect } = require('chai');
const TestHarness = require('cht-conf-test-harness');
const formInputs = require('../form-inputs');

const harness = new TestHarness();

describe('Covid-19 RDT - Tasks', () => {
  before(async () => await harness.start());

  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow('2021-01-01');
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('Should not show tasks if not submitted forms', async () => {
    const tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(0);
  });

  it('Should show correct task when provision is submitted', async () => {
    const provisionRDT = await harness.fillForm('covid19_rdt_provision', ...formInputs.provisionRDT);

    expect(provisionRDT.errors).to.be.empty;

    const tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);

    const task = tasks[0];
    expect(task).to.include({
      user: 'org.couchdb.user:chw_area_contact_id',
      requester: 'patient_id',
      owner: 'patient_id',
      state: 'Ready'
    });
    expect(task.emission).to.include({
      title: 'task.covid19.capture.title',
      icon: 'icon-follow-up',
      deleted: false,
      resolved: false,
      dueDate: '2021-01-02',
      startDate: '2021-01-01',
      endDate: '2021-01-04',
      forId: 'patient_id'
    });
    expect(task.emission.actions[0]).to.include({
      type: 'report',
      form: 'covid19_rdt_capture'
    });
  });

  it('Should resolve task when results are captured', async () => {
    const provisionRDT = await harness.fillForm('covid19_rdt_provision', ...formInputs.provisionRDT);

    expect(provisionRDT.errors).to.be.empty;

    let tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);

    harness.flush(1);
    await harness.loadAction(tasks[0]);
    const captureResult = await harness.fillForm(...formInputs.captureResult);

    expect(captureResult.errors).to.be.empty;

    tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(0);
  });

  it('Should not resolve task if capture form doesnt correspond with the provisioned RDT', async () => {
    const provisionRDT = await harness.fillForm('covid19_rdt_provision', ...formInputs.provisionRDT);

    expect(provisionRDT.errors).to.be.empty;

    let tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);

    harness.flush(1);
    await harness.loadAction(tasks[0]);
    // Filling a different form from the one loaded by the action, so it won't have the RDT's test_id
    const captureResult = await harness.fillForm('covid19_rdt_capture', ...formInputs.captureResult);

    expect(captureResult.errors).to.be.empty;

    tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);
    expect(tasks[0].emission).to.include({
      title: 'task.covid19.capture.title',
      icon: 'icon-follow-up',
      deleted: false,
      resolved: false,
      dueDate: '2021-01-02',
      startDate: '2021-01-01',
      endDate: '2021-01-04',
      forId: 'patient_id'
    });
  });

  it('Should show task for repeating a provision RDT', async () => {
    const provisionRDT = await harness.fillForm('covid19_rdt_provision', ...formInputs.provisionRDT);

    expect(provisionRDT.errors).to.be.empty;

    let tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);

    harness.flush(1);
    await harness.loadAction(tasks[0]);
    const captureResult = await harness.fillForm(...formInputs.captureResultWithRepeat);

    expect(captureResult.errors).to.be.empty;

    tasks = await harness.getTasks();

    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);
    const task = tasks[0];
    expect(task).to.include({
      user: 'org.couchdb.user:chw_area_contact_id',
      requester: 'patient_id',
      owner: 'patient_id',
      state: 'Ready'
    });
    expect(task.emission).to.include({
      title: 'task.covid19.repeat.title',
      icon: 'icon-follow-up',
      deleted: false,
      resolved: false,
      dueDate: '2021-01-03',
      startDate: '2021-01-02',
      endDate: '2021-01-05',
      forId: 'patient_id'
    });
    expect(task.emission.actions[0]).to.include({
      type: 'report',
      form: 'covid19_rdt_provision'
    });
  });

  it('Should resolve task for repeating a provision RDT and create a task for capturing results', async () => {
    const provisionRDT = await harness.fillForm('covid19_rdt_provision', ...formInputs.provisionRDT);

    expect(provisionRDT.errors).to.be.empty;

    harness.flush(1);
    let tasks = await harness.getTasks();
    await harness.loadAction(tasks[0]);
    const captureResult = await harness.fillForm(...formInputs.captureResultWithRepeat);

    expect(captureResult.errors).to.be.empty;

    harness.flush(1);
    tasks = await harness.getTasks();
    await harness.loadAction(tasks[0]);
    const repeatProvision = await harness.fillForm(...formInputs.provisionRDT);
    tasks = await harness.getTasks();

    expect(repeatProvision.errors).to.be.empty;
    expect(tasks).to.not.be.undefined;
    expect(tasks.length).to.equal(1);
    const task = tasks[0];
    expect(task).to.include({
      user: 'org.couchdb.user:chw_area_contact_id',
      requester: 'patient_id',
      owner: 'patient_id',
      state: 'Ready'
    });
    expect(task.emission).to.include({
      title: 'task.covid19.capture.title',
      icon: 'icon-follow-up',
      deleted: false,
      resolved: false,
      dueDate: '2021-01-04',
      startDate: '2021-01-03',
      endDate: '2021-01-06',
      forId: 'patient_id'
    });
    expect(task.emission.actions[0]).to.include({
      type: 'report',
      form: 'covid19_rdt_capture'
    });
  });
});
