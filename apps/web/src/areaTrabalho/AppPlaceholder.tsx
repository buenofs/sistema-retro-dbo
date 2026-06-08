import type { PropsApp } from './tipos';

// Placeholder usado pelos 4 apps na Fase 2; os apps reais chegam nas Fases 3–6.
export function AppPlaceholder({ janela }: PropsApp) {
  return (
    <div style={{ padding: 8 }}>
      <p style={{ marginTop: 0 }}>{janela.titulo}</p>
      <p style={{ fontSize: 11, color: '#444' }}>
        Este aplicativo chega numa fase futura.
      </p>
    </div>
  );
}
