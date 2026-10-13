import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const campos = ['nome', 'email', 'telefone', 'data_nascimento', 'cep',
  'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];

export class AgendaDatabase {
  constructor(arquivo) {
    if (arquivo !== ':memory:') mkdirSync(dirname(arquivo), { recursive: true });
    this.db = new DatabaseSync(arquivo);
    this.db.exec(`CREATE TABLE IF NOT EXISTS contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL, email TEXT NOT NULL, telefone TEXT NOT NULL,
      data_nascimento TEXT NOT NULL, cep TEXT NOT NULL,
      logradouro TEXT NOT NULL, numero TEXT NOT NULL,
      complemento TEXT NOT NULL DEFAULT '', bairro TEXT NOT NULL,
      cidade TEXT NOT NULL, estado TEXT NOT NULL
    )`);
  }

  listar() {
    return this.db.prepare('SELECT * FROM contatos ORDER BY nome COLLATE NOCASE, id').all();
  }
  buscar(id) {
    return this.db.prepare('SELECT * FROM contatos WHERE id = ?').get(id);
  }
  criar(contato) {
    const resultado = this.db.prepare(`INSERT INTO contatos (${campos.join(',')})
      VALUES (${campos.map(() => '?').join(',')})`).run(...campos.map(c => contato[c]));
    return this.buscar(Number(resultado.lastInsertRowid));
  }
  atualizar(id, contato) {
    const resultado = this.db.prepare(`UPDATE contatos SET
      ${campos.map(c => `${c} = ?`).join(',')} WHERE id = ?`)
      .run(...campos.map(c => contato[c]), id);
    return resultado.changes ? this.buscar(id) : undefined;
  }
  excluir(id) {
    return this.db.prepare('DELETE FROM contatos WHERE id = ?').run(id).changes > 0;
  }
  fechar() { this.db.close(); }
}
