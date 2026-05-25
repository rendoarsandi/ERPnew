import { loadDocType } from './engine';

/**
 * Synchronizes the SQLite schema in D1 for the given DocType.
 * It checks if the table `tab[DocType Name]` exists. If not, it creates it.
 * It also recursively inspects child fields of type "Table" and syncs them.
 */
export async function syncSchema(doctype: string, env: any): Promise<void> {
  const doctypeDef = loadDocType(doctype);
  if (!doctypeDef) {
    throw new Error(`DocType definition for "${doctype}" not found.`);
  }

  const tableName = `tab${doctype}`;
  
  // Check if table exists in D1 SQLite
  const checkQuery = `SELECT name FROM sqlite_schema WHERE type='table' AND name = ?`;
  const exists = await env.DB.prepare(checkQuery).bind(tableName).first();

  if (!exists) {
    const columnsSql = [
      '`name` TEXT PRIMARY KEY',
      '`creation` TEXT',
      '`modified` TEXT',
      '`owner` TEXT',
      '`modified_by` TEXT',
      '`docstatus` INTEGER DEFAULT 0',
      '`parent` TEXT',
      '`parentfield` TEXT',
      '`parenttype` TEXT',
      '`idx` INTEGER'
    ];
    const seenFields = new Set([
      'name', 'creation', 'modified', 'owner', 'modified_by', 'docstatus',
      'parent', 'parentfield', 'parenttype', 'idx'
    ]);

    const IGNORED_FIELD_TYPES = ['Section Break', 'Column Break', 'HTML', 'Button', 'Heading', 'Table'];

    const fields = doctypeDef.fields || [];
    for (const field of fields) {
      if (IGNORED_FIELD_TYPES.includes(field.fieldtype)) {
        continue;
      }
      const colName = field.fieldname;
      if (!colName || seenFields.has(colName)) {
        continue;
      }
      seenFields.add(colName);

      let sqliteType = 'TEXT';
      const ft = field.fieldtype;
      if (ft === 'Check') {
        sqliteType = 'INTEGER';
      } else if (['Int', 'Integer'].includes(ft)) {
        sqliteType = 'INTEGER';
      } else if (['Float', 'Currency', 'Percent'].includes(ft)) {
        sqliteType = 'REAL';
      }

      columnsSql.push(`\`${colName}\` ${sqliteType}`);
    }

    const createSql = `CREATE TABLE \`${tableName}\` (${columnsSql.join(', ')});`;
    await env.DB.prepare(createSql).run();
    console.log(`Successfully created table \`${tableName}\`.`);
  }

  // Handle child DocType tables (fields of type "Table")
  const fields = doctypeDef.fields || [];
  for (const field of fields) {
    if (field.fieldtype === 'Table' && field.options) {
      // Recursively sync child table schema
      await syncSchema(field.options, env);
    }
  }
}
