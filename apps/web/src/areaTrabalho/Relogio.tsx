import { useEffect, useState } from 'react';

function horaAtual() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function Relogio() {
  const [hora, setHora] = useState(horaAtual);
  useEffect(() => {
    const t = setInterval(() => setHora(horaAtual()), 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relogio" aria-label="Relógio">
      {hora}
    </div>
  );
}
