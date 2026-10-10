import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const runFile = promisify(execFile);
let ready = false;
const root = path.resolve('dist');
const requestedPort = Number(process.env.MADANG_PORT ?? process.argv[2] ?? 0);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  throw new Error('Port must be an integer between 0 and 65535.');
}
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  try {
    if (!ready) {res.writeHead(503, {'Retry-After':'1'});res.end('Preparing preview');return;}
    const url = new URL(req.url, 'http://127.0.0.1');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
    const info = await stat(file);
    if (url.pathname.endsWith('/index.html')) {
      res.writeHead(308, {Location:url.pathname.slice(0,-10)+url.search});res.end();return;
    }
    if (info.isDirectory()) {
      if (!url.pathname.endsWith('/')) {res.writeHead(308, {Location:url.pathname+'/'+url.search});res.end();return;}
      file = path.join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(body);
  } catch {res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});res.end('<h1>페이지를 찾을 수 없습니다.</h1><a href="/">성인PC마당으로 돌아가기</a>');}
});
server.on('error', error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
server.listen(requestedPort,'127.0.0.1',async()=>{
  const localOrigin = `http://localhost:${server.address().port}`;
  try {
    await runFile(process.execPath,['build.mjs'], {cwd:process.cwd(),env:{...process.env,SITE_ORIGIN:localOrigin}});
    ready = true;
    process.stdout.write(`Local: ${localOrigin}\n`);
  } catch(error) {
    process.stderr.write(`Preview build failed: ${error.stderr || error.message}\n`);
    server.close();process.exitCode = 1;
  }
});
