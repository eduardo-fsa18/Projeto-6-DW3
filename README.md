# Projeto 06 Agenda de contatos

**Disciplina:** Desenvolvimento Web III  
**Aluno:** Michael Douglas Dantas da Silva  
**RA:** 2171392521034

Agenda de contatos com nome, e-mail, telefone, data de nascimento e endereço consultado pela API ViaCEP. Permite cadastrar, listar, pesquisar, editar e excluir contatos. Os registros são gravados no SQLite.

## Como executar

Instale o **Node.js 24 ou superior**. Esta versão usa o SQLite que acompanha o Node.js, sem dependências externas.

No Windows, você também pode abrir `Iniciar-agenda.bat`. Ou abra o terminal nesta pasta e execute:

```bash
node app.js
```

Acesse **http://localhost:5000** no navegador. Para encerrar, pressione `Ctrl+C` no terminal.

Se o npm estiver instalado, também pode usar `npm start`. Não é necessário instalar pacotes.

## Como usar

1. Clique em **Novo contato**.
2. Preencha nome, e-mail, telefone com DDD e data de nascimento.
3. Digite um CEP e saia do campo, ou clique em **Buscar CEP**.
4. Complete o número e, se necessário, os demais campos do endereço.
5. Clique em **Salvar contato**.
6. Use **Editar** para alterar os dados ou **Excluir** para remover um contato. A exclusão pede confirmação.

O complemento é opcional. O bairro pode ficar vazio em CEPs de localidades sem bairro informado. A consulta de CEP precisa de internet; em caso de indisponibilidade, o endereço pode ser preenchido manualmente.

O arquivo `data/agenda.sqlite` é criado automaticamente na primeira execução. Fechar o navegador ou reiniciar o servidor não apaga os contatos. O pacote de entrega vem sem contatos cadastrados.

## Arquivos principais

| Arquivo | Função |
| --- | --- |
| `app.js` | Servidor HTTP, rotas CRUD e validação dos dados |
| `database.js` | Criação da tabela e operações parametrizadas no SQLite |
| `public/index.html` | Formulário, lista de contatos e confirmação de exclusão |
| `public/agenda.js` | Comunicação com a API, ViaCEP e atualização da tela |
| `public/style.css` | Estilos da interface e adaptação para telas menores |
| `test/agenda.test.js` | Testes de CRUD, validação e persistência |

## Rotas da API

| Método | Rota | Operação |
| --- | --- | --- |
| GET | `/api/contatos` | Listar todos |
| GET | `/api/contatos/:id` | Consultar um contato |
| POST | `/api/contatos` | Cadastrar |
| PUT | `/api/contatos/:id` | Editar |
| DELETE | `/api/contatos/:id` | Excluir |

## Testes

```bash
node --test
```

Os testes usam bancos separados do arquivo da agenda. A pasta `evidencias` contém os resultados dos testes e capturas da interface.

## Entrega

Envie o ZIP do projeto ou publique os arquivos em um repositório seu, conforme a orientação do professor. O enunciado informa entrega em **14/10/2026 às 07h59**. O projeto ainda não está publicado em uma conta GitHub.

Para publicar em um repositório vazio, substitua o endereço abaixo pelo seu:

```bash
git init
git add .
git commit -m "Cria agenda de contatos do Projeto 06"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/Projeto06-DW3.git
git push -u origin main
```

## Referências

O enunciado pede uma agenda baseada no projeto `261007_Cadastro_CRUD`. O repositório público [Projeto06-DW3 de MacieldSantos](https://github.com/MacieldSantos/Projeto06-DW3) foi consultado como referência de funcionalidades e tecnologias. Os arquivos desta implementação foram escritos para este projeto.

- [ViaCEP — documentação oficial](https://viacep.com.br/)
- [Node.js 24 — SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)
