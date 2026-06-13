# SO de Arquivos — Fase 4: Monitor SQL + remoção do RH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o Monitor SQL ao vivo (painel que mostra cada comando executado, com prévia resolvida) alimentado automaticamente por todas as respostas da API, e remover em definitivo o domínio RH (web, server, shared) agora que nada mais o referencia.

**Architecture:** Toda resposta que traz `dados.sql` é empurrada para um store Zustand (`useLojaLogSQL`) dentro do cliente HTTP central — nenhum app precisa de código especial. O Monitor apenas assina o store. A remoção do RH é feita por último, com a árvore de dependências já livre.

**Tech Stack:** React 18, Zustand, Vitest + Testing Library.

**Pré-requisito:** Fases 1–3 concluídas.

---

## File Structure

- Create: `apps/web/src/aplicativos/monitor/lojaLog.ts` — store do log SQL.
- Create: `apps/web/src/aplicativos/monitor/resolver.ts` — prévia resolvida (puro).
- Create: `apps/web/src/aplicativos/monitor/MonitorSQL.tsx` — o painel.
- Create: `apps/web/src/aplicativos/monitor/monitor.css` — estilos.
- Modify: `apps/web/src/api/cliente.ts` — empurra `dados.sql` para o store.
- Modify: `apps/web/src/areaTrabalho/tipos.ts`, `registroApps.tsx` — registra Monitor; remove RH.
- Delete (RH): web `aplicativos/{folha,busca,relacionamentos}`; server `rotas/{busca,relacionamentos,folha,dominio}` + `bd/consultas{Busca,Folha,Relacionamentos,Dominio}`; shared `{dominio,busca,relacionamentos,folha}`.

---

## Task 1: Store do log + prévia resolvida

**Files:**
- Create: `apps/web/src/aplicativos/monitor/lojaLog.ts`
- Create: `apps/web/src/aplicativos/monitor/resolver.ts`
- Create (test): `apps/web/src/aplicativos/monitor/resolver.test.ts`
- Create (test): `apps/web/src/aplicativos/monitor/lojaLog.test.ts`

- [ ] **Step 1: Escrever os testes**

`apps/web/src/aplicativos/monitor/resolver.test.ts`:

```typescript
import { test, expect } from 'vitest';
import { resolverSQL } from './resolver';

test('substitui parâmetros por literais', () => {
  const sql = 'INSERT INTO dbo.Itens (nome, paiId) VALUES (@nome, @pai)';
  expect(resolverSQL(sql, { nome: 'Docs', pai: 3 })).toBe(
    "INSERT INTO dbo.Itens (nome, paiId) VALUES ('Docs', 3)",
  );
});

test('NULL e escapa aspas', () => {
  expect(resolverSQL('SET x = @a, y = @b', { a: null, b: "O'Brien" })).toBe("SET x = NULL, y = 'O''Brien'");
});

test('mantém @param desconhecido', () => {
  expect(resolverSQL('WHERE id = @id', {})).toBe('WHERE id = @id');
});
```

`apps/web/src/aplicativos/monitor/lojaLog.test.ts`:

```typescript
import { test, expect, beforeEach } from 'vitest';
import { useLojaLogSQL } from './lojaLog';
import type { ComandoSQL } from '@dbos/shared';

const cmd = (acao: string): ComandoSQL => ({ acao, tipo: 'INSERT', texto: 'INSERT ...', parametros: {}, linhasAfetadas: 1, em: '2026-06-13T00:00:00Z' });

beforeEach(() => useLojaLogSQL.getState().limpar());

test('registrar acumula comandos', () => {
  useLojaLogSQL.getState().registrar([cmd('a'), cmd('b')]);
  expect(useLojaLogSQL.getState().comandos.map((c) => c.acao)).toEqual(['a', 'b']);
});

test('pausado ignora novos comandos', () => {
  useLojaLogSQL.getState().alternarPausa();
  useLojaLogSQL.getState().registrar([cmd('x')]);
  expect(useLojaLogSQL.getState().comandos).toHaveLength(0);
  useLojaLogSQL.getState().alternarPausa();
});

test('limpar zera', () => {
  useLojaLogSQL.getState().registrar([cmd('a')]);
  useLojaLogSQL.getState().limpar();
  expect(useLojaLogSQL.getState().comandos).toHaveLength(0);
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/monitor`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar `resolver.ts`**

