#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { ClassAppService, OfflineAdapter } from './service.js';
import { liveAdapter } from './live.js';
import { createServer } from './server.js';
import { SafeError, publicError } from './errors.js';

async function main():Promise<void>{
  const mode=process.env.CLASSAPP_MODE ?? 'offline';
  if(mode!=='live' && mode!=='offline')throw new SafeError('INVALID_MODE','CLASSAPP_MODE must be live or offline.');
  const adapter=mode==='live'?await liveAdapter():new OfflineAdapter();
  const server=createServer(new ClassAppService(adapter,process.env.CLASSAPP_DOWNLOAD_DIR));
  await server.connect(new StdioServerTransport());
}
main().catch(error=>{process.stderr.write(`${publicError(error)}\n`);process.exitCode=1;});
