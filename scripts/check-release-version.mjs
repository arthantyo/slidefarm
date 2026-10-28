import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const electron = JSON.parse(await readFile(new URL('../electron/package.json', import.meta.url), 'utf8'));
const tag = process.env.GITHUB_REF_NAME;

assert.equal(electron.version, root.version, 'Root and Electron package versions must match');
assert.equal(tag, `v${root.version}`, 'Release tag must match the package version');
console.log(`Release version ${tag} matches both packages.`);
