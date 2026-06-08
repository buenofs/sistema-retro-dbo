-- DBOS_RH — schema RH idempotente (dropa e recria objetos + reseed).
IF DB_ID('DBOS_RH') IS NULL CREATE DATABASE DBOS_RH;
GO
USE DBOS_RH;
GO

-- Dropar na ordem de dependência (idempotência)
IF OBJECT_ID('dbo.vw_AnomaliasFolha', 'V') IS NOT NULL DROP VIEW dbo.vw_AnomaliasFolha;
IF OBJECT_ID('dbo.vw_FolhaResumo', 'V') IS NOT NULL DROP VIEW dbo.vw_FolhaResumo;
IF OBJECT_ID('dbo.FolhaPagamento', 'U') IS NOT NULL DROP TABLE dbo.FolhaPagamento;
IF OBJECT_ID('dbo.FuncionariosProjetos', 'U') IS NOT NULL DROP TABLE dbo.FuncionariosProjetos;
IF OBJECT_ID('dbo.Funcionarios', 'U') IS NOT NULL DROP TABLE dbo.Funcionarios;
IF OBJECT_ID('dbo.Projetos', 'U') IS NOT NULL DROP TABLE dbo.Projetos;
IF OBJECT_ID('dbo.Departamentos', 'U') IS NOT NULL DROP TABLE dbo.Departamentos;
GO

CREATE TABLE dbo.Departamentos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(80) NOT NULL,
  centroCusto VARCHAR(20) NULL
);
CREATE TABLE dbo.Projetos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  dataInicio DATE NULL
);
CREATE TABLE dbo.Funcionarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(100) NOT NULL,
  cargo NVARCHAR(60) NULL,
  salario DECIMAL(10,2) NOT NULL DEFAULT 0,
  dataAdmissao DATE NULL,
  departamentoId INT NOT NULL
    CONSTRAINT FK_Funcionarios_Departamento REFERENCES dbo.Departamentos(id)
);
CREATE TABLE dbo.FuncionariosProjetos (
  funcionarioId INT NOT NULL
    CONSTRAINT FK_FP_Funcionario REFERENCES dbo.Funcionarios(id) ON DELETE CASCADE,
  projetoId INT NOT NULL
    CONSTRAINT FK_FP_Projeto REFERENCES dbo.Projetos(id) ON DELETE CASCADE,
  papel NVARCHAR(40) NULL,
  CONSTRAINT PK_FuncionariosProjetos PRIMARY KEY (funcionarioId, projetoId)
);
CREATE TABLE dbo.FolhaPagamento (
  id INT IDENTITY(1,1) PRIMARY KEY,
  funcionarioId INT NOT NULL
    CONSTRAINT FK_Folha_Funcionario REFERENCES dbo.Funcionarios(id) ON DELETE CASCADE,
  competencia CHAR(7) NOT NULL, -- 'AAAA-MM'
  salarioBase DECIMAL(10,2) NOT NULL,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  descontos DECIMAL(10,2) NOT NULL DEFAULT 0,
  salarioLiquido DECIMAL(10,2) NOT NULL
);
GO

CREATE INDEX IX_Funcionarios_departamentoId ON dbo.Funcionarios(departamentoId);
CREATE INDEX IX_Folha_funcionarioId ON dbo.FolhaPagamento(funcionarioId);
CREATE INDEX IX_FP_projetoId ON dbo.FuncionariosProjetos(projetoId);
GO

-- Seed com IDs fixos (determinístico para os testes)
SET IDENTITY_INSERT dbo.Departamentos ON;
INSERT INTO dbo.Departamentos (id, nome, centroCusto) VALUES
  (1, 'Engenharia', 'CC-100'),
  (2, 'Financeiro', 'CC-200'),
  (3, 'Recursos Humanos', 'CC-300');
SET IDENTITY_INSERT dbo.Departamentos OFF;

SET IDENTITY_INSERT dbo.Projetos ON;
INSERT INTO dbo.Projetos (id, nome, status, dataInicio) VALUES
  (1, 'DBOS', 'Ativo', '2026-01-10'),
  (2, 'Folha2026', 'Ativo', '2026-02-01'),
  (3, 'Intranet', 'Planejado', '2026-03-15');
SET IDENTITY_INSERT dbo.Projetos OFF;

SET IDENTITY_INSERT dbo.Funcionarios ON;
INSERT INTO dbo.Funcionarios (id, nome, cargo, salario, dataAdmissao, departamentoId) VALUES
  (1, 'Felipe Bueno',   'Desenvolvedor Sr', 12000.00, '2025-06-01', 1),
  (2, 'Ana Souza',      'Desenvolvedora',    9000.00, '2025-08-12', 1),
  (3, 'Bruno Lima',     'Tech Lead',        15000.00, '2024-03-20', 1),
  (4, 'Carla Dias',     'Analista Fin.',     8000.00, '2025-01-05', 2),
  (5, 'Diego Alves',    'Contador',         11000.00, '2023-11-30', 2),
  (6, 'Elaine Rocha',   'Analista RH',       7000.00, '2025-09-01', 3),
  (7, 'Fabio Nunes',    'Gerente RH',       13000.00, '2022-07-15', 3),
  (8, 'Gabi Martins',   'Estagiária',        2500.00, '2026-02-01', 1);
SET IDENTITY_INSERT dbo.Funcionarios OFF;

INSERT INTO dbo.FuncionariosProjetos (funcionarioId, projetoId, papel) VALUES
  (1, 1, 'Backend'),   -- Felipe em DBOS
  (1, 3, 'Backend'),   -- Felipe em Intranet
  (2, 1, 'Frontend'),
  (3, 1, 'Líder'),
  (5, 2, 'Financeiro'),
  (6, 3, 'RH');

-- Folha: várias competências; a última do Felipe é ANÔMALA (liquido != base+bonus-descontos)
INSERT INTO dbo.FolhaPagamento (funcionarioId, competencia, salarioBase, bonus, descontos, salarioLiquido) VALUES
  (1, '2026-04', 12000.00, 1000.00, 2000.00, 11000.00),  -- ok
  (1, '2026-05', 12000.00, 1000.00, 2000.00,  9000.00),  -- ANÔMALA (deveria ser 11000)
  (2, '2026-05',  9000.00,  500.00, 1500.00,  8000.00),  -- ok
  (3, '2026-05', 15000.00, 2000.00, 3000.00, 14000.00);  -- ok
GO

CREATE VIEW dbo.vw_FolhaResumo AS
  SELECT f.id AS funcionarioId,
         f.nome AS funcionario,
         f.cargo,
         d.nome AS departamento,
         f.salario,
         fp.competencia AS ultimaCompetencia,
         fp.salarioLiquido AS ultimoLiquido
  FROM dbo.Funcionarios f
  JOIN dbo.Departamentos d ON d.id = f.departamentoId
  OUTER APPLY (
    SELECT TOP 1 competencia, salarioLiquido
    FROM dbo.FolhaPagamento fpx
    WHERE fpx.funcionarioId = f.id
    ORDER BY competencia DESC
  ) fp;
GO

CREATE VIEW dbo.vw_AnomaliasFolha AS
  SELECT fp.id,
         f.nome AS funcionario,
         fp.competencia,
         fp.salarioBase, fp.bonus, fp.descontos, fp.salarioLiquido,
         (fp.salarioBase + fp.bonus - fp.descontos) AS liquidoEsperado
  FROM dbo.FolhaPagamento fp
  JOIN dbo.Funcionarios f ON f.id = fp.funcionarioId
  WHERE fp.salarioLiquido <> fp.salarioBase + fp.bonus - fp.descontos;
GO
