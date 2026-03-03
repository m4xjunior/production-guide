# Sage SQL Server Schema Mapping

**Data**: 2026-03-03
**Servidor**: 10.0.0.41 (server2.KH.ES)
**Porta**: 1433
**Auth**: SQL Server Authentication (sa / admin000)

## Databases Disponibles

| Database | Descrição |
|----------|-----------|
| `KH` | **Database principal de partes/operarios** |
| `Logicclass` | ERP Sage completo (centenas de tabelas) |
| `HIST_Logicclass` | Histórico do ERP |
| `bc_sage` | Backup/cópia Sage |
| `SageCopia` | Outra cópia Sage |
| `Iseco_ImpDatos` | Importação de dados |

## Database KH (a que usamos)

### Tabelas

| Tabela | Colunas | Descrição |
|--------|---------|-----------|
| `Operario` | `id` (numeric), `descripcion` (nvarchar) | **Lista de operários** — 942 registros, IDs de 1 a 2889 |
| `Referencia` | `id` (numeric), `descripcion` (nvarchar) | Referências de produto (ex: "TRIM B CUS DELANT") |
| `Parte` | ~50 colunas (ver detalhes abaixo) | Partes de trabalho atuais |
| `HistoricoParte` | mesma estrutura que Parte | Histórico de partes |
| `Observacion` | `id` (numeric), `descripcion` (nvarchar) | Observações |
| `Configuracion` | várias | Config do sistema de partes |
| `ErroresCorregidos` | `idParte` (numeric) | Partes com erros corrigidos |
| `ErroresRelleno` | `idParte` (numeric) | Partes com erros de preenchimento |
| `Parte_BAK` | mesma estrutura que Parte | Backup de partes |

### Tabela Operario (detalhes)

```
Operario
├── id: numeric NOT NULL (código do operário, ex: 1, 2, 3... até 2889)
└── descripcion: nvarchar(-1) NULL (nome completo, formato "APELIDO APELIDO, NOME")
```

**Exemplos:**
- `[1] ARNAU MORELL, EMILIO MANUEL`
- `[34] OPERARIO RWK`
- `[2687] FEITOSA MEIRELES JUNIOR, MAX LANIO`

**Observações:**
- IDs não são sequenciais (há gaps: 35, 43, 58, 72, 74, 77, 78, etc.)
- IDs vão de 1 a 2889 (1-4 dígitos)
- Total: 942 operários ativos
- Formato do nome: `APELIDO(S), NOME(S)` (maiúsculas)

### Tabela Parte (detalhes)

```
Parte / HistoricoParte
├── id_autonumerico: numeric (PK auto)
├── dia, mes, anyo: int (data do parte)
├── fecha_parte_leido_mal_o_lectura_ok: datetime
├── parte_mal_leido: bit
├── codigo_operario: numeric (FK → Operario.id)
├── parte_dia: numeric
├── estado: int (ex: 1=activo, 100=?, 200=?)
├── ruta: varchar (caminho do ficheiro escaneado)
├── r1_referencia, r1_cantidad, r1_anular, r1_horas, r1_minutos, r1_piezas_km, r1_tipo_horas
├── r2_referencia, r2_cantidad, r2_anular, r2_horas, r2_minutos, r2_piezas_km, r2_tipo_horas
├── r3_referencia, r3_cantidad, r3_anular, r3_horas, r3_minutos, r3_piezas_km, r3_tipo_horas
├── o1_observacion, o1_anular, o1_referencia, o1_horas, o1_minutos, o1_tipo_horas
├── o2_observacion, o2_anular, o2_referencia, o2_horas, o2_minutos, o2_tipo_horas
├── o3_observacion, o3_anular, o3_referencia, o3_horas, o3_minutos, o3_tipo_horas
└── r1_activa, r2_activa, r3_activa, o1_activa, o2_activa, o3_activa: bit
```

**Cada parte tem até 3 referências (r1-r3) e 3 observações (o1-o3).**

### Tabela Referencia (detalhes)

```
Referencia
├── id: numeric (código da referência)
└── descripcion: nvarchar (nome do produto/tarefa)
```

**Exemplos:**
- `[1001] TRIM B CUS DELANT`
- `[1002] TRIM B CUSTODIAS`
- `[1003] TRIM B LUNETAS`
- `[1004] TRIM B PARABRISAS`

## Database Logicclass (ERP completo)

Database muito grande com centenas de tabelas do ERP Sage. Principais categorias:
- Contabilidade (AcumuladosConta, Asientos, etc.)
- RRHH (Empleados, Contratos, Nominas, etc.)
- Fabricação (OrdenFabricacion, OperacionesOF, etc.)
- Vendas (Pedidos, Albaranes, Facturas, etc.)
- Stock (Almacenes, AcumuladoStock, etc.)

**Tabelas de interesse para futuro (RRHH/Empleados):**
- `Empleados` — pode ter dados mais completos dos operários
- `EmpleadosCategorias`, `EmpleadosContratos`, `EmpleadosHistorico`

## Configuração do Sync

Para o sync-sage usar estes dados:

```env
SAGE_HOST=10.0.0.41
SAGE_PORT=1433
SAGE_USER=sa
SAGE_PASSWORD=admin000
SAGE_ENCRYPT=false
SAGE_TRUST_CERT=true
SAGE_DATABASE=KH

SAGE_OPERATOR_TABLE=Operario
SAGE_CODE_COLUMN=id
SAGE_NAME_COLUMN=descripcion
```

**IMPORTANTE**: O campo `id` é numeric (não string). O sync deve converter para string com padding se necessário, ou o login deve aceitar códigos sem padding.
