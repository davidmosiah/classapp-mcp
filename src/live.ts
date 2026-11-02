import * as z from 'zod/v4';
import type { ReadAdapter, Message } from './service.js';
import { SafeError } from './errors.js';
import {privateFile} from './storage.js';
import {requestBytes,requireHttps} from './network.js';
import {operationBody,type Operation} from './operations.js';

const API=new URL('https://web.classapp.com.br/graphql');
const API_HOSTS=['web.classapp.com.br'] as const;
// These switches are source-reviewed evidence decisions, never environment or
// client flags. Static source alone cannot prove the server has no side effects.
const LIVE_VERIFIED=true;
const ATTACHMENT_HOSTS:readonly string[]=['classapp-live-media-1.olaisaac.io'];
const DOWNLOAD_HOSTS=['classapp.com.br'] as const;
const credentialSchema=z.object({accessToken:z.string().min(10).max(16384).regex(/^[A-Za-z0-9._~+-/=]+$/)}).strict();
const dbId=z.union([z.string().regex(/^[1-9][0-9]{0,19}$/),z.number().int().positive().max(Number.MAX_SAFE_INTEGER)]).transform(String);
const entitySchema=z.object({id:dbId,fullname:z.string(),type:z.string()});
const fileSchema=z.object({id:dbId,mimetype:z.string().nullish(),origName:z.string().nullish(),filename:z.string().nullish(),fullUri:z.string().nullish(),size:z.number().nonnegative().nullish()});
const dateSchema=z.union([z.string(),z.number()]).nullish();
const messageSchema=z.object({id:dbId,subject:z.string().nullish(),content:z.string().nullish(),rendered:z.string().nullish(),summary:z.string().nullish(),unread:z.number().int().nullish(),sentAt:dateSchema,medias:z.object({nodes:z.array(fileSchema).max(40)}).nullish()});
type RawMessage=z.infer<typeof messageSchema>;
function message(raw:RawMessage):Message{return {id:raw.id,title:raw.subject??raw.summary??'',body:raw.content??raw.rendered??raw.summary??'',date:String(raw.sentAt??''),unreadRaw:raw.unread??null,attachments:(raw.medias?.nodes??[]).map(f=>({id:f.id,name:f.origName??f.filename??'attachment',...(f.mimetype?{mimeType:f.mimetype}:{})}))};}

class LiveAdapter implements ReadAdapter {
  readonly mode='live' as const;
  constructor(private readonly token:string){}
  private async operation(operation:Operation,variables:unknown):Promise<unknown>{
    const body=operationBody(operation,variables);
    const bytes=await requestBytes(API,API_HOSTS,{'Authorization':`Bearer ${this.token}`,'Content-Type':'application/json','Accept':'application/json'},2_000_000,body);
    let result:unknown;try{result=JSON.parse(bytes.toString('utf8'));}catch{throw new SafeError('INVALID_RESPONSE','ClassApp returned an invalid JSON response.');}
    const envelope=z.object({data:z.unknown().optional(),errors:z.array(z.unknown()).optional()}).safeParse(result);
    if(!envelope.success||envelope.data.errors?.length||!envelope.data.data)throw new SafeError('API_ERROR','ClassApp rejected the read-only request; refresh credentials manually if expired.');
    return envelope.data.data;
  }
  async entities(){const data=z.object({viewer:z.object({entities:z.object({nodes:z.array(entitySchema).max(40)})})}).safeParse(await this.operation('entities',{}));if(!data.success)throw new SafeError('INVALID_RESPONSE','Unexpected ClassApp profile response.');return data.data.viewer.entities.nodes.map(e=>({id:e.id,name:e.fullname,type:e.type}));}
  async search(entityId:string,query:string,limit:number,offset:number){
    const data=z.object({node:z.object({id:dbId,messages:z.object({nodes:z.array(messageSchema).max(50),pageInfo:z.object({hasNextPage:z.boolean()})})})}).safeParse(await this.operation('search',{entityId,search:query,limit,offset}));
    if(!data.success)throw new SafeError('INVALID_RESPONSE','Unexpected ClassApp notice response.');
    return {messages:data.data.node.messages.nodes.map(message),hasMore:data.data.node.messages.pageInfo.hasNextPage};
  }
  private async rawMessage(entityId:string,messageId:string):Promise<RawMessage>{
    const data=z.object({node:z.object({id:dbId,message:messageSchema})}).safeParse(await this.operation('read',{entityId,messageId}));
    if(!data.success)throw new SafeError('INVALID_RESPONSE','Unexpected ClassApp message response.');return data.data.node.message;
  }
  async read(entityId:string,messageId:string){return message(await this.rawMessage(entityId,messageId));}
  async attachment(entityId:string,messageId:string,attachmentId:string){
    const raw=await this.rawMessage(entityId,messageId);const file=raw.medias?.nodes.find(f=>f.id===attachmentId);
    if(!file?.fullUri)throw new SafeError('NOT_FOUND','Attachment does not belong to that message or has no downloadable URI.');
    if(file.size && file.size>25_000_000)throw new SafeError('SIZE_LIMIT','Attachment exceeds the 25 MB limit.');
    let url:URL;try{url=new URL(file.fullUri);}catch{throw new SafeError('NETWORK_POLICY','Attachment URI is not a valid reviewed HTTPS URL.');}
    requireHttps(url,ATTACHMENT_HOSTS);
    // The web client's fixed download proxy is required: direct CDN GET returns
    // 403 for the observed file. The nested URI is independently allowlisted;
    // neither endpoint nor URI can be supplied by an MCP caller.
    const proxy=new URL('https://classapp.com.br/download_file');
    const name=(file.origName??file.filename??'attachment').replace(/[^\p{L}\p{N}_. -]/gu,'_').slice(0,200)||'attachment';
    proxy.searchParams.set('name',name);
    proxy.searchParams.set('path',url.href);
    // No bearer, cookies or API headers are sent to the public download proxy.
    return requestBytes(proxy,DOWNLOAD_HOSTS,{},25_000_000);
  }
}
export async function liveAdapter():Promise<ReadAdapter> {
  if(!LIVE_VERIFIED)throw new SafeError('LIVE_NOT_VERIFIED','Live requests remain blocked until authorization and the absence of read receipts are verified. Use CLASSAPP_MODE=offline for synthetic data.');
  const path=process.env.CLASSAPP_CREDENTIALS_FILE;
  if(!path)throw new SafeError('CREDENTIALS_REQUIRED','Set CLASSAPP_CREDENTIALS_FILE to a private JSON file outside Git.');
  let parsed:unknown;try{parsed=JSON.parse(await privateFile(path));}catch(error){if(error instanceof SafeError)throw error;throw new SafeError('UNSAFE_CREDENTIALS','Could not read the private credential file.');}
  const credentials=credentialSchema.safeParse(parsed);if(!credentials.success)throw new SafeError('UNSAFE_CREDENTIALS','Expected a private JSON object with an accessToken string only.');
  return new LiveAdapter(credentials.data.accessToken);
}
