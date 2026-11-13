-- Foto e nome do dono no cartão da conta do Hub (pedido do Yuri em 13/11: "ajuste com a foto").
-- Antes o cartão mostrava o e-mail de login e a inicial. Grava full_name e avatar_url nos dados
-- do usuário do Supabase Auth (o Hub já lê full_name; avatar_url passa a ser lido também).
-- Sem e-mail no repositório: o alvo é o dono do tenant fora-do-papel, e só se houver um dono.
do $$
declare t uuid; n int; u uuid;
begin
  select id into t from public.tenants where slug = 'fora-do-papel';
  if t is null then raise notice 'Tenant fora-do-papel não encontrado.'; return; end if;
  select count(*), min(user_id::text)::uuid into n, u
    from public.memberships where tenant_id = t and role = 'owner';
  if n <> 1 then raise notice 'Encontrados % donos: nada alterado.', n; return; end if;
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('full_name', 'Yuri Sousa', 'avatar_url', '/yuri-avatar.webp')
   where id = u;
end $$;
