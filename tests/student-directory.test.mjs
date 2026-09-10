import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const root = new URL('../', import.meta.url).pathname;
await mkdir(root+'.sites-runtime',{recursive:true});
await build({entryPoints:[root+'app/api/admin/directory/route.ts'],outfile:root+'.sites-runtime/directory-route.cjs',bundle:true,platform:'node',format:'cjs',plugins:[{name:'test-database-and-session',setup(b){b.onResolve({filter:/^@\/db$/},()=>({path:'database',namespace:'test'}));b.onResolve({filter:/^@\/lib\/portal-auth$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='database'?'export function getD1(){return globalThis.directoryTestDb}':'export async function requireAdmin(request){return request.headers.get("x-test-role")==="admin"?null:Response.json({error:"Admin access is required"},{status:401})}',loader:'js'}));}}]});
const require=createRequire(import.meta.url),api=require(root+'.sites-runtime/directory-route.cjs');
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(root+'drizzle')).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(root+'drizzle/'+f,'utf8'));
globalThis.directoryTestDb={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async all(){return{results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}};
function req(method,body,role='admin'){return new Request('https://example.test/api/admin/directory',{method,headers:{'x-test-role':role,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
function student(){return{name:'Test Student',applicationNumber:'NEET-1',mobile:'',email:'',neetRank:'',counsellor:'',priority:'normal',nextAction:'',followUpDate:'',notes:'',completion:'ongoing',enrollments:[{id:'en1',counselling:'MCC AIQ',year:2026,registrationNumber:'',listId:'',status:'ongoing',rounds:[1,2,3,4].map(round=>({round,participation:'undecided',registration:'not_started',choices:'not_started',verification:'not_started',result:'pending',college:'',course:'',quota:'',category:'',decision:'pending',reporting:'not_started',reportingDate:'',sourceUrl:'',notes:''}))}]};}

test('directory persistence, access, duplicates, concurrent edits and recovery',async()=>{
 for(const method of ['GET','POST','PUT','PATCH'])for(const role of ['student','anonymous'])assert.equal((await api[method](req(method,method==='GET'?null:{},role))).status,401);
 const s=student(); const create=await api.POST(req('POST',{student:s}));assert.equal(create.status,201);const {id}=await create.json();
 let data=await (await api.GET(req('GET'))).json();assert.equal(data.students.length,1);assert.equal(data.students[0].enrollments[0].rounds.length,4);
 assert.equal((await api.POST(req('POST',{student:s}))).status,409);
 s.name='Updated student';assert.equal((await api.PUT(req('PUT',{id,revision:1,student:s}))).status,200);
 s.name='Stale overwrite';assert.equal((await api.PUT(req('PUT',{id,revision:1,student:s}))).status,409);
 data=await (await api.GET(req('GET'))).json();assert.equal(data.students[0].name,'Updated student');
 s.completion='done';assert.equal((await api.PUT(req('PUT',{id,revision:2,student:s}))).status,400);s.completion='ongoing';
 s.enrollments[0].rounds[0].result='allotted';assert.equal((await api.PUT(req('PUT',{id,revision:2,student:s}))).status,400);s.enrollments[0].rounds[0].college='Exact College, City';
 db.prepare('INSERT INTO preference_lists (id,student_name,created_at,updated_at) VALUES (?,?,?,?)').run('list-test','Updated student',1,1);
 s.enrollments[0].listId='list-test';assert.equal((await api.PUT(req('PUT',{id,revision:2,student:s}))).status,200);
 const second=student();second.applicationNumber='NEET-2';second.enrollments[0].listId='list-test';assert.equal((await api.POST(req('POST',{student:second}))).status,409);
 assert.equal((await api.PATCH(req('PATCH',{id,revision:3,restore:false}))).status,200);
 data=await (await api.GET(req('GET'))).json();assert.ok(data.students[0].archivedAt);assert.equal(data.students[0].enrollments[0].rounds[0].college,'Exact College, City');assert.equal(data.lists[0].linkedStudentId,id);
 assert.equal((await api.PATCH(req('PATCH',{id,revision:4,restore:true}))).status,200);
 data=await (await api.GET(req('GET'))).json();assert.equal(data.students[0].archivedAt,null);assert.equal(data.students[0].revision,5);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM preference_lists').get().n,1);
});
