#!/usr/bin/env node
/**
 * Valida a estrutura do plugin antes de sincronizar com o Bubble.
 *
 * Rode `node tools/validate-plugin.js` antes de todo push. Um erro aqui
 * significa que o Bubble rejeitaria o repositório ou importaria o plugin
 * quebrado — mais barato descobrir agora do que depois do sync.
 *
 * As regras abaixo foram derivadas de um plugin real exportado pelo Bubble
 * (vini-brito/Bubble-Plugin-Leafy-Maps) e conferidas contra os IDs que o
 * próprio Bubble gerou neste repositório (AAC-850m6, AAL-850mr).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/* ------------------------------------------------------------------ *
 * IDs e nomes de pasta
 *
 * Cada entidade do plugin (elemento, campo, state, evento, ação) recebe um
 * ID de 3 letras vindo de um contador único por plugin. Pastas usam
 * "<ID>-<token>", e o token é derivado do ID:
 *
 *     token = base32(2 * valorDoId + 8553090)
 *     valorDoId = base256 sobre (charCode - 65)
 *
 * O alfabeto base32 do Bubble omite 4 letras. Os dados observados não
 * distinguem qual de cada par ambíguo (h/i, k/l, s/t) é omitido — 'o' é
 * sempre omitido —, então aceitamos qualquer uma das 8 combinações. Para a
 * faixa de valores deste plugin as 8 produzem exatamente o mesmo token.
 * ------------------------------------------------------------------ */

const TOKEN_ALPHABETS = [];
for (const a of ["h", "i"]) {
  for (const b of ["k", "l"]) {
    for (const c of ["s", "t"]) {
      const omit = new Set([a, b, c, "o"]);
      TOKEN_ALPHABETS.push(
        "0123456789" +
          "abcdefghijklmnopqrstuvwxyz"
            .split("")
            .filter((ch) => !omit.has(ch))
            .join("")
      );
    }
  }
}
const ID_OFFSET = 8553090;

function idValue(id) {
  let v = 0;
  for (const ch of id) v = v * 256 + (ch.charCodeAt(0) - 65);
  return v;
}

function tokensFor(id) {
  const n = 2 * idValue(id) + ID_OFFSET;
  return TOKEN_ALPHABETS.map((alpha) => {
    let v = n;
    let out = "";
    while (v > 0) {
      out = alpha[v % 32] + out;
      v = Math.floor(v / 32);
    }
    return out;
  });
}

/** Nome de pasta que o Bubble geraria para este ID. */
function folderNameFor(id) {
  return id + "-" + tokensFor(id)[0];
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`${relPath}: JSON inválido — ${e.message}`);
    return null;
  }
}

/** Os .js do Bubble são expressões de função anônima, não módulos. */
function checkJs(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    fail(`${relPath}: arquivo obrigatório ausente`);
    return;
  }
  const src = fs.readFileSync(abs, "utf8").trim();
  if (!/^function\s*\(/.test(src)) {
    fail(`${relPath}: deve começar com "function(" (expressão de função anônima)`);
    return;
  }
  try {
    new Function(`return (${src});`);
  } catch (e) {
    fail(`${relPath}: erro de sintaxe JavaScript — ${e.message}`);
  }
}

