// Vendoriza os ícones do tema (aero) a partir do tema XP B00merang (raw GitHub),
// hi-res e suavizado. Rode manualmente para (re)baixar os assets:
//   node scripts/vendor-icones.mjs
// Saída: apps/web/src/tema/icones/assets/aero/<nome>.png
//        + _contato.html (folha de contato) + _cobertura.json (relatório)
// Os PNGs já ficam versionados no repositório — este script é só a trilha de
// origem/licença e serve para regenerá-los quando necessário.
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(RAIZ, 'apps/web/src/tema/icones/assets');
const XP_RAW = 'https://raw.githubusercontent.com/B00merang-Artwork/Windows-XP/master';
const XP_TREE = 'https://api.github.com/repos/B00merang-Artwork/Windows-XP/git/trees/master?recursive=1';

// Palavras-chave por nome, em ordem de prioridade (1ª = match forte).
// Casadas contra o STEM do arquivo (sem extensão), minúsculo, em 128x128/**.
const KW_AERO = {
  folder: ['gtk-directory', 'folder'],
  folderOpen: ['folder-open', 'folder_open', 'folder'],
  sql: ['libreoffice-base', 'ooo-base', 'phppg', 'database'],
  grid: ['x-office-spreadsheet', 'libreoffice-calc', 'gnometris', 'table'],
  props: ['document-properties', 'gtk-properties', 'cs-details', 'preferences-system'],
  search: ['system-search', 'edit-find', 'kfind', 'gnome-searchtool', 'find'],
  network: ['network-workgroup', 'gnome-remote-desktop', 'cs-network', 'network'],
  terminal: ['gnome-terminal', 'terminal', 'openterm'],
  report: ['x-office-document', 'libreoffice-writer', 'document'],
  database: ['drive-harddisk', 'libreoffice-base', 'server'],
  computer: ['computer', 'gnome-fs-client'],
  table: ['x-office-spreadsheet', 'libreoffice-calc'],
  view: ['document-print-preview', 'edit-find', 'view'],
  column: ['x-office-spreadsheet', 'format-columns'],
  key: ['seahorse', 'key_bindings', 'keybindings', 'key'],
  run: ['system-run', 'gnome-run', 'run'],
  save: ['document-save', 'media-floppy', 'gtk-save'],
  insert: ['list-add', 'gtk-add', 'add'],
  edit: ['accessories-text-editor', 'text-editor', 'gedit', 'gtk-edit'],
  trash: ['user-trash', 'gtk-delete', 'edit-delete', 'trash'],
  refresh: ['view-refresh', 'gtk-refresh', 'stock_refresh', 'reload'],
  filter: ['view-filter', 'filter', 'funnel'],
  newdoc: ['document-new', 'gtk-new', 'stock_new'],
  stop: ['process-stop', 'gtk-stop', 'dialog-error', 'stop'],
  clock: ['gnome-panel-clock', 'cairo-clock', 'clock', 'time'],
  speaker: ['audio-volume-high', 'multimedia-volume-control', 'gnome-volume-control', 'speaker'],
  wifi: ['network-wireless', 'nm-device-wireless', 'wifi', 'network'],
  power: ['system-shutdown', 'gnome-power-manager', 'cs-power', 'power'],
  logoff: ['system-log-out', 'gnome-logout', 'logout'],
  user: ['system-users', 'config-users', 'stock_people', 'cs-user-accounts', 'user'],
  help: ['help-browser', 'help-index', 'khelpcenter', 'help'],
  star: ['bookmark-new', 'bookmark', 'emblem-favorite', 'starred', 'favorite'],
};
const NOMES = Object.keys(KW_AERO);

// Overrides manuais (pinam o STEM exato, ignorando o matcher) — definidos após
// revisão visual da folha de contato. Valor = caminho COMPLETO relativo ao
// master, incluindo o tamanho: '<WxH>/<subpasta>/<stem>' (sem .png). Permite
// usar tamanhos != 128x128, já que muitos stems só existem em 48x48.
const OVR_AERO = {
  column: '48x48/mimetypes/x-office-spreadsheet', // planilha (colunas)
  trash: '48x48/places/user-trash', // lixeira
  refresh: '48x48/apps/view-refresh', // atualizar
  filter: '128x128/places/folder-saved-search', // busca salva = filtro (sem funil no pacote)
  newdoc: '48x48/mimetypes/x-office-document', // documento novo
  logoff: '48x48/apps/system-log-out', // sair da sessão
  grid: '48x48/mimetypes/x-office-spreadsheet', // grade de células
  props: '128x128/apps/cs-details', // propriedades/detalhes
  report: '128x128/apps/libreoffice-writer', // documento/relatório
  table: '128x128/apps/libreoffice-calc', // planilha/tabela
  view: '128x128/apps/edit-find', // lupa sobre documento (visualizar)
  save: '128x128/devices/media-floppy', // disquete (salvar)
  power: '48x48/apps/system-shutdown', // botão liga/desliga
};

