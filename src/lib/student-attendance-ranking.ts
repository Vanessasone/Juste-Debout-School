import {supabase} from './supabase';
export type StudentAttendanceSummary={member_id:string;group_id:string;recorded_courses:number;missing_calls:number;raw_absences:number;justified_absences:number;pending_justifications:number;weighted_absences:number;warning_required:boolean;attendance_rank:number|null};
export async function getStudentAttendanceSummary(){const {data,error}=await supabase.rpc('jds_student_attendance_summary');if(error)throw error;return (data??[]) as StudentAttendanceSummary[];}
