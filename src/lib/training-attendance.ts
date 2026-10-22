import type {Attendance,TrainingMember} from './training';

export function attendanceSummary(lessonId:string,members:TrainingMember[],records:Attendance[]) {
 const memberIds=new Set(members.map(m=>m.id));
 const statuses=new Map(records.filter(a=>a.lesson_id===lessonId&&memberIds.has(a.member_id)).map(a=>[a.member_id,a.status]));
 const result={total:memberIds.size,present:0,absent:0,late:0,excused:0,unmarked:0};
 for(const id of memberIds){const status=statuses.get(id);if(status)result[status]++;else result.unmarked++;}
 return result;
}
