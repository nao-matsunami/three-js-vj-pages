import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
// Publish only this clean checkout, never copy a synced working directory recursively.
const status = git('status', '--porcelain');
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
for (const file of files) {
  if (file.split('/').some(p => / \d+(?:\.|$)/.test(p))) throw new Error(`Duplicate filename blocked: ${file}`);
}
const allowed = /^(?:data|days|reports|outputs|pages|scripts|docs|research|pipelines|\.github)\/|^(?:index\.html|live\.html|app\.js|styles\.css|package\.json|README\.md|\.nojekyll|\.gitignore)$/;
const changed = git('ls-files', '--modified', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
for (const file of changed) if (!allowed.test(file)) throw new Error(`Unexpected publish file: ${file}`);
if (changed.length) git('add', '--', ...changed);
if (git('diff', '--cached', '--name-only')) git('commit', '-m', 'Publish daily VJ study and reliable update pipeline');
// gh supplies credentials through Git's credential protocol; never put a token in argv/logs.
git('-c', 'credential.helper=', '-c', 'credential.helper=!/opt/homebrew/bin/gh auth git-credential', 'push', 'origin', 'HEAD:main');
console.log(`Published ${git('rev-parse', 'HEAD')}`);
