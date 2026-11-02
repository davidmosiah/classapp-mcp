import * as z from 'zod/v4';
import { SafeError } from './errors.js';

// Selection sets reduced from the ClassApp web bundles investigated locally on
// 2026-10-21. No caller-provided document, field name, method or URL is accepted.
const id=z.string().regex(/^[1-9][0-9]{0,19}$/);
const operations={
  entities:{variables:z.object({}).strict(),document:`query ClassAppReadOnlyEntities { viewer { entities(limit: 40) { nodes { id: dbId type fullname } } } }`},
  search:{variables:z.object({entityId:id,limit:z.number().int().min(1).max(50),offset:z.number().int().min(0).max(10000),search:z.string().max(200)}).strict(),document:`query ClassAppReadOnlySearch($entityId: ID!, $limit: Int, $offset: Int, $search: String) { node(id: $entityId) { ... on Entity { id: dbId messages(limit: $limit, offset: $offset, search: $search) { nodes { id: dbId unread summary sentAt } pageInfo { hasNextPage } } } } }`},
  read:{variables:z.object({entityId:id,messageId:id}).strict(),document:`query ClassAppReadOnlyMessage($entityId: ID!, $messageId: ID!) { node(id: $entityId) { ... on Entity { id: dbId message(id: $messageId, filterTagsByEntity: true, deleteNotifications: false, updateAccessed: false, updateStatus: null) { id: dbId subject content rendered summary unread sentAt medias(type: FILE, limit: 40) { nodes { id: dbId mimetype origName filename fullUri: uri size } } } } } }`}
} as const;
export type Operation=keyof typeof operations;
export function operationBody(operation:Operation,variables:unknown):string{
  if(!Object.hasOwn(operations,operation))throw new SafeError('OPERATION_DENIED','Operation is outside the reviewed read-only allowlist.');
  const entry=operations[operation];
  const parsed=entry.variables.safeParse(variables);
  if(!parsed.success)throw new SafeError('INVALID_ARGUMENTS','Read-only operation variables are invalid.');
  return JSON.stringify({query:entry.document,variables:parsed.data});
}