```typescript
// Substitui @parametros pelos literais, para leitura humana no Monitor.
export function resolverSQL(texto: string, parametros: Record<string, unknown>): string {
  return texto.replace(/@(\w+)/g, (achado, nome: string) => {
    if (!(nome in parametros)) return achado;
    const v = parametros[nome];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}
```

- [ ] **Step 4: Implementar `lojaLog.ts`**

```typescript
import { create } from 'zustand';
import type { ComandoSQL } from '@dbos/shared';

const MAX = 200;

interface LojaLogSQL {
  comandos: ComandoSQL[];
  pausado: boolean;
  registrar: (cmds: ComandoSQL[]) => void;
  limpar: () => void;
  alternarPausa: () => void;
}

export const useLojaLogSQL = create<LojaLogSQL>((set) => ({
  comandos: [],
  pausado: false,
  registrar: (cmds) =>
    set((s) => (s.pausado || cmds.length === 0 ? s : { comandos: [...s.comandos, ...cmds].slice(-MAX) })),
  limpar: () => set({ comandos: [] }),
  alternarPausa: () => set((s) => ({ pausado: !s.pausado })),
}));
```

- [ ] **Step 5: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/monitor`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/aplicativos/monitor/lojaLog.ts apps/web/src/aplicativos/monitor/resolver.ts apps/web/src/aplicativos/monitor/*.test.ts
git commit -m "feat(web): store do log SQL + prévia resolvida"
```

---

## Task 2: Alimentar o log no cliente HTTP

**Files:**
- Modify: `apps/web/src/api/cliente.ts`
- Modify (test): `apps/web/src/api/cliente.test.ts`

- [ ] **Step 1: Escrever o teste do efeito colateral**

Acrescentar ao `apps/web/src/api/cliente.test.ts`:

```typescript
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

test('requisitar empurra dados.sql para o Monitor', async () => {
  useLojaLogSQL.getState().limpar();
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ ok: true, dados: { dados: { id: 1 }, sql: [{ acao: 'Criar pasta', tipo: 'INSERT', texto: 'INSERT ...', parametros: {}, linhasAfetadas: 1, em: 'x' }] } }), { status: 200 }),
  ));
  await requisitar('/api/arquivos/pasta', { method: 'POST', body: '{}' });
  expect(useLojaLogSQL.getState().comandos).toHaveLength(1);
  expect(useLojaLogSQL.getState().comandos[0]!.acao).toBe('Criar pasta');
});
```

(Garanta que `requisitar` e `vi` já estão importados no topo do arquivo de teste; se não, adicione `import { requisitar } from './cliente';` e `import { vi, test, expect } from 'vitest';` conforme o estilo existente.)

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/api/cliente.test.ts`
Expected: FAIL (o log fica vazio).

- [ ] **Step 3: Modificar `cliente.ts`**

Adicionar o import no topo e o push após o parse. Arquivo completo:

```typescript
import type { ComandoSQL, Resposta } from '@dbos/shared';
import { useLojaLogSQL } from '../aplicativos/monitor/lojaLog';

