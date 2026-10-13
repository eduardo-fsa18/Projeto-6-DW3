import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgendaDatabase, campos } from './database.js';

const pasta = path.dirname(fileURLToPath(import.meta.url));
const estados = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

function responder(res, status, valor) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(valor));
}

async function lerJSON(req) {
  req.setEncoding('utf8');
  let texto = '';
  for await (const pedaco of req) {
    texto += pedaco;
    if (Buffer.byteLength(texto) > 16_384) {
      throw Object.assign(new Error('O cadastro enviado é muito grande.'), { status: 413 });
    }
  }
  try { return JSON.parse(texto); }
  catch { throw Object.assign(new Error('Envie um documento JSON válido.'), { status: 400 }); }
}

function validar(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw Object.assign(new Error('Cadastro inválido.'), { status: 400 });
  }
  const contato = {};
  for (const campo of campos) {
    if (campo === 'complemento' && dados[campo] === undefined) contato[campo] = '';
    else if (typeof dados[campo] !== 'string') {
      throw Object.assign(new Error(`Informe o campo ${campo}.`), { status: 400 });
    } else contato[campo] = dados[campo].trim();
    if (contato[campo].length > 200) {
      throw Object.assign(new Error(`O campo ${campo} deve ter até 200 caracteres.`), { status: 400 });
    }
  }
  for (const campo of campos.filter(c => c !== 'complemento' && c !== 'bairro')) {
    if (!contato[campo]) throw Object.assign(new Error(`Preencha o campo ${campo}.`), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.email)) {
    throw Object.assign(new Error('Informe um e-mail válido.'), { status: 400 });
  }
  contato.telefone = contato.telefone.replace(/\D/g, '');
  contato.cep = contato.cep.replace(/\D/g, '');
  contato.estado = contato.estado.toUpperCase();
  if (!/^\d{10,11}$/.test(contato.telefone)) {
    throw Object.assign(new Error('O telefone deve ter DDD e 10 ou 11 dígitos.'), { status: 400 });
  }
  if (!/^\d{8}$/.test(contato.cep)) {
    throw Object.assign(new Error('O CEP deve ter 8 dígitos.'), { status: 400 });
  }
  if (!estados.has(contato.estado)) {
    throw Object.assign(new Error('Informe uma UF válida.'), { status: 400 });
  }
  const data = new Date(contato.data_nascimento + 'T00:00:00Z');
  const hoje = new Date();
  const limite = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(contato.data_nascimento) ||
      Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== contato.data_nascimento ||
      contato.data_nascimento > limite || contato.data_nascimento < '1900-01-01') {
    throw Object.assign(new Error('Informe uma data de nascimento válida, sem data futura.'), { status: 400 });
  }
  return contato;
}

// Cada requisição CRUD utiliza instruções parametrizadas no SQLite.
export function criarServidor({ arquivo = path.join(pasta, 'data', 'agenda.sqlite') } = {}) {
  const agenda = new AgendaDatabase(arquivo);
  const arquivos = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
    '/style.css': ['style.css', 'text/css'], '/agenda.js': ['agenda.js', 'text/javascript'] };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      const rota = /^\/api\/contatos(?:\/([1-9]\d*))?$/.exec(url.pathname);
      if (rota) {
        const id = rota[1] ? Number(rota[1]) : null;
        if (id && !Number.isSafeInteger(id)) return responder(res, 400, { erro: 'ID inválido.' });
        if (req.method === 'GET') {
          const contato = id ? agenda.buscar(id) : agenda.listar();
          return contato ? responder(res, 200, contato) : responder(res, 404, { erro: 'Contato não encontrado.' });
        }
        if (req.method === 'POST' && !id) {
          return responder(res, 201, agenda.criar(validar(await lerJSON(req))));
        }
        if (req.method === 'PUT' && id) {
          const contato = agenda.atualizar(id, validar(await lerJSON(req)));
          return contato ? responder(res, 200, contato) : responder(res, 404, { erro: 'Contato não encontrado.' });
        }
        if (req.method === 'DELETE' && id) {
          if (!agenda.excluir(id)) return responder(res, 404, { erro: 'Contato não encontrado.' });
          return responder(res, 200, { mensagem: 'Contato excluído.' });
        }
        res.setHeader('Allow', id ? 'GET, PUT, DELETE' : 'GET, POST');
        return responder(res, 405, { erro: 'Método não permitido para esta rota.' });
      }
      if (url.pathname.startsWith('/api/')) return responder(res, 404, { erro: 'Rota não encontrada.' });
      const estatico = arquivos[url.pathname];
      if (!estatico || !['GET', 'HEAD'].includes(req.method)) {
        return responder(res, 404, { erro: 'Página não encontrada.' });
      }
      const conteudo = await readFile(path.join(pasta, 'public', estatico[0]));
      res.writeHead(200, { 'Content-Type': estatico[1] + '; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : conteudo);
    } catch (erro) {
      if (!erro.status) console.error('Erro no servidor:', erro);
      responder(res, erro.status || 500, { erro: erro.status ? erro.message : 'Não foi possível concluir a operação.' });
    }
  });
  server.on('close', () => agenda.fechar());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const porta = Number(process.env.PORT || 5000);
  const servidor = criarServidor();
  servidor.on('error', erro => {
    console.error(erro.code === 'EADDRINUSE' ? `A porta ${porta} já está ocupada. Escolha outra com PORT.` : erro.message);
    process.exitCode = 1;
    servidor.close();
  });
  servidor.listen(porta, '127.0.0.1', () => console.log(`Agenda de contatos: http://localhost:${porta}`));
  process.on('SIGINT', () => servidor.close());
  process.on('SIGTERM', () => servidor.close());
}
