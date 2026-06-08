# DBOS RH — Plano 2: Boot/Logon + Polimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao DBOS cara de SO na entrada e deixar as janelas existentes mais coesas com o domínio RH: uma **tela de boot** (logo + barra de progresso + som) antes do logon, um **diálogo de logon clássico** "Log On to DBOS", o **nome do banco conectado** visível no desktop, a **Grade exibindo views** (read-only) e um **atalho "Relatório"** que abre `vw_FolhaResumo` (checklist "exibição via view").

**Architecture:** O `App` vira uma máquina de estados **boot → login → desktop**: na carga inicial mostra `<TelaBoot>` (timer + som `iniciar`), depois decide login/desktop pela sessão (logout volta ao logon, sem re-boot). O nome do banco vem do contrato de sessão (`UsuarioSessao.banco`, lido de `process.env.SQL_BANCO` no servidor — sem query). A Grade passa a listar tabelas **e** views no seletor; views não têm PK → já caem em somente-leitura (Fase 5). O atalho "Relatório" é um ícone do desktop que chama `abrirJanela('grade', { esquema:'dbo', tabela:'vw_FolhaResumo' })`.

**Tech Stack:** React 18, TanStack Query, Zustand, 98.css, Web Audio (`tocarSom`), Vitest + RTL; servidor Fastify (ajuste pequeno na rota de autenticação). pt-BR; `tsc --noEmit` limpo é gate.

**Builds on Plano 1 + Fases 0–7:** `DBOS_RH` + `SQL_BANCO=DBOS_RH`; `useSessao`/`useLogin` e `TelaLogin` (Fase 1); `App` decide login/desktop; `AreaTrabalho` (desktop com ícones/menu de contexto/sons/diálogos, Fase 7); `GradeDados`/`TabelaGrade` (Fase 5, views já são read-only por não terem PK); `sons.ts` com `tocarSom('iniciar')` (Fase 7); contrato `UsuarioSessao { login }` (shared).

---

### Decisões deste plano

- **Boot só na carga inicial** (estado em `App`, que não desmonta); logout → logon.
- **`TelaBoot` testável**: completa via `setTimeout(onConcluir, DURACAO_BOOT_MS)`; nos testes do `App`, `TelaBoot` é **mockada** para concluir na hora (o timer é testado isoladamente).
- **`UsuarioSessao.banco` obrigatório** (o servidor sempre envia, lendo `SQL_BANCO`). Stubs de teste passam a incluir `banco`.
- **Grade lista views** (read-only); o **atalho "Relatório"** abre `vw_FolhaResumo`.
- Consistência visual mais ampla é incremental — as janelas novas (Planos 3–5) já nascem no padrão; aqui entra um polimento concreto (boot/logon/desktop) + pequenas regras globais.

---

### File structure for this plan

**`apps/web/src`**
- Create `TelaBoot.tsx`, `TelaBoot.css` — tela de boot.
- Test `TelaBoot.test.tsx`.
- Modify `App.tsx` — máquina de estados boot→login→desktop.
- Modify `App.test.tsx` — mock de `TelaBoot` + `banco` nos stubs.
- Modify `autenticacao/TelaLogin.tsx` — diálogo de logon clássico.
- Create `autenticacao/telaLogin.css` — estilo do logon (wallpaper + diálogo).
- Modify `autenticacao/TelaLogin.test.tsx` — botão "OK".
- Modify `areaTrabalho/AreaTrabalho.tsx` — rótulo do banco + atalho "Relatório".
- Modify `areaTrabalho/AreaTrabalho.test.tsx` — `usuario.banco` nos props.
- Modify `areaTrabalho/areaTrabalho.css` — `.rotulo-banco`.
- Modify `aplicativos/grade/GradeDados.tsx` — seletor lista views.
- Modify `aplicativos/grade/GradeDados.test.tsx` — assertar view no seletor.

**`packages/shared/src`**
- Modify `sessao.ts` — `UsuarioSessao.banco`.

**`apps/server/src`**
- Modify `rotas/autenticacao.ts` — `banco` nas respostas de login/sessão.
- Modify `rotas/autenticacao.test.ts` — assertar `banco`.

**`README.md`** — Modify.

---

### Task 0: Tela de boot + máquina de estados do `App` (TDD)

**Files:**
- Create: `apps/web/src/TelaBoot.tsx`, `apps/web/src/TelaBoot.css`
- Test: `apps/web/src/TelaBoot.test.tsx`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`

- [ ] **Step 1: Escrever o teste que falha `apps/web/src/TelaBoot.test.tsx`**

```tsx
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelaBoot, DURACAO_BOOT_MS } from './TelaBoot';

