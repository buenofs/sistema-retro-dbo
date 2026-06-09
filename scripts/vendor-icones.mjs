// Vendoriza ícones por pele:
//   98  -> @react95/icons (jsDelivr), tiers 16/32, image pixelado
//   aero -> tema XP B00merang (raw GitHub), hi-res, suavizado
// Uso: node scripts/vendor-icones.mjs
// Saída: apps/web/src/tema/icones/assets/{98,aero}/<nome>...png
//        + _contato.html (folha de contato) + _cobertura.json (relatório)
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(RAIZ, 'apps/web/src/tema/icones/assets');
const REACT95 = 'https://cdn.jsdelivr.net/npm/@react95/icons@2.5.0';
const R95_LISTA = 'https://data.jsdelivr.com/v1/packages/npm/@react95/icons@2.5.0?structure=flat';
const XP_RAW = 'https://raw.githubusercontent.com/B00merang-Artwork/Windows-XP/master';
const XP_TREE = 'https://api.github.com/repos/B00merang-Artwork/Windows-XP/git/trees/master?recursive=1';

// Palavras-chave por nome, em ordem de prioridade (1ª = match forte).
// react95: casadas contra o BASE name (antes de _WxH_D), minúsculo.
const KW_98 = {
  folder:['folder'], folderOpen:['folderopen','folder'],
  sql:['database','odbc','sql','filetext'], grid:['columns','table','grid'],
  props:['filesettings','filetextsettings','settings'], search:['filefind','find','search'],
  network:['microsoftnetwork','network','globe'], terminal:['msdos','command','terminal','console'],
  report:['doc','report','chart'], database:['database','drvspace','disk','odbc'],
  computer:['computer'], table:['columns','table','grid'],
  view:['eye','view','filefind','find'], column:['columns','column'],
  key:['key'], run:['run','exec','play','application'],
  save:['save','floppy','drvspace','disk'], insert:['billadd','add','insert','new'],
  edit:['filepen','filepencil','pen','pencil','edit'], trash:['delete','recycle','trash'],
  refresh:['refresh','reload','sync'], filter:['filter','funnel'],
  newdoc:['blankscreen','doc','blank','new'], stop:['forbidden','filecorrupted','stop','error'],
  clock:['date','dial','clock','time'], speaker:['mmsys','speaker','volume','sound','mplayer'],
  wifi:['microsoftnetwork','inetcfg','inetcpl','network','globe'], power:['power','shutdown'],
  logoff:['logoff','logout','key'], user:['user','people','person','account'],
  help:['helpbook','help'], star:['fave','bookmark','star','favorite'],
};
// XP: casadas contra o STEM do arquivo (sem extensão), minúsculo, em 128x128/**.
const KW_AERO = {
  folder:['gtk-directory','folder'], folderOpen:['folder-open','folder_open','folder'],
  sql:['libreoffice-base','ooo-base','phppg','database'], grid:['x-office-spreadsheet','libreoffice-calc','gnometris','table'],
  props:['document-properties','gtk-properties','cs-details','preferences-system'], search:['system-search','edit-find','kfind','gnome-searchtool','find'],
  network:['network-workgroup','gnome-remote-desktop','cs-network','network'], terminal:['gnome-terminal','terminal','openterm'],
  report:['x-office-document','libreoffice-writer','document'], database:['drive-harddisk','libreoffice-base','server'],
  computer:['computer','gnome-fs-client'], table:['x-office-spreadsheet','libreoffice-calc'],
  view:['document-print-preview','edit-find','view'], column:['x-office-spreadsheet','format-columns'],
  key:['seahorse','key_bindings','keybindings','key'], run:['system-run','gnome-run','run'],
  save:['document-save','media-floppy','gtk-save'], insert:['list-add','gtk-add','add'],
  edit:['accessories-text-editor','text-editor','gedit','gtk-edit'], trash:['user-trash','gtk-delete','edit-delete','trash'],
  refresh:['view-refresh','gtk-refresh','stock_refresh','reload'], filter:['view-filter','filter','funnel'],
  newdoc:['document-new','gtk-new','stock_new'], stop:['process-stop','gtk-stop','dialog-error','stop'],
  clock:['gnome-panel-clock','cairo-clock','clock','time'], speaker:['audio-volume-high','multimedia-volume-control','gnome-volume-control','speaker'],
  wifi:['network-wireless','nm-device-wireless','wifi','network'], power:['system-shutdown','gnome-power-manager','cs-power','power'],
  logoff:['system-log-out','gnome-logout','logout'], user:['system-users','config-users','stock_people','cs-user-accounts','user'],
  help:['help-browser','help-index','khelpcenter','help'], star:['bookmark-new','bookmark','emblem-favorite','starred','favorite'],
};
const NOMES = Object.keys(KW_98);

