import { useEffect, useState } from 'react';

function horaAtual() {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2, '0');
  const mm = String(agora.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function Relogio() {
  const [hora, setHora] = useState(horaAtual);
  useEffect(() => {
    const timer = setInterval(() => setHora(horaAtual()), 10_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="relogio" aria-label="Relógio">
      {hora}
    </div>
  );
}
