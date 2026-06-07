import { construirApp } from './app';

const PORTA = Number(process.env.PORTA ?? 3001);

const app = construirApp();

app
  .listen({ port: PORTA, host: '0.0.0.0' })
  .then(() => console.log(`Servidor DBOS ouvindo na porta ${PORTA}`))
  .catch((erro) => {
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  });
