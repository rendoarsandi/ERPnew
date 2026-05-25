import { createServerFn } from '@tanstack/react-start';
import { getEvent } from 'vinxi/http';
import { loadDocType } from '../lib/frappe/engine';
import { syncSchema } from '../lib/frappe/database';
import { runHooks } from '../lib/frappe/hooks';

// Helper to get bindings
function getEnv() {
  const event = getEvent();
  if (!event || !event.context || !event.context.cloudflare || !event.context.cloudflare.env) {
    throw new Error('Cloudflare bindings not available in current context.');
  }
  return event.context.cloudflare.env;
}

// Helper to generate a short unique string name
function generateName(doctype: string): string {
  const prefix = doctype.replace(/ /g, '').slice(0, 4).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomStr}`;
}

// Helper to insert a record dynamically mapping properties to SQL columns
async function dbInsert(tableName: string, fields: any[], doc: any, env: any) {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: any[] = [];

  const stdKeys = ['name', 'creation', 'modified', 'owner', 'modified_by', 'docstatus', 'parent', 'parentfield', 'parenttype', 'idx'];
  for (const k of stdKeys) {
    if (doc[k] !== undefined) {
      columns.push(`\`${k}\``);
      placeholders.push('?');
      values.push(doc[k]);
    }
  }

  for (const field of fields) {
    const k = field.fieldname;
    if (k && !stdKeys.includes(k) && doc[k] !== undefined) {
      if (field.fieldtype === 'Table') continue;
      columns.push(`\`${k}\``);
      placeholders.push('?');
      values.push(doc[k]);
    }
  }

  const sql = `INSERT INTO \`${tableName}\` (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  await env.DB.prepare(sql).bind(...values).run();
}

// Helper to update a record dynamically mapping properties to SQL columns
async function dbUpdate(tableName: string, fields: any[], doc: any, env: any) {
  const updates: string[] = [];
  const values: any[] = [];

  const stdKeys = ['modified', 'modified_by', 'docstatus', 'parent', 'parentfield', 'parenttype', 'idx'];
  for (const k of stdKeys) {
    if (doc[k] !== undefined) {
      updates.push(`\`${k}\` = ?`);
      values.push(doc[k]);
    }
  }

  for (const field of fields) {
    const k = field.fieldname;
    if (k && !stdKeys.includes(k) && doc[k] !== undefined) {
      if (field.fieldtype === 'Table') continue;
      updates.push(`\`${k}\` = ?`);
      values.push(doc[k]);
    }
  }

  const sql = `UPDATE \`${tableName}\` SET ${updates.join(', ')} WHERE name = ?`;
  values.push(doc.name);
  await env.DB.prepare(sql).bind(...values).run();
}

// Helper to fetch a complete document with child records
async function getDocInternal(doctype: string, name: string, env: any): Promise<any | null> {
  const tableName = `tab${doctype}`;
  const mainDocRaw = await env.DB.prepare(
    `SELECT * FROM \`${tableName}\` WHERE name = ?`
  ).bind(name).first();

  if (!mainDocRaw) {
    return null;
  }

  const doc = { ...mainDocRaw };
  const doctypeDef = loadDocType(doctype);
  const fields = doctypeDef.fields || [];

  for (const field of fields) {
    if (field.fieldtype === 'Table' && field.options) {
      await syncSchema(field.options, env);
      
      const childTableName = `tab${field.options}`;
      const { results: childRows } = await env.DB.prepare(
        `SELECT * FROM \`${childTableName}\` WHERE parent = ? AND parenttype = ? AND parentfield = ? ORDER BY idx ASC`
      ).bind(name, doctype, field.fieldname).all();

      doc[field.fieldname] = childRows.map((r: any) => ({ ...r }));
    }
  }

  return doc;
}

// ==========================================
// EXPOSED TANSTACK SERVER FUNCTIONS
// ==========================================