function dirsIn(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Todos os IDs do plugin vêm de um contador único — colisão quebra o sync. */
const seenIds = new Map();
function claimId(id, where) {
  if (!/^[A-Za-z]{3}$/.test(id)) {
    fail(`${where}: ID "${id}" deve ter exatamente 3 letras`);
    return;
  }
  if (seenIds.has(id)) {
    fail(`ID duplicado "${id}": usado em ${seenIds.get(id)} e em ${where}. IDs são únicos em todo o plugin.`);
    return;
  }
  seenIds.set(id, where);
}

/** Nome de pasta bate com o token que o Bubble derivaria do ID? */
function checkFolderName(folder, parentRel) {
  const m = /^([A-Za-z]{3})-([0-9a-z]+)$/.exec(folder);
  if (!m) {
    fail(`${parentRel}/${folder}: nome de pasta deve ser "<ID>-<token>", ex.: ${folderNameFor("AAZ")}`);
    return null;
  }
  const [, id, token] = m;
  if (!tokensFor(id).includes(token)) {
    fail(
      `${parentRel}/${folder}: token não corresponde ao ID. Para "${id}" o Bubble usaria "${folderNameFor(id)}".`
    );
  }
  return id;
}

/** Dois campos com o mesmo `name` fazem um sobrescrever o outro no código. */
function checkFields(fields, where) {
  if (!fields) return;
  const names = new Map();
  for (const [fid, f] of Object.entries(fields)) {
    claimId(fid, `${where} (campo "${f && f.name}")`);
    if (!f || typeof f !== "object") {
      fail(`${where}: campo ${fid} não é um objeto`);
      continue;
    }
    if (!f.name) fail(`${where}: campo ${fid} não tem "name" (usado como properties.<name>)`);
    if (!f.caption) fail(`${where}: campo ${fid} não tem "caption" (rótulo no editor)`);
    if (f.name) {
      if (names.has(f.name)) {
        fail(`${where}: dois campos usam name "${f.name}" (${names.get(f.name)} e ${fid})`);
      }
      names.set(f.name, fid);
    }
    if (f.editor === "Dropdown" && !f.options) {
      fail(`${where}: campo ${fid} é Dropdown mas não tem "options"`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Raiz do plugin
 * ------------------------------------------------------------------ */

for (const required of ["meta_data.json", "shared_tech_params.json"]) {
  if (!fs.existsSync(path.join(ROOT, required))) {
    fail(`${required}: arquivo obrigatório ausente na raiz`);
  }
}

const meta = readJson("meta_data.json");
if (meta && !meta.name) fail("meta_data.json: falta a chave \"name\"");

/* ------------------------------------------------------------------ *
 * Elementos
 * ------------------------------------------------------------------ */

const elementDirs = dirsIn("elements");
if (elementDirs.length === 0) warn("Nenhum elemento encontrado em elements/");

for (const elDir of elementDirs) {
  const elRel = `elements/${elDir}`;
  const elId = checkFolderName(elDir, "elements");
  if (elId) claimId(elId, `elemento ${elRel}`);

  // O Bubble espera "element_actions"; "actions" dentro de um elemento é
  // ignorado silenciosamente (ações no nível raiz são server-side actions).
  if (fs.existsSync(path.join(ROOT, elRel, "actions"))) {
    fail(
      `${elRel}/actions: pasta com nome errado. Ações de elemento vão em ${elRel}/element_actions (uma pasta "actions" na raiz do repositório é outra coisa: server-side actions).`
    );
  }

  for (const js of ["initialize.js", "update.js", "preview.js", "reset.js"]) {
    checkJs(`${elRel}/${js}`);
  }
  // O <script> das bibliotecas pode estar no header compartilhado do plugin
  // (html_headers.html na raiz) ou no header do próprio elemento.
  const hasSharedHeader = fs.existsSync(path.join(ROOT, "html_headers.html"));
  const hasElementHeader = fs.existsSync(path.join(ROOT, elRel, "headers.html"));
  if (!hasSharedHeader && !hasElementHeader) {
    warn(`${elRel}: sem headers.html nem html_headers.html — o elemento não carrega bibliotecas externas?`);
  }
  if (hasSharedHeader && hasElementHeader) {
    warn(
      `html_headers.html e ${elRel}/headers.html coexistem — confira se alguma biblioteca não está sendo carregada duas vezes`
    );
  }

  const el = readJson(`${elRel}/params.json`);
  if (!el) continue;

  if (el.actions || el.element_actions) {
    fail(
      `${elRel}/params.json: não declare ações aqui. Cada ação se descreve sozinha em element_actions/<ID-token>/params.json.`
    );
  }
  if (!el.display) fail(`${elRel}/params.json: falta "display" (nome do elemento no editor)`);

  checkFields(el.fields, `${elRel}/params.json`);

  // Eventos: só declaração no params.json, sem pasta própria.
  for (const [evId, ev] of Object.entries(el.events || {})) {
    claimId(evId, `${elRel}/params.json evento "${ev && ev.name}"`);
    if (!ev || !ev.name) fail(`${elRel}/params.json: evento ${evId} não tem "name"`);
    if (!ev || !ev.caption) fail(`${elRel}/params.json: evento ${evId} não tem "caption"`);
  }

  // States: declaração no params.json + pasta com initialization.js.
  const declaredStates = Object.keys(el.states || {});
  for (const [stId, st] of Object.entries(el.states || {})) {
    claimId(stId, `${elRel}/params.json state "${st && st.name}"`);
    if (!st || !st.name) fail(`${elRel}/params.json: state ${stId} não tem "name"`);
    if (!st || !st.value) fail(`${elRel}/params.json: state ${stId} não tem "value" (tipo)`);
  }

  const stateDirs = dirsIn(`${elRel}/states`);
  const stateDirIds = [];
  for (const sd of stateDirs) {
    const sid = checkFolderName(sd, `${elRel}/states`);
    if (sid) stateDirIds.push(sid);
    checkJs(`${elRel}/states/${sd}/initialization.js`);
  }
  for (const sid of declaredStates) {
    if (!stateDirIds.includes(sid)) {
      fail(
        `${elRel}: state ${sid} declarado no params.json mas sem pasta. Crie ${elRel}/states/${folderNameFor(sid)}/initialization.js`
      );
    }
  }
  for (const sid of stateDirIds) {
    if (!declaredStates.includes(sid)) {
      fail(`${elRel}/states/${folderNameFor(sid)}: pasta sem state correspondente em params.json`);
    }
  }

  // Ações do elemento.
  for (const ad of dirsIn(`${elRel}/element_actions`)) {
    const aRel = `${elRel}/element_actions/${ad}`;
    const aid = checkFolderName(ad, `${elRel}/element_actions`);
    if (aid) claimId(aid, `ação ${aRel}`);
    checkJs(`${aRel}/run.js`);
    const a = readJson(`${aRel}/params.json`);
    if (!a) continue;
    if (!a.caption) fail(`${aRel}/params.json: falta "caption" (nome da ação no workflow)`);
    if (a.fields && Object.keys(a.fields).length === 0) {
      warn(`${aRel}/params.json: "fields" vazio — o Bubble omite a chave quando não há campos`);
    }
    checkFields(a.fields, `${aRel}/params.json`);
  }
}

/* ------------------------------------------------------------------ *
 * Resultado
 * ------------------------------------------------------------------ */

for (const w of warnings) console.log(`aviso   ${w}`);
for (const e of errors) console.error(`ERRO    ${e}`);

console.log("");
if (errors.length === 0) {
  const ids = [...seenIds.keys()].sort();
  console.log(`OK — estrutura válida. ${ids.length} IDs em uso, ${warnings.length} aviso(s).`);
  console.log(`Próximo ID livre sugerido: ${nextFreeId(ids)}`);
  process.exit(0);
}
console.error(`FALHOU — ${errors.length} erro(s). Corrija antes de sincronizar com o Bubble.`);
process.exit(1);

/** Sugere o próximo ID do contador, para quem for criar entidades à mão. */
function nextFreeId(ids) {
  if (ids.length === 0) return "AAC";
  const max = Math.max(...ids.map(idValue));
  let v = max + 1;
  const chars = [];
  for (let i = 0; i < 3; i++) {
    chars.unshift(String.fromCharCode((v % 256) + 65));
    v = Math.floor(v / 256);
  }
  return chars.join("");
}
