const $ = id => document.getElementById(id);
let contatos = [];
let editando = null;
let excluindo = null;
let consultaCEP = null;
let ultimoCEP = '';

const hoje = new Date();
$('data_nascimento').max = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

function avisar(texto, erro = false) {
  $('mensagem').textContent = texto;
  $('mensagem').className = erro ? 'erro' : '';
  $('mensagem').hidden = false;
}
async function api(caminho, opcoes) {
  const resposta = await fetch(caminho, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Falha ao acessar o servidor.');
  return dados;
}
function formatarTelefone(numero) {
  return numero.length === 11 ? `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}` : `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
}
function celula(linha, texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  linha.append(td);
  return td;
}
function renderizar() {
  const termo = $('pesquisa').value.toLocaleLowerCase('pt-BR').trim();
  const encontrados = contatos.filter(c => [c.nome, c.email, c.telefone, formatarTelefone(c.telefone)]
    .some(valor => valor.toLocaleLowerCase('pt-BR').includes(termo)));
  $('contador').textContent = contatos.length;
  $('contatos').replaceChildren();
  $('tabela').hidden = encontrados.length === 0;
  $('vazio').hidden = encontrados.length > 0;
  $('vazio').textContent = contatos.length ? 'Nenhum contato corresponde à pesquisa.' : 'Nenhum contato cadastrado. Clique em Novo contato para começar.';
  for (const contato of encontrados) {
    const linha = document.createElement('tr');
    const nome = celula(linha, contato.nome);
    const email = document.createElement('small');email.textContent = contato.email;nome.append(email);
    celula(linha, formatarTelefone(contato.telefone));
    celula(linha, contato.data_nascimento.split('-').reverse().join('/'));
    const endereco = `${contato.logradouro}, ${contato.numero}${contato.complemento ? ' - ' + contato.complemento : ''}`;
    const local = celula(linha, endereco);
    const detalhe = document.createElement('small');
    detalhe.textContent = `${contato.bairro ? contato.bairro + ' · ' : ''}${contato.cidade}/${contato.estado} · CEP ${contato.cep.slice(0, 5)}-${contato.cep.slice(5)}`;
    local.append(detalhe);
    const acoes = celula(linha, '');
    for (const [rotulo, classe, acao] of [
      ['Editar', 'secundario', () => abrirFormulario(contato)],
      ['Excluir', 'perigo', () => {
        excluindo = contato.id;
        $('texto-exclusao').textContent = `Deseja excluir o contato ${contato.nome}?`;
        $('confirmacao').showModal();
      }]
    ]) {
      const botao = document.createElement('button');
      botao.textContent = rotulo;botao.className = classe;
      botao.addEventListener('click', acao);acoes.append(botao);
    }
    $('contatos').append(linha);
  }
}
async function carregar() {
  contatos = await api('/api/contatos');
  renderizar();
}
function cancelarConsulta() {
  consultaCEP?.abort();
  consultaCEP = null;
  $('buscar-cep').disabled = false;
}
function abrirFormulario(contato = null) {
  cancelarConsulta();
  editando = contato?.id || null;
  $('form-contato').reset();
  ultimoCEP = contato?.cep || '';
  if (contato) for (const campo of $('form-contato').elements) {
    if (campo.name) campo.value = contato[campo.name] || '';
  }
  $('titulo-formulario').textContent = contato ? 'Editar contato' : 'Novo contato';
  $('status-cep').textContent = '';
  $('cadastro').hidden = false;
  $('novo').hidden = true;
  $('mensagem').hidden = true;
  $('nome').focus();
  $('cadastro').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function fecharFormulario() {
  cancelarConsulta();
  $('cadastro').hidden = true;
  $('novo').hidden = false;
  editando = null;
}
async function buscarCEP() {
  const cep = $('cep').value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) {
    $('status-cep').textContent = 'Informe um CEP com 8 dígitos.';
    return;
  }
  cancelarConsulta();
  const controle = new AbortController();
  consultaCEP = controle;
  $('buscar-cep').disabled = true;
  $('status-cep').textContent = 'Buscando endereço no ViaCEP...';
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`,
      { signal: controle.signal });
    if (!resposta.ok) throw new Error('Falha ao consultar o ViaCEP.');
    const dados = await resposta.json();
    if (controle.signal.aborted || $('cep').value.replace(/\D/g, '') !== cep) return;
    if (dados.erro) {
      $('status-cep').textContent = 'CEP não encontrado. Confira o número informado.';
      return;
    }
    $('logradouro').value = dados.logradouro || '';
    $('bairro').value = dados.bairro || '';
    $('cidade').value = dados.localidade || '';
    $('estado').value = dados.uf || '';
    ultimoCEP = cep;
    $('status-cep').textContent = 'Endereço encontrado. Complete o número e, se necessário, os demais campos.';
  } catch (erro) {
    if (erro.name !== 'AbortError') $('status-cep').textContent = 'ViaCEP indisponível. Tente novamente ou preencha o endereço manualmente.';
  } finally {
    if (consultaCEP === controle) {
      consultaCEP = null;
      $('buscar-cep').disabled = false;
    }
  }
}
$('cep').addEventListener('input', () => {
  cancelarConsulta();
  const cep = $('cep').value.replace(/\D/g, '');
  if (cep !== ultimoCEP) {
    for (const id of ['logradouro', 'bairro', 'cidade', 'estado']) $(id).value = '';
    $('status-cep').textContent = '';
  }
});
$('cep').addEventListener('blur', () => {
  const cep = $('cep').value.replace(/\D/g, '');
  if (cep.length === 8 && cep !== ultimoCEP) buscarCEP();
});
$('buscar-cep').addEventListener('click', buscarCEP);
$('novo').addEventListener('click', () => abrirFormulario());
$('cancelar').addEventListener('click', fecharFormulario);
$('pesquisa').addEventListener('input', renderizar);
$('form-contato').addEventListener('submit', async evento => {
  evento.preventDefault();
  if (consultaCEP) { avisar('Aguarde a consulta do CEP terminar.', true); return; }
  $('salvar').disabled = true;
  const atualizando = editando !== null;
  const dados = Object.fromEntries(new FormData($('form-contato')));
  try {
    await api(atualizando ? `/api/contatos/${editando}` : '/api/contatos', {
      method: atualizando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    });
    fecharFormulario();
    $('pesquisa').value = '';
    await carregar();
    avisar(atualizando ? 'Contato atualizado com sucesso.' : 'Contato cadastrado com sucesso.');
  } catch (erro) { avisar(erro.message, true); }
  finally { $('salvar').disabled = false; }
});
$('cancelar-exclusao').addEventListener('click', () => $('confirmacao').close());
$('confirmar-exclusao').addEventListener('click', async () => {
  $('confirmar-exclusao').disabled = true;
  try {
    await api(`/api/contatos/${excluindo}`, { method: 'DELETE' });
    $('confirmacao').close();
    if (editando === excluindo) fecharFormulario();
    await carregar();
    avisar('Contato excluído com sucesso.');
  } catch (erro) { $('confirmacao').close();avisar(erro.message, true); }
  finally { $('confirmar-exclusao').disabled = false; }
});
carregar().catch(erro => avisar(erro.message, true));
