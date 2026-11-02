"""Authenticated GitHub requests restricted to api.github.com; never follow redirects."""
import json,re,subprocess,urllib.request,urllib.parse,urllib.error
ORIGIN='https://api.github.com'
_token=None
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,request,fp,code,message,headers,newurl):return None
def request(path,method='GET',payload=None):
 global _token
 if '://' in path or path.startswith('//'):raise ValueError('Only relative api.github.com paths are permitted.')
 if _token is None:
  try:r=subprocess.run(['gh','auth','token'],capture_output=True,text=True)
  except FileNotFoundError:raise RuntimeError('Authenticated GitHub CLI is required for Project access.') from None
  if r.returncode or not r.stdout.strip():raise RuntimeError('Authenticate GitHub CLI for repository and project access.')
  _token=r.stdout.strip()
 req=urllib.request.Request(ORIGIN+'/'+path.lstrip('/'),method=method,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+_token,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'GVR-Operations'})
 try:
  with urllib.request.build_opener(NoRedirect()).open(req,timeout=45) as response:
   raw=response.read();return (json.loads(raw) if raw else None),dict(response.headers)
 except urllib.error.HTTPError as e:
  if 300<=e.code<400:raise RuntimeError('GitHub API redirect rejected: '+str(urllib.parse.urlsplit(e.headers.get('Location','')).hostname)) from None
  raise RuntimeError(f'GitHub API HTTP {e.code}: '+e.read().decode(errors='replace')[:600]) from None
def api(path,method='GET',payload=None):return request(path,method,payload)[0]
def pages(path):
 result=[]
 while path:
  page,headers=request(path);result.append(page);m=re.search(r'<([^>]+)>; rel="next"',headers.get('Link',''));path=None
  if m:
   p=urllib.parse.urlsplit(m[1])
   if p.scheme!='https' or p.hostname!='api.github.com':raise RuntimeError('Unexpected pagination origin rejected.')
   path=p.path+('?' + p.query if p.query else '')
 return result
def graphql(query,variables=None):
 value=api('graphql','POST',{'query':query,'variables':variables or {}})
 if value.get('errors'):raise RuntimeError('GitHub GraphQL: '+str(value['errors'])[:1000])
 return value['data']
