import fs from 'fs';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import UserRuntimeError from './error.js';

export async function obtainCertificateAndKey(values) {
    console.log("Obtaining certificate...");
    const certSource = values.cert_source || '';
    if (certSource === 'specify-file-path') {
        const crtFilePath = values.certificate_crt_file_path;
        const keyFilePath = values.certificate_key_file_path;
        if (!crtFilePath || !keyFilePath) {
            return Promise.reject(Error("certificate_crt_file_path and certificate_key_file_path must be set in values when cert_source is 'specify-file-path'"));
        }
        fs.copyFileSync(crtFilePath, 'certificate.crt');
        fs.copyFileSync(keyFilePath, 'private.key');
    } else if (certSource === 'my-ip-co') {
        const crtResponse = await fetch('https://local-ip.medicmobile.org/fullchain');
        const crtData = await crtResponse.text();
        const keyResponse = await fetch('https://local-ip.medicmobile.org/key');
        const keyData = await keyResponse.text();
        fs.writeFileSync('certificate.crt', crtData);
        fs.writeFileSync('private.key', keyData);
    } else if (certSource !== 'eks-medic') {
        return Promise.reject(UserRuntimeError("cert_source must be either 'specify-file-path', 'my-ip-co', or 'eks-medic'"));
    }
}

export function createSecret(namespace, values) {
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
