import { getD1 } from '@/db';
import { requireAdmin } from '@/lib/portal-auth';
import { BUILTIN_MASTER } from '@/lib/master-data';
import { directorySchema } from '@/lib/student-directory';

function failure(error: unknown) { console.error(error); return Response.json({error:'Unable to save or load the directory. Please retry.'},{status:500}); }
const noCache = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
 try {
  const denied=await requireAdmin(request); if(denied)return denied;
  const db=getD1();
  const [students,lists,masters]=await Promise.all([
   db.prepare('SELECT * FROM student_directory ORDER BY updated_at DESC').all(),
   db.prepare(`SELECT l.id, l.student_name AS studentName, l.locked_at AS choiceLockedAt, COALESCE(m.title, ?) AS masterTitle FROM preference_lists l LEFT JOIN counselling_masters m ON m.id=l.master_id ORDER BY l.student_name COLLATE NOCASE`).bind(BUILTIN_MASTER.title).all(),
   db.prepare('SELECT title FROM counselling_masters ORDER BY title').all()
  ]);
  const rows=students.results.map(row=>({...JSON.parse(String(row.data_json)),id:String(row.id),revision:Number(row.revision),archivedAt:row.archived_at,updatedAt:row.updated_at}));
  const links=new Map<string,string>(); for(const s of rows)for(const e of s.enrollments)if(e.listId)links.set(e.listId,s.id);
  return Response.json({students:rows,lists:lists.results.map(l=>({...l,linkedStudentId:links.get(String(l.id))??null})),counsellings:[...new Set([BUILTIN_MASTER.title,...masters.results.map(r=>String(r.title))])]}, {headers:noCache});
 } catch(error){return failure(error);}
}
async function save(request:Request, create:boolean) {
 try {
  const denied=await requireAdmin(request);if(denied)return denied;
  if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  const payload=await request.json();const parsed=directorySchema.safeParse(payload.student);
  if(!parsed.success)return Response.json({error:parsed.error.issues[0].message},{status:400});
  const student=parsed.data;const db=getD1(); const id=create?crypto.randomUUID():String(payload.id||'');
  if(!create && (!Number.isInteger(payload.revision)||!id))return Response.json({error:'Reload this student and try again.'},{status:400});
  const links=student.enrollments.map(e=>e.listId).filter(Boolean);
  for(const listId of links)if(!await db.prepare('SELECT id FROM preference_lists WHERE id=?').bind(listId).first())return Response.json({error:'A linked choice list no longer exists. Remove its link and retry.'},{status:400});
  const appNumber=student.applicationNumber.toUpperCase()||null;
  const conflict=await db.prepare('SELECT id FROM student_directory WHERE application_number=? AND id<>?').bind(appNumber,id).first();
  if(conflict)return Response.json({error:'This NEET application number already exists in the directory, including removed students.'},{status:409});
  const json=JSON.stringify(student),now=Date.now();
  // Checked inside the write statement, so simultaneous saves cannot claim the same choice list.
  const guard=`NOT EXISTS (SELECT 1 FROM student_directory d, json_each(d.data_json, '$.enrollments') e WHERE d.id<>? AND json_extract(e.value,'$.listId')<>'' AND json_extract(e.value,'$.listId') IN (SELECT value FROM json_each(?)))`;
  const stmt=create ? db.prepare(`INSERT INTO student_directory (id,data_json,application_number,created_at,updated_at) SELECT ?,?,?,?,? WHERE ${guard}`).bind(id,json,appNumber,now,now,id,JSON.stringify(links)) : db.prepare(`UPDATE student_directory SET data_json=?,application_number=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND ${guard}`).bind(json,appNumber,now,id,payload.revision,id,JSON.stringify(links));
  const result=await stmt.run();
  if(!result.meta.changes)return Response.json({error:'This record changed, or a choice list is linked to another student. Refresh the directory before saving again.'},{status:409});
  return Response.json({ok:true,id},{status:create?201:200,headers:noCache});
 } catch(error){if(error instanceof SyntaxError)return Response.json({error:'Invalid student details'},{status:400});return failure(error);}
}
export async function POST(request:Request){return save(request,true);}
export async function PUT(request:Request){return save(request,false);}
export async function PATCH(request:Request){
 try {
  const denied=await requireAdmin(request);if(denied)return denied;
  if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  const p=await request.json();if(typeof p.id!=='string'||!Number.isInteger(p.revision)||typeof p.restore!=='boolean')return Response.json({error:'Invalid student action'},{status:400});
  const now=Date.now();const result=await getD1().prepare('UPDATE student_directory SET archived_at=?, updated_at=?, revision=revision+1 WHERE id=? AND revision=?').bind(p.restore?null:now,now,p.id,p.revision).run();
  if(!result.meta.changes)return Response.json({error:'This student changed. Refresh and try again.'},{status:409});
  return Response.json({ok:true},{headers:noCache});
 }catch(error){return failure(error);}
}
