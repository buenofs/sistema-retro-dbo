import { z } from 'zod';

export const esquemaCredenciais = z.object({
  login: z.string().min(1, 'Informe o login.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

export type Credenciais = z.infer<typeof esquemaCredenciais>;
