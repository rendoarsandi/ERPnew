import fs from 'node:fs';
import path from 'node:path';

export interface DocField {
  fieldname: string;
  fieldtype: string;
  label?: string;
  options?: string;
  reqd?: number | boolean;
  unique?: number | boolean;
  default?: any;
  in_list_view?: number;
  read_only?: number;
  hidden?: number;
}

export interface DocTypeDefinition {
  name: string;
  module?: string;
  istable?: number | boolean;
  fields: DocField[];
  field_order?: string[];
  [key: string]: any;
}

const MODULES = [
  'accounts', 'assets', 'bulk_transaction', 'buying', 'communication', 'crm',
  'edi', 'erpnext_integrations', 'maintenance', 'manufacturing', 'portal',
  'projects', 'quality_management', 'regional', 'selling', 'setup',
  'shopping_cart', 'stock', 'subcontracting', 'support', 'telephony', 'utilities'
];

/**
 * Loads a DocType definition by reading the JSON file.
 * It will search under /opt/erpnext/erpnext/[module]/doctype/[doctype]/[doctype].json
 * or a local copy under src/lib/frappe/doctypes/[doctype].json.
 */
export function loadDocType(doctype: string): DocTypeDefinition {
  const fileName = doctype.replace(/ /g, '_') + '.json';
  const snakeName = doctype.replace(/ /g, '_').toLowerCase();
  
  // 1. Try local copy in src/doctypes/
  const pathsToTry = [
    path.join(process.cwd(), 'src/doctypes', fileName),
    path.join(process.cwd(), 'src/doctypes', `${snakeName}.json`),
    path.join(process.cwd(), 'src/lib/frappe/doctypes', `${snakeName}.json`)
  ];

  for (const localPath of pathsToTry) {
    if (fs.existsSync(localPath)) {
      try {
        const data = fs.readFileSync(localPath, 'utf8');
        return JSON.parse(data) as DocTypeDefinition;
      } catch (err) {
        console.error(`Failed to read/parse local DocType ${doctype} at ${localPath}:`, err);
      }
    }
  }

  // 2. Try standard modules in ERPNext
  for (const mod of MODULES) {
    const p = `/opt/erpnext/erpnext/${mod}/doctype/${snakeName}/${snakeName}.json`;
    if (fs.existsSync(p)) {
      try {
        const data = fs.readFileSync(p, 'utf8');
        return JSON.parse(data) as DocTypeDefinition;
      } catch (err) {
        console.error(`Failed to read/parse DocType ${doctype} at ${p}:`, err);
      }
    }
  }

  // 3. Fallback search (recursive search in /opt/erpnext/erpnext/ if not found in pre-defined modules)
  try {
    const baseDir = '/opt/erpnext/erpnext';
    if (fs.existsSync(baseDir)) {
      const items = fs.readdirSync(baseDir);
      for (const item of items) {
        const itemPath = path.join(baseDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const doctypeDir = path.join(itemPath, 'doctype');
          if (fs.existsSync(doctypeDir)) {
            const p = path.join(doctypeDir, snakeName, `${snakeName}.json`);
            if (fs.existsSync(p)) {
              const data = fs.readFileSync(p, 'utf8');
              return JSON.parse(data) as DocTypeDefinition;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Fallback search failed for ${doctype}:`, err);
  }

  throw new Error(`DocType definition for "${doctype}" not found.`);
}

/**
 * Returns the field order for the given DocType definition.
 */
export function getFieldOrder(docTypeDef: DocTypeDefinition): string[] {
  if (docTypeDef.field_order && docTypeDef.field_order.length > 0) {
    return docTypeDef.field_order;
  }
  return (docTypeDef.fields || []).map((f) => f.fieldname).filter(Boolean);
}

/**
 * Returns the field definition by its fieldname.
 */
export function getField(docTypeDef: DocTypeDefinition, fieldname: string): DocField | undefined {
  return (docTypeDef.fields || []).find((f) => f.fieldname === fieldname);
}

/**
 * Returns the field type for the given fieldname in a DocType definition.
 */
export function getFieldType(docTypeDef: DocTypeDefinition, fieldname: string): string | undefined {
  return getField(docTypeDef, fieldname)?.fieldtype;
}

/**
 * Returns the field options for the given fieldname in a DocType definition.
 */
export function getFieldOptions(docTypeDef: DocTypeDefinition, fieldname: string): string | undefined {
  return getField(docTypeDef, fieldname)?.options;
}

/**
 * Checks if the given fieldname in a DocType definition is mandatory.
 */
export function isMandatory(docTypeDef: DocTypeDefinition, fieldname: string): boolean {
  const field = getField(docTypeDef, fieldname);
  if (!field) return false;
  return field.reqd === 1 || field.reqd === true;
}
