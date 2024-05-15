import { expect } from 'chai';
import sinon from 'sinon';
import child_process from 'child_process';
import { helmInstallOrUpdate, ensureMedicHelmRepo } from '../src/install.js';
import UserRuntimeError from '../src/error.js';

const MEDIC_REPO_NAME = "medic";
const MEDIC_REPO_URL = "https://docs.communityhealthtoolkit.org/helm-charts";

describe('helmInstallOrUpdate function', () => {
    let execSyncStub;
    let processExitStub;
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
        execSyncStub = sinon.stub(child_process, 'execSync');
        processExitStub = sinon.stub(process, 'exit');
    });

    afterEach(() => {
        execSyncStub.restore();
        processExitStub.restore();
    });

    it('should upgrade an existing release', () => {
        // Mock the response to simulate existing release
        execSyncStub.withArgs(`helm list -n ${fakeNamespace}`).returns(Buffer.from('test-project'));
        execSyncStub.returns(Buffer.from('Upgrade successful'));
        helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);
        const expectedCommand = `helm upgrade --install test-project medic/cht-chart-4x --version 5.0.0 --namespace test-namespace --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
        expect(execSyncStub.calledWith(expectedCommand)).to.be.true;
    });

    it('should install a new release when no release exists', () => {
        // Mock the response to simulate no existing release
        execSyncStub.withArgs(`helm list -n ${fakeNamespace}`).returns(Buffer.from(''));
        execSyncStub.returns(Buffer.from('Install successful'));
        helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);
        const expectedCommand = `helm install test-project medic/cht-chart-4x --version 5.0.0 --namespace test-namespace --create-namespace --values ${fakeValuesFile} --set cht_image_tag=${fakeImageTag}`;
        expect(execSyncStub.calledWith(expectedCommand)).to.be.true;
    });

    it('should exit when error thrown', () => {
        // Force an error to be thrown
        execSyncStub.throws(new Error('fake error'));
        helmInstallOrUpdate(fakeValuesFile, fakeNamespace, fakeValues, fakeImageTag);
        expect(processExitStub.calledWith(1)).to.be.true;
    });

    it('should handle helm repo not found and add it', () => {
        // Mock the response to simulate helm repo not found
        const fakeRepoList = JSON.stringify([]);
        execSyncStub.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));
        ensureMedicHelmRepo();
        expect(execSyncStub.calledWith(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`)).to.be.true;
    });

    it('should handle existing helm repo and update it', () => {
        // Mock the response to simulate existing helm repo
        const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: MEDIC_REPO_URL }]);
        execSyncStub.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));
        ensureMedicHelmRepo();
        expect(execSyncStub.calledWith(`helm repo update ${MEDIC_REPO_NAME}`)).to.be.true;
    });

    it('should exit if helm repo url does not match', () => {
        // Mock the response to simulate helm repo url mismatch
        const fakeRepoList = JSON.stringify([{ name: MEDIC_REPO_NAME, url: 'https://wrong.url' }]);
        execSyncStub.withArgs('helm repo list -o json').returns(Buffer.from(fakeRepoList));
        execSyncStub.throws(new UserRuntimeError(`Medic repo found but url not matching '${MEDIC_REPO_URL}', see: helm repo list`));
        ensureMedicHelmRepo();
        expect(processExitStub.calledWith(1)).to.be.true;
    });
});
