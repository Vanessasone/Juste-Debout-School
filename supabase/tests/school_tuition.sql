begin;
-- All synthetic financial rows are rolled back; no real payment or enrollment is modified.
select set_config('jds.test_other_admin',coalesce((select p.id::text from public.profiles p where 'admin'=any(p.roles) and not exists(select 1 from public.jds_school_responsibilities r where r.profile_id=p.id and r.enabled and r.email in ('nicolas@juste-debout.com','bruceykanji1@gmail.com','rabah@juste-debout.com','loic@juste-debout.com')) limit 1),''),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$
declare member_key uuid; key uuid; other uuid; payload jsonb; s record; payment_key uuid:=gen_random_uuid(); d date:=(now() at time zone 'Europe/Paris')::date;
begin
 if not public.jds_school_finance_access() then raise exception 'Nicolas access failed';end if;
 if not (public.jds_school_cockpit()->>'can_finance')::boolean then raise exception 'Cockpit finance access missing';end if;
 select m.id into member_key from public.jds_training_members m where not exists(select 1 from public.jds_tuition_accounts a where a.member_id=m.id) order by m.id limit 1;
 if member_key is null then raise exception 'No unused training member for rollback-only test';end if;
 payload:=jsonb_build_object('member_id',member_key,'base_cents',10000,'discount_cents',1000,'terms_confirmed',false,'schedule_confirmed',false,'payer_kind','parent','payer_name','__tuition_test__','installments',jsonb_build_array(
 jsonb_build_object('id',gen_random_uuid(),'label','Acompte','due_on',d-1,'amount_cents',3000),
 jsonb_build_object('id',gen_random_uuid(),'label','Du jour','due_on',d,'amount_cents',3000),
 jsonb_build_object('id',gen_random_uuid(),'label','À venir','due_on',d+15,'amount_cents',3000)),'receipts','[]'::jsonb);
 key:=public.jds_save_tuition_account(null,null,payload);
 select * into s from public.jds_tuition_account_summary where id=key;
 if s.balance_cents is not null or s.overdue_cents<>0 then raise exception 'Draft leaked into confirmed balances';end if;
 begin perform public.jds_save_tuition_account(null,null,payload);raise exception 'Duplicate membership accepted';exception when unique_violation then null;end;
 payload:=payload||'{"terms_confirmed":true,"schedule_confirmed":true}';
 perform public.jds_save_tuition_account(key,1,payload);
 select * into s from public.jds_tuition_account_summary where id=key;
 if s.agreed_cents<>9000 or s.overdue_cents<>3000 or s.upcoming_cents<>6000 then raise exception 'Confirmed schedule or today boundary incorrect';end if;
 begin perform public.jds_save_tuition_account(key,1,payload);raise exception 'Stale revision accepted';exception when raise_exception then if sqlerrm not like '%a changé%' then raise;end if;end;
 begin perform public.jds_save_tuition_account(key,2,payload||'{"discount_cents":1001}');raise exception 'Unbalanced schedule accepted';exception when raise_exception then if sqlerrm not like '%total de l’échéancier%' then raise;end if;end;
 begin perform public.jds_save_tuition_account(key,2,payload||'{"qonto_payment_url":"https://pay.qonto.com@evil.example/test"}');raise exception 'Untrusted URL accepted';exception when check_violation then null;end;
 payload:=payload||jsonb_build_object('receipts',jsonb_build_array(jsonb_build_object('id',payment_key,'amount_cents',2000,'paid_on',d,'method','transfer','reference','TEST-BANK-01','payer_name','__parent_test__','payer_kind','parent','status','recorded','void_reason','')));
 perform public.jds_save_tuition_account(key,2,payload);
 select to_jsonb(a) into payload from public.jds_tuition_accounts a where a.id=key;
 select * into s from public.jds_tuition_account_summary where id=key;
 if s.received_cents<>2000 or s.overdue_cents<>1000 or s.balance_cents<>7000 then raise exception 'Partial payment FIFO incorrect';end if;
 begin perform public.jds_save_tuition_account(key,3,jsonb_set(payload,'{receipts,0,amount_cents}','2100'));raise exception 'Receipt modification accepted';exception when raise_exception then if sqlerrm not like '%immuable%' then raise;end if;end;
 begin perform public.jds_save_tuition_account(key,3,jsonb_set(payload,'{receipts}','[]'));raise exception 'Receipt deletion accepted';exception when raise_exception then if sqlerrm not like '%supprimé%' then raise;end if;end;
 begin perform public.jds_save_tuition_account(key,3,jsonb_set(payload,'{receipts,0,paid_on}',to_jsonb((d+1)::text)));raise exception 'Future receipt accepted';exception when raise_exception then if sqlerrm not like '%date passée%' then raise;end if;end;
 payload:=jsonb_set(jsonb_set(payload,'{receipts,0,status}','"void"'),'{receipts,0,void_reason}','"Erreur de montant test"');
 perform public.jds_save_tuition_account(key,3,payload);
 select * into s from public.jds_tuition_account_summary where id=key;
 if s.received_cents<>0 or s.overdue_cents<>3000 then raise exception 'Voided receipt counted as income';end if;
 select to_jsonb(a) into payload from public.jds_tuition_accounts a where a.id=key;
 begin perform public.jds_save_tuition_account(key,4,jsonb_set(payload,'{receipts,0,status}','"recorded"'));raise exception 'Void reactivation accepted';exception when raise_exception then if sqlerrm not like '%réactivée%' then raise;end if;end;
 payload:=jsonb_set(payload,'{receipts}',(payload->'receipts')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'amount_cents',10000,'paid_on',d,'method','transfer','reference','TEST-BANK-02','payer_name','__organization_test__','payer_kind','organization','status','recorded','void_reason','')));
 perform public.jds_save_tuition_account(key,4,payload);
 select * into s from public.jds_tuition_account_summary where id=key;
 if s.received_cents<>10000 or s.surplus_cents<>1000 or s.balance_cents<>0 or s.overdue_cents<>0 then raise exception 'Overpayment visibility incorrect';end if;
 if (select count(*) from public.jds_tuition_events where account_id=key)<>5 then raise exception 'Audit event missing';end if;
 if jsonb_array_length(public.jds_tuition_data()->'roster')<1 then raise exception 'Roster missing';end if;
 begin update public.jds_tuition_accounts set note='bypass' where id=key;raise exception 'Direct update accepted';exception when insufficient_privilege then null;end;
 other:=nullif(current_setting('jds.test_other_admin'),'')::uuid;
 perform set_config('request.jwt.claim.sub',coalesce(other::text,'00000000-0000-0000-0000-000000000099'),true);
 if public.jds_school_finance_access() or exists(select 1 from public.jds_tuition_accounts) or exists(select 1 from public.jds_tuition_events) then raise exception 'Other account can read finance';end if;
 if public.jds_can_manage_school('CORE') and exists(select 1 from jsonb_array_elements(public.jds_school_cockpit()->'actions') a where a->>'key' like 'tuition_%' or a->>'key' like 'enrollment_%') then raise exception 'Non-director cockpit leaks financial actions';end if;
 begin perform public.jds_tuition_data();raise exception 'Other account can load tuition RPC';exception when raise_exception then if sqlerrm not like '%quatre directeurs%' then raise;end if;end;
 begin perform public.jds_save_tuition_account(null,null,payload);raise exception 'Other account can write';exception when raise_exception then if sqlerrm not like '%quatre directeurs%' then raise;end if;end;
end $$;
set local role anon;
do $$begin
 begin perform public.jds_tuition_data();raise exception 'Anon can execute';exception when insufficient_privilege then null;end;
 begin perform id from public.jds_tuition_accounts;raise exception 'Anon can read';exception when insufficient_privilege then null;end;
end $$;
rollback;