const txt = async (u) => (await fetch(u)).text();
const json = async (u) => JSON.parse(await txt(u));
const PNG_MAGIC = [0x89,0x50,0x4e,0x47];

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

async function vendor98(cobertura) {
  const lista = await json(R95_LISTA);
  const pngs = lista.files.map((f) => f.name).filter((n) => /\.png$/i.test(n) && /_(16x16|32x32)_\d\.png$/.test(n));
  // index: base -> { 16: arquivo, 32: arquivo } preferindo depth 8 > 4
  const idx = {};
  for (const n of pngs) {
    const m = n.match(/\/png\/(.+)_(16x16|32x32)_(\d)\.png$/);
    if (!m) continue;
    const [, base, dim, depth] = m;
    const tier = dim === '16x16' ? '16' : '32';
    idx[base] ??= {};
    const prev = idx[base][tier];
    if (!prev || Number(depth) > prev.depth) idx[base][tier] = { arquivo: n, depth: Number(depth) };
  }
  const bases = Object.keys(idx);
  await mkdir(join(DEST, '98'), { recursive: true });
  for (const nome of NOMES) {
    const esc = escolher(bases, KW_98[nome]);
    if (!esc) { cobertura.push({ pele:'98', nome, status:'FALTA', via:null }); continue; }
    const base = esc.stem;
    for (const tier of ['16','32']) {
      let alvo = idx[base][tier];
      if (!alvo) alvo = idx[base]['32'] || idx[base]['16']; // fallback de tier
      const buf = await baixarPng(REACT95 + alvo.arquivo);
      if (buf) await writeFile(join(DEST, '98', `${nome}-${tier}.png`), buf);
    }
    cobertura.push({ pele:'98', nome, status: esc.prioridade === 0 ? 'OK' : 'REVISAR', via: base, kw: KW_98[nome][esc.prioridade] });
  }
}

async function vendorAero(cobertura) {
  const tree = await json(XP_TREE);
  const paths = tree.tree.map((t) => t.path).filter((p) => /^128x128\/.+\.png$/i.test(p));
  const stems = paths.map((p) => p.replace(/^128x128\//, '').replace(/\.png$/i, '')); // ex.: apps/system-search
  await mkdir(join(DEST, 'aero'), { recursive: true });
  for (const nome of NOMES) {
    const esc = escolher(stems, KW_AERO[nome]);
    if (!esc) { cobertura.push({ pele:'aero', nome, status:'FALTA', via:null }); continue; }
    const buf = await baixarPng(`${XP_RAW}/128x128/${esc.stem}.png`);
    if (buf) await writeFile(join(DEST, 'aero', `${nome}.png`), buf);
    cobertura.push({ pele:'aero', nome, status: esc.prioridade === 0 ? 'OK' : 'REVISAR', via: esc.stem, kw: KW_AERO[nome][esc.prioridade] });
  }
}

function folhaContato() {
  const linhas = NOMES.map((n) => `
    <tr><td>${n}</td>
      <td class=c98><img src="98/${n}-16.png"><img src="98/${n}-32.png"></td>
      <td class=caero><img src="aero/${n}.png"></td></tr>`).join('');
  return `<!doctype html><meta charset=utf8><title>Ícones — folha de contato</title>
<style>body{background:#1a1a1a;color:#eee;font:14px system-ui}img{margin:4px;vertical-align:middle}
table{border-collapse:collapse}td{padding:8px 12px;border-top:1px solid #333}
.c98{background:#c3c7cb}.caero{background:linear-gradient(#eef5fc,#d4e6f7)}
.c98 img{image-rendering:pixelated}.caero img{width:48px;height:48px}</style>
<h2>Folha de contato (98 = pixelado, aero = suave)</h2><table>
<tr><th>nome</th><th>98 (16/32)</th><th>aero</th></tr>${linhas}</table>`;
}

const cobertura = [];
await vendor98(cobertura);
await vendorAero(cobertura);
await writeFile(join(DEST, '_cobertura.json'), JSON.stringify(cobertura, null, 2));
await writeFile(join(DEST, '_contato.html'), folhaContato());
const revisar = cobertura.filter((c) => c.status !== 'OK');
console.log(`Gerados ${cobertura.length} registros. A revisar (${revisar.length}):`);
for (const c of revisar) console.log(`  [${c.pele}] ${c.nome} -> ${c.status} (${c.via ?? 'sem match'})`);
console.log('Abra apps/web/src/tema/icones/assets/_contato.html no navegador.');
