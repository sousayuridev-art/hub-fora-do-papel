# RD2-7 · Materiais com prévia e Sites

Parte do redesenho RD2 (`docs/cards/RD2-redesenho-areas.md`). Aprovado no canvas (P09 Materiais): "prévia dos materiais" ficou como está.

## Visão de negócio
Para conferir um modelo ou uma entrega era preciso abrir em outra aba ou baixar. A lista só com ícones não ajudava a achar uma imagem.

## Requisitos
1. Materiais em **Grade** (padrão) ou **Lista** (`?vista=lista`). A grade mostra a miniatura real das imagens
   (até 3 MB, endereço temporário de 10 minutos, numa chamada só) e a sigla do tipo nos demais (PDF, DOCX…);
   textos prontos mostram o começo do texto. Grade virtualizada por linha: 2 colunas no celular, até 4 no computador.
2. Painel do material com **prévia sem baixar**: imagem, PDF (no computador), vídeo MP4 e áudio MP3.
   SVG, texto e arquivos do Office nunca abrem no Hub (só baixar), como antes.
3. Setas **anterior / próximo** e "3 de 18" no painel, na ordem da lista filtrada.
4. "Ver" virou "Abrir em nova aba".
5. Sites: já em Entregar desde o RD2-1, com a escolha do site quando há mais de um.

## Casos de borda
- PDF no celular: sem prévia (os navegadores do celular não mostram PDF dentro da página); fica "Abrir em nova aba".
- Falha ao gerar o endereço: aviso com "Tentar de novo"; o resto do painel funciona.
- Imagem acima de 3 MB: sigla na grade, prévia no painel.

## Critérios de aceite
- [x] `src/test/rd2-7.test.ts` passa.
- [x] Build, lint e testes passam; conferido no navegador em computador e celular.

## Métrica de sucesso
Conferir um material sem baixar nada.
