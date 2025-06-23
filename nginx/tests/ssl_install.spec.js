const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os'); // For os.tmpdir()
const { expect } = require('chai');

const SSL_INSTALL_SCRIPT_SOURCE_PATH = '/tests/nginx/ssl-install.sh';


describe('ssl-install.sh tests', function() {
  // Set a higher timeout for shell command execution, especially for openssl.
  this.timeout(20000);

  let tempDir; // Base temporary directory for all test artifacts
  let sslInstallScriptPath; // Path where the ssl-install.sh content will be copied to for testing
  let baseTempPath; // Corresponds to /etc/nginx/private in the script's context within our tempDir
  let sslCertFilePath; // Actual temp path for cert.pem
  let sslKeyFilePath; // Actual temp path for key.pem
  let certbotTempPath; // Temp path for certbot related files within the /etc/nginx/private structure

  beforeEach(async function() {
    // Create a unique base temporary directory for all test artifacts
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssl-install-test-'));

    // Define the temporary path where we will copy the script for execution
    sslInstallScriptPath = path.join(tempDir, 'ssl-install.sh');

    // Copy the ssl-install.sh script from its source path to the temporary directory
    // This ensures we're running a fresh copy for each test and isolating it.
    fs.copyFileSync(SSL_INSTALL_SCRIPT_SOURCE_PATH, sslInstallScriptPath);
    fs.chmodSync(sslInstallScriptPath, '755'); // Make it executable

    // Simulate the /etc/nginx/private structure within our temporary directory.
    // The script's `mkdir -p /etc/nginx/private` will operate on the real root
    // unless the environment is containerized or chrooted.
    // For our tests, we'll ensure our temp paths are used for SSL_CERT_FILE_PATH and SSL_KEY_FILE_PATH.
    baseTempPath = path.join(tempDir, 'etc', 'nginx', 'private');
    fs.mkdirSync(baseTempPath, { recursive: true });

    // Define the actual file paths the script will use within our temporary structure
    sslCertFilePath = path.join(baseTempPath, 'cert.pem');
    sslKeyFilePath = path.join(baseTempPath, 'key.pem');

    // Define certbot related paths within the temporary /etc/nginx/private structure
    certbotTempPath = path.join(baseTempPath, 'certbot');
    fs.mkdirSync(path.join(certbotTempPath, '.well-known', 'acme-challenge'), { recursive: true });

    // Set environment variables for the script's execution.
    // These will override the script's default hardcoded paths for cert.pem and key.pem.
    process.env.SSL_CERT_FILE_PATH = sslCertFilePath;
    process.env.SSL_KEY_FILE_PATH = sslKeyFilePath;

    // Clear other specific environment variables that might affect tests
    delete process.env.CERTIFICATE_MODE;
    delete process.env.COMMON_NAME;
    delete process.env.EMAIL;
    delete process.env.COUNTRY;
    delete process.env.STATE;
    delete process.env.LOCALITY;
    delete process.env.ORGANISATION;
    delete process.env.DEPARTMENT;
  });

  afterEach(function() {
    // Clean up the entire temporary directory created for the test run.
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Clean up environment variables that were set for the script.
    delete process.env.SSL_CERT_FILE_PATH;
    delete process.env.SSL_KEY_FILE_PATH;
    delete process.env.CERTIFICATE_MODE;
    delete process.env.COMMON_NAME;
    delete process.env.EMAIL;
    delete process.env.COUNTRY;
    delete process.env.STATE;
    delete process.env.LOCALITY;
    delete process.env.ORGANISATION;
    delete process.env.DEPARTMENT;
  });

  /**
   * Helper function to execute the shell script and return a promise.
   * @param {string} args - Arguments to pass to the script (e.g., "welcome_message").
   * @param {Object} env - Additional environment variables to set for this specific execution.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  function runScript(args = '', env = {}) {
    return new Promise((resolve) => {
      // Merge current process environment with test-specific environment variables.
      const scriptEnv = { ...process.env, ...env };

      // Execute the temporary ssl-install.sh script.
      exec(`${sslInstallScriptPath} ${args}`, { env: scriptEnv }, (error, stdout, stderr) => {
        // The `error` object will be null for exit code 0, and contain an Error for non-zero exit codes.
        // We extract the exit code directly.
        const code = error ? error.code : 0;
        resolve({ stdout, stderr, code });
      });
    });
  }

  it('should run welcome_message and output "Running SSL certificate checks"', async function() {
    const { stdout, stderr, code } = await runScript('welcome_message');
    const output = stdout + stderr; // Combine stdout and stderr as Bats does for 'assert_output'
    expect(code).to.equal(0); // Assert success (exit code 0)
    expect(output).to.include('Running SSL certificate checks');
  });

  it('should return an error message if CERTIFICATE_MODE environment variable is not set', async function() {
    const { stdout, stderr, code } = await runScript('select_ssl_certificate_mode');
    const output = stdout + stderr;
    expect(code).to.not.equal(0); // Assert failure (non-zero exit code)
    expect(output).to.include('ssl certificate mode unknown or not set. Please set a proper ssl certificate mode in the CERTIFICATE_MODE variable');
  });

  it('should return an appropriate error message if CERTIFICATE_MODE is OWN_CERT but certificates are not provided', async function() {
    const { stdout, stderr, code } = await runScript('select_ssl_certificate_mode', { CERTIFICATE_MODE: 'OWN_CERT' });
    const output = stdout + stderr;
    expect(code).to.not.equal(0); // Assert failure
    expect(output).to.include('Please provide add your certificate');
  });

  it('should succeed when CERTIFICATE_MODE is OWN_CERT and certificates are provided', async function() {
    // Create dummy certificate files within our temporary path
    fs.writeFileSync(sslCertFilePath, 'dummy cert content');
    fs.writeFileSync(sslKeyFilePath, 'dummy key content');

    const { stdout, stderr, code } = await runScript('main', { CERTIFICATE_MODE: 'OWN_CERT' });
    const output = stdout + stderr;

    expect(code).to.equal(0); // Assert success
    expect(output).to.include('Running SSL certificate checks');
    expect(output).to.include('SSL certificate exists.');
    expect(output).to.include('Launching Nginx');

    // Verify the files still exist and contain the original dummy content (they should not be overwritten)
    expect(fs.existsSync(sslCertFilePath)).to.be.true;
    expect(fs.existsSync(sslKeyFilePath)).to.be.true;
    expect(fs.readFileSync(sslCertFilePath, 'utf8')).to.equal('dummy cert content');
    expect(fs.readFileSync(sslKeyFilePath, 'utf8')).to.equal('dummy key content');
  });

  it('should generate SSL certs if CERTIFICATE_MODE is SELF_SIGNED', async function() {
    // Ensure files do not exist before running
    expect(fs.existsSync(sslCertFilePath)).to.be.false;
    expect(fs.existsSync(sslKeyFilePath)).to.be.false;

    const { stdout, stderr, code } = await runScript('main', {
      CERTIFICATE_MODE: 'SELF_SIGNED',
      COMMON_NAME: 'test.dev.medic.org',
      // Default environment variables from the script will apply for COUNTRY, STATE, etc. if not set here.
    });
    const output = stdout + stderr;

    expect(code).to.equal(0); // Assert success
    // `openssl req` output usually goes to stderr.
    expect(output).to.include('self signed certificate for test.dev.medic.org generated');
    expect(output).to.include('Launching Nginx');

    // Check if files were created in the temporary directory
    expect(fs.existsSync(sslCertFilePath)).to.be.true;
    expect(fs.existsSync(sslKeyFilePath)).to.be.true;

    // Verify that the generated certificate/key are not empty (basic check)
    expect(fs.statSync(sslCertFilePath).size).to.be.greaterThan(0);
    expect(fs.statSync(sslKeyFilePath).size).to.be.greaterThan(0);

    // Note: This test requires `openssl` to be available in the test environment's PATH.
  });

  it('should not create a new self-signed certificate if one already exists', async function() {
    // Create dummy certificate files (to simulate existing ones)
    const initialCertContent = 'initial self-signed cert content';
    const initialKeyContent = 'initial self-signed key content';
    fs.writeFileSync(sslCertFilePath, initialCertContent);
    fs.writeFileSync(sslKeyFilePath, initialKeyContent);

    const { stdout, stderr, code } = await runScript('main', { CERTIFICATE_MODE: 'SELF_SIGNED' });
    const output = stdout + stderr;

    expect(code).to.equal(0); // Assert success
    expect(output).to.include('self signed SSL cert already exists.');
    expect(output).to.include('Launching Nginx');

    // Ensure the content hasn't changed (meaning a new cert was not generated)
    expect(fs.readFileSync(sslCertFilePath, 'utf8')).to.equal(initialCertContent);
    expect(fs.readFileSync(sslKeyFilePath, 'utf8')).to.equal(initialKeyContent);
  });

  it('should not generate a new certificate if CERTIFICATE_MODE is AUTO_GENERATE and one exists', async function() {
    // Create dummy certificate files
    const initialCertContent = 'existing auto-gen cert content';
    const initialKeyContent = 'existing auto-gen key content';
    fs.writeFileSync(sslCertFilePath, initialCertContent);
    fs.writeFileSync(sslKeyFilePath, initialKeyContent);

    const { stdout, stderr, code } = await runScript('main', {
      CERTIFICATE_MODE: 'AUTO_GENERATE',
      COMMON_NAME: 'test.dev.medic.org',
      EMAIL: 'test@medic.org'
    });
    const output = stdout + stderr;

    expect(code).to.equal(0); // Assert success
    expect(output).to.include('SSL cert already exists.');
    expect(output).to.include('Launching Nginx');
    expect(output).to.include('nginx configured to work with certbot');


    // Ensure the content of the cert/key files hasn't changed
    expect(fs.readFileSync(sslCertFilePath, 'utf8')).to.equal(initialCertContent);
    expect(fs.readFileSync(sslKeyFilePath, 'utf8')).to.equal(initialKeyContent);

    // Check if certbot compatibility files are created/modified in the *temporary* structure.
    // /etc/nginx/private/deploy.sh maps to baseTempPath/deploy.sh
    const deployScriptPath = path.join(baseTempPath, 'deploy.sh');
    // /etc/nginx/private/certbot/.well-known/acme-challenge/index.html maps to certbotTempPath/../index.html
    const indexHtmlPath = path.join(certbotTempPath, '.well-known', 'acme-challenge', 'index.html');

    expect(fs.existsSync(deployScriptPath)).to.be.true;
    expect(fs.existsSync(indexHtmlPath)).to.be.true;
    expect(fs.readFileSync(indexHtmlPath, 'utf8')).to.include('CERTIFICATE_MODE AUTO_GENERATE');
    expect(fs.readFileSync(deployScriptPath, 'utf8')).to.include(
      'cp "$RENEWED_LINEAGE/fullchain.pem" /etc/nginx/private/cert.pem'
    );

    // Note: The script also attempts to write to /etc/periodic/weekly/reload-nginx.sh.
    // This test does not verify that file's creation/content directly as it operates
    // outside the controlled temporary directory structure for this specific file.
    // Verifying it would require root privileges or a more complex isolated test environment.
  });
});
