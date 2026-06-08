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
