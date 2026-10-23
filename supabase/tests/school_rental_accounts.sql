begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','74d99439-9ecb-454d-b7c8-c3d186dd9bf5',true);
do $$declare key uuid;current_revision integer;payload jsonb;begin
 payload:='{"client_name":"__rental_account_test__","amount_due_cents":10000,"amount_received_cents":2500,"payment_reference":"TEST-QONTO-01","state":"active"}';
 key:=public.jds_save_rental_account(null,null,payload);
 if not exists(select 1 from public.jds_rental_accounts where id=key and amount_due_cents-amount_received_cents=7500) then raise exception 'Director cannot manage rental balance';end if;
 if(select count(*) from public.jds_rental_account_events where account_id=key)<>1 then raise exception 'Missing initial history';end if;
 perform public.jds_save_rental_account(key,1,payload||'{"amount_received_cents":10000,"payment_reference":"TEST-QONTO-01 + TEST-QONTO-02"}');
 if(select count(*) from public.jds_rental_account_events where account_id=key)<>2 then raise exception 'Missing updated history';end if;
 begin
  perform public.jds_save_rental_account(key,1,payload);
  raise exception 'Concurrent stale update accepted';
 exception when raise_exception then if sqlerrm not like 'Ce dossier a changé.%' then raise;end if;end;
 begin
  perform public.jds_save_rental_account(key,2,payload||'{"amount_received_cents":10001}');
  raise exception 'Overpayment accepted';
 exception when raise_exception then if sqlerrm not like 'Vérifie les montants%' then raise;end if;end;
 begin
  perform public.jds_save_rental_account(key,2,payload||'{"qonto_payment_url":"https://pay.qonto.com@evil.example/payment"}');
  raise exception 'Untrusted payment URL accepted';
 exception when check_violation then null;end;
 begin
  update public.jds_rental_accounts set amount_received_cents=0 where id=key;
  raise exception 'Untracked direct update accepted';
 exception when insufficient_privilege then null;end;
 if(select revision from public.jds_rental_accounts where id=key)<>2 then raise exception 'Failed save changed record';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$begin
 if exists(select 1 from public.jds_rental_accounts where client_name='__rental_account_test__') or exists(select 1 from public.jds_rental_account_events) then raise exception 'Non-manager read financial records';end if;
 begin
  perform public.jds_save_rental_account(null,null,'{"client_name":"Forbidden"}');raise exception 'Non-manager write accepted';
 exception when raise_exception then if sqlerrm<>'Accès gestion CORE requis.' then raise;end if;end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform * from public.jds_rental_accounts;raise exception 'Anonymous financial read accepted';exception when insufficient_privilege then null;end;
 begin perform public.jds_save_rental_account(null,null,'{}');raise exception 'Anonymous write accepted';exception when insufficient_privilege then null;end;
end $$;
rollback;
