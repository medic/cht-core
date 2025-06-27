const { expect } = require('chai');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');

describe('generate.sh validation tests', () => {
  let tmpWorkDir;
  let actualErrorsDir;
  let tmpErrorsDir;

  beforeEach(async () => {
    // Create temporary directory
    tmpWorkDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nginx-test-'));

    // Set up directories
    const currentDir = __dirname;
    actualErrorsDir = path.join(currentDir, '..', '..', 'nginx_error_pages');
    tmpErrorsDir = path.join(tmpWorkDir, 'nginx_error_pages');

    // Create temp errors directory
    await fs.mkdir(tmpErrorsDir, { recursive: true });

    // Copy required files
    const filesToCopy = ['generate.sh', 'template.html', 'template.json'];

    for (const file of filesToCopy) {
      const srcPath = path.join(actualErrorsDir, file);
      const destPath = path.join(tmpErrorsDir, file);

      await fs.copyFile(srcPath, destPath);
    }
  });

  afterEach(async () => {
    // Cleanup temporary directory
    if (tmpWorkDir) {
      await fs.rm(tmpWorkDir, { recursive: true, force: true });
    }
  });

  describe('generate.sh execution', () => {
    it('should be possible to run', async () => {
      const generateScript = path.join(tmpErrorsDir, 'generate.sh');

      await execAsync(generateScript, {
        cwd: tmpErrorsDir
      });

      // If we get here, the script ran successfully
      expect(true).to.be.true;
    });

    it('should fail if there are no error pages templates', async () => {
      // manually delete it because it has been created in the beforeEach
      await fs.rm(path.join(tmpErrorsDir, 'template.json'), { recursive: true, force: true });

      const generateScript = path.join(tmpErrorsDir, 'generate.sh');
      await expect(execAsync(generateScript, {
        cwd: tmpErrorsDir
      })).to.be.rejectedWith(/No such file or directory/i);
    });
  });

  describe('file generation validation', () => {
    it('should generate correct number of error files', async () => {
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
      const generateScript = path.join(tmpErrorsDir, 'generate.sh');

      // Run generate.sh
      await execAsync(generateScript, { cwd: tmpErrorsDir });

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
        } catch {
          throw new Error(`Generated file ${filename} does not exist`);
        }

        // Compare file contents
        const actualContent = await fs.readFile(actualFilePath, 'utf8');
        const tmpContent = await fs.readFile(tmpFilePath, 'utf8');

        expect(tmpContent).to.equal(actualContent,
          `Content mismatch in file: ${filename}`);

        fileCount++;
      }

      expect(fileCount).to.be.at.least(2,
        'Should have validated at least 2 files');
    });
  });
});

/**
 * Helper function to get all .html and .json files from a directory
 */
const getErrorFiles = async (directory) => {
  try {
    const files = await fs.readdir(directory);
    return files
      .filter(file => file.endsWith('.html') || file.endsWith('.json'))
      .map(file => path.join(directory, file));
  } catch {
    // Directory might not exist or be accessible
    return [];
  }
};
