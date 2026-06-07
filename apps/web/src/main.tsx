import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TelaInicial } from './TelaInicial';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <TelaInicial />
  </StrictMode>,
);
