-- DBOS_SISTEMA — sistema de arquivos sobre banco. Idempotente (dropa e recria).
IF DB_ID('DBOS_SISTEMA') IS NULL CREATE DATABASE DBOS_SISTEMA;
GO
USE DBOS_SISTEMA;
GO

-- Dropar na ordem de dependência (idempotência).
IF OBJECT_ID('dbo.vw_Lixeira','V') IS NOT NULL DROP VIEW dbo.vw_Lixeira;
IF OBJECT_ID('dbo.vw_UsoPorDrive','V') IS NOT NULL DROP VIEW dbo.vw_UsoPorDrive;
IF OBJECT_ID('dbo.vw_UsoPorUsuario','V') IS NOT NULL DROP VIEW dbo.vw_UsoPorUsuario;
IF OBJECT_ID('dbo.vw_ArvoreItens','V') IS NOT NULL DROP VIEW dbo.vw_ArvoreItens;
IF OBJECT_ID('dbo.Itens','U') IS NOT NULL DROP TABLE dbo.Itens;
IF OBJECT_ID('dbo.Usuarios','U') IS NOT NULL DROP TABLE dbo.Usuarios;
IF OBJECT_ID('dbo.Drives','U') IS NOT NULL DROP TABLE dbo.Drives;
GO

CREATE TABLE dbo.Drives (
  id INT IDENTITY(1,1) PRIMARY KEY,
  letra CHAR(1) NOT NULL CONSTRAINT UQ_Drives_letra UNIQUE,
  rotulo NVARCHAR(50) NOT NULL,
  capacidadeBytes BIGINT NOT NULL
);

CREATE TABLE dbo.Usuarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  login NVARCHAR(50) NOT NULL CONSTRAINT UQ_Usuarios_login UNIQUE,
  nome NVARCHAR(100) NOT NULL
);

CREATE TABLE dbo.Itens (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL
    CONSTRAINT CK_Itens_tipo CHECK (tipo IN ('pasta','arquivo')),
  paiId INT NULL
    CONSTRAINT FK_Itens_pai REFERENCES dbo.Itens(id),
  driveId INT NOT NULL
    CONSTRAINT FK_Itens_drive REFERENCES dbo.Drives(id),
  donoId INT NOT NULL
    CONSTRAINT FK_Itens_dono REFERENCES dbo.Usuarios(id),
  conteudo NVARCHAR(MAX) NULL,
  tamanhoBytes AS (DATALENGTH(conteudo)),
  criadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  modificadoEm DATETIME2 NULL,
  naLixeira BIT NOT NULL DEFAULT 0
);
GO

-- Nome único dentro da mesma pasta, só entre itens vivos (índice filtrado).
-- driveId entra na chave para distinguir raízes (paiId NULL) de drives diferentes.
CREATE UNIQUE INDEX UQ_Itens_local ON dbo.Itens(driveId, paiId, nome) WHERE naLixeira = 0;
CREATE INDEX IX_Itens_paiId ON dbo.Itens(paiId);
CREATE INDEX IX_Itens_driveId ON dbo.Itens(driveId);
GO

-- Caminho completo + profundidade via CTE recursiva.
CREATE VIEW dbo.vw_ArvoreItens AS
WITH arvore AS (
  SELECT i.id, i.nome, i.tipo, i.paiId, i.driveId, i.donoId, i.naLixeira,
         CAST(d.letra + ':\' + i.nome AS NVARCHAR(4000)) AS caminho,
         0 AS profundidade
  FROM dbo.Itens i
  JOIN dbo.Drives d ON d.id = i.driveId
  WHERE i.paiId IS NULL AND i.naLixeira = 0
  UNION ALL
  SELECT f.id, f.nome, f.tipo, f.paiId, f.driveId, f.donoId, f.naLixeira,
         CAST(a.caminho + '\' + f.nome AS NVARCHAR(4000)),
         a.profundidade + 1
  FROM dbo.Itens f
  JOIN arvore a ON f.paiId = a.id WHERE f.naLixeira = 0
)
SELECT id, nome, tipo, paiId, driveId, donoId, naLixeira, caminho, profundidade
FROM arvore;
GO

CREATE VIEW dbo.vw_UsoPorUsuario AS
  SELECT u.id AS usuarioId, u.nome AS usuario,
         COUNT(i.id) AS itens,
         ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS bytes
  FROM dbo.Usuarios u
  LEFT JOIN dbo.Itens i ON i.donoId = u.id AND i.naLixeira = 0
  GROUP BY u.id, u.nome;
GO

CREATE VIEW dbo.vw_UsoPorDrive AS
  SELECT d.id AS driveId, d.letra, d.rotulo, d.capacidadeBytes,
         ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS usadoBytes,
         d.capacidadeBytes - ISNULL(SUM(CAST(i.tamanhoBytes AS BIGINT)), 0) AS livreBytes
  FROM dbo.Drives d
  LEFT JOIN dbo.Itens i ON i.driveId = d.id AND i.naLixeira = 0
  GROUP BY d.id, d.letra, d.rotulo, d.capacidadeBytes;
GO

CREATE VIEW dbo.vw_Lixeira AS
  SELECT i.id, i.nome, i.tipo, i.paiId, i.driveId, i.donoId,
         CAST(i.tamanhoBytes AS BIGINT) AS tamanhoBytes, i.modificadoEm
  FROM dbo.Itens i
  WHERE i.naLixeira = 1;
GO

-- Seed determinístico.
SET IDENTITY_INSERT dbo.Drives ON;
INSERT INTO dbo.Drives (id, letra, rotulo, capacidadeBytes) VALUES
  (1, 'C', 'Sistema', 549755813888),
  (2, 'D', 'Dados',  1099511627776);
SET IDENTITY_INSERT dbo.Drives OFF;

SET IDENTITY_INSERT dbo.Usuarios ON;
INSERT INTO dbo.Usuarios (id, login, nome) VALUES
  (1, 'felipe',  'Felipe Bueno'),
  (2, 'ana',     'Ana Souza'),
  (3, 'sistema', 'Sistema');
SET IDENTITY_INSERT dbo.Usuarios OFF;

SET IDENTITY_INSERT dbo.Itens ON;
INSERT INTO dbo.Itens (id, nome, tipo, paiId, driveId, donoId, conteudo) VALUES
  (1, 'Windows',     'pasta',   NULL, 1, 3, NULL),
  (2, 'Usuarios',    'pasta',   NULL, 1, 3, NULL),
  (3, 'Felipe',      'pasta',   2,    1, 1, NULL),
  (4, 'Documentos',  'pasta',   3,    1, 1, NULL),
  (5, 'leiame.txt',  'arquivo', 4,    1, 1, N'Bem-vindo ao DBOS.'),
  (6, 'notas.txt',   'arquivo', 4,    1, 1, N'Comprar pao.'),
  (7, 'System32',    'pasta',   1,    1, 3, NULL),
  (8, 'config.sys',  'arquivo', 1,    1, 3, N'REM config'),
  (9, 'Backup',      'pasta',   NULL, 2, 1, NULL);
SET IDENTITY_INSERT dbo.Itens OFF;
GO
