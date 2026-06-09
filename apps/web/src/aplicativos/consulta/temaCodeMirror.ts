import { EditorView, type Extension } from '@uiw/react-codemirror';
import type { Pele } from '../../tema/tipos';

// Tema mínimo por pele: Aero = claro/arejado; 98 = clássico chapado.
const aero = EditorView.theme({
  '&': { backgroundColor: 'rgba(255,255,255,0.92)', color: '#0e2a14' },
  '.cm-content': { fontFamily: 'var(--mono)' },
  '.cm-gutters': { backgroundColor: '#eef3f9', color: '#5c6b78', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgba(120,200,255,0.10)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(120,200,255,0.35)',
  },
});

const win98 = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#101010' },
  '.cm-content': { fontFamily: 'var(--mono)' },
  '.cm-gutters': { backgroundColor: '#c0c0c0', color: '#222', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#eef3fb' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#b8d0ff',
  },
});

export function temaCodeMirror(pele: Pele): Extension {
  return pele === 'aero' ? aero : win98;
}
