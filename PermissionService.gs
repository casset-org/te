/**
 * @file PermissionService.gs
 * @description Define quais papéis (roles) podem submeter quais tipos de formulários.
 */

const PermissionService = {
  PERMISSIONS: {
    'MONITOR': ['frequencia-ida', 'frequencia-volta'],
    'SECRETARY': [
      'alunos', 'monitores', 'secretarios', 'rotas',
      'ponto-facultativo', 'reposicao', 'atividade-extracurricular',
      'controle-vagas'
    ]
  },

  /**
   * Verifica se um usuário com um determinado papel tem permissão para submeter um formulário.
   * @param {string} role O papel do usuário (ex: 'MONITOR', 'SECRETARY').
   * @param {string} formType O tipo do formulário (ex: 'alunos', 'frequencia').
   * @returns {boolean} Verdadeiro se tiver permissão, falso caso contrário.
   */
  canSubmit: function(role, formType) {
    if (!role || !this.PERMISSIONS[role]) {
      return false;
    }
    return this.PERMISSIONS[role].includes(formType);
  }
};
