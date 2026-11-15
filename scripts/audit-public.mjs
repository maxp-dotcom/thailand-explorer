import {readdir,readFile,lstat} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
export function sensitiveFindings(text){
 const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['api-key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/],
  ['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['bearer-credential',/Bearer\s+[A-Za-z0-9_.-]{25,}/i],
  ['credential-url',/https?:\/\/[^\s/@:]+:[^\s/@]+@/],
  ['private-hosting-metadata',/git\.chatgpt-team\.site|appgprj_[a-z0-9]+|siwc_bypass_bearer_token/],
  ['email-address',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i]
 ];
 return rules.filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
}
export async function inspectPublic(directory){
 const root=resolve(directory),files=[],findings=[];
 async function visit(path){for(const entry of await readdir(path,{withFileTypes:true})){const full=resolve(path,entry.name),name=relative(root,full);const info=await lstat(full);
  if(info.isSymbolicLink()){findings.push(name+': symbolic link');continue;}
  if(entry.isDirectory()){if(!['assets','images'].includes(name))findings.push(name+': unexpected directory');await visit(full);continue;}
  files.push(name);
  if(!['.html','.js','.css','.json','.svg','.txt'].includes(extname(name))&&name!=='.nojekyll')findings.push(name+': unexpected file type');
  if(/(?:^|\/)(?:\.git|\.openai|\.env|node_modules|tests|docs)(?:[/.]|$)|\.map$/.test(name))findings.push(name+': private/source-only file');
  const text=await readFile(full,'utf8');for(const rule of sensitiveFindings(text))findings.push(name+': '+rule);
 }}
 await visit(root);
 if(!files.includes('index.html'))findings.push('index.html missing');
 if(findings.length)throw new Error('Public artifact check failed (values hidden):\n'+findings.join('\n'));
 return {files:files.length,root};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await inspectPublic(process.argv[2]||'build');console.log(`Public artifact checked: ${result.files} files; no matching credentials, email addresses or private hosting metadata.`);
}
