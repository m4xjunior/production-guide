/**
 * Script de mapeamento do schema Sage.
 * Conecta ao SQL Server e lista tabelas/colunas relevantes para operadores.
 * Uso: SAGE_HOST=SAGE npx tsx src/map-schema.ts
 */
import sql from "mssql";

const host = process.env.SAGE_HOST || "SAGE";
const port = parseInt(process.env.SAGE_PORT || "1433");

const domain = process.env.SAGE_DOMAIN || "";
const useWindowsAuth = domain.length > 0;

const config: sql.config = {
  server: host,
  port,
  user: process.env.SAGE_USER,
  password: process.env.SAGE_PASSWORD,
  database: process.env.SAGE_DATABASE || "SAGE",
  ...(useWindowsAuth ? { domain } : {}),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

async function mapSchema(): Promise<void> {
  console.log(`Conectando a ${host}:${port}...`);

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(config);
    console.log("Conectado!\n");

    // 1. Listar todos os databases
    console.log("=== DATABASES ===");
    const dbs = await pool.request().query("SELECT name FROM sys.databases ORDER BY name");
    for (const db of dbs.recordset) {
      console.log(`  ${db.name}`);
    }

    // 2. Listar todas as tabelas
    console.log("\n=== TABELAS ===");
    const tables = await pool.request().query(
      "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );
    for (const t of tables.recordset) {
      console.log(`  ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    }

    // 3. Buscar tabelas que parecem de operadores/empregados
    console.log("\n=== TABELAS CANDIDATAS (operador/empregado) ===");
    const candidates = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND (
          TABLE_NAME LIKE '%OPER%'
          OR TABLE_NAME LIKE '%EMPL%'
          OR TABLE_NAME LIKE '%TRAB%'
          OR TABLE_NAME LIKE '%PERSONAL%'
          OR TABLE_NAME LIKE '%RECURS%'
          OR TABLE_NAME LIKE '%HUMAN%'
          OR TABLE_NAME LIKE '%EMPLEADO%'
          OR TABLE_NAME LIKE '%OPERARI%'
        )
      ORDER BY TABLE_NAME
    `);

    if (candidates.recordset.length === 0) {
      console.log("  Nenhuma tabela candidata encontrada. Listando TODAS as tabelas com colunas:");
      // List all tables with column count
      const allTables = await pool.request().query(`
        SELECT t.TABLE_SCHEMA, t.TABLE_NAME, COUNT(c.COLUMN_NAME) as col_count
        FROM INFORMATION_SCHEMA.TABLES t
        JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        GROUP BY t.TABLE_SCHEMA, t.TABLE_NAME
        ORDER BY t.TABLE_NAME
      `);
      for (const t of allTables.recordset) {
        console.log(`  ${t.TABLE_NAME} (${t.col_count} colunas)`);
      }
    } else {
      for (const t of candidates.recordset) {
        console.log(`\n  >>> ${t.TABLE_NAME}`);
        // Show columns for each candidate
          const cols = await pool.request()
          .input("tableName", sql.NVarChar, t.TABLE_NAME)
          .query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);
        for (const c of cols.recordset) {
          const len = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : "";
          console.log(`    ${c.COLUMN_NAME} ${c.DATA_TYPE}${len} ${c.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL"}`);
        }

        // Show sample data (first 5 rows)
        try {
          const safeName = t.TABLE_NAME.replace(/\]/g, "]]");
          const sample = await pool.request().query(`SELECT TOP 5 * FROM [${safeName}]`);
          if (sample.recordset.length > 0) {
            console.log(`\n    Amostra (${sample.recordset.length} rows):`);
            for (const row of sample.recordset) {
              console.log(`    `, JSON.stringify(row).substring(0, 200));
            }
          }
        } catch (e) {
          console.log(`    (erro ao ler amostra: ${e})`);
        }
      }
    }
  } catch (error) {
    console.error("ERRO de conexão:", error);
  } finally {
    if (pool) await pool.close();
  }
}

mapSchema().catch(console.error);
