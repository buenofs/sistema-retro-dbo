import { useEffect } from 'react';
import { tocarSom } from './areaTrabalho/sons';
import './TelaBoot.css';

export const DURACAO_BOOT_MS = 1800;

export function TelaBoot({ onConcluir }: { onConcluir: () => void }) {
  useEffect(() => {
    tocarSom('iniciar');
    const t = setTimeout(onConcluir, DURACAO_BOOT_MS);
    return () => clearTimeout(t);
  }, [onConcluir]);

  return (
    <div className="tela-boot">
      <div className="boot-marca">DBOS</div>
      <div className="boot-sub">Database Operating System</div>
      <div className="boot-barra" role="progressbar" aria-label="Iniciando">
        <div className="boot-progresso" />
      </div>
      <div className="boot-msg">Iniciando...</div>
    </div>
  );
}