vi.mock('./areaTrabalho/sons', () => ({ tocarSom: vi.fn() }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('chama onConcluir após a duração do boot', () => {
  const espiao = vi.fn();
  render(<TelaBoot onConcluir={espiao} />);
  expect(espiao).not.toHaveBeenCalled();
  vi.advanceTimersByTime(DURACAO_BOOT_MS);
  expect(espiao).toHaveBeenCalledTimes(1);
});

test('mostra a marca DBOS', () => {
  render(<TelaBoot onConcluir={() => {}} />);
  expect(screen.getByText('DBOS')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/TelaBoot.test.tsx`
Expected: FAIL — `Cannot find module './TelaBoot'`.

- [ ] **Step 3: Criar `apps/web/src/TelaBoot.tsx`**

```tsx
import { useEffect } from 'react';
import { tocarSom } from './areaTrabalho/sons';
import './TelaBoot.css';

export const DURACAO_BOOT_MS = 1800;

// Tela de inicialização do "SO": logo + barra de progresso + som de boot.
export function TelaBoot({ onConcluir }: { onConcluir: () => void }) {
  useEffect(() => {
    tocarSom('iniciar');
    const t = setTimeout(onConcluir, DURACAO_BOOT_MS);
    return () => clearTimeout(t);
  }, [onConcluir]);

  return (
    <div className="tela-boot">
      <div className="boot-marca">DBOS</div>
      <div className="boot-sub">Database Operating System</div>
      <div className="boot-barra" role="progressbar" aria-label="Iniciando">
        <div className="boot-progresso" />
      </div>
      <div className="boot-msg">Iniciando...</div>
    </div>
  );
}
```

- [ ] **Step 4: Criar `apps/web/src/TelaBoot.css`**

```css
.tela-boot {
  position: fixed;
  inset: 0;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: 'Pixelated MS Sans Serif', Arial, sans-serif;
}
.boot-marca {
  font-size: 64px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #00a4a4;
  text-shadow: 2px 2px #004f4f;
}
.boot-sub {
  font-size: 13px;
  color: #c0c0c0;
}
.boot-barra {
  width: 280px;
  height: 18px;
  margin-top: 12px;
  border: 2px solid #808080;
  background: #1a1a1a;
  box-shadow: inset 1px 1px #000;
  overflow: hidden;
}
.boot-progresso {
  height: 100%;
  width: 0;
  background: repeating-linear-gradient(90deg, #00a4a4 0 10px, #007a7a 10px 14px);
  animation: boot-encher 1.8s linear forwards;
}
@keyframes boot-encher {
  from { width: 0; }
  to { width: 100%; }
}
.boot-msg {
  font-size: 11px;
  color: #9a9a9a;
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/TelaBoot.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 6: Reescrever `apps/web/src/App.tsx` com a máquina de estados**

```tsx
import { useState } from 'react';
import { useSessao } from './autenticacao/ganchos';
import { TelaBoot } from './TelaBoot';
import { TelaLogin } from './autenticacao/TelaLogin';
import { AreaTrabalho } from './areaTrabalho/AreaTrabalho';

// boot (só na carga inicial) → login → desktop.
export function App() {
  const [bootConcluido, setBootConcluido] = useState(false);
  const sessao = useSessao();

  if (!bootConcluido) return <TelaBoot onConcluir={() => setBootConcluido(true)} />;

  if (sessao.isLoading) {
    return (
      <div className="window" style={{ width: 320, margin: '15vh auto' }}>
        <div className="title-bar">
          <div className="title-bar-text">DBOS</div>
        </div>
        <div className="window-body">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return sessao.data ? <AreaTrabalho usuario={sessao.data} /> : <TelaLogin />;
}
```

- [ ] **Step 7: Atualizar `apps/web/src/App.test.tsx` (mock de TelaBoot + `banco` nos stubs)**

Reescreva o arquivo inteiro:

```tsx
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { useLoja, estadoInicial } from './areaTrabalho/loja';

// O boot é testado isoladamente (TelaBoot.test); aqui concluímos na hora.
vi.mock('./TelaBoot', async () => {
  const { useEffect } = await import('react');
  return {
    TelaBoot: ({ onConcluir }: { onConcluir: () => void }) => {
      useEffect(() => onConcluir(), [onConcluir]);
      return null;
    },
  };
});

beforeEach(() => useLoja.setState(estadoInicial()));
afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  );
}

test('mostra a tela de login quando não há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, erro: { tipo: 'autenticacao', mensagem: 'sem sessão' } }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  expect(await screen.findByLabelText('Login')).toBeInTheDocument();
});

test('mostra a área de trabalho quando há sessão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, dados: { login: 'sa', banco: 'DBOS_RH' } })),
    ),
  );
  renderizar();
  expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
});
```

- [ ] **Step 8: Rodar a suíte web inteira**

Run: `bun --filter @dbos/web test`
Expected: PASS — incluindo `TelaBoot` (2) e `App` (2). (Outros testes podem falhar de tipo se dependerem de `UsuarioSessao` sem `banco` — isso é resolvido no Task 2; nesta etapa o `App.test` já manda `banco` no stub e o `TelaLogin`/`AreaTrabalho` ainda não exigem `banco`.)

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/TelaBoot.tsx apps/web/src/TelaBoot.css apps/web/src/TelaBoot.test.tsx apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): tela de boot + máquina de estados boot→login→desktop"
```

---

### Task 1: Diálogo de logon clássico "Log On to DBOS" (TDD)

**Files:**
- Modify: `apps/web/src/autenticacao/TelaLogin.tsx`
- Create: `apps/web/src/autenticacao/telaLogin.css`
- Modify: `apps/web/src/autenticacao/TelaLogin.test.tsx`

- [ ] **Step 1: Atualizar `apps/web/src/autenticacao/TelaLogin.test.tsx`**

O botão de envio passa a ser "OK". Reescreva o teste (mantém os campos Login/Senha e o alerta):

```tsx
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelaLogin } from './TelaLogin';

afterEach(() => vi.unstubAllGlobals());

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <TelaLogin />
    </QueryClientProvider>,
  );
}

test('mostra mensagem de erro quando o login falha', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          erro: { tipo: 'autenticacao', mensagem: 'Falha no logon: login ou senha inválidos.' },
        }),
        { status: 401 },
      ),
    ),
  );
  renderizar();
  fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'sa' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha no logon');
});

