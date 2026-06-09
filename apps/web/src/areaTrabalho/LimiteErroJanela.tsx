import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icone } from '../tema/icones/Icone';

interface Props {
  titulo: string;
  children: ReactNode;
}
interface Estado {
  erro: Error | null;
}

// Captura crashes de render do app e mostra um painel retrô, isolando a janela (spec §6.5).
export class LimiteErroJanela extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(_erro: Error, _info: ErrorInfo) {
    // Ponto de log futuro; por ora o painel já comunica o erro ao usuário.
  }

  render() {
    if (this.state.erro) {
      return (
        <div style={{ padding: 12 }}>
          <p>
            <Icone nome="stop" tamanho={16} alt="" style={{ marginRight: 4 }} />
            Este programa executou uma operação ilegal e será encerrado.
          </p>
          <p style={{ fontSize: 11, color: '#555' }}>{this.state.erro.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
