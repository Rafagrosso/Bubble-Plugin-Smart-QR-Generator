# Sincronização Bubble ↔ GitHub

**Regra de ouro deste repositório: o GitHub é a base. O editor do Bubble é espelho.**

O Bubble não tem uma opção "usar o GitHub como fonte da verdade" — o botão
*Synchronize with GitHub* sempre faz um **merge de duas vias**: ele commita o
estado interno do plugin e mescla com a branch padrão do repositório. Tornar o
GitHub a base é, portanto, uma disciplina de trabalho, não um botão. Este
documento é essa disciplina.

O conflito que você já viu —

> There was a conflict when both versions were merged, please head to GitHub to
> resolve the conflicts, merge into master and synchronize again.

— acontece exatamente quando os dois lados mexeram no mesmo conteúdo. Seguindo o
fluxo abaixo, ele deixa de acontecer.

## Configuração

- Branch padrão do repositório: **`main`**. É a única branch que o Bubble
  enxerga. (A palavra "master" na mensagem de erro é texto fixo do Bubble.)
- Todo trabalho novo entra por uma branch de feature e só chega ao Bubble
  depois de ser mesclado na `main`.

## O fluxo do dia a dia

1. **Alterar o código aqui**, no repositório — nunca no editor do Bubble.
2. **Validar** antes de enviar:

   ```bash
   node tools/validate-plugin.js
   ```

3. **Push para a `main`.**
4. **No editor do plugin no Bubble, clicar em *Synchronize with GitHub*.**
   Como o lado do Bubble não mudou, o merge é limpo e ele apenas absorve o que
   veio do GitHub.
5. Testar na página de demo e publicar com *Submit a new version*.

### As duas regras que evitam todo conflito

- **Não edite pelo editor do Bubble.** Cada edição lá vira uma alteração que o
  GitHub desconhece — e é isso, e só isso, que gera conflito.
- **Sincronize depois de todo push.** Deixar o Bubble muitas versões atrás
  aumenta a chance de alguém "só ajustar rapidinho" pelo editor.

Se você **precisar** mexer pelo editor do Bubble (para usar um campo que a
interface cria melhor, por exemplo): sincronize **imediatamente depois**, ainda
na mesma sessão, e antes de qualquer alteração nova aqui. Assim a mudança volta
para o GitHub antes de virar divergência.

## Quem manda em quê

"GitHub é a base" vale para **o código e o conteúdo**: `update.js`, `run.js`,
textos, opções, valores padrão. Não vale para **IDs e estrutura de pastas**.

O Bubble mantém seu próprio contador de IDs. Quando ele importa uma entidade
nova criada à mão aqui (um state, uma ação, um evento), ele **atribui o ID
dele** e reescreve a pasta. Foi o que aconteceu no primeiro sync deste
repositório: as ações criadas como `AAT-850n8` e `AAU-850na` voltaram do Bubble
como `AAW-850ne` e `AAY-850nj`. O código dentro delas veio intacto, byte a byte
— só a numeração mudou.

Por isso, para **criar entidades novas** o caminho barato é o inverso: crie a
casca no editor do Bubble (só o nome do state/ação/campo), sincronize para o
GitHub, e então escreva o código aqui. O Bubble numera, você programa. Para
**alterar o que já existe**, siga o fluxo normal acima — o GitHub manda.

## Se o conflito aparecer

O Bubble cria uma branch chamada `conflict_<data>` com a versão dele e pede
para você resolver no GitHub. Como a versão do Bubble já traz o conteúdo do
GitHub reimportado **com os IDs canônicos dele**, o normal é resolver a favor
do Bubble e depois recuperar o que ele tiver descartado:

```bash
git fetch origin
git branch -r                                    # ache a branch conflict_<data>
git checkout main
git merge -X theirs origin/conflict_<data>       # IDs e estrutura do Bubble
```

Em seguida, **três verificações que o merge não faz sozinho**:

1. **Apague suas pastas duplicadas.** As entidades que você criou à mão
   continuam no repositório com os IDs antigos, ao lado das que o Bubble
   renumerou. `node tools/validate-plugin.js` acusa o ID repetido; apague a
   pasta com o ID antigo.
2. **Restaure o que o Bubble perdeu no caminho.** Ao reimportar, ele costuma
   descartar `doc`, `optional` e `default_val` de campos. Compare com
   `git diff b651b98 main -- elements/` e reponha à mão.
3. **Valide e envie.**

   ```bash
   node tools/validate-plugin.js
   git push origin main
   ```

Depois disso, volte ao Bubble e clique em *Synchronize with GitHub* de novo:
como a `main` agora descende da branch do Bubble, o merge é limpo.

`-X theirs` só decide os trechos **em conflito** a favor do Bubble; o que só
existe na `main` (este arquivo, `tools/`, `.github/`) atravessa o merge intacto.

### Detalhes observados do lado do Bubble

- Ele remove a quebra de linha final dos arquivos. Diferença cosmética, ignore.
- O `<script>` de bibliotecas fica em **`html_headers.html` na raiz** (header
  compartilhado do plugin), não em `elements/<id>/headers.html`.
- Ele **não** importa alterações de `description` e `plugin_instructions` do
  `meta_data.json` — esses campos são editados na aba de configurações do
  plugin. Se o texto no Bubble estiver desatualizado, atualize por lá.

## Estrutura do repositório

O Bubble espera exatamente esta organização — o validador cobra cada item:

```
meta_data.json                     descrição, categorias, instruções
shared_tech_params.json            plugin_api_version, use_jquery
elements/<ID>-<token>/
    params.json                    campos, states e eventos do elemento
    headers.html                   <script> de bibliotecas externas
    initialize.js  update.js  preview.js  reset.js
    states/<ID>-<token>/initialization.js
    element_actions/<ID>-<token>/
        params.json                caption, doc e campos da ação
        run.js
actions/<ID>-<token>/              server-side actions (não usadas aqui)
api/                               chamadas de API (não usadas aqui)
```

Três detalhes que quebram o sync silenciosamente:

- Ações de elemento vão em **`element_actions/`**. Uma pasta `actions/` dentro
  de um elemento é ignorada — `actions/` na raiz é outra coisa (server-side).
- **Eventos não têm pasta.** Existem só como chave `events` no `params.json` do
  elemento.
- **Ações não são declaradas no `params.json` do elemento.** Cada uma se
  descreve sozinha no seu próprio `params.json`.

## Criando entidades novas à mão

Todo elemento, campo, state, evento e ação recebe um **ID de 3 letras vindo de
um contador único por plugin** — IDs nunca se repetem, mesmo entre tipos
diferentes. O validador imprime o próximo ID livre:

```bash
node tools/validate-plugin.js
# → Próximo ID livre sugerido: AAW
```

Para states e ações, que têm pasta própria, o nome da pasta é `<ID>-<token>`,
com o token derivado do ID por `base32(2 * valorDoId + 8553090)`. Não invente o
token: o validador reclama e mostra o nome correto.

Campos e eventos não têm pasta — basta a entrada no `params.json`.

## Verificação automática

`.github/workflows/validate.yml` roda o validador a cada push e pull request na
`main`. Se a aba **Actions** do repositório mostrar vermelho, **não sincronize
com o Bubble** antes de corrigir: a `main` está com algo que o Bubble não
importaria direito.
