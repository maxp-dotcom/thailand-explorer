import {cp,mkdir,rm,readdir,readFile,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sensitiveFindings} from './audit-public.mjs';
const root=process.cwd(),stage=resolve(root,'release/thailand-explorer');
await mkdir(resolve(root,'release'),{recursive:true});await rm(stage,{recursive:true,force:true});await mkdir(stage);
const included=['.github','.gitignore','.nvmrc','package.json','package-lock.json','vite.config.js','README.md','dist','docs','scripts','tests'];
for(const name of included)await cp(resolve(root,name),resolve(stage,name),{recursive:true,filter:async src=>!(await lstat(src)).isSymbolicLink()});
// Scan public app content in the source handoff as well; scanner fixtures deliberately contain patterns.
async function inspect(path){for(const e of await readdir(path,{withFileTypes:true})){const file=resolve(path,e.name);if(e.isDirectory())await inspect(file);else{const rules=sensitiveFindings(await readFile(file,'utf8'));if(rules.length)throw new Error('Source export requires review: '+e.name+' ('+rules.join(', ')+')');}}}
await inspect(resolve(stage,'dist'));
const archive=resolve(root,'release/thailand-explorer-github.zip');await rm(archive,{force:true});
const result=spawnSync('zip',['-q','-r',archive,'.'],{cwd:stage,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr||'zip failed');
console.log('Prepared GitHub source directory: '+stage);console.log('Source archive: '+archive);console.log('Excluded: .git history, .openai, credentials, dependencies, build output, local storage and release artifacts. Nothing was uploaded.');