// Faz uma requisição à API e devolve sempre o contrato Resposta<T>.
// credentials: 'include' garante o envio do cookie de sessão.
// Efeito: respostas que trazem `dados.sql` alimentam o Monitor SQL automaticamente.
export async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<Resposta<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      credentials: 'include',
      ...opcoes,
      headers: { 'content-type': 'application/json', ...opcoes.headers },
    });
  } catch {
    return { ok: false, erro: { tipo: 'rede', mensagem: 'Não foi possível falar com o servidor.' } };
  }

  let parsed: Resposta<T>;
  try {
    parsed = (await resposta.json()) as Resposta<T>;
  } catch {
    return { ok: false, erro: { tipo: 'interno', mensagem: 'Resposta inválida do servidor.' } };
  }

  // Captura central do SQL (vale para sucesso e para erro com `sql`).
  const corpo = (parsed as { dados?: { sql?: unknown }; sql?: unknown });
  const sql = (corpo.dados && (corpo.dados as { sql?: unknown }).sql) ?? corpo.sql;
  if (Array.isArray(sql)) useLojaLogSQL.getState().registrar(sql as ComandoSQL[]);

  return parsed;
}
```

> Nota: erros de validação/SQL nas rotas de arquivos também trazem `sql` no corpo (ver Fase 1, função `tratar`), por isso a captura olha tanto `dados.sql` (sucesso) quanto `sql` no topo (erro). Assim o Monitor mostra também a constraint rejeitando o comando.

- [ ] **Step 4: Rodar os testes do cliente**

Run: `cd apps/web && npx vitest run src/api/cliente.test.ts`
Expected: PASS (incluindo os testes pré-existentes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/cliente.ts apps/web/src/api/cliente.test.ts
git commit -m "feat(web): cliente HTTP alimenta o Monitor SQL automaticamente"
```

---

## Task 3: Painel Monitor SQL

**Files:**
- Create: `apps/web/src/aplicativos/monitor/MonitorSQL.tsx`
- Create: `apps/web/src/aplicativos/monitor/monitor.css`
- Create (test): `apps/web/src/aplicativos/monitor/MonitorSQL.test.tsx`

- [ ] **Step 1: Escrever o teste**

`apps/web/src/aplicativos/monitor/MonitorSQL.test.tsx`:

```typescript
import { test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonitorSQL } from './MonitorSQL';
import { useLojaLogSQL } from './lojaLog';
import type { ComandoSQL } from '@dbos/shared';

const cmd = (acao: string, tipo: ComandoSQL['tipo']): ComandoSQL => ({
  acao, tipo, texto: 'INSERT INTO dbo.Itens (nome) VALUES (@nome)', parametros: { nome: 'Docs' }, linhasAfetadas: 1, em: '2026-06-13T10:00:00Z',
});

beforeEach(() => useLojaLogSQL.getState().limpar());

test('mostra a ação e a prévia resolvida', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT')]);
  render(<MonitorSQL />);
  expect(screen.getByText('Criar pasta')).toBeInTheDocument();
  expect(screen.getByText(/VALUES \('Docs'\)/)).toBeInTheDocument();
});

test('filtro por tipo esconde os demais', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT'), cmd('Apagar', 'DELETE')]);
  render(<MonitorSQL />);
  fireEvent.click(screen.getByLabelText('Filtrar DELETE'));
  expect(screen.queryByText('Criar pasta')).not.toBeInTheDocument();
  expect(screen.getByText('Apagar')).toBeInTheDocument();
});

test('limpar zera a lista', () => {
  useLojaLogSQL.getState().registrar([cmd('Criar pasta', 'INSERT')]);
  render(<MonitorSQL />);
  fireEvent.click(screen.getByText('Limpar'));
  expect(screen.queryByText('Criar pasta')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar para falhar**

Run: `cd apps/web && npx vitest run src/aplicativos/monitor/MonitorSQL.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `monitor.css`**

