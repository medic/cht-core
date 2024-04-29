const fs = require('fs');
const { execSync } = require('child_process');
const axios = require('axios');
const yaml = require('js-yaml');
const path = require('path');

const MEDIC_REPO_NAME = "medic";
const MEDIC_REPO_URL = "https://docs.communityhealthtoolkit.org/helm-charts";
const CHT_CHART_NAME = `${MEDIC_REPO_NAME}/cht-chart-4x`;
const DEFAULT_CHART_VERSION = "0.2.3";

class UserRuntimeError extends Error {
    constructor(message) {
        super(message);
        this.name = "UserRuntimeError";
    }
}

function readFile(f) {
    try {
        return yaml.load(fs.readFileSync(f, 'utf8'));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

function prepare(f) {
    const values = readFile(f);
    const environment = values.environment || '';
    const scriptPath = path.join(__dirname, 'prepare.sh');
    execSync(`${scriptPath} ${environment}`, { stdio: 'inherit' });
}

function loadValues(f) {
    if (!f) {
        console.error("No values file provided. Please specify a values file using -f <file>");
        process.exit(1);
    }
    return readFile(f);
}

function determineNamespace(values) {
    const namespace = values.namespace || '';
    if (!namespace) {
        console.error("Namespace is not specified.");
        process.exit(1);
    }
    return namespace;
}

function checkNamespaceExists(namespace) {
    try {
        execSync(`kubectl get namespace ${namespace}`, { stdio: 'inherit' });
    } catch (err) {
        console.log(`Namespace ${namespace} does not exist. Creating the namespace.`);
        const namespaceManifest = `
apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
`;
        const scriptDir = __dirname;
        fs.writeFileSync(`${scriptDir}/helm/namespace.yaml`, namespaceManifest);
        execSync(`kubectl apply -f ${scriptDir}/helm/namespace.yaml`, { stdio: 'inherit' });
        fs.unlinkSync(`${scriptDir}/helm/namespace.yaml`);
    }
}

async function obtainCertificateAndKey(values) {
    console.log("Obtaining certificate...");
    const certSource = values.cert_source || '';
    if (certSource === 'specify-file-path') {
        const crtFilePath = values.certificate_crt_file_path;
        const keyFilePath = values.certificate_key_file_path;
        if (!crtFilePath || !keyFilePath) {
            throw new Error("certificate_crt_file_path and certificate_key_file_path must be set in values when cert_source is 'specify-file-path'");
        }
        fs.copyFileSync(crtFilePath, 'certificate.crt');
        fs.copyFileSync(keyFilePath, 'private.key');
    } else if (certSource === 'my-ip-co') {
        const crtResponse = await axios.get('https://local-ip.medicmobile.org/fullchain');
        const keyResponse = await axios.get('https://local-ip.medicmobile.org/key');
        fs.writeFileSync('certificate.crt', crtResponse.data);
        fs.writeFileSync('private.key', keyResponse.data);
    } else if (certSource !== 'eks-medic') {
        throw new UserRuntimeError("cert_source must be either 'specify-file-path', 'my-ip-co', or 'eks-medic'");
    }
}

function createSecret(namespace, values) {
    console.log("Checking if secret api-tls-secret already exists...");
    try {
        execSync(`kubectl get secret api-tls-secret -n ${namespace}`, { stdio: 'inherit' });
    } catch (err) {
        console.log("Secret does not exist. Creating Secret from certificate and key...");
        obtainCertificateAndKey(values);
        execSync(`kubectl -n ${namespace} create secret tls api-tls-secret --cert=certificate.crt --key=private.key`, { stdio: 'inherit' });
        fs.unlinkSync('certificate.crt');
        fs.unlinkSync('private.key');
    }
}

async function get_image_tag(chtversion) {
    const response = await axios.get(`https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:${chtversion}`);
    const data = response.data;
    const tag = data.tags.find(tag => tag.container_name === 'cht-api');
    if (!tag) throw new Error('cht image tag not found');
    return tag.image.split(':').pop();
}

function helmInstallOrUpdate(valuesFile, namespace, values, image_tag) {
    const chart_version = values.cht_chart_version || DEFAULT_CHART_VERSION;
    ensureMedicHelmRepo();
    const project_name = values.project_name || "";
    try {
        const releaseExists = execSync(`helm list -n ${namespace}`).toString();
        if (releaseExists.includes(project_name)) {
            console.log("Release exists. Performing upgrade.");
            execSync(
                `helm upgrade --install ${project_name} ${CHT_CHART_NAME} --version ${chart_version} --namespace ${namespace} --values ${valuesFile} --set cht_image_tag=${image_tag}`, { stdio: 'inherit' });
            console.log(`Instance at ${values.ingress.host} upgraded successfully.`);
        } else {
            console.log("Release does not exist. Performing install.");
            execSync(`helm install ${project_name} ${CHT_CHART_NAME} --version ${chart_version} --namespace ${namespace} --values ${valuesFile} --set cht_image_tag=${image_tag}`, { stdio: 'inherit' });
            console.log(`Instance at ${values.ingress.host} installed successfully.`);
        }
    } catch (err) {
        console.error(err.message);
    }
}

function ensureMedicHelmRepo() {
    try {
        const repoList = execSync(`helm repo list -o json`).toString();
        const repos = JSON.parse(repoList);
        const medicRepo = repos.find(repo => repo.name === MEDIC_REPO_NAME);
        if (!medicRepo) {
            console.log(`Helm repo ${MEDIC_REPO_NAME} not found, adding..`);
            execSync(`helm repo add ${MEDIC_REPO_NAME} ${MEDIC_REPO_URL}`, { stdio: 'inherit' });
        } else if (medicRepo.url.trim('/') !== MEDIC_REPO_URL) {
            throw new UserRuntimeError(`Medic repo found but url not matching '${MEDIC_REPO_URL}', see: helm repo list`);
        }
    } catch (err) {
        console.error(err.message);
        if (err instanceof UserRuntimeError) throw err;
    }
}

async function install(f) {
    prepare(f);
    const values = loadValues(f);
    const namespace = determineNamespace(values);
    checkNamespaceExists(namespace);
    if (values.cluster_type === 'k3s-k3d') {
        await obtainCertificateAndKey(values);
        createSecret(namespace, values);
    }
    const image_tag = await get_image_tag(values.chtversion);
    helmInstallOrUpdate(f, namespace, values, image_tag);
}

module.exports = { install };
