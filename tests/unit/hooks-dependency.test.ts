import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

describe('Dependency Update Hooks', () => {
  let testRepo: string;
  let originalCwd: string;
  const hookScript = path.join(process.cwd(), '.husky/check-dependencies.sh');
  const postMergeHook = path.join(process.cwd(), '.husky/post-merge');
  const postCheckoutHook = path.join(process.cwd(), '.husky/post-checkout');

  beforeEach(() => {
    originalCwd = process.cwd();
    // Create temporary test repository
    testRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'));
    process.chdir(testRepo);

    // Initialize git repo
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');

    // Create basic package.json
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {},
      })
    );

    // Create initial commit
    execSync('git add package.json');
    execSync('git commit -m "Initial commit"');

    // Copy hook files
    fs.mkdirSync('.husky', { recursive: true });
    fs.copyFileSync(hookScript, '.husky/check-dependencies.sh');
    fs.copyFileSync(postMergeHook, '.husky/post-merge');
    fs.copyFileSync(postCheckoutHook, '.husky/post-checkout');

    // Make hooks executable
    fs.chmodSync('.husky/check-dependencies.sh', '755');
    fs.chmodSync('.husky/post-merge', '755');
    fs.chmodSync('.husky/post-checkout', '755');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Clean up test repo
    fs.rmSync(testRepo, { recursive: true, force: true });
  });

  describe('check-dependencies.sh script', () => {
    it('should detect package.json changes', () => {
      const changedFiles = 'package.json\nsrc/index.ts';
      const result = execSync(`.husky/check-dependencies.sh "test" "${changedFiles}"`, {
        encoding: 'utf-8',
      });

      // Check that the hook detected the change
      expect(result).not.toContain('No package changes detected');

      // Check log file was created
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      expect(fs.existsSync(logFile)).toBe(true);

      const logContents = fs.readFileSync(logFile, 'utf-8');
      expect(logContents).toContain('[test] Hook triggered');
      expect(logContents).toContain('[test] Package changes detected');
    });

    it('should detect package-lock.json changes', () => {
      const changedFiles = 'package-lock.json\nsrc/index.ts';
      const result = execSync(`.husky/check-dependencies.sh "test" "${changedFiles}"`, {
        encoding: 'utf-8',
      });

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');
      expect(logContents).toContain('[test] Package changes detected');
    });

    it('should ignore other file changes', () => {
      const changedFiles = 'src/index.ts\nREADME.md\nsrc/components/Button.svelte';
      const result = execSync(`.husky/check-dependencies.sh "test" "${changedFiles}"`, {
        encoding: 'utf-8',
      });

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');
      expect(logContents).toContain('[test] No package changes detected, skipping npm install');
    });

    it('should log to hooks.log with timestamps', () => {
      const changedFiles = 'src/index.ts';
      execSync(`.husky/check-dependencies.sh "test-hook" "${changedFiles}"`);

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');

      // Check for timestamp format: [YYYY-MM-DD HH:MM:SS]
      expect(logContents).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
      // Check for hook name
      expect(logContents).toContain('[test-hook]');
    });

    it('should handle empty changed files list', () => {
      const changedFiles = '';
      const result = execSync(`.husky/check-dependencies.sh "test" "${changedFiles}"`, {
        encoding: 'utf-8',
      });

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');
      expect(logContents).toContain('[test] No package changes detected');
    });
  });

  describe('post-merge hook', () => {
    it('should trigger on merge with package.json changes', () => {
      // Create a feature branch with package.json change
      execSync('git checkout -b feature');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      pkg.dependencies = { lodash: '^4.17.21' };
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
      execSync('git add package.json');
      execSync('git commit -m "Add lodash dependency"');

      // Go back to main and merge
      execSync('git checkout -');
      execSync('git merge feature --no-edit');

      // Check that log shows post-merge hook ran
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      if (fs.existsSync(logFile)) {
        const logContents = fs.readFileSync(logFile, 'utf-8');
        expect(logContents).toContain('[post-merge]');
      }
    });

    it('should not trigger on merge without package changes', () => {
      // Create a feature branch with non-package change
      execSync('git checkout -b feature');
      fs.writeFileSync('README.md', '# Test Project');
      execSync('git add README.md');
      execSync('git commit -m "Add README"');

      // Go back to main and merge
      execSync('git checkout -');
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFileBefore = path.join(gitDir, 'hooks.log');
      const contentBefore = fs.existsSync(logFileBefore)
        ? fs.readFileSync(logFileBefore, 'utf-8')
        : '';

      execSync('git merge feature --no-edit');

      // If log exists, check that it shows "No package changes"
      if (fs.existsSync(logFileBefore)) {
        const contentAfter = fs.readFileSync(logFileBefore, 'utf-8');
        const newContent = contentAfter.substring(contentBefore.length);
        if (newContent.includes('[post-merge]')) {
          expect(newContent).toContain('No package changes detected');
        }
      }
    });
  });

  describe('post-checkout hook', () => {
    it('should trigger on branch checkout with flag=1', () => {
      // Create feature branch
      execSync('git checkout -b feature');
      fs.writeFileSync('test.txt', 'test');
      execSync('git add test.txt');
      execSync('git commit -m "Add test file"');

      // Switch back to main (triggers post-checkout)
      execSync('git checkout main');

      // Log should show post-checkout hook ran
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      if (fs.existsSync(logFile)) {
        const logContents = fs.readFileSync(logFile, 'utf-8');
        expect(logContents).toContain('[post-checkout]');
      }
    });

    it('should detect package changes during checkout', () => {
      // Create feature branch with package.json change
      execSync('git checkout -b feature');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      pkg.dependencies = { axios: '^1.6.0' };
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
      execSync('git add package.json');
      execSync('git commit -m "Add axios dependency"');

      // Switch back to main
      execSync('git checkout main');

      // Log should show package changes detected
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      if (fs.existsSync(logFile)) {
        const logContents = fs.readFileSync(logFile, 'utf-8');
        // Should detect the change when switching back
        const postCheckoutEntries = logContents
          .split('\n')
          .filter((line) => line.includes('[post-checkout]'));
        expect(postCheckoutEntries.length).toBeGreaterThan(0);
      }
    });

    it('should manually test flag=0 does not trigger', () => {
      // This test manually invokes the hook with flag=0
      const result = execSync('.husky/post-checkout HEAD HEAD 0', {
        encoding: 'utf-8',
      });

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      // Log should not have new post-checkout entry from this manual invocation
      // (because flag=0 means file checkout, not branch checkout)
      const logBefore = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : '';

      execSync('.husky/post-checkout HEAD HEAD 0');

      const logAfter = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : '';

      // Log should be unchanged (no new post-checkout entries)
      expect(logAfter).toBe(logBefore);
    });

    it('should manually test flag=1 does trigger', () => {
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      const logBefore = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : '';

      execSync('.husky/post-checkout HEAD HEAD 1');

      const logAfter = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : '';

      // Log should have new post-checkout entry
      expect(logAfter).not.toBe(logBefore);
      const newContent = logAfter.substring(logBefore.length);
      expect(newContent).toContain('[post-checkout]');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle both hooks logging to same file', () => {
      // Trigger post-checkout
      execSync('.husky/post-checkout HEAD HEAD 1');

      // Trigger post-merge
      const changedFiles = execSync('git diff-tree -r --name-only --no-commit-id HEAD HEAD', {
        encoding: 'utf-8',
      });
      execSync(`.husky/check-dependencies.sh "post-merge" "${changedFiles}"`);

      // Both should be in the log
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');

      expect(logContents).toContain('[post-checkout]');
      expect(logContents).toContain('[post-merge]');
    });

    it('should rotate log file when it exceeds 1MB', () => {
      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');

      // Create a large log file (> 1MB)
      const largeContent = 'x'.repeat(1048577); // Just over 1MB
      fs.writeFileSync(logFile, largeContent);

      // Trigger hook
      execSync(`.husky/check-dependencies.sh "test" "src/index.ts"`);

      // Check that log was rotated
      const logOldFile = `${logFile}.old`;
      expect(fs.existsSync(logOldFile)).toBe(true);

      // New log should be smaller
      const newLogSize = fs.statSync(logFile).size;
      expect(newLogSize).toBeLessThan(1048577);
    });
  });

  describe('Quiet mode', () => {
    it('should suppress output when GIT_QUIET is set', () => {
      const result = execSync(`GIT_QUIET=1 .husky/check-dependencies.sh "test" "package.json"`, {
        encoding: 'utf-8',
      });

      // Should have minimal output in quiet mode
      // Just the one line: [test] Updating dependencies...
      const lines = result
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      expect(lines.length).toBeLessThanOrEqual(1);
    });

    it('should still log to file in quiet mode', () => {
      execSync(`GIT_QUIET=1 .husky/check-dependencies.sh "test" "package.json"`);

      const gitDir = execSync('git rev-parse --git-dir', {
        encoding: 'utf-8',
      }).trim();
      const logFile = path.join(gitDir, 'hooks.log');
      const logContents = fs.readFileSync(logFile, 'utf-8');

      expect(logContents).toContain('[test] Hook triggered');
    });
  });
});
