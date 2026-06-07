import '98.css';

// Placeholder da tela de boot. A autenticação real chega na Fase 1.
export function TelaInicial() {
  return (
    <div className="window" style={{ width: 320, margin: '15vh auto' }}>
      <div className="title-bar">
        <div className="title-bar-text">DBOS</div>
      </div>
      <div className="window-body">
        <p>Database Operating System</p>
        <p>Iniciando o sistema...</p>
      </div>
    </div>
  );
}
