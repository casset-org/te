# SIG-TE - Sistema Integrado de Gestão de Transporte Escolar

## Visão Geral da Arquitetura

O SIG-TE é estruturado para garantir **separação de responsabilidades**, **consistência de dados** e **facilidade de manutenção**. A solução utiliza Google Apps Script como backend, Google Sheets como base de dados e HTML/JavaScript para o frontend.

### 1. Backend (.gs files)

- Cada arquivo `.gs` representa um serviço ou módulo (ex: `SheetService.gs`, `LoggerService.gs`, `DriveService.gs`).
- Serviços encapsulam operações específicas: leitura/escrita na planilha, autenticação, upload de arquivos, geração de relatórios, etc.
- Funções são expostas ao frontend via `google.script.run`, permitindo chamadas assíncronas.

**Exemplo de Serviço:**
```javascript
const SheetService = {
  appendRow: function(sheetName, rowData) { /* ... */ },
  findRow: function(sheetName, columnName, value) { /* ... */ },
  // ...outros métodos...
};
```

### 2. Frontend (.html files)

- Arquivos HTML definem a interface do usuário, utilizando CSS customizado e JavaScript modular.
- O frontend interage com o backend usando `google.script.run.withSuccessHandler()` e `withFailureHandler()`.
- O objeto global `App` gerencia estado, eventos, UI e integração de dados.

**Exemplo de chamada assíncrona:**
```javascript
google.script.run
  .withSuccessHandler((data) => { /* atualiza UI */ })
  .withFailureHandler((err) => { /* mostra erro */ })
  .getDashboardData();
```

### 3. Configuração Centralizada (`Config.gs`)

- O arquivo `Config.gs` centraliza IDs de planilhas, nomes de abas, cabeçalhos e padrões de validação.
- Alterações em nomes de abas ou estrutura de dados devem ser feitas apenas neste arquivo para garantir consistência.

**Exemplo:**
```javascript
const CONFIG = {
  SPREADSHEET_ID: '...',
  SHEETS: { ALUNOS: 'Alunos', VEICULOS: 'Veículos', ... },
  HEADERS: { ALUNOS: ['ID_Aluno', 'Nome_Completo', ...], ... }
};
```

### 4. Fluxo de Dados

- O frontend coleta dados do usuário, realiza validações básicas e envia para o backend.
- O backend valida, processa e grava os dados na planilha, retornando o resultado para o frontend.
- Logs de eventos e erros são registrados via `LoggerService` para auditoria e depuração.

### 5. Padrões e Boas Práticas

- **Modularidade:** Cada serviço tem responsabilidade única.
- **Consistência:** Uso de `CONFIG.HEADERS` para garantir que todos os módulos conheçam a estrutura dos dados.
- **Centralização:** IDs e nomes de abas em um único local (`Config.gs`).
- **Testabilidade:** Arquitetura facilita testes unitários e de integração (ex: `AddTests.gs`).
- **Feedback ao Usuário:** Operações assíncronas garantem UI responsiva e mensagens claras.

### 6. Testes e Integração

- Testes podem ser criados simulando operações de backend, validando manipulação de dados e regras de negócio.
- Arquivos como `*.integrationtest.gs` podem validar fluxos completos (ex: cadastro de aluno, geração de relatório).
- A configuração de testes é gerenciada por `TestConfig.gs`, que define o ID da planilha de teste, garantindo que os testes de integração operem em um ambiente isolado e controlado.

### 7. Exemplos de Uso

**Registrar um novo aluno:**
1. Usuário preenche formulário no frontend.
2. Dados são enviados via `google.script.run.submitForm('alunos', data, authData)`.
3. Backend valida e grava na aba `Alunos`.
4. Resultado é retornado ao frontend, que atualiza a UI.

**Gerar relatório com Gemini:**
1. Usuário solicita relatório.
2. Backend coleta dados das abas relevantes.
3. Serviço Gemini integra com API externa e retorna relatório detalhado.

### 8. Dicas para Manutenção

- Sempre atualize `Config.gs` ao modificar estrutura de abas ou cabeçalhos.
- Utilize `LoggerService` para registrar operações críticas e facilitar depuração.
- Mantenha serviços pequenos e focados para facilitar testes e reuso.
- Para novos módulos, siga o padrão de expor funções via `Code.gs` e mapear rotas HTML.
- **Detecção e tratamento de duplicatas:** Utilize `IntegrityService.listDuplicates(sheet, campo)` para listar duplicatas. Para mesclar/remover, use `mergeDuplicates` ou `removeDuplicatesKeepLatest`.
- **Relatórios Gemini de duplicatas:** Crie botões no frontend que chamem `GeminiReportService.generateDuplicatesReport(apiKey)` para análise automática e sugestões de ação.

---

## Diagnóstico de Consistência dos Dados

Se você está com dificuldade de acessar o SIG-TE ou percebe inconsistências nos dashboards ou formulários, siga estes passos:

1. **Verifique o arquivo Config.gs:**
   - O valor de `SPREADSHEET_ID` deve ser o ID exato da sua planilha Google.
   - Os nomes das abas em `CONFIG.SHEETS` devem corresponder exatamente (case-sensitive) aos nomes das abas na planilha.
   - Os cabeçalhos em `CONFIG.HEADERS` devem corresponder exatamente (case-sensitive e ordem) à primeira linha de cada aba.

2. **Execute o diagnóstico de consistência:**
   - No Apps Script Editor, execute:
     ```javascript
     SheetService.verifySystemDataConsistency();
     ```
   - O resultado mostrará abas ou cabeçalhos faltantes ou divergentes.

3. **Corrija as inconsistências:**
   - Ajuste os nomes das abas e cabeçalhos na planilha ou em Config.gs para garantir correspondência exata.

4. **Permissões:**
   - Certifique-se que o Apps Script tem permissão para acessar a planilha (verifique em "Recursos > Serviços Google" e autorizações do projeto).

---

## Referências Rápidas

- **Configuração:** `/TE/Config.gs`
- **Serviços:** `/TE/SheetService.gs`, `/TE/LoggerService.gs`, `/TE/DriveService.gs`, etc.
- **Detecção de duplicatas:** `/TE/IntegrityService.gs` (`listDuplicates`, `mergeDuplicates`, `removeDuplicatesKeepLatest`)
- **Relatório Gemini de duplicatas:** `/TE/GeminiIntegration.gs` (`generateDuplicatesReport`)
- **Sugestão de botões:** No frontend, adicione botões que chamem as funções acima via `google.script.run`.

---

## Observações

A arquitetura do SIG-TE foi desenhada para ser **robusta**, **escalável** e **de fácil manutenção**, aproveitando ao máximo os recursos do Google Apps Script e Google Sheets. Para dúvidas ou sugestões, consulte os comentários nos arquivos ou entre em contato com o mantenedor do projeto.
