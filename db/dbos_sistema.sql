IF DB_ID('DBOS_SISTEMA') IS NULL CREATE DATABASE DBOS_SISTEMA;
GO
USE DBOS_SISTEMA;
GO

IF OBJECT_ID('dbo.vw_Lixeira', 'V') IS NOT NULL DROP VIEW dbo.vw_Lixeira;
IF OBJECT_ID('dbo.vw_UsoPorDrive', 'V') IS NOT NULL DROP VIEW dbo.vw_UsoPorDrive;
IF OBJECT_ID('dbo.vw_UsoPorUsuario', 'V') IS NOT NULL DROP VIEW dbo.vw_UsoPorUsuario;
IF OBJECT_ID('dbo.Itens', 'U') IS NOT NULL DROP TABLE dbo.Itens;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
IF OBJECT_ID('dbo.Drives', 'U') IS NOT NULL DROP TABLE dbo.Drives;
GO

CREATE TABLE dbo.Drives (
  id INT IDENTITY PRIMARY KEY,
  letra CHAR(1) NOT NULL UNIQUE,
  rotulo NVARCHAR(50) NOT NULL,
  capacidadeBytes BIGINT NOT NULL
);

CREATE TABLE dbo.Usuarios (
  id INT IDENTITY PRIMARY KEY,
  login NVARCHAR(50) NOT NULL UNIQUE,
  nome NVARCHAR(100) NOT NULL
);

CREATE TABLE dbo.Itens (
  id INT IDENTITY PRIMARY KEY,
  nome NVARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('pasta', 'arquivo')),
  paiId INT NULL REFERENCES dbo.Itens(id),
  driveId INT NOT NULL REFERENCES dbo.Drives(id),
  donoId INT NOT NULL REFERENCES dbo.Usuarios(id),
  conteudo NVARCHAR(MAX) NULL,
  tamanhoBytes AS DATALENGTH(conteudo),
  criadoEm DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  modificadoEm DATETIME2 NULL,
  naLixeira BIT NOT NULL DEFAULT 0
);
GO

-- Não deixa dois itens com o mesmo nome na mesma pasta (a lixeira não conta).
CREATE UNIQUE INDEX UQ_Itens_local ON dbo.Itens(driveId, paiId, nome) WHERE naLixeira = 0;
GO

-- Quanto cada usuário guarda, só contando o que não está na lixeira.
CREATE VIEW dbo.vw_UsoPorUsuario AS
  SELECT u.id AS usuarioId, u.nome AS usuario,
    COUNT(i.id) AS itens,
    ISNULL(SUM(i.tamanhoBytes), 0) AS bytes
  FROM dbo.Usuarios u
  LEFT JOIN dbo.Itens i ON i.donoId = u.id AND i.naLixeira = 0
  GROUP BY u.id, u.nome;
GO

-- Espaço usado e livre em cada drive.
CREATE VIEW dbo.vw_UsoPorDrive AS
  SELECT d.id AS driveId, d.letra, d.rotulo, d.capacidadeBytes,
    ISNULL(SUM(i.tamanhoBytes), 0) AS usadoBytes,
    d.capacidadeBytes - ISNULL(SUM(i.tamanhoBytes), 0) AS livreBytes
  FROM dbo.Drives d
  LEFT JOIN dbo.Itens i ON i.driveId = d.id AND i.naLixeira = 0
  GROUP BY d.id, d.letra, d.rotulo, d.capacidadeBytes;
GO

-- O que está na lixeira.
CREATE VIEW dbo.vw_Lixeira AS
  SELECT id, nome, tipo, paiId, driveId, donoId, tamanhoBytes, modificadoEm
  FROM dbo.Itens
  WHERE naLixeira = 1;
GO

-- Dados iniciais.
SET IDENTITY_INSERT dbo.Drives ON;
INSERT INTO dbo.Drives (id, letra, rotulo, capacidadeBytes) VALUES
  (1, 'C', 'Sistema', 549755813888),
  (2, 'D', 'Dados', 1099511627776);
SET IDENTITY_INSERT dbo.Drives OFF;

SET IDENTITY_INSERT dbo.Usuarios ON;
INSERT INTO dbo.Usuarios (id, login, nome) VALUES
  (1, 'felipe', 'Felipe Bueno'),
  (2, 'ana', 'Ana Souza'),
  (3, 'sistema', 'Sistema');
SET IDENTITY_INSERT dbo.Usuarios OFF;

SET IDENTITY_INSERT dbo.Itens ON;
INSERT INTO dbo.Itens (id, nome, tipo, paiId, driveId, donoId, conteudo) VALUES
  (1, 'Windows', 'pasta', NULL, 1, 3, NULL),
  (2, 'Usuarios', 'pasta', NULL, 1, 3, NULL),
  (3, 'Felipe', 'pasta', 2, 1, 1, NULL),
  (4, 'Documentos', 'pasta', 3, 1, 1, NULL),
  (5, 'leiame.txt', 'arquivo', 4, 1, 1, N'Bem-vindo ao DBOS.'),
  (6, 'notas.txt', 'arquivo', 4, 1, 1, N'Comprar pao.'),
  (7, 'System32', 'pasta', 1, 1, 3, NULL),
  (8, 'config.sys', 'arquivo', 1, 1, 3, N'REM config'),
  (9, 'Backup', 'pasta', NULL, 2, 1, NULL);
SET IDENTITY_INSERT dbo.Itens OFF;
GO
