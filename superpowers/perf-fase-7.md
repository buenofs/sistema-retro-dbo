# Verificação de Performance — Fase 7

Checklist das práticas da spec §2.3, com onde cada uma vive no código.

- [x] **React.memo no chrome da janela** — `apps/web/src/areaTrabalho/Janela.tsx` (`export const Janela = memo(...)`). Mover uma janela não re-renderiza as outras.
- [x] **Seletores Zustand por janela** — `Janela.tsx` seleciona `s.janelas.find((j) => j.id === id)`; `CamadaJanelas.tsx` seleciona só a lista de ids via `useShallow`. Mover/redimensionar uma janela não re-renderiza a camada.
- [x] **React.memo em item de lista** — `apps/web/src/aplicativos/explorador/NoTabela.tsx` (adicionado nesta fase): filtrar o Explorador não re-renderiza nós cujo `objeto` não mudou.
- [x] **React.lazy + Suspense por app** — `registroApps.tsx` carrega `EditorConsultas` via `lazy(() => import(...))`; `Janela.tsx` envolve o app em `<Suspense>`. O CodeMirror só baixa ao abrir o Editor.
- [x] **Virtualização de lista** — `apps/web/src/aplicativos/consulta/GradeResultado.tsx` usa `@tanstack/react-virtual` para resultados ilimitados.
- [x] **Paginação no servidor** — `apps/web/src/aplicativos/grade/TabelaGrade.tsx` + `apps/server/src/bd/consultasGrade.ts` (`OFFSET/FETCH`); o Editor aplica teto de linhas (`SQL_MAX_LINHAS`).
- [x] **Debounce em filtro** — `apps/web/src/aplicativos/explorador/usarValorDebounced.ts` no filtro do Explorador.
- [x] **Arrasto/redimensionamento em rAF** — `apps/web/src/areaTrabalho/usarArrasto.ts` (batelada por `requestAnimationFrame`).
- [x] **Persistência de layout (localStorage)** — `apps/web/src/areaTrabalho/loja.ts` com `persist` (Fase 2).

Conclusão: todas as práticas da spec §2.3 estão presentes; esta fase acrescentou a memoização do nó da árvore.
