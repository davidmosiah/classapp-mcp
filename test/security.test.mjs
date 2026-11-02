import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,chmod,writeFile,symlink,readdir,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {requireHttps,publicAddress} from '../dist/network.js';
import {privateFile,saveAttachment} from '../dist/storage.js';
import {publicError} from '../dist/errors.js';

// Owner: network destination contract. Credible failures include suffix-host
// acceptance, URL credentials, and private/mapped-IP resolution bypasses.
test('network rejects nonallowlisted destinations and private addresses',()=>{
  const hosts=['files.example.com'];
  requireHttps(new URL('https://files.example.com/f'),hosts);
  for(const input of ['http://files.example.com/f','https://files.example.com.evil.test/f','https://user:secret@files.example.com/f','https://files.example.com:444/f','https://127.0.0.1/f','https://files.example.com/f#x'])assert.throws(()=>requireHttps(new URL(input),hosts));
  for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.16.0.1','100.64.0.1','::1','::ffff:127.0.0.1','192.0.2.1','198.51.100.1'])assert.equal(publicAddress(address),false,address);
  assert.equal(publicAddress('8.8.8.8'),true);
});
// Owner: private filesystem contract. Tests use real files because mocks miss
// permissions and symlink semantics; regression: read/write follows a link.
test('private paths reject symlinks, permissive files and unsafe roots',async()=>{
  const root=await mkdtemp('/private/tmp/classapp-mcp-security-');await chmod(root,0o700);
  const credential=join(root,'credential.json');await writeFile(credential,'synthetic-secret',{mode:0o600});
  assert.equal(await privateFile(credential),'synthetic-secret');
  await symlink(credential,join(root,'link'));await assert.rejects(privateFile(join(root,'link')),/Symbolic links/);
  await chmod(credential,0o644);await assert.rejects(privateFile(credential),/owner-only/);
  const output=join(root,'output');await symlink(root,output);await assert.rejects(saveAttachment(output,Buffer.from('x')),/Symbolic links/);
  await chmod(credential,0o600);
  await chmod(root,0o755);await assert.rejects(privateFile(credential),/owner-only/);
  await assert.rejects(saveAttachment(root,Buffer.from('x')),/owner-only/);
  assert.deepEqual((await readdir(root)).sort(),['credential.json','link','output']);
});
// Owner: private storage must never enter version control, including worktrees.
// A valid 0600 credential and 0700 directory prevent an unrelated rejection.
test('private storage rejects Git directory and worktree-file ancestry before writing',async()=>{
  for(const kind of ['directory','file']){
    const root=await mkdtemp('/private/tmp/classapp-mcp-git-');await chmod(root,0o700);
    if(kind==='directory')await mkdir(join(root,'.git'));else await writeFile(join(root,'.git'),'gitdir: /synthetic/worktree',{mode:0o600});
    const nested=join(root,'nested');await mkdir(nested,{mode:0o700});
    const credential=join(nested,'session.json');await writeFile(credential,'{}',{mode:0o600});
    await assert.rejects(privateFile(credential),{code:'UNSAFE_STORAGE'});
    await assert.rejects(saveAttachment(nested,Buffer.from('synthetic')),{code:'UNSAFE_STORAGE'});
    assert.deepEqual(await readdir(nested),['session.json'],'Rejected download must not create a file');
  }
});
test('unexpected errors never expose credentials or URLs',()=>{
  assert.doesNotMatch(publicError(new Error('Bearer synthetic-secret https://example.com/private')),/synthetic-secret|example/);
});

test('transport pins DNS and rejects redirects and oversized responses without retry',async()=>{
  const dns=await import('node:dns/promises');
  const https=await import('node:https');
  const {syncBuiltinESMExports}=await import('node:module');
  const {EventEmitter}=await import('node:events');
  const {mock}=await import('node:test');
  const {requestBytes}=await import('../dist/network.js');
  const calls=[];let scenario='redirect';
  mock.method(dns.default,'lookup',async()=>[{address:'8.8.8.8',family:4}]);
  mock.method(https.default,'request',(url,options,callback)=>{
    calls.push({url:String(url),options});const req=new EventEmitter();req.setTimeout=()=>req;req.destroy=()=>{};
    req.end=()=>{const res=new EventEmitter();res.statusCode=scenario==='redirect'?302:200;res.destroy=()=>{};callback(res);if(res.statusCode===200){res.emit('data',Buffer.alloc(11));res.emit('end');}};
    return req;
  });syncBuiltinESMExports();
  try{
    await assert.rejects(requestBytes(new URL('https://files.example.com/object'),['files.example.com'],{},10),/redirects are disabled/);
    assert.equal(calls.length,1);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.agent,false);assert.equal(calls[0].options.family,4);
    const pinned=await new Promise(resolve=>calls[0].options.lookup('ignored',{},(_e,address,family)=>resolve({address,family})));assert.deepEqual(pinned,{address:'8.8.8.8',family:4});
    scenario='oversize';await assert.rejects(requestBytes(new URL('https://files.example.com/object'),['files.example.com'],{},10),/download limit/);assert.equal(calls.length,2);
    mock.restoreAll();mock.method(dns.default,'lookup',async()=>[{address:'127.0.0.1',family:4}]);syncBuiltinESMExports();
    await assert.rejects(requestBytes(new URL('https://files.example.com/object'),['files.example.com'],{},10),/public addresses/);
    assert.equal(calls.length,2);
  }finally{mock.restoreAll();syncBuiltinESMExports();}
});
