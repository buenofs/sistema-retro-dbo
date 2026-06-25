import { construirApp } from './app';

const PORTA = Number(process.env.PORTA ?? 3001);
const INTERVALO_LIMPEZA_MS = 60_000;

const app = construirApp();

const limpeza = setInterval(() => {
  void app.pools.limparExpiradas(Date.now());
}, INTERVALO_LIMPEZA_MS);
limpeza.unref?.();

app
  .listen({ port: PORTA, host: '0.0.0.0' })
  .then(() => console.log(`Servidor DBOS ouvindo na porta ${PORTA}`))
  .catch((erro) => {
    clearInterval(limpeza);
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  });
