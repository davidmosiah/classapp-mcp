import {mkdtemp,cp,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import assert from 'node:assert/strict';

// Throwaway copies only. Each planted regression must fail its owning boundary
// for the expected assertion, never because the candidate does not compile.
const controls=[
  {name:'read receipts enabled',file:'dist/operations.js',from:'deleteNotifications: false, updateAccessed: false, updateStatus: null',to:'deleteNotifications: true, updateAccessed: true, updateStatus: READ',test:'operations.test.mjs',pattern:'only fixed read documents'},
  {name:'attachment host allowlist disabled',file:'dist/network.js',from:'!hosts.includes(url.hostname)',to:'false',test:'security.test.mjs',pattern:'network rejects nonallowlisted'},
  {name:'private download permission check disabled',file:'dist/storage.js',from:'(stat.mode & 0o077) !== 0 || await realpath(root)',to:'false || await realpath(root)',test:'security.test.mjs',pattern:'private paths reject'}
];
for(const c of controls){
  const dir=await mkdtemp('/private/tmp/classapp-control-');
  await cp('dist',join(dir,'dist'),{recursive:true});await cp('test',join(dir,'test'),{recursive:true});
  // Node resolution remains local: dependencies are used read-only from the
  // candidate path through an import-map-free filesystem link in the temp copy.
  const {symlink}=await import('node:fs/promises');await symlink(join(process.cwd(),'node_modules'),join(dir,'node_modules'),'dir');
  const path=join(dir,c.file);const original=await readFile(path,'utf8');assert.ok(original.includes(c.from),`control target missing: ${c.name}`);await writeFile(path,original.replace(c.from,c.to));
  const run=spawnSync(process.execPath,['--test',`--test-name-pattern=${c.pattern}`,join(dir,'test',c.test)],{encoding:'utf8',cwd:dir});
  const output=run.stdout+run.stderr;
  assert.notEqual(run.status,0,`control incorrectly approved: ${c.name}`);
  assert.match(output,/AssertionError/,`control failed for unrelated reason: ${c.name}`);
  assert.match(output,new RegExp(c.pattern),`owner test did not execute: ${c.name}`);
  console.log(`REJECTED: ${c.name}`);
}
