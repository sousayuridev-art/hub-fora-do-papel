# Card S8 · Materiais (Hub) e Arquivos (portal)

> **Base visual:** canvas "Hub Fora do Papel · proposta 2", telas `HubMateriais` e `PortalArquivos`, no visual atual.
> **Pedido do Yuri (19/10):** finalizar o sistema incluindo Materiais. As decisões abaixo seguem o protótipo; mudar qualquer uma é um ajuste pequeno.

**Objetivo:** um lugar só para os modelos, guias, textos prontos, marca, anúncios e entregas da agência, e para os arquivos que o cliente envia (fotos, logo, textos), sem WhatsApp nem e-mail perdido.
**Depende de:** S3 (projetos e pendências do cliente), portal com login.
**Não entra:**
- versões de arquivo e pastas dentro do portal;
- edição de imagem;
- exclusão automática da lixeira (o Yuri exclui de vez).

## Decisões
- **Um cadastro único** (`materials`), de três tipos:
  - **arquivo:** fica no Storage privado do Supabase, bucket `materiais`, até 25 MB, com os tipos comuns: PDF, imagens, Office, texto, zip, vídeo MP4 e áudio MP3;
  - **texto pronto:** com botão de copiar;
  - **link** (`https`).
- **Categorias:** modelos e documentos, guias para clientes, textos prontos, marca e apresentação, anúncios, entregas de projetos e "do cliente" (o que o cliente enviou).
- **Vínculo opcional** com cliente e projeto.
- **Visibilidade:** "só nosso" ou "compartilhado com o cliente". Compartilhar exige cliente.
- **Lixeira:** sai das listas e pode ser restaurado; "Excluir de vez" apaga o arquivo e o registro.

## Requisitos

### Banco (`supabase/migrations/20261019100000_s8_materiais.sql`)
- **Envio de arquivo em três passos:**
  1. `material_preparar` (ou `portal_arquivo_preparar`) reserva o caminho `{agência}/{material}/{nome}`;
  2. o app envia o arquivo ao Storage;
  3. `material_confirmar` só aceita se o arquivo chegou, e grava o tamanho real.
- **Regras do Storage** (`storage.objects`):
  - **ler:** dono da agência; ou alguém da empresa do cliente, se o material foi compartilhado com ela ou enviado por ela;
  - **gravar:** só quem preparou, no caminho reservado, em até 1 dia;
  - **apagar:** só o dono.
- **Cliente:** envia no máximo 60 arquivos por dia. Ligado a uma pendência, o envio marca a pendência como feita e avisa nas Novidades do Painel (`arquivo_enviado`).
- **RLS:** o dono lê a tabela; o cliente só pelas RPCs `portal_*`; anon nada.

### Hub (`/app/materiais`)
- **Navegação:** categorias com contagem à esquerda (em chips no celular) e a lixeira.
- **Filtros:**
  - busca por nome, cliente ou texto;
  - cliente;
  - "Nossos" ou "Do cliente";
  - "Só compartilhados".
- **Lista virtualizada.**
- **"Enviar material" (âmbar):** arquivo, texto pronto ou link.
- **Painel do material:**
  - ver, baixar ou copiar;
  - editar (título, categoria, cliente, projeto, compartilhar);
  - mandar para a lixeira, restaurar ou excluir de vez.
- **Ficha do cliente e projeto:** atalho "Materiais deste cliente".

### Portal (`/portal/arquivos`)
- **"O que falta enviar":** as pendências abertas, cada uma com "Escolher arquivos".
- **Seus arquivos:**
  - "Enviados por você";
  - "Da Fora do Papel", com ver, baixar e copiar texto.
- **"Enviar outro arquivo"**, sem pendência.

## Critérios de aceite
- O Yuri envia um PDF compartilhado com a Clínica: a Paula vê e baixa no portal, e outra empresa não vê.
- A Paula envia as fotos pela pendência: a pendência fecha e o Yuri vê nas Novidades e em Materiais › Do cliente.
- Verificações: build, lint, vitest e pgTAP (`supabase/tests/s8_materiais.test.sql`) passam; e2e com o envio real.
