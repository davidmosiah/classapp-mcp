import test from 'node:test';
import assert from 'node:assert/strict';
import {operationBody} from '../dist/operations.js';
// Owner: semantic operation allowlist. A GET-only guard would miss GraphQL
// mutations; exact documents and strict variable schemas prevent that bypass.
test('only fixed read documents with bounded variables can reach transport',()=>{
  const result=JSON.parse(operationBody('search',{entityId:'123',limit:5,offset:0,search:'updateRecipient'}));
  assert.match(result.query,/^query ClassAppReadOnlySearch/);
  assert.doesNotMatch(result.query,/updateRecipient|mutation/);
  assert.equal(result.variables.search,'updateRecipient');
  const read=JSON.parse(operationBody('read',{entityId:'123',messageId:'1'}));
  assert.match(read.query,/deleteNotifications: false, updateAccessed: false, updateStatus: null/);
  assert.doesNotMatch(read.query,/updateStatus: READ|MessageNodeEntityUpdateQuery/);
  for(const op of ['mutation','updateRecipient','sendMessage','__proto__','constructor','https://example.com'])assert.throws(()=>operationBody(op,{}),/allowlist/);
  for(const vars of [{entityId:'123',messageId:'1',query:'mutation { sendMessage }'},{entityId:'../123',messageId:'1'},{entityId:'123',messageId:'1/mark-read'},{entityId:'123',messageId:'1',markRead:true}])assert.throws(()=>operationBody('read',vars),/variables/);
});
