import { expect } from 'chai';
import sinon from 'sinon';
import child_process from 'child_process';
import { helmInstallOrUpdate, ensureMedicHelmRepo } from '../src/install.js';

const MEDIC_REPO_NAME = 'medic';
const MEDIC_REPO_URL = 'https://docs.communityhealthtoolkit.org/helm-charts';
const CHT_CHART_NAME = `${MEDIC_REPO_NAME}/cht-chart-4x`;

describe('helmInstallOrUpdate function', () => {
  const fakeValuesFile = 'path_to_fake_values.yaml';
  const fakeNamespace = 'test-namespace';
  const fakeValues = {
    project_name: 'test-project',
    ingress: {
      host: 'test.host.com'
    },
    cht_chart_version: '5.0.0'
  };
  const fakeImageTag = 'latest';

  beforeEach(() => {
    sinon.stub(child_process, 'execSync');
    sinon.stub(process, 'exit');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should upgrade an existing release', () => {
    // Mock the responses
    child_process.execSync.withArgs('helm repo list -o json')
      .returns(Buffer.from(JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }])));
    child_process.execSync.withArgs(`helm repo update ${MEDIC_REPO_NAME}`)
      .returns(Buffer.from('Successfully got an update from the "medic" chart repository'));
    child_process.execSync.withArgs(`kubectl get namespace ${fakeNamespace}`)
      .returns(Buffer.from(`NAME            STATUS   AGE\n${fakeNamespace}   Active   10d`));
    child_process.execSync.withArgs(`helm list -n ${fakeNamespace}`)
      .returns(Buffer.from('NAME            REVISION        UPDATED                         ' +
      'STATUS          CHART           APP VERSION     NAMESPACE\n' +
      'test-project    1               2023-07-05 10:00:00.000000000 +0000 UTC deployed        ' +
      'cht-chart-4x-1.0.0   1.0.0           test-namespace'));
    const upgradeCommand = `helm upgrade --install test-project ${CHT_CHART_NAME} --version 5.0.0 ` +
      `--namespace ${fakeNamespace} --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
    child_process.execSync.withArgs(upgradeCommand, { stdio: 'inherit' })
      .returns(Buffer.from('Release "test-project" has been upgraded. Happy Helming!'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    expect(child_process.execSync.callCount).to.equal(5);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
    expect(child_process.execSync.getCall(1).args[0]).to.equal(`helm repo update ${MEDIC_REPO_NAME}`);
    expect(child_process.execSync.getCall(2).args[0]).to.equal(`kubectl get namespace ${fakeNamespace}`);
    expect(child_process.execSync.getCall(3).args[0]).to.equal(`helm list -n ${fakeNamespace}`);
    expect(child_process.execSync.getCall(4).args[0]).to.equal(upgradeCommand);
    expect(child_process.execSync.getCall(4).args[1]).to.deep.equal({ stdio: 'inherit' });
  });

  it('should install a new release when no release exists', () => {
    // Mock the responses
    child_process.execSync.withArgs('helm repo list -o json')
      .returns(Buffer.from(JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }])));
    child_process.execSync.withArgs(`helm repo update ${MEDIC_REPO_NAME}`)
      .returns(Buffer.from('Successfully got an update from the "medic" chart repository'));
    child_process.execSync.withArgs(`kubectl get namespace ${fakeNamespace}`)
      .throws(new Error('Error from server (NotFound): namespaces "test-namespace" not found'));
    child_process.execSync.withArgs(`helm list -n ${fakeNamespace}`)
      .returns(Buffer.from(''));

    const installCommand = `helm install test-project ${CHT_CHART_NAME} --version 5.0.0 --namespace ${fakeNamespace} ` +
      `--create-namespace --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
    child_process.execSync.withArgs(installCommand, { stdio: 'inherit' })
      .returns(Buffer.from('Release "test-project" has been installed. Happy Helming!'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    expect(child_process.execSync.callCount).to.equal(5);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
    expect(child_process.execSync.getCall(1).args[0]).to.equal(`helm repo update ${MEDIC_REPO_NAME}`);
    expect(child_process.execSync.getCall(2).args[0]).to.equal(`kubectl get namespace ${fakeNamespace}`);
    expect(child_process.execSync.getCall(3).args[0]).to.equal(`helm list -n ${fakeNamespace}`);
    expect(child_process.execSync.getCall(4).args[0]).to.equal(installCommand);
    expect(child_process.execSync.getCall(4).args[1]).to.deep.equal({ stdio: 'inherit' });
  });

  it('should exit when error thrown during helm list', () => {
    // Mock the responses
    child_process.execSync.withArgs('helm repo list -o json')
      .returns(Buffer.from(JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }])));
    child_process.execSync.withArgs(`helm repo update ${MEDIC_REPO_NAME}`)
      .returns(Buffer.from('Successfully got an update from the "medic" chart repository'));
    child_process.execSync.withArgs(`kubectl get namespace ${fakeNamespace}`)
      .returns(Buffer.from(`NAME            STATUS   AGE\n${fakeNamespace}   Active   10d`));
    child_process.execSync.withArgs(`helm list -n ${fakeNamespace}`)
      .throws(new Error('Error: could not find tiller'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    expect(process.exit.calledWith(1)).to.be.true;
    expect(child_process.execSync.callCount).to.equal(4);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
    expect(child_process.execSync.getCall(1).args[0]).to.equal(`helm repo update ${MEDIC_REPO_NAME}`);
    expect(child_process.execSync.getCall(2).args[0]).to.equal(`kubectl get namespace ${fakeNamespace}`);
    expect(child_process.execSync.getCall(3).args[0]).to.equal(`helm list -n ${fakeNamespace}`);
  });
});

describe('ensureMedicHelmRepo function', () => {
  beforeEach(() => {
    sinon.stub(child_process, 'execSync');
    sinon.stub(process, 'exit');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should handle helm repo not found and add it', () => {
    // Mock the responses
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from('[]'));
    child_process.execSync.withArgs(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`, { stdio: 'inherit' })
      .returns(Buffer.from('"medic" has been added to your repositories'));

    ensureMedicHelmRepo();

    expect(child_process.execSync.callCount).to.equal(2);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
    expect(child_process.execSync.getCall(1).args[0]).to.equal(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`);
    expect(child_process.execSync.getCall(1).args[1]).to.deep.equal({ stdio: 'inherit' });
  });

  it('should handle existing helm repo and update it', () => {
    // Mock the responses
    const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }]);
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));
    child_process.execSync.withArgs(`helm repo update ${MEDIC_REPO_NAME}`, { stdio: 'inherit' })
      .returns(Buffer.from('Successfully got an update from the "medic" chart repository'));

    ensureMedicHelmRepo();

    expect(child_process.execSync.callCount).to.equal(2);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
    expect(child_process.execSync.getCall(1).args[0]).to.equal(`helm repo update ${MEDIC_REPO_NAME}`);
    expect(child_process.execSync.getCall(1).args[1]).to.deep.equal({ stdio: 'inherit' });
  });

  it('should exit if helm repo url does not match', () => {
    // Mock the responses
    const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: 'https://wrong.url' }]);
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));

    ensureMedicHelmRepo();

    expect(process.exit.calledWith(1)).to.be.true;
    expect(child_process.execSync.callCount).to.equal(1);
    expect(child_process.execSync.getCall(0).args[0]).to.equal('helm repo list -o json');
  });
});