export const getList = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      doctype: string;
      fields?: string[];
      filters?: any;
      limit?: number;
      limit_start?: number;
      order_by?: string;
    }) => input
  )
  .handler(async ({ data: input }) => {
    const env = getEnv();
    await syncSchema(input.doctype, env);

    const tableName = `tab${input.doctype}`;
    const selectFields = input.fields && input.fields.length > 0
      ? input.fields.map(f => `\`${f}\``).join(', ')
      : '*';

    let whereClause = '';
    const bindParams: any[] = [];

    if (input.filters) {
      const clauses: string[] = [];
      if (Array.isArray(input.filters)) {
        for (const f of input.filters) {
          if (Array.isArray(f) && f.length >= 3) {
            const [field, op, val] = f;
            const operator = op.toLowerCase();
            if (operator === 'like') {
              clauses.push(`\`${field}\` LIKE ?`);
              bindParams.push(val);
            } else if (operator === 'not like') {
              clauses.push(`\`${field}\` NOT LIKE ?`);
              bindParams.push(val);
            } else if (operator === 'in') {
              const arr = Array.isArray(val) ? val : [val];
              const placeholders = arr.map(() => '?').join(', ');
              clauses.push(`\`${field}\` IN (${placeholders})`);
              bindParams.push(...arr);
            } else if (operator === 'not in') {
              const arr = Array.isArray(val) ? val : [val];
              const placeholders = arr.map(() => '?').join(', ');
              clauses.push(`\`${field}\` NOT IN (${placeholders})`);
              bindParams.push(...arr);
            } else {
              clauses.push(`\`${field}\` ${op} ?`);
              bindParams.push(val);
            }
          }
        }
      } else if (typeof input.filters === 'object') {
        for (const [key, val] of Object.entries(input.filters)) {
          clauses.push(`\`${key}\` = ?`);
          bindParams.push(val);
        }
      }
      if (clauses.length > 0) {
        whereClause = 'WHERE ' + clauses.join(' AND ');
      }
    }

    let orderClause = '';
    if (input.order_by) {
      orderClause = `ORDER BY ${input.order_by}`;
    }

    let limitClause = '';
    if (input.limit !== undefined) {
      limitClause = `LIMIT ${input.limit}`;
      if (input.limit_start !== undefined) {
        limitClause += ` OFFSET ${input.limit_start}`;
      }
    }

    const sql = `SELECT ${selectFields} FROM \`${tableName}\` ${whereClause} ${orderClause} ${limitClause}`;
    const { results } = await env.DB.prepare(sql).bind(...bindParams).all();
    return results;
  });

export const getDoc = createServerFn({ method: 'GET' })
  .inputValidator((input: { doctype: string; name: string }) => input)
  .handler(async ({ data: input }) => {
    const env = getEnv();
    await syncSchema(input.doctype, env);
    return await getDocInternal(input.doctype, input.name, env);
  });

export const saveDoc = createServerFn({ method: 'POST' })
  .inputValidator((input: { doctype: string; doc: any }) => input)
  .handler(async ({ data: input }) => {
    const env = getEnv();
    await syncSchema(input.doctype, env);

    const doctypeDef = loadDocType(input.doctype);
    const tableName = `tab${input.doctype}`;

    let isNew = true;
    if (input.doc.name) {
      const existing = await env.DB.prepare(
        `SELECT name FROM \`${tableName}\` WHERE name = ?`
      ).bind(input.doc.name).first();
      if (existing) {
        isNew = false;
      }
    }

    const now = new Date().toISOString();

    if (isNew) {
      if (!input.doc.name) {
        input.doc.name = generateName(input.doctype);
      }
      input.doc.creation = now;
      input.doc.modified = now;
      input.doc.owner = input.doc.owner || 'Administrator';
      input.doc.modified_by = 'Administrator';
      input.doc.docstatus = input.doc.docstatus || 0;

      await runHooks(input.doctype, 'before_insert', input.doc, env);
      await runHooks(input.doctype, 'before_save', input.doc, env);

      await dbInsert(tableName, doctypeDef.fields || [], input.doc, env);

      // Child tables insertion
      const fields = doctypeDef.fields || [];
      for (const field of fields) {
        if (field.fieldtype === 'Table' && field.options) {
          const childDocs = input.doc[field.fieldname] || [];
          for (let i = 0; i < childDocs.length; i++) {
            const child = childDocs[i];
            child.name = child.name || generateName(field.options);
            child.creation = now;
            child.modified = now;
            child.owner = child.owner || 'Administrator';
            child.modified_by = 'Administrator';
            child.docstatus = child.docstatus || 0;
            child.parent = input.doc.name;
            child.parenttype = input.doctype;
            child.parentfield = field.fieldname;
            child.idx = i + 1;

            const childDocTypeDef = loadDocType(field.options);
            await dbInsert(`tab${field.options}`, childDocTypeDef.fields || [], child, env);
          }
        }
      }

      await runHooks(input.doctype, 'after_insert', input.doc, env);
      await runHooks(input.doctype, 'after_save', input.doc, env);
    } else {
      input.doc.modified = now;
      input.doc.modified_by = 'Administrator';

      await runHooks(input.doctype, 'before_save', input.doc, env);

      await dbUpdate(tableName, doctypeDef.fields || [], input.doc, env);

      // Child tables update (delete & re-insert)
      const fields = doctypeDef.fields || [];
      for (const field of fields) {
        if (field.fieldtype === 'Table' && field.options) {
          await env.DB.prepare(
            `DELETE FROM \`tab${field.options}\` WHERE parent = ? AND parenttype = ? AND parentfield = ?`
          ).bind(input.doc.name, input.doctype, field.fieldname).run();

          const childDocs = input.doc[field.fieldname] || [];
          for (let i = 0; i < childDocs.length; i++) {
            const child = childDocs[i];
            child.name = child.name || generateName(field.options);
            child.creation = child.creation || now;
            child.modified = now;
            child.owner = child.owner || 'Administrator';
            child.modified_by = 'Administrator';
            child.docstatus = child.docstatus || 0;
            child.parent = input.doc.name;
            child.parenttype = input.doctype;
            child.parentfield = field.fieldname;
            child.idx = i + 1;

            const childDocTypeDef = loadDocType(field.options);
            await dbInsert(`tab${field.options}`, childDocTypeDef.fields || [], child, env);
          }
        }
      }

      await runHooks(input.doctype, 'after_save', input.doc, env);
    }

    // Return the updated document fully populated
    return await getDocInternal(input.doctype, input.doc.name, env);
  });