test('Cancelar limpa os campos', () => {
  renderizar();
  const login = screen.getByLabelText('Login') as HTMLInputElement;
  fireEvent.change(login, { target: { value: 'sa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(login.value).toBe('');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/web && bunx vitest run src/autenticacao/TelaLogin.test.tsx`
Expected: FAIL — ainda não há botão "OK"/"Cancelar".

- [ ] **Step 3: Reescrever `apps/web/src/autenticacao/TelaLogin.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useLogin } from './ganchos';
import './telaLogin.css';

// Diálogo de logon estilo Win9x "Log On to DBOS", sobre o wallpaper.
export function TelaLogin() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useLogin();

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    entrar.mutate({ login, senha });
  }

  function cancelar() {
    setLogin('');
    setSenha('');
  }

  return (
    <div className="tela-logon">
      <div className="window logon-janela">
        <div className="title-bar">
          <div className="title-bar-text">Log On to DBOS</div>
        </div>
        <div className="window-body">
          <div className="logon-cabecalho">
            <span className="logon-icone" aria-hidden="true">🔑</span>
            <p style={{ margin: 0 }}>
              Digite seu login e senha do SQL Server para entrar no Database
              Operating System.
            </p>
          </div>
          <form onSubmit={aoEnviar}>
            <div className="field-row" style={{ marginTop: 12 }}>
              <label htmlFor="login" style={{ width: 64 }}>
                Login
              </label>
              <input id="login" value={login} onChange={(e) => setLogin(e.target.value)} />
            </div>
            <div className="field-row" style={{ marginTop: 8 }}>
              <label htmlFor="senha" style={{ width: 64 }}>
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 14, gap: 6 }}>
              <button type="submit" disabled={entrar.isPending}>
                {entrar.isPending ? 'Entrando...' : 'OK'}
              </button>
              <button type="button" onClick={cancelar}>
                Cancelar
              </button>
            </div>
            {entrar.isError && (
              <p role="alert" style={{ color: 'red', marginTop: 8 }}>
                {entrar.error.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar `apps/web/src/autenticacao/telaLogin.css`**

```css
.tela-logon {
  position: fixed;
  inset: 0;
  background: #008080;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logon-janela {
  width: 360px;
}
.logon-cabecalho {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.logon-icone {
  font-size: 32px;
  line-height: 1;
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/web && bunx vitest run src/autenticacao/TelaLogin.test.tsx`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/autenticacao/TelaLogin.tsx apps/web/src/autenticacao/telaLogin.css apps/web/src/autenticacao/TelaLogin.test.tsx
git commit -m "feat(web): diálogo de logon clássico (Log On to DBOS)"
```

---

### Task 2: Nome do banco no contrato de sessão (TDD de integração)

**Files:**
- Modify: `packages/shared/src/sessao.ts`
- Modify: `apps/server/src/rotas/autenticacao.ts`
- Modify: `apps/server/src/rotas/autenticacao.test.ts`

- [ ] **Step 1: Adicionar `banco` ao `UsuarioSessao` em `packages/shared/src/sessao.ts`**

```ts
import type { Resposta } from './respostas';

// Usuário autenticado, exposto ao cliente. NUNCA inclui a senha.
export interface UsuarioSessao {
  login: string;
  banco: string; // nome do banco conectado (SQL_BANCO)
}

// Resposta do login e da checagem de sessão atual.
export type RespostaSessao = Resposta<UsuarioSessao>;
```

- [ ] **Step 2: Atualizar as asserções em `apps/server/src/rotas/autenticacao.test.ts`**

No teste "login com credenciais válidas...", troque a asserção de igualdade para incluir `banco`:

```ts
    expect(await r.json()).toEqual({
      ok: true,
      dados: { login: 'sa', banco: process.env.SQL_BANCO },
    });
```

(Os demais testes que leem `dados.login` seguem válidos.)

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/autenticacao.test.ts`
Expected: FAIL — a resposta ainda não traz `banco`.

- [ ] **Step 4: Incluir `banco` nas respostas em `apps/server/src/rotas/autenticacao.ts`**

Na rota de **login**, troque a montagem da resposta:

```ts
    const resposta: RespostaSessao = {
      ok: true,
      dados: { login: credenciais.login, banco: process.env.SQL_BANCO ?? '' },
    };
    return resposta;
```

Na rota de **sessão** (`GET /api/autenticacao/sessao`):

```ts
    async (req): Promise<RespostaSessao> => {
      return { ok: true, dados: { login: req.sessao!.login, banco: process.env.SQL_BANCO ?? '' } };
    },
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/server && bun test --env-file=../../.env src/rotas/autenticacao.test.ts`
Expected: PASS — todos os testes de autenticação (com `banco`).

- [ ] **Step 6: Confirmar a suíte do servidor**

Run: `bun --filter @dbos/server test`
Expected: PASS — tudo.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/sessao.ts apps/server/src/rotas/autenticacao.ts apps/server/src/rotas/autenticacao.test.ts
git commit -m "feat(server): expõe o nome do banco na sessão (UsuarioSessao.banco)"
```

---

### Task 3: Desktop mostra o banco + atalho "Relatório" + Grade lista views (TDD)

**Files:**
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.tsx`
- Modify: `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`
- Modify: `apps/web/src/areaTrabalho/areaTrabalho.css`
- Modify: `apps/web/src/aplicativos/grade/GradeDados.tsx`
- Modify: `apps/web/src/aplicativos/grade/GradeDados.test.tsx`

- [ ] **Step 1: Reescrever `apps/web/src/areaTrabalho/AreaTrabalho.tsx`**

Acrescenta o rótulo do banco e o atalho "Relatório" (abre `vw_FolhaResumo` na Grade); mantém menus de contexto e sons da Fase 7.

```tsx
import type { UsuarioSessao } from '@dbos/shared';
import { ORDEM_APPS, registroApps } from './registroApps';
import { useLoja } from './loja';
import { type ItemMenu, useMenuContexto } from './useMenuContexto';
import { usarSonsJanelas } from './usarSonsJanelas';
import { CamadaJanelas } from './CamadaJanelas';
import { BarraTarefas } from './BarraTarefas';
import { GerenciadorDialogos } from './GerenciadorDialogos';
import { MenuContexto } from './MenuContexto';
import './areaTrabalho.css';

const RELATORIO = { esquema: 'dbo', tabela: 'vw_FolhaResumo' };

export function AreaTrabalho({ usuario }: { usuario: UsuarioSessao }) {
  usarSonsJanelas();
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const abrirMenu = useMenuContexto((s) => s.abrir);

  return (
    <div
      className="area-trabalho"
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const itens: ItemMenu[] = ORDEM_APPS.map((tipo) => ({
          rotulo: `Abrir ${registroApps[tipo].titulo}`,
          aoClicar: () => abrirJanela(tipo),
        }));
        abrirMenu(e.clientX, e.clientY, itens);
      }}
    >
      <div className="icones-area">
        {ORDEM_APPS.map((tipo) => (
          <button
            key={tipo}
            className="icone-atalho"
            onDoubleClick={() => abrirJanela(tipo)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              abrirMenu(e.clientX, e.clientY, [
                { rotulo: 'Abrir', aoClicar: () => abrirJanela(tipo) },
              ]);
            }}
          >
            <span className="icone-atalho-glifo" aria-hidden="true">
              {registroApps[tipo].icone}
            </span>
            <span className="icone-atalho-rotulo">{registroApps[tipo].titulo}</span>
          </button>
        ))}
        <button
          className="icone-atalho"
          onDoubleClick={() => abrirJanela('grade', RELATORIO)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirMenu(e.clientX, e.clientY, [
              { rotulo: 'Abrir', aoClicar: () => abrirJanela('grade', RELATORIO) },
            ]);
          }}
        >
          <span className="icone-atalho-glifo" aria-hidden="true">📄</span>
          <span className="icone-atalho-rotulo">Relatório (Folha)</span>
        </button>
      </div>
      <CamadaJanelas />
      <div className="rotulo-banco" aria-hidden="true">
        {usuario.banco}
      </div>
      <BarraTarefas login={usuario.login} />
      <GerenciadorDialogos />
      <MenuContexto />
    </div>
  );
}
```

- [ ] **Step 2: Acrescentar `.rotulo-banco` ao final de `apps/web/src/areaTrabalho/areaTrabalho.css`**

```css
/* Marca d'água com o banco conectado, acima da barra de tarefas */
.rotulo-banco {
  position: absolute;
  right: 8px;
  bottom: 38px;
  color: #ffffff;
  opacity: 0.7;
  font-size: 11px;
  text-shadow: 1px 1px #000;
  pointer-events: none;
}
```

- [ ] **Step 3: Atualizar `apps/web/src/areaTrabalho/AreaTrabalho.test.tsx`**

Os props de `usuario` agora exigem `banco`. Atualize o `renderizar` (e acrescente uma asserção do rótulo e do atalho):

```tsx
function renderizar() {
  return render(<AreaTrabalho usuario={{ login: 'sa', banco: 'DBOS_RH' }} />);
}
```

E acrescente ao final do arquivo:

```tsx
test('mostra o nome do banco conectado e o atalho de Relatório', () => {
  const { getByText } = renderizar();
  expect(getByText('DBOS_RH')).toBeInTheDocument();
  expect(getByText('Relatório (Folha)')).toBeInTheDocument();
});
```

(Os dois testes existentes de menu de contexto seguem válidos — o menu do desktop continua vindo de `ORDEM_APPS`.)

- [ ] **Step 4: Grade lista views em `apps/web/src/aplicativos/grade/GradeDados.tsx`**

No `SeletorTabela`, troque o filtro só-tabelas por listar **tabelas e views** (ícone distinto):

```tsx
function SeletorTabela({ aoEscolher }: { aoEscolher: (r: RefTabela) => void }) {
  const consulta = useObjetos();
  if (consulta.isPending) return <p style={{ padding: 8 }}>Carregando tabelas…</p>;
  if (consulta.isError) return <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>;
  const objetos = consulta.data ?? [];
  return (
    <div style={{ padding: 8 }}>
      <p>Escolha uma tabela ou view:</p>
      <ul className="tree-view">
        {objetos.map((o) => (
          <li key={`${o.esquema}.${o.nome}`}>
            <button onClick={() => aoEscolher({ esquema: o.esquema, tabela: o.nome })}>
              {o.tipo === 'view' ? '🔎' : '▦'} {o.esquema}.{o.nome}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Atualizar `apps/web/src/aplicativos/grade/GradeDados.test.tsx`**

No teste do seletor (sem tabela pré-selecionada), inclua uma **view** no stub de `/api/explorador/objetos` e asserte que ela aparece. Localize o stub que devolve `[{ esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' }]` e troque por:

```ts
        JSON.stringify({
          ok: true,
          dados: [
            { esquema: 'dbo', nome: 'Clientes', tipo: 'tabela' },
            { esquema: 'dbo', nome: 'vw_FolhaResumo', tipo: 'view' },
          ],
        }),
```

E acrescente, no mesmo teste, após a asserção existente do `dbo.Clientes`:

```tsx
  expect(await screen.findByText(/vw_FolhaResumo/)).toBeInTheDocument();
```

- [ ] **Step 6: Checar tipos e rodar a suíte web**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros (todos os `usuario={{...}}` agora incluem `banco`).

Run: `bun --filter @dbos/web test`
Expected: PASS — `AreaTrabalho` (3) e `GradeDados` (2) atualizados, e todo o resto.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/areaTrabalho/AreaTrabalho.tsx apps/web/src/areaTrabalho/AreaTrabalho.test.tsx apps/web/src/areaTrabalho/areaTrabalho.css apps/web/src/aplicativos/grade/GradeDados.tsx apps/web/src/aplicativos/grade/GradeDados.test.tsx
git commit -m "feat(web): desktop mostra o banco + atalho Relatório + Grade lista views"
```

---

### Task 4: Verificação completa + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checar tipos do web (garantia)**

Run: `cd apps/web && bunx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 2: Documentar no `README.md`**

Acrescente, ao final da seção do desktop, uma linha:

```markdown

Ao abrir, o sistema mostra uma **tela de boot** e depois o diálogo **"Log On to
DBOS"**. O desktop exibe o nome do banco conectado e um atalho **Relatório (Folha)**
que abre a view `vw_FolhaResumo`. A Grade lista tabelas e views (views em modo
somente-leitura).
```

- [ ] **Step 3: Rodar a suíte inteira do monorepo**

Run: `bun run test`
Expected: tudo verde — `@dbos/shared`, `@dbos/server` (autenticação com `banco`), `@dbos/web` (+ TelaBoot, App/TelaLogin/AreaTrabalho/GradeDados atualizados). Pré-requisito: `bun run db:setup`. Falhas SÓ por conexão SQL = ambiente.

- [ ] **Step 4: Verificar no navegador**

Em dois terminais:
```bash
bun run dev:server   # :3001
bun run dev:web      # :5173
```
Confirme: a **tela de boot** (logo DBOS + barra + som) aparece, depois o diálogo
**Log On to DBOS** sobre o wallpaper teal; logar leva ao desktop com o rótulo
**DBOS_RH** no canto e o atalho **Relatório (Folha)**; o atalho abre a Grade na
view `vw_FolhaResumo` (somente leitura); o seletor da Grade lista tabelas e views;
sair (menu Iniciar) volta ao **logon** (sem re-boot).

Pare ambos com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README — boot/logon e polimento do desktop (Plano 2)"
```

---

## Self-Review

**Spec coverage (Plano 2 / spec §6, §7, §10.2):**
- Máquina de estados boot→login→desktop + BootScreen com som (spec §6) → Task 0. ✓
- Diálogo de logon clássico "Log On to DBOS" sobre o wallpaper (spec §6) → Task 1. ✓
- Desktop exibe o banco conectado (spec §7) → Tasks 2–3 (`UsuarioSessao.banco` + `.rotulo-banco`). ✓
- Grade exibe views (spec §7) → Task 3 (`SeletorTabela`). ✓
- Atalho "Relatório" abre `vw_FolhaResumo` (spec §7, checklist) → Task 3. ✓
- Logout volta ao logon, sem re-boot (spec §6) → Task 0 (estado em `App`). ✓

**Placeholder scan:** Sem TBD/TODO; código completo em cada passo.

**Type consistency:** `UsuarioSessao` ganha `banco` (Task 2) e todos os consumidores passam a fornecê-lo: `App.test`/`AreaTrabalho.test` stubs e o `AreaTrabalho` exibe `usuario.banco`. `TelaBoot`/`DURACAO_BOOT_MS` (Task 0) usados por `App` e pelo seu teste isolado. `RELATORIO` usa `abrirJanela('grade', { esquema, tabela })`, formato que `GradeDados.refInicial` já lê. `SeletorTabela` continua chamando `aoEscolher({ esquema, tabela })`. ✓

**Riscos/observações:**
- `TelaBoot` é mockada no `App.test` (concluir imediato via `useEffect`); o timer real é coberto pelo `TelaBoot.test` com fake timers.
- Tornar `UsuarioSessao.banco` obrigatório quebra qualquer stub sem `banco` — os testes afetados (`App`, `AreaTrabalho`, integração de autenticação) são atualizados nesta entrega; `tsc` no Task 3 confirma que nada ficou para trás.
- Views na Grade já são somente-leitura (sem PK → regra da Fase 5), então não há novo caminho de escrita.
- Consistência visual mais ampla é incremental; as janelas dos Planos 3–5 nascem já no padrão.
- O som de boot é silencioso no jsdom (sem Web Audio) e mockado nos testes.
