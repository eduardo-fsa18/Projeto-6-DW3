import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { criarServidor } from '../app.js';
import { AgendaDatabase } from '../database.js';

const contato = {
  nome: 'Ana Teste', email: 'ana@example.com', telefone: '(11) 99999-1234',
  data_nascimento: '2000-05-10', cep: '01001-000', logradouro: 'Praça da Sé',
  numero: '10', complemento: '', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP'
};

async function iniciar(t) {
  const servidor = criarServidor({ arquivo: ':memory:' });
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise((resolve, reject) => servidor.close(erro => erro ? reject(erro) : resolve())));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return async (rota, method = 'GET', dados) => {
    const resposta = await fetch(base + rota, {
      method, headers: { 'Content-Type': 'application/json' },
      body: dados === undefined ? undefined : JSON.stringify(dados)
    });
    return { status: resposta.status, dados: await resposta.json() };
  };
}

test('API realiza cadastro, consulta, edição e exclusão com todos os campos', async t => {
  const pedir = await iniciar(t);
  assert.deepEqual((await pedir('/api/contatos')).dados, []);
  const criado = await pedir('/api/contatos', 'POST', contato);
  assert.equal(criado.status, 201);
  assert.equal(criado.dados.telefone, '11999991234');
  assert.equal(criado.dados.cep, '01001000');
  assert.equal(criado.dados.data_nascimento, contato.data_nascimento);
  assert.equal((await pedir('/api/contatos')).dados.length, 1);
  const id = criado.dados.id;
  assert.equal((await pedir(`/api/contatos/${id}`)).dados.email, contato.email);
  const editado = await pedir(`/api/contatos/${id}`, 'PUT', { ...contato, nome: 'Ana Atualizada', numero: '20' });
  assert.equal(editado.status, 200);
  assert.equal(editado.dados.nome, 'Ana Atualizada');
  assert.equal(editado.dados.numero, '20');
  assert.equal((await pedir(`/api/contatos/${id}`, 'DELETE')).status, 200);
  assert.equal((await pedir(`/api/contatos/${id}`)).status, 404);
  assert.deepEqual((await pedir('/api/contatos')).dados, []);
});

test('Validação rejeita campos inválidos sem inserir registros', async t => {
  const pedir = await iniciar(t);
  for (const alteracao of [
    { email: 'email-invalido' }, { telefone: '123' }, { cep: '12345' },
    { nome: '' }, { data_nascimento: '2099-01-01' },
    { data_nascimento: '2023-02-30' }, { estado: 'XX' }
  ]) {
    assert.equal((await pedir('/api/contatos', 'POST', { ...contato, ...alteracao })).status, 400);
  }
  assert.equal((await pedir('/api/contatos', 'POST', null)).status, 400);
  assert.deepEqual((await pedir('/api/contatos')).dados, []);
});

test('Registros inexistentes e rotas incorretas retornam erros adequados', async t => {
  const pedir = await iniciar(t);
  assert.equal((await pedir('/api/contatos/999')).status, 404);
  assert.equal((await pedir('/api/contatos/999', 'PUT', contato)).status, 404);
  assert.equal((await pedir('/api/contatos/999', 'DELETE')).status, 404);
  assert.equal((await pedir('/api/contatos', 'DELETE')).status, 405);
  assert.equal((await pedir('/api/contatos-inexistente')).status, 404);
});

test('SQLite preserva o contato após fechar e reabrir o banco', () => {
  const pasta = mkdtempSync(path.join(tmpdir(), 'agenda-dw3-teste-'));
  const arquivo = path.join(pasta, 'agenda.sqlite');
  let db = new AgendaDatabase(arquivo);
  const salvo = db.criar({ ...contato, telefone: '11999991234', cep: '01001000' });
  db.fechar();
  db = new AgendaDatabase(arquivo);
  try {
    assert.equal(db.buscar(salvo.id).nome, contato.nome);
    assert.equal(db.listar().length, 1);
  } finally { db.fechar(); }
});

test('SQL parametrizado trata texto de injeção como nome do contato', async t => {
  const pedir = await iniciar(t);
  const nome = "Maria'); DROP TABLE contatos; --";
  const salvo = await pedir('/api/contatos', 'POST', { ...contato, nome });
  assert.equal(salvo.status, 201);
  assert.equal((await pedir('/api/contatos')).dados[0].nome, nome);
});
