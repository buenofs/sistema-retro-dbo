import { EditorView, type Extension } from '@uiw/react-codemirror';

export const temaCodeMirror: Extension = EditorView.theme({
  '&': { backgroundColor: 'rgba(255,255,255,0.92)', color: '#0e2a14' },
  '.cm-content': { fontFamily: 'var(--mono)' },
  '.cm-gutters': { backgroundColor: '#eef3f9', color: '#5c6b78', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgba(120,200,255,0.10)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(120,200,255,0.35)',
  },
});
