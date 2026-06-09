import { useState, type FormEvent } from 'react';
import type { FiltrosBusca } from '@dbos/shared';
import { useLoja } from '../../areaTrabalho/loja';
import { useBusca, useDepartamentos, useFuncionarios, useProjetos } from './ganchos';
import { Icone } from '../../tema/icones/Icone';
import { formatarMoeda } from '../grade/conversao';
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
          <>
            <p style={{ margin: 0, padding: '4px 8px' }}>
              Resultados
              <span className="busca-contagem">{(consulta.data ?? []).length}</span>
            </p>
            <div className="busca-cards">
              {(consulta.data ?? []).map((f) => (
                <div key={f.id} className="busca-card">
                  <Icone nome="user" tamanho={28} alt="" />
                  <div className="busca-card-corpo">
                    <div className="busca-card-nome">{f.nome}</div>
                    <div className="busca-card-sub">
                      {f.cargo} · {f.departamento} · {formatarMoeda(f.salario)}
                    </div>
                  </div>
                  <div className="busca-card-acoes">
                    <button
                      className="busca-botao-icone"
                      onClick={() => abrirJanela('grade', { esquema: 'dbo', tabela: 'Funcionarios' })}
                    >
                      <Icone nome="grid" tamanho={16} alt="" /> Grade
                    </button>
                    <button
                      className="busca-botao-icone"
                      onClick={() => abrirJanela('relacionamentos', { tipo: 'funcionario', id: f.id })}
                    >
                      <Icone nome="network" tamanho={16} alt="" /> Relações
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
