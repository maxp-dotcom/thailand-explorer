// Kept separate from Vite so repository/root/custom-domain behavior can be tested.
export function pagesBase(env=process.env){
 const explicit=env.PAGES_BASE_PATH?.trim();
 if(explicit){
  if(!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(explicit)||explicit.split('/').some(s=>s==='.'||s==='..'))throw new Error('PAGES_BASE_PATH must be / or a slash-delimited repository path, e.g. /thailand-explorer/.');
  return explicit;
 }
 const repository=env.GITHUB_REPOSITORY;
 if(repository){
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw new Error('Invalid GITHUB_REPOSITORY');
  const [owner,name]=repository.split('/');return name.toLowerCase()===owner.toLowerCase()+'.github.io'?'/':`/${name}/`;
 }
 return '/thailand-explorer/';
}