```css
.mon { display: flex; flex-direction: column; height: 100%; font-size: 12px; }
.mon-barra { display: flex; gap: 6px; align-items: center; padding: 4px; border-bottom: 1px solid var(--borda, #888); flex-wrap: wrap; }
.mon-lista { flex: 1; overflow: auto; font-family: monospace; }
.mon-linha { padding: 4px 6px; border-bottom: 1px solid var(--borda-fraca, #ddd); }
.mon-cab { display: flex; gap: 8px; align-items: center; }
.mon-badge { padding: 0 6px; border-radius: 3px; color: #fff; font-size: 10px; }
.mon-INSERT { background: #2e7d32; }
.mon-UPDATE { background: #1565c0; }
.mon-DELETE { background: #c62828; }
.mon-SELECT { background: #6a1b9a; }
.mon-erro { color: #c62828; }
.mon-sql { white-space: pre-wrap; opacity: 0.85; margin-top: 2px; }
```

- [ ] **Step 4: Implementar `MonitorSQL.tsx`**

```typescript
import { useState } from 'react';
import type { TipoComando } from '@dbos/shared';
import { useLojaLogSQL } from './lojaLog';
import { resolverSQL } from './resolver';
import './monitor.css';

const TIPOS: TipoComando[] = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'];

export function MonitorSQL() {
  const comandos = useLojaLogSQL((s) => s.comandos);
  const pausado = useLojaLogSQL((s) => s.pausado);
  const limpar = useLojaLogSQL((s) => s.limpar);
  const alternarPausa = useLojaLogSQL((s) => s.alternarPausa);
  const [ocultos, setOcultos] = useState<Set<TipoComando>>(new Set());

  function alternarTipo(t: TipoComando) {
    setOcultos((s) => {
      const n = new Set(s);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  }

  const visiveis = comandos.filter((c) => !ocultos.has(c.tipo));

  return (
    <div className="mon">
      <div className="mon-barra">
        {TIPOS.map((t) => (
          <label key={t} aria-label={`Filtrar ${t}`}>
            <input type="checkbox" checked={!ocultos.has(t)} onChange={() => alternarTipo(t)} /> {t}
          </label>
        ))}
        <button onClick={alternarPausa}>{pausado ? 'Retomar' : 'Pausar'}</button>
        <button onClick={limpar}>Limpar</button>
        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{visiveis.length} comando(s)</span>
      </div>
      <div className="mon-lista">
        {visiveis.map((c, i) => (
          <div key={i} className="mon-linha">
            <div className="mon-cab">
              <span className={`mon-badge mon-${c.tipo}`}>{c.tipo}</span>
              <strong>{c.acao}</strong>
              <span style={{ opacity: 0.6 }}>{c.em.slice(11, 19)}</span>
              {c.erro ? <span className="mon-erro">erro: {c.erro}</span> : <span style={{ opacity: 0.6 }}>{c.linhasAfetadas} linha(s)</span>}
              <button
                style={{ marginLeft: 'auto' }}
                onClick={() => void navigator.clipboard?.writeText(resolverSQL(c.texto, c.parametros))}
              >
                Copiar SQL
              </button>
            </div>
            <div className="mon-sql">{resolverSQL(c.texto, c.parametros)}</div>
          </div>
        ))}
        {visiveis.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>(sem comandos — faça uma ação no SO)</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar para passar**

Run: `cd apps/web && npx vitest run src/aplicativos/monitor/MonitorSQL.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 6: Registrar o Monitor no WM**

Em `tipos.ts`, adicionar `'monitor'` ao `TipoApp`. Em `registroApps.tsx`:

```typescript
import { MonitorSQL } from '../aplicativos/monitor/MonitorSQL';
```

```typescript
  monitor: {
    titulo: 'Monitor SQL',
    icone: 'report',
    tamanhoInicial: { largura: 620, altura: 420 },
    componente: MonitorSQL,
  },
```

