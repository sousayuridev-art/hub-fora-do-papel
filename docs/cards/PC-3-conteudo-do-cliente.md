# Card PC-3 · Artigos e fotos editados pelo cliente

> **Origem:** PRD `PC-0` (27/10). Base: CMS-1 (tabelas e RPCs) e CMS-2 (telas no Hub).
> **Decisões:** o cliente usa as mesmas tabelas e RPCs do conteúdo do site da Fora do Papel; muda só quem pode editar.

**Objetivo:** responsável e equipe criam, editam e publicam artigos e enviam fotos do próprio site pelo painel, sem tocar no site de outra empresa.

**Não entra:**
- Páginas (PC-4).
- Assistente virtual para resumo e descrição de foto (P2 do PC-0).
- Portfólio: segue o mesmo modelo, em card próprio quando o primeiro cliente de portfólio entrar.

## Requisitos
### Banco (`supabase/migrations/[data]_pc3_conteudo_cliente.sql`)
- Função `pode_editar_site(p_site)` (`security definer`, estável): verdadeira para o dono do tenant e para pessoas do portal (`client_members`, qualquer perfil) da empresa ligada ao site (`sites.client_id`).
- RPCs do CMS-1 (`site_artigo_salvar`, `site_artigo_publicar`, `site_artigo_arquivar`) passam a aceitar quem `pode_editar_site`. As validações do CMS-1 continuam (título para o Google até 60, descrição até 155, sem marcador `[ ]` pendente ao publicar).
- RPC `portal_site_artigos(p_site)` para a lista do painel (sem corpo) e `portal_site_artigo(p_id)` com corpo.
- Fotos: tabela `site_midia` (site_id, tenant_id, caminho, nome, descricao, tamanho_bytes, usada_em text[]) com RLS; bucket `site-midia` (CMS-1) com pasta por site; RPCs `site_midia_registrar` e `site_midia_descrever`. Apagar só se `usada_em` estiver vazio.
- Eventos `artigo.publicado` e `midia.enviada` com `quem` (pessoa do portal ou dono).

### Telas (portal, Meu site)
- **Artigos** (`/portal/site/artigos`): lista com foto, título, resumo e situação (Rascunho, Agendado, Publicado); "Escrever artigo" (principal). Editor em painel lateral largo (bottom sheet no celular), reaproveitando os componentes do CMS-2, com: foto de capa (escolher em Fotos e arquivos), título, texto por seções, resumo e a prévia "Como aparece no Google" com contador.
- **Fotos e arquivos** (`/portal/site/fotos`): grade com aviso de fotos sem descrição ("A descrição ajuda pessoas com deficiência visual e faz a foto aparecer no Google Imagens"), envio com compressão no navegador antes de subir (até 2 MB, jpg/png/webp), detalhe com descrição e onde é usada.
- Componente único "Escolher foto" usado nos artigos e no editor de páginas (PC-4).
- Mensagem de sucesso: "Artigo publicado" com "Ver no site".

## Critérios de aceite
- Dado o responsável da Clínica, quando publica um artigo, então ele aparece em `site_publico_artigos('[dominio da clínica]')` e não aparece no site de outra empresa.
- Pessoa de outra empresa chamando `site_artigo_salvar` no site da Clínica recebe recusa (teste de banco).
- Equipe também publica (conteúdo não é dinheiro).
- Foto usada em artigo não pode ser apagada; o aviso diz onde ela é usada.
- Erro de rede no salvar mantém o texto e mostra "Tentar de novo".
- pgTAP `supabase/tests/pc3_conteudo_cliente.test.sql` passa; `bun run build`, `bun run lint`, `bun run test` passam.

## Para o Yuri depois de publicar
- Ligar um site de teste a uma empresa de teste e publicar um artigo pela conta do portal.
