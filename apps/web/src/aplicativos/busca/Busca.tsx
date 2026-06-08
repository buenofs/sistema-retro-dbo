import { useState, type FormEvent } from 'react';
import type { FiltrosBusca } from '@dbos/shared';
import { useLoja } from '../../areaTrabalho/loja';
import { useBusca, useDepartamentos, useFuncionarios, useProjetos } from './ganchos';
import './busca.css';

export function Busca() {
  const abrirJanela = useLoja((s) => s.abrirJanela);
  const departamentos = useDepartamentos();
  const projetos = useProjetos();
  const funcionarios = useFuncionarios();

  const [nome, setNome] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [salarioOp, setSalarioOp] = useState('');
  const [salario, setSalario] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [relacionadoA, setRelacionadoA] = useState('');

  const [filtros, setFiltros] = useState<FiltrosBusca>({});
  const [pesquisou, setPesquisou] = useState(false);
  const consulta = useBusca(filtros, pesquisou);

  function pesquisar(evento: FormEvent) {
    evento.preventDefault();
    const f: FiltrosBusca = {};
    if (nome) f.nome = nome;
    if (departamentoId) f.departamentoId = Number(departamentoId);
    if (salarioOp && salario) {
      f.salarioOp = salarioOp as FiltrosBusca['salarioOp'];
      f.salario = Number(salario);
    }
    if (projetoId) f.projetoId = Number(projetoId);
    if (relacionadoA) f.relacionadoA = Number(relacionadoA);
    setFiltros(f);
    setPesquisou(true);
  }

  return (
    <div className="busca">
      <form className="busca-criterios" onSubmit={pesquisar}>
        <fieldset>
          <legend>Pesquisar funcionários</legend>
          <div className="field-row-stacked">
            <label htmlFor="b-nome">Nome contém</label>
            <input id="b-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-dep">Departamento</label>
            <select id="b-dep" value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)}>
              <option value="">(qualquer)</option>
              {(departamentos.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-salop">Salário</label>
            <div className="field-row">
              <select id="b-salop" value={salarioOp} onChange={(e) => setSalarioOp(e.target.value)}>
                <option value="">(ignorar)</option>
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
                <option value="eq">=</option>
              </select>
              <input
                aria-label="Valor do salário"
                type="number"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
              />
            </div>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-proj">Projeto</label>
            <select id="b-proj" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
              <option value="">(qualquer)</option>
              {(projetos.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row-stacked">
            <label htmlFor="b-rel">Relacionado a</label>
            <select id="b-rel" value={relacionadoA} onChange={(e) => setRelacionadoA(e.target.value)}>
              <option value="">(ninguém)</option>
              {(funcionarios.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div className="field-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit">Pesquisar</button>
          </div>
        </fieldset>
      </form>

      <div className="busca-resultados">
        {!pesquisou ? (
          <p style={{ padding: 8 }}>Defina os critérios e clique em Pesquisar.</p>
        ) : consulta.isPending ? (
          <p style={{ padding: 8 }}>Pesquisando…</p>
        ) : consulta.isError ? (
          <p style={{ padding: 8, color: 'red' }}>{consulta.error.message}</p>
        ) : (consulta.data ?? []).length === 0 ? (
          <p style={{ padding: 8 }}>Nenhum funcionário encontrado.</p>
        ) : (
          <table className="busca-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Salário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(consulta.data ?? []).map((f) => (
                <tr key={f.id}>
                  <td>{f.nome}</td>
                  <td>{f.cargo}</td>
                  <td>{f.departamento}</td>
                  <td>{f.salario}</td>
                  <td>
                    <button onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}>
                      Abrir na grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
