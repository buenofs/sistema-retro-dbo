import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ProvedorTema } from './tema/ProvedorTema';
import './tema/tokens.css';
import './tema/base.css';

const cliente = new QueryClient();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <ProvedorTema>
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>
    </ProvedorTema>
  </StrictMode>,
);
