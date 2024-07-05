import { expect } from 'chai';
import sinon from 'sinon';
import child_process from 'child_process';
import { helmInstallOrUpdate, ensureMedicHelmRepo } from '../src/install.js';
import UserRuntimeError from '../src/error.js';

const MEDIC_REPO_NAME = 'medic';
const MEDIC_REPO_URL = 'https://docs.communityhealthtoolkit.org/helm-charts';

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
    // Mock the response to simulate existing release
    child_process.execSync.withArgs(`helm list -n ${fakeNamespace}`).returns(Buffer.from('test-project'));
    child_process.execSync.returns(Buffer.from('Upgrade successful'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    const expectedCommand = `helm upgrade` +
        ` --install test-project medic/cht-chart-4x` +
        ` --version 5.0.0 --namespace test-namespace` +
        ` --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
    expect(child_process.execSync.calledWith(expectedCommand)).to.be.true;
  });

  it('should install a new release when no release exists', () => {
    // Mock the response to simulate no existing release
    child_process.execSync.withArgs(`helm list -n ${fakeNamespace}`).returns(Buffer.from(''));
    child_process.execSync.returns(Buffer.from('Install successful'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    const expectedCommand = `helm install test-project medic/cht-chart-4x` + 
        ` --version 5.0.0 --namespace test-namespace --create-namespace` +
        ` --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
    expect(child_process.execSync.calledWith(expectedCommand)).to.be.true;
  });

  it('should exit when error thrown', () => {
    // Force an error to be thrown
    child_process.execSync.throws(new Error('fake error'));

    helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);

    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should handle helm repo not found and add it', () => {
    // Mock the response to simulate helm repo not found
    const fakeRepoList = JSON.stringify([]);
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));

    ensureMedicHelmRepo();

    expect(child_process.execSync.calledWith(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`)).to.be.true;
  });

  it('should handle existing helm repo and update it', () => {
    // Mock the response to simulate existing helm repo
    const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }]);
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));

    ensureMedicHelmRepo();

    expect(child_process.execSync.calledWith(`helm repo update ${MEDIC_REPO_NAME}`)).to.be.true;
  });

  it('should exit if helm repo url does not match', () => {
    // Mock the response to simulate helm repo url mismatch
    const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: 'https://wrong.url' }]);
    child_process.execSync.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));
    child_process.execSync.throws(
      new UserRuntimeError(`Medic repo found but url not matching '${MEDIC_REPO_URL}', see: helm repo list`)
    );
    ensureMedicHelmRepo();

    expect(process.exit.calledWith(1)).to.be.true;
  });
});