export const submitDoc = createServerFn({ method: 'POST' })
  .inputValidator((input: { doctype: string; name: string }) => input)
  .handler(async ({ data: input }) => {
    const env = getEnv();
    await syncSchema(input.doctype, env);

    const doc = await getDocInternal(input.doctype, input.name, env);
    if (!doc) {
      throw new Error(`Document ${input.name} of type ${input.doctype} not found.`);
    }

    if (doc.docstatus !== 0) {
      throw new Error(`Document ${input.name} is already submitted or cancelled.`);
    }

    await runHooks(input.doctype, 'before_submit', doc, env);

    const now = new Date().toISOString();
    doc.docstatus = 1;
    doc.modified = now;
    doc.modified_by = 'Administrator';

    await env.DB.prepare(
      `UPDATE \`tab${input.doctype}\` SET docstatus = 1, modified = ?, modified_by = 'Administrator' WHERE name = ?`
    ).bind(now, input.name).run();

    const doctypeDef = loadDocType(input.doctype);
    const fields = doctypeDef.fields || [];
    for (const field of fields) {
      if (field.fieldtype === 'Table' && field.options) {
        await env.DB.prepare(
          `UPDATE \`tab${field.options}\` SET docstatus = 1, modified = ?, modified_by = 'Administrator' WHERE parent = ? AND parenttype = ? AND parentfield = ?`
        ).bind(now, input.name, input.doctype, field.fieldname).run();

        if (doc[field.fieldname]) {
          for (const child of doc[field.fieldname]) {
            child.docstatus = 1;
            child.modified = now;
            child.modified_by = 'Administrator';
          }
        }
      }
    }

    await runHooks(input.doctype, 'on_submit', doc, env);

    return doc;
  });

export const deleteDoc = createServerFn({ method: 'POST' })
  .inputValidator((input: { doctype: string; name: string }) => input)
  .handler(async ({ data: input }) => {
    const env = getEnv();
    await syncSchema(input.doctype, env);

    const doc = await getDocInternal(input.doctype, input.name, env);
    if (!doc) {
      throw new Error(`Document ${input.name} of type ${input.doctype} not found.`);
    }

    if (doc.docstatus === 1) {
      throw new Error(`Submitted document ${input.name} cannot be deleted.`);
    }

    await runHooks(input.doctype, 'before_delete', doc, env);

    const doctypeDef = loadDocType(input.doctype);
    const fields = doctypeDef.fields || [];

    for (const field of fields) {
      if (field.fieldtype === 'Table' && field.options) {
        await env.DB.prepare(
          `DELETE FROM \`tab${field.options}\` WHERE parent = ? AND parenttype = ? AND parentfield = ?`
        ).bind(input.name, input.doctype, field.fieldname).run();
      }
    }

    await env.DB.prepare(
      `DELETE FROM \`tab${input.doctype}\` WHERE name = ?`
    ).bind(input.name).run();

    await runHooks(input.doctype, 'after_delete', doc, env);

    return { success: true };
  });
