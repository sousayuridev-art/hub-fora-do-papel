-- CX-4 · Depois do aceite (20/10): card docs/cards/CX-3-4-7-pagina-da-proposta.md
-- O aceite já deixa o portal pronto para quem aceitou: convite de responsável pelo contrato
-- para o e-mail informado no aceite (se a pessoa ainda não tem acesso nem convite aberto).
-- A página da proposta aceita devolve esse e-mail para o botão "Abrir meu portal" já vir preenchido.

create or replace function public._cx4_trocar(p_funcao text, p_de text, p_para text)
returns void language plpgsql as $$
declare d text; novo text;
begin
  d := pg_get_functiondef(p_funcao::regprocedure);
  novo := replace(d, p_de, p_para);
  if novo = d then raise exception '%: ponto de troca não encontrado', p_funcao; end if;
  execute novo;
end;
$$;

select public._cx4_trocar('public.proposta_aceitar(text,integer,text,text,text,text,text,text,text,boolean)',
  '  v_de := d.stage;',
  '  -- Portal pronto para quem aceitou (CX-4): convite de responsável, se ainda não tem acesso
  if not exists (select 1 from public.client_members cm join auth.users u on u.id = cm.user_id
                  where cm.client_id = p.client_id and lower(u.email) = v_email)
     and not exists (select 1 from public.portal_invites i where i.client_id = p.client_id and lower(i.email) = v_email
                      and i.accepted_at is null and i.canceled_at is null)
     and not exists (select 1 from public.memberships m join auth.users u on u.id = m.user_id
                      where m.tenant_id = p.tenant_id and m.role = ''owner'' and lower(u.email) = v_email) then
    insert into public.portal_invites (tenant_id, client_id, email, profile, can_approve)
    values (p.tenant_id, p.client_id, v_email, ''responsavel'', true);
    insert into public.event_outbox (tenant_id, event, payload)
    values (p.tenant_id, ''portal.convite'', jsonb_build_object(''client_id'', p.client_id, ''email'', v_email,
            ''perfil'', ''responsavel'', ''origem'', ''aceite''));
  end if;

  v_de := d.stage;');

select public._cx4_trocar('public.proposta_publica(text)',
  '''documento_tipo'', p.accept_data->>''documento_tipo'', ''aceita_em'', p.accepted_at) end,',
  '''documento_tipo'', p.accept_data->>''documento_tipo'', ''aceita_em'', p.accepted_at,
       ''email'', p.accept_data->>''email'') end,');

drop function public._cx4_trocar(text, text, text);