Adicionar `'monitor'` ao `ORDEM_APPS` (logo após `'terminal'`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/aplicativos/monitor/MonitorSQL.tsx apps/web/src/aplicativos/monitor/monitor.css apps/web/src/aplicativos/monitor/MonitorSQL.test.tsx apps/web/src/areaTrabalho/tipos.ts apps/web/src/areaTrabalho/registroApps.tsx
git commit -m "feat(web): painel Monitor SQL ao vivo registrado no WM"
```

---

## Task 4: Remover o domínio RH (web, server, shared)

Agora nada referencia o RH (Terminal e registro já migrados). Remoção em três frentes; rode os testes ao fim.

**Files:** ver listas abaixo.

- [ ] **Step 1: Remover os apps RH do web e do registro**

Em `apps/web/src/areaTrabalho/tipos.ts`, deixar o `TipoApp` final assim:

```typescript
export type TipoApp =
  | 'consulta'
  | 'explorador'
  | 'grade'
  | 'propriedades'
  | 'terminal'
  | 'arquivos'
  | 'bloco'
  | 'lixeira'
  | 'monitor';
```

Em `apps/web/src/areaTrabalho/registroApps.tsx`: remover os imports e as entradas `busca`, `relacionamentos`, `relatorio`, e tirá-los de `ORDEM_APPS`. `ORDEM_APPS` final:

```typescript
export const ORDEM_APPS: TipoApp[] = [
  'arquivos',
  'explorador',
  'consulta',
  'grade',
  'propriedades',
  'terminal',
  'monitor',
  'lixeira',
];
```

Deletar diretórios e testes:

```bash
git rm -r apps/web/src/aplicativos/folha apps/web/src/aplicativos/busca apps/web/src/aplicativos/relacionamentos
```

- [ ] **Step 2: Remover o backend RH**

```bash
git rm apps/server/src/rotas/busca.ts apps/server/src/rotas/relacionamentos.ts apps/server/src/rotas/folha.ts apps/server/src/rotas/dominio.ts
git rm apps/server/src/rotas/busca.test.ts apps/server/src/rotas/relacionamentos.test.ts apps/server/src/rotas/folha.test.ts apps/server/src/rotas/dominio.test.ts
git rm apps/server/src/bd/consultasBusca.ts apps/server/src/bd/consultasFolha.ts apps/server/src/bd/consultasRelacionamentos.ts apps/server/src/bd/consultasDominio.ts
```

Em `apps/server/src/app.ts`, remover os imports e as chamadas de `registrarRotasBusca`, `registrarRotasRelacionamentos`, `registrarRotasFolha`, `registrarRotasDominio`. O bloco de registro final:

```typescript
  app.register(async (instancia) => {
    await registrarSessao(instancia);
    registrarRotasAutenticacao(instancia, gerenciador);
    registrarRotasExplorador(instancia, gerenciador);
    registrarRotasConsulta(instancia, gerenciador);
    registrarRotasGrade(instancia, gerenciador);
    registrarRotasPropriedades(instancia, gerenciador);
    registrarRotasArquivos(instancia, gerenciador);
  });
```

- [ ] **Step 3: Remover os módulos RH do shared**

```bash
git rm packages/shared/src/dominio.ts packages/shared/src/busca.ts packages/shared/src/relacionamentos.ts packages/shared/src/folha.ts
git rm packages/shared/src/busca.test.ts packages/shared/src/relacionamentos.test.ts
```

`packages/shared/src/index.ts` final:

```typescript
export * from './respostas';
export * from './credenciais';
export * from './sessao';
export * from './explorador';
export * from './consulta';
export * from './grade';
export * from './propriedades';
export * from './arquivos';
```

- [ ] **Step 4: Caçar referências remanescentes**

Run: `git grep -nE "folha|busca|relacionamentos|Funcionario|Departamento|FolhaPagamento" -- apps packages | grep -viE "\.md$"`
Expected: nenhuma referência em código (apenas, talvez, em docs/planos). Se aparecer alguma, remova/ajuste o import correspondente.

- [ ] **Step 5: Rodar TODAS as suítes**

Run: `bun --filter @dbos/shared test && bun --filter @dbos/server test && bun --filter @dbos/web test`
Expected: PASS em todas. Sem módulos órfãos.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove o domínio RH (web/server/shared) após migração para SO de arquivos"
```

---

## Task 5: Branding (limpeza de textos de RH)

**Files:** variáveis (boot/logon/menus).

- [ ] **Step 1: Localizar textos de RH**

Run: `git grep -niE "recursos humanos|folha de pagamento|funcion[aá]rio|RH" -- apps/web/src`
Expected: lista de ocorrências em telas de boot/login/menus.

- [ ] **Step 2: Ajustar a cópia**

Para cada ocorrência, trocar por texto coerente com o SO de arquivos (ex.: subtítulo do boot "DBOS — Disco e Banco como Sistema Operacional", remover menção a RH). Manter o nome "DBOS". Editar os arquivos apontados (provavelmente `TelaBoot.tsx`, `autenticacao/TelaLogin.tsx`, `MenuIniciar.tsx`).

- [ ] **Step 3: Rodar os testes que tocam essas telas**

Run: `cd apps/web && npx vitest run src/TelaBoot.test.tsx src/autenticacao/TelaLogin.test.tsx src/areaTrabalho/MenuIniciar.test.tsx`
Expected: PASS (ajuste expectativas de texto nos testes se elas verificavam strings de RH).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): branding do SO de arquivos (remove textos de RH)"
```

---

## Task 6: Verificação fim-a-fim e fechamento

- [ ] **Step 1: Roteiro de demonstração (manual, app no ar)**

Com `bun dev:server` e `bun dev:web`:
1. Abrir **Monitor SQL** e o **Explorador de Arquivos** lado a lado.
2. Criar pasta → ver `INSERT` no Monitor (com prévia resolvida).
3. Criar arquivo, renomear (`UPDATE`), mover por arrastar (`UPDATE paiId`), copiar/colar (`INSERT`), apagar (`UPDATE naLixeira=1`).
4. Abrir a **Lixeira** → Restaurar (`UPDATE`) e Esvaziar (`DELETE`).
5. No **Terminal**: `mkdir`, `cd`, `ls`, `echo ... > a.txt`, `cat a.txt` — todos refletidos no Monitor.
6. Provocar erro: criar duas pastas com o mesmo nome → diálogo amigável + comando com `erro` no Monitor (constraint rejeitando).
7. No **Explorador de Objetos**, abrir `dbo.Itens` e as views `vw_ArvoreItens`/`vw_UsoPorDrive` para o professor ver o modelo real.

Expected: cada ação aparece no Monitor com o SQL correto; tudo persiste no banco.

- [ ] **Step 2: Merge da branch (opcional)**

```bash
git checkout main && git merge --no-ff feat/so-arquivos
```

(Só quando você validar o roteiro acima.)

---

## Self-Review (preenchido)

- **Cobertura da spec (Seção 5 — Monitor e erros; Seção 6 — remoção e branding):** store + prévia (Task 1), captura central no cliente incl. erros (Task 2), painel com filtros/pausa/limpar/copiar (Task 3), remoção total do RH (Task 4), branding (Task 5), roteiro de demo (Task 6). ✔
- **Sem placeholders:** todo step com código tem código completo; ícones reaproveitam nomes existentes (`report` p/ Monitor, `trash` p/ Lixeira, `folder`/`newdoc` p/ itens) — sem assets novos pendentes. ✔
- **Consistência de tipos:** `ComandoSQL`/`TipoComando` (shared) usados no store, no cliente e no painel; `resolverSQL` compartilhado entre Monitor (exibe) e botão Copiar; `useLojaLogSQL` é a única fonte do log. ✔
- **Ordem de remoção:** o RH só sai após Terminal (Fase 3) e registro (Tasks 1–3 desta fase) pararem de referenciá-lo — build verde em cada passo. ✔
- **Decisão de ícones:** optei por reusar ícones existentes em vez de adicionar `drive`/`monitor` e criar PNGs por pele (98/Aero) — evita um passo manual de assets e não compromete a leitura. Se quiser ícones dedicados depois, é um incremento isolado em `nomes.ts` + `assets/`.
```