const txt = async (u) => (await fetch(u)).text();
const json = async (u) => JSON.parse(await txt(u));
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function baixarPng(url, tentativasSymlink = 5) {
  // Resolve symlinks do raw.githubusercontent (devolve o caminho-alvo como texto).
  let atual = url;
  for (let i = 0; i < tentativasSymlink; i++) {
    const r = await fetch(atual);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ehPng = PNG_MAGIC.every((b, j) => buf[j] === b);
    if (ehPng) return buf;
    // texto curto = provável symlink relativo
    const alvo = buf.toString('utf8').trim();
    if (buf.length < 200 && alvo && !alvo.includes('\n')) {
      atual = new URL(alvo, atual + '').toString();
      continue;
    }
    return null;
  }
  return null;
}

function escolher(stems, kws) {
  // devolve { stem, prioridade } do melhor match; prioridade = índice na lista (0 = forte)
  for (let p = 0; p < kws.length; p++) {
    const kw = kws[p];
    const hit = stems.find((s) => s.toLowerCase().includes(kw));
    if (hit) return { stem: hit, prioridade: p };
  }
  return null;
}

async function vendorAero(cobertura) {
  const tree = await json(XP_TREE);
  const paths = tree.tree.map((t) => t.path).filter((p) => /^128x128\/.+\.png$/i.test(p));
  const stems = paths.map((p) => p.replace(/^128x128\//, '').replace(/\.png$/i, '')); // ex.: apps/system-search
  await mkdir(join(DEST, 'aero'), { recursive: true });
  for (const nome of NOMES) {
    if (OVR_AERO[nome]) {
      // Valor já inclui o tamanho: '<WxH>/<subpasta>/<stem>' relativo ao master.
      const caminho = OVR_AERO[nome];
      const buf = await baixarPng(`${XP_RAW}/${caminho}.png`);
      if (buf) await writeFile(join(DEST, 'aero', `${nome}.png`), buf);
      cobertura.push({ nome, status: 'OVERRIDE', via: caminho });
      continue;
    }
    const esc = escolher(stems, KW_AERO[nome]);
    if (!esc) {
      cobertura.push({ nome, status: 'FALTA', via: null });
      continue;
    }
    const buf = await baixarPng(`${XP_RAW}/128x128/${esc.stem}.png`);
    if (buf) await writeFile(join(DEST, 'aero', `${nome}.png`), buf);
    cobertura.push({
      nome,
      status: esc.prioridade === 0 ? 'OK' : 'REVISAR',
      via: esc.stem,
      kw: KW_AERO[nome][esc.prioridade],
    });
  }
}

function folhaContato() {
  const linhas = NOMES.map(
    (n) => `
    <tr><td>${n}</td><td class=caero><img src="aero/${n}.png"></td></tr>`,
  ).join('');
  return `<!doctype html><meta charset=utf8><title>Ícones — folha de contato</title>
<style>body{background:#1a1a1a;color:#eee;font:14px system-ui}img{margin:4px;vertical-align:middle}
table{border-collapse:collapse}td{padding:8px 12px;border-top:1px solid #333}
.caero{background:linear-gradient(#eef5fc,#d4e6f7)}.caero img{width:48px;height:48px}</style>
<h2>Folha de contato (aero)</h2><table>
<tr><th>nome</th><th>aero</th></tr>${linhas}</table>`;
}

const cobertura = [];
await vendorAero(cobertura);
await writeFile(join(DEST, '_cobertura.json'), JSON.stringify(cobertura, null, 2));
await writeFile(join(DEST, '_contato.html'), folhaContato());
const revisar = cobertura.filter((c) => c.status !== 'OK');
console.log(`Gerados ${cobertura.length} registros. A revisar (${revisar.length}):`);
for (const c of revisar) console.log(`  ${c.nome} -> ${c.status} (${c.via ?? 'sem match'})`);
console.log('Abra apps/web/src/tema/icones/assets/_contato.html no navegador.');
