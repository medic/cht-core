const { exec } = require('child_process');
const path = require('path');
const { expect } = require('chai');

const COMPOSE_FILE_PATH = path.join(__dirname, '..', 'compose.yml');
const CHT_NGINX_SERVICE_NAME = 'cht-nginx'; // Service name from compose.yml

describe('ssl-install.sh tests with Docker containers', function() {
  // Increase timeout significantly for Docker operations (startup, execution, cleanup)
  this.timeout(60000); // 1 minute

  // These are based on the default paths in ssl-install.sh
  const CONTAINER_SSL_PRIVATE_DIR = '/etc/nginx/private';
  const CONTAINER_SSL_CERT_FILE_PATH = path.join(CONTAINER_SSL_PRIVATE_DIR, 'cert.pem');
  const CONTAINER_SSL_KEY_FILE_PATH = path.join(CONTAINER_SSL_PRIVATE_DIR, 'key.pem');
  const CONTAINER_CERTBOT_DEPLOY_PATH = path.join(CONTAINER_SSL_PRIVATE_DIR, 'deploy.sh');
  const CONTAINER_CERTBOT_RELOAD_NGINX_PATH = '/etc/periodic/weekly/reload-nginx.sh';
  const CONTAINER_ACME_CHALLENGE_INDEX_PATH = path.join(
    CONTAINER_SSL_PRIVATE_DIR,
    'certbot/.well-known/acme-challenge/index.html'
  );

  /**
   * Helper function to execute the shell command and return a promise.
   * @param {string} command - Command to run.
   * @param {Object} env - Additional environment variables to set for this specific execution.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  const runCommand = (command = '', env = {}) => new Promise((resolve) => {
    // Merge current process environment with test-specific environment variables.
    const scriptEnv = {...process.env, ...env};

    // Execute the temporary ssl-install.sh script.
    exec(`${command}`, {env: scriptEnv}, (error, stdout, stderr) => {
      // The `error` object will be null for exit code 0, and contain an Error for non-zero exit codes.
      // We extract the exit code directly.
      const code = error ? error.code : 0;
      resolve({stdout, stderr, code});
    });
  });

  /**
   * Helper function to execute a command inside the cht-nginx container.
   * @param {string} command - The command string to execute inside the container.
   * @param {Object} env - Environment variables to pass to the exec command.
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  const execInContainer = (command, env = {}) => new Promise((resolve) => {
    // Convert env object to -e flags for docker compose exec
    const envFlags = Object.entries(env).map(([key, value]) => `-e ${key}="${value}"`).join(' ');
    // Ensure `bash` is used to execute the script in case it relies on bash-specific features
    const fullCommand = `docker compose -f "${COMPOSE_FILE_PATH}" exec ${envFlags} ${CHT_NGINX_SERVICE_NAME} bash -c "${command}"`;
    console.log(`Executing in container: ${fullCommand}`);

    exec(fullCommand, (error, stdout, stderr) => {
      const code = error ? error.code : 0;
      resolve({ stdout, stderr, code });
    });
  });
  
  /**
   * Helper to check if a file exists inside the container.
   * @param {string} filePath - The path to the file inside the container.
   * @returns {Promise<boolean>}
   */
  const fileExistsInContainer = async (filePath) => {
    const { code } = await execInContainer(`test -f ${filePath}`);
    return code === 0;
  };

  /**
   * Helper to read a file's content from inside the container.
   * @param {string} filePath - The path to the file inside the container.
   * @returns {Promise<string>}
   */
  const readFileInContainer = async (filePath) => {
    const { stdout, code, stderr } = await execInContainer(`cat ${filePath}`);
    if (code !== 0) {
      throw new Error(`Failed to read file ${filePath} from container. Stderr: ${stderr}`);
    }
    return stdout;
  };

  /**
   * Helper to write content to a file inside the container.
   * Ensures parent directories exist.
   * @param {string} filePath - The path to the file inside the container.
   * @param {string} content - The content to write.
   * @returns {Promise<void>}
   */
  const writeFileInContainer = async (filePath, content) => {
    const dir = path.dirname(filePath);
    await execInContainer(`mkdir -p ${dir}`); // Ensure directory exists

    const command = `cat > ${filePath} <<'EOF_DELIMITER'
${content}
EOF_DELIMITER`;

    const { code, stderr } = await execInContainer(command);

    if (code !== 0) {
      console.error(`Failed to write file ${filePath} in container: ${stderr}`);
      throw new Error(`Failed to write file ${filePath} in container.`);
    }
  };
  
  afterEach(async function() {
    // Bring down and remove the services after each test
    console.log(`Tearing down ${CHT_NGINX_SERVICE_NAME} service...`);
    await new Promise((resolve) => {
      exec(
        `docker compose -f "${COMPOSE_FILE_PATH}" down -v --remove-orphans`,
        (error, stdout, stderr) => { // -v to remove volumes
          if (error) {
            console.error(`docker compose down failed during cleanup: ${stderr}`);
          // Do not reject here to allow subsequent tests to run even if cleanup fails
          }
          console.log(`docker compose down output:\n${stdout}${stderr}`);
          resolve();
        }
      );
    });
    console.log(`${CHT_NGINX_SERVICE_NAME} service should be down and cleaned.`);
  });

  // --- Test Cases ---
  it('should run ssl-install.sh script welcome message', async function() {
    // Execute the 'welcome_message' function of the script inside the container
    const { stdout, stderr, code } = await runCommand(`docker compose -f ${COMPOSE_FILE_PATH} run --entrypoint "/docker-entrypoint.d/ssl-install.sh welcome_message" ${CHT_NGINX_SERVICE_NAME}`);
    const output = stdout + stderr;

    expect(code).to.equal(0);
    expect(output).to.include('Running SSL certificate checks');
  });

  it('should return an error message if CERTIFICATE_MODE environment variable is not set', async function() {
    // Execute 'select_ssl_certificate_mode' without setting CERTIFICATE_MODE env var
    const { stdout, stderr, code } = await runCommand(
      `docker compose -f ${COMPOSE_FILE_PATH} run -e CERTIFICATE_MODE= --entrypoint "/docker-entrypoint.d/ssl-install.sh select_ssl_certificate_mode" ${CHT_NGINX_SERVICE_NAME}`
    );
    const output = stdout + stderr;

    expect(code).to.not.equal(0); // Expect non-zero exit code for error
    expect(output).to.include(
      'ssl certificate mode unknown or not set. ' +
      'Please set a proper ssl certificate mode in the CERTIFICATE_MODE variable'
    );
  });

  it(
    'should return an appropriate error message if CERTIFICATE_MODE is OWN_CERT but certificates are not provided',
    async function() {
      // Execute 'select_ssl_certificate_mode' with OWN_CERT mode, but no files pre-created
      const { stdout, stderr, code } = await runCommand(
        `docker compose -f ${COMPOSE_FILE_PATH} run -e CERTIFICATE_MODE=OWN_CERT --entrypoint "/docker-entrypoint.d/ssl-install.sh select_ssl_certificate_mode" ${CHT_NGINX_SERVICE_NAME}`
      );
      const output = stdout + stderr;

      expect(code).to.not.equal(0);
      expect(output).to.include('Please provide add your certificate');
    }
  );

  it('should succeed when CERTIFICATE_MODE is OWN_CERT and certificates are provided', async function() {
    let { stdout, stderr, code } = await runCommand(
      `docker compose -f ${COMPOSE_FILE_PATH} run -d -e CERTIFICATE_MODE=OWN_CERT --entrypoint "sleep infinity" ${CHT_NGINX_SERVICE_NAME}`
    );
    expect(code).to.equal(0);

    // Pre-create dummy cert files inside the container
    const dummyCert = '---BEGIN CERTIFICATE---\ndummy cert content\n---END CERTIFICATE---';
    const dummyKey = '---BEGIN PRIVATE KEY---\ndummy key content\n---END PRIVATE KEY---';
    await writeFileInContainer(CONTAINER_SSL_CERT_FILE_PATH, dummyCert);
    await writeFileInContainer(CONTAINER_SSL_KEY_FILE_PATH, dummyKey);

    ({ stdout, stderr, code } = await execInContainer(`/docker-entrypoint.d/ssl-install.sh main`, {
      CERTIFICATE_MODE: 'OWN_CERT'
    }));
    const output = stdout + stderr;

    expect(output).to.include('Running SSL certificate checks');
    expect(output).to.include('SSL certificate exists.');
    expect(output).to.include('Launching Nginx');

    // Verify files exist and content hasn't changed inside the container
    expect(await fileExistsInContainer(CONTAINER_SSL_CERT_FILE_PATH)).to.be.true;
    expect(await fileExistsInContainer(CONTAINER_SSL_KEY_FILE_PATH)).to.be.true;
    expect((await readFileInContainer(CONTAINER_SSL_CERT_FILE_PATH)).trim()).to.equal(dummyCert.trim());
    expect((await readFileInContainer(CONTAINER_SSL_KEY_FILE_PATH)).trim()).to.equal(dummyKey.trim());
  });

  it('should generate SSL certs if CERTIFICATE_MODE is SELF_SIGNED', async function() {
    let { stdout, stderr, code } = await runCommand(
      `docker compose -f ${COMPOSE_FILE_PATH} run -d -e CERTIFICATE_MODE=SELF_SIGNED --entrypoint "sleep infinity" ${CHT_NGINX_SERVICE_NAME}`
    );
    expect(code).to.equal(0);

    // Ensure files do not exist initially in the container (cleanup in beforeEach handles this)
    expect(await fileExistsInContainer(CONTAINER_SSL_CERT_FILE_PATH)).to.be.false;
    expect(await fileExistsInContainer(CONTAINER_SSL_KEY_FILE_PATH)).to.be.false;

    ({ stdout, stderr, code } = await execInContainer(`/docker-entrypoint.d/ssl-install.sh main`, {
      CERTIFICATE_MODE: 'SELF_SIGNED',
      COMMON_NAME: 'test.dev.medic.org',
    }));
    const output = stdout + stderr;

    expect(output).to.include('self signed certificate for test.dev.medic.org generated');
    expect(output).to.include('Launching Nginx');

    // Check if files were created in the container
    expect(await fileExistsInContainer(CONTAINER_SSL_CERT_FILE_PATH)).to.be.true;
    expect(await fileExistsInContainer(CONTAINER_SSL_KEY_FILE_PATH)).to.be.true;

    // Verify content is not empty (basic check)
    const certContent = await readFileInContainer(CONTAINER_SSL_CERT_FILE_PATH);
    const keyContent = await readFileInContainer(CONTAINER_SSL_KEY_FILE_PATH);
    expect(certContent.length).to.be.greaterThan(0);
    expect(keyContent.length).to.be.greaterThan(0);
    expect(certContent).to.include('BEGIN CERTIFICATE');
    expect(keyContent).to.include('BEGIN PRIVATE KEY');
  });

  it('should not create a new self-signed certificate if one already exists', async function() {
    let { stdout, stderr, code } = await runCommand(
      `docker compose -f ${COMPOSE_FILE_PATH} run -d -e CERTIFICATE_MODE=SELF_SIGNED --entrypoint "sleep infinity" ${CHT_NGINX_SERVICE_NAME}`
    );
    expect(code).to.equal(0);

    // Create dummy certificate files inside the container
    const initialCertContent = 'initial self-signed cert content';
    const initialKeyContent = 'initial self-signed key content';
    await writeFileInContainer(CONTAINER_SSL_CERT_FILE_PATH, initialCertContent);
    await writeFileInContainer(CONTAINER_SSL_KEY_FILE_PATH, initialKeyContent);

    ({ stdout, stderr, code } = await execInContainer(`/docker-entrypoint.d/ssl-install.sh main`, {
      CERTIFICATE_MODE: 'SELF_SIGNED'
    }));
    const output = stdout + stderr;

    expect(output).to.include('SSL cert already exists.'); // From ensure_own_cert_exits or generate_self_signed_cert
    expect(output).to.include('Launching Nginx');

    // Ensure the content hasn't changed
    expect((await readFileInContainer(CONTAINER_SSL_CERT_FILE_PATH)).trim()).to.equal(initialCertContent.trim());
    expect((await readFileInContainer(CONTAINER_SSL_KEY_FILE_PATH)).trim()).to.equal(initialKeyContent.trim());
  });

  it(
    'should generate a self-signed certificate first, then configure for AUTO_GENERATE if one does not exist',
    async function() {
      let { stdout, stderr, code } = await runCommand(
        `docker compose -f ${COMPOSE_FILE_PATH} run -d -e CERTIFICATE_MODE=AUTO_GENERATE --entrypoint "sleep infinity" ${CHT_NGINX_SERVICE_NAME}`
      );
      expect(code).to.equal(0);

      // Ensure no certs exist initially (cleanup in beforeEach handles this)
      expect(await fileExistsInContainer(CONTAINER_SSL_CERT_FILE_PATH)).to.be.false;
      expect(await fileExistsInContainer(CONTAINER_SSL_KEY_FILE_PATH)).to.be.false;

      ({ stdout, stderr, code } = await execInContainer(`/docker-entrypoint.d/ssl-install.sh main`, {
        CERTIFICATE_MODE: 'AUTO_GENERATE',
        COMMON_NAME: 'test.dev.medic.org',
        EMAIL: 'test@medic.org'
      }));
      const output = stdout + stderr;

      expect(code).to.equal(0);
      expect(output).to.include('self signed certificate for test.dev.medic.org generated');
      expect(output).to.include('Launching Nginx');
      expect(output).to.include('nginx configured to work with certbot'); // From enable_certbot_compatability

      // Verify files created and certbot compatibility files exist
      expect(await fileExistsInContainer(CONTAINER_SSL_CERT_FILE_PATH)).to.be.true;
      expect(await fileExistsInContainer(CONTAINER_SSL_KEY_FILE_PATH)).to.be.true;
      expect(await fileExistsInContainer(CONTAINER_CERTBOT_DEPLOY_PATH)).to.be.true;
      expect(await fileExistsInContainer(CONTAINER_CERTBOT_RELOAD_NGINX_PATH)).to.be.true;
      expect(await fileExistsInContainer(CONTAINER_ACME_CHALLENGE_INDEX_PATH)).to.be.true;
      expect(
        (await readFileInContainer(CONTAINER_ACME_CHALLENGE_INDEX_PATH)).trim()
      ).to.include('CERTIFICATE_MODE AUTO_GENERATE');
    }
  );

  it(
    'should not generate a new certificate if CERTIFICATE_MODE is AUTO_GENERATE and one exists',
    async function() {
      let { stdout, stderr, code } = await runCommand(
        `docker compose -f ${COMPOSE_FILE_PATH} run -d -e CERTIFICATE_MODE=AUTO_GENERATE --entrypoint "sleep infinity" ${CHT_NGINX_SERVICE_NAME}`
      );
      expect(code).to.equal(0);

      // Create dummy certificate files inside the container
      const initialCertContent = 'existing auto-gen cert content';
      const initialKeyContent = 'existing auto-gen key content';
      await writeFileInContainer(CONTAINER_SSL_CERT_FILE_PATH, initialCertContent);
      await writeFileInContainer(CONTAINER_SSL_KEY_FILE_PATH, initialKeyContent);

      ({ stdout, stderr, code } = await execInContainer(`/docker-entrypoint.d/ssl-install.sh main`, {
        CERTIFICATE_MODE: 'AUTO_GENERATE',
        COMMON_NAME: 'test.dev.medic.org',
        EMAIL: 'test@medic.org'
      }));
      const output = stdout + stderr;

      expect(code).to.equal(0);
      expect(output).to.include('SSL cert already exists.'); // From ensure_own_cert_exits or generate_self_signed_cert
      expect(output).to.include('Launching Nginx');
      expect(output).to.include('nginx configured to work with certbot');

      // Ensure the content of the cert/key files hasn't changed
      expect((await readFileInContainer(CONTAINER_SSL_CERT_FILE_PATH)).trim()).to.equal(initialCertContent.trim());
      expect((await readFileInContainer(CONTAINER_SSL_KEY_FILE_PATH)).trim()).to.equal(initialKeyContent.trim());
    }
  );
});
