import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdtemp,chmod,readFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';

// Owner boundary: a real stdio subprocess must expose only the bounded tools,
// search/read synthetic notices and save an attachment without traversal.
// This catches protocol/schema wiring regressions that service tests would miss.
test('stdio read-only workflow, strict arguments and private local download',async()=>{
  const root=await mkdtemp('/private/tmp/classapp-mcp-smoke-');await chmod(root,0o700);
  const child=spawn(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{PATH:process.env.PATH,CLASSAPP_MODE:'offline',CLASSAPP_DOWNLOAD_DIR:root},stdio:['pipe','pipe','pipe']});
  let id=0;const pending=new Map();let stderr='';child.stderr.on('data',b=>stderr+=b);
  const lines=createInterface({input:child.stdout});lines.on('line',line=>{let msg;try{msg=JSON.parse(line);}catch{assert.fail('stdout contains non-protocol output');}const slot=pending.get(msg.id);if(slot){pending.delete(msg.id);clearTimeout(slot.timer);slot.resolve(msg);}});
  const rpc=(method,params)=>new Promise((resolve,reject)=>{const current=++id;const timer=setTimeout(()=>reject(Error('MCP response timeout')),5000);pending.set(current,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:current,method,params})+'\n');});
  try{
    const init=await rpc('initialize',{protocolVersion:'2026-07-28',capabilities:{},clientInfo:{name:'synthetic-test',version:'1'}});assert.ok(init.result.serverInfo);
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    const tools=(await rpc('tools/list',{})).result.tools;
    assert.deepEqual(tools.map(x=>x.name).sort(),['classapp_download_attachment','classapp_list_entities','classapp_read_message','classapp_search_notices','classapp_status']);
    const call=async(name,args={})=>(await rpc('tools/call',{name,arguments:args})).result;
    const entities=await call('classapp_list_entities');assert.equal(entities.structuredContent.entities[0].id,'demo-entity');
    const search=await call('classapp_search_notices',{entityId:'demo-entity',query:'science'});assert.equal(search.structuredContent.messages.length,1);assert.equal(search.structuredContent.mode,'offline');
    const read=await call('classapp_read_message',{entityId:'demo-entity',messageId:'demo-1'});assert.match(read.structuredContent.message.body,/12 November/);
    const status=await call('classapp_status');assert.equal(status.structuredContent.readReceiptUpdatesRequested,false);assert.equal(status.structuredContent.backendSideEffects,'not_proven');
    const injected=await call('classapp_download_attachment',{entityId:'demo-entity',messageId:'demo-1',attachmentId:'demo-file-1',url:'http://127.0.0.1/',filename:'../../escape'});assert.equal(injected.isError,true);assert.deepEqual(await readdir(root),[]);
    const invalid=await call('classapp_download_attachment',{entityId:'demo-entity',messageId:'demo-2',attachmentId:'demo-file-1'});assert.equal(invalid.isError,true);assert.deepEqual(await readdir(root),[]);
    const a=await call('classapp_download_attachment',{entityId:'demo-entity',messageId:'demo-1',attachmentId:'demo-file-1'});
    const b=await call('classapp_download_attachment',{entityId:'demo-entity',messageId:'demo-1',attachmentId:'demo-file-1'});
    assert.equal(a.isError,undefined);assert.notEqual(a.structuredContent.path,b.structuredContent.path);
    assert.match(await readFile(a.structuredContent.path,'utf8'),/Synthetic ClassApp attachment/);
    assert.equal((await lstat(a.structuredContent.path)).mode&0o777,0o600);
    assert.equal(stderr,'');
  }finally{child.stdin.end();child.kill();lines.close();for(const slot of pending.values())clearTimeout(slot.timer);}
});

test('live startup without credential file fails closed',async()=>{
  const {spawnSync}=await import('node:child_process');
  const result=spawnSync(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{PATH:process.env.PATH,CLASSAPP_MODE:'live'},encoding:'utf8'});
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/CREDENTIALS_REQUIRED/);assert.doesNotMatch(result.stderr,/synthetic-secret|nonexistent/);
});
