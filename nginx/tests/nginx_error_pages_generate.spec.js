const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs').promises;
const path = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

describe('generate.sh validation tests', function() {
  let tmpWorkDir;
  let actualErrorsDir;
  let tmpErrorsDir;

  beforeEach(async () => {
    // Set timeout for setup
    this.timeout(10000);

    // Create temporary directory
    tmpWorkDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nginx-test-'));

    // Set up directories
    const currentDir = __dirname;
    actualErrorsDir = path.join(currentDir, '..', 'nginx', 'nginx_error_pages');
    tmpErrorsDir = path.join(tmpWorkDir, 'nginx_error_pages');

    // Create temp errors directory
    await fs.mkdir(tmpErrorsDir, { recursive: true });

    // Copy required files
    const filesToCopy = ['generate.sh', 'template.html', 'template.json'];

    for (const file of filesToCopy) {
      const srcPath = path.join(actualErrorsDir, file);
      const destPath = path.join(tmpErrorsDir, file);

      try {
        await fs.copyFile(srcPath, destPath);

        // Make generate.sh executable
        if (file === 'generate.sh') {
          await fs.chmod(destPath, '755');
        }
      } catch (error) {
        console.warn(`Warning: Could not copy ${file}:`, error.message);
      }
    }
  });

  afterEach(async () => {
    // Cleanup temporary directory
    if (tmpWorkDir) {
      try {
        await fs.rm(tmpWorkDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Warning: Could not remove temp directory:', error.message);
      }
    }
  });

  describe('generate.sh execution', () => {
    it('should be possible to run', async () => {
      this.timeout(15000);

      const generateScript = path.join(tmpErrorsDir, 'generate.sh');

      try {
        const { stdout, stderr } = await execAsync(generateScript, {
          cwd: tmpErrorsDir
        });

        // If we get here, the script ran successfully
        expect(true).to.be.true;
      } catch (error) {
        throw new Error(`generate.sh failed to run: ${error.message}`);
      }
    });
  });

  describe('file generation validation',() => {
    it('should generate correct number of error files', async () => {
      this.timeout(15000);

      const generateScript = path.join(tmpErrorsDir, 'generate.sh');

      // Run generate.sh
      await execAsync(generateScript, { cwd: tmpErrorsDir });

      // Count files in actual directory
      const actualFiles = await getErrorFiles(actualErrorsDir);
      const actualCount = actualFiles.length;

      // Count files in temp directory
      const tmpFiles = await getErrorFiles(tmpErrorsDir);
      const tmpCount = tmpFiles.length;

      expect(tmpCount).to.equal(actualCount,
        `Expected ${actualCount} files, but generated ${tmpCount} files`);
    });

    it('should match file content for all error files', async () => {
      this.timeout(15000);

      const generateScript = path.join(tmpErrorsDir, 'generate.sh');

      // Run generate.sh
      await execAsync(generateScript, { cwd: tmpErrorsDir });

      console.log(await execSync(`ls ${tmpErrorsDir}`).toString());

      // Get all error files from actual directory
      const actualFiles = await getErrorFiles(actualErrorsDir);

      expect(actualFiles.length).to.be.at.least(2,
        'Should have processed at least 2 files');

      let fileCount = 0;

      for (const file of actualFiles) {
        const filename = path.basename(file);
        const actualFilePath = path.join(actualErrorsDir, filename);
        const tmpFilePath = path.join(tmpErrorsDir, filename);

        // Check if temp file exists
        try {
          await fs.access(tmpFilePath);
        } catch (error) {
          throw new Error(`Generated file ${filename} does not exist`);
        }

        // Compare file contents
        const actualContent = await fs.readFile(actualFilePath, 'utf8');
        const tmpContent = await fs.readFile(tmpFilePath, 'utf8');

        expect(tmpContent).to.equal(actualContent,
          `Content mismatch in file: ${filename}`);

        fileCount++;
      }
      console.log(await execSync(`ls ${tmpErrorsDir}`).toString());

      expect(fileCount).to.be.at.least(2,
        'Should have validated at least 2 files');
    });
  });
});

/**
 * Helper function to get all .html and .json files from a directory
 */
const getErrorFiles = async directory => {
  try {
    const files = await fs.readdir(directory);
    return files.filter(file =>
      file.endsWith('.html') || file.endsWith('.json')
    ).map(file => path.join(directory, file));
  } catch (error) {
    // Directory might not exist or be accessible
    return [];
  }
};
