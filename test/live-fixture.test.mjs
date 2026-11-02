import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,chmod,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {syncBuiltinESMExports} from 'node:module';
import https from 'node:https';
import dns from 'node:dns/promises';

// Owner: production live adapter behavior with synthetic provider responses.
// No production test flag or fixture endpoint exists. Network builtins are
// intercepted; all provider content and credentials below are synthetic.
test('live adapter validates fixed documents, preserves numeric unread and keeps credentials off output',async()=>{
  const secretRoot=await mkdtemp('/private/tmp/classapp-fixture-credential-');await chmod(secretRoot,0o700);const credential=join(secretRoot,'synthetic.json');await writeFile(credential,JSON.stringify({accessToken:'synthetic-secret-token'}),{mode:0o600});
  const old=process.env.CLASSAPP_CREDENTIALS_FILE;process.env.CLASSAPP_CREDENTIALS_FILE=credential;
  const requests=[];
  mock.method(dns,'lookup',async()=>[{address:'8.8.8.8',family:4}]);
  mock.method(https,'request',(url,options,callback)=>{
    if(options.method==='GET'){const proxy=new URL(url);assert.equal(proxy.origin,'https://classapp.com.br');assert.equal(proxy.pathname,'/download_file');assert.equal(proxy.searchParams.get('path'),'https://classapp-live-media-1.olaisaac.io/synthetic');assert.equal(proxy.searchParams.get('name'),'synthetic.pdf');assert.deepEqual(options.headers,{});const req=new EventEmitter();req.setTimeout=()=>req;req.destroy=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};callback(res);res.emit('data',Buffer.from('%PDF-synthetic'));res.emit('end');};return req;}
    assert.equal(String(url),'https://web.classapp.com.br/graphql');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer synthetic-secret-token');
    const req=new EventEmitter();req.setTimeout=()=>req;req.destroy=()=>{};
    req.end=body=>{const op=JSON.parse(body);requests.push(op);let data;
      if(op.query.includes('ClassAppReadOnlyEntities'))data={viewer:{entities:{nodes:[{id:123,type:'SYNTHETIC',fullname:'Synthetic profile'}]}}};
      else if(op.query.includes('ClassAppReadOnlySearch'))data={node:{id:123,messages:{nodes:[{id:456,summary:'Synthetic summary',unread:0,sentAt:null}],pageInfo:{hasNextPage:false}}}};
      else {assert.match(op.query,/deleteNotifications: false, updateAccessed: false, updateStatus: null/);data={node:{id:123,message:{id:456,subject:'Synthetic title',content:'Synthetic content',unread:null,sentAt:'2026-11-01',medias:{nodes:[{id:789,origName:'../../synthetic.txt',mimetype:'text/plain',fullUri:'https://files.example.com/f',size:10},{id:790,origName:'synthetic.pdf',mimetype:'application/pdf',fullUri:'https://classapp-live-media-1.olaisaac.io/synthetic',size:14}]}}}};}
      const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};callback(res);res.emit('data',Buffer.from(JSON.stringify({data})));res.emit('end');};return req;
  });syncBuiltinESMExports();
  try{
    const {liveAdapter}=await import('../dist/live.js');const adapter=await liveAdapter();
    assert.deepEqual(await adapter.entities(),[{id:'123',name:'Synthetic profile',type:'SYNTHETIC'}]);
    const page=await adapter.search('123','science',10,0);assert.equal(page.messages[0].unreadRaw,0);assert.equal(page.hasMore,false);
    const message=await adapter.read('123','456');assert.equal(message.unreadRaw,null);assert.equal(message.attachments[0].id,'789');assert.doesNotMatch(JSON.stringify(message),/files.example|synthetic-secret-token/);
    await assert.rejects(adapter.attachment('123','456','789'),/allowlist/); // Synthetic CDN host is outside the reviewed allowlist.
    const attachment=await adapter.attachment('123','456','790');assert.equal(Buffer.from(attachment).toString(),'%PDF-synthetic');
    assert.equal(requests.length,5);await assert.rejects(adapter.read('123','../456'),/variables/);assert.equal(requests.length,5);
  }finally{mock.restoreAll();syncBuiltinESMExports();if(old===undefined)delete process.env.CLASSAPP_CREDENTIALS_FILE;else process.env.CLASSAPP_CREDENTIALS_FILE=old;}
});
