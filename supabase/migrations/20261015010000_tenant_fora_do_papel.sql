-- =====================================================================
-- A própria agência como empresa no Hub. Os contatos do site
-- (site_registrar_contato) são gravados nela; sem esta linha, o banco
-- recusa todos os contatos com "tenant_ausente".
-- Idempotente: se a linha já existir em produção, nada muda.
-- =====================================================================
insert into public.tenants (name, slug)
values ('Fora do Papel', 'fora-do-papel')
on conflict (slug) do nothing;
