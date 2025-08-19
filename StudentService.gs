/**
 * @file StudentService.gs
 * @description Serviço de Negócio para a entidade Aluno.
 */

const StudentService = {

  _generateStudentId: function() {
    const allData = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    if (allData.length === 0) return 'ALU-0001';
    // Encontra o maior número de ID existente e incrementa
    const maxNumber = allData.reduce((max, row) => {
      const id = row.ID_Aluno;
      if (id && id.startsWith('ALU-')) {
        const num = parseInt(id.split('-')[1], 10);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    return 'ALU-' + String(maxNumber + 1).padStart(4, '0');
  },

  _validateStudentData: function(studentData, isUpdate = false) {
    const errors = [];

    // 1. Validação de Campos Obrigatórios
    const requiredFields = ['Nome_Completo', 'RA_Aluno', 'ID_Rota', 'Celular_Responsavel']; // RA_Aluno added as required
    requiredFields.forEach(field => {
      if (!studentData[field]) {
        errors.push(`O campo obrigatório '${field}' não foi preenchido.`);
      }
    });

    if (errors.length > 0) return { success: false, message: errors.join(' ') };

    // 2. Validação de Formato e Existência
    // CPF
    if (studentData.CPF) {
      const cleanCpf = String(studentData.CPF).replace(/\D/g, '');
      if (!CONFIG.VALIDATION.PATTERNS.CPF.test(cleanCpf)) {
        errors.push('CPF inválido. Deve conter 11 dígitos numéricos.');
      } else {
        // Verifica Unicidade do CPF
        const existingStudent = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'CPF', cleanCpf);
        if (existingStudent && existingStudent.rowData.ID_Aluno !== studentData.ID_Aluno) {
            errors.push(`CPF já cadastrado para outro aluno (${existingStudent.rowData.Nome_Completo}).`);
        }
      }
    }

    // RA_Aluno - Unicidade
    if (studentData.RA_Aluno) {
      const existingStudentByRA = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'RA_Aluno', studentData.RA_Aluno);
      if (existingStudentByRA && existingStudentByRA.rowData.ID_Aluno !== studentData.ID_Aluno) {
        errors.push(`RA_Aluno já cadastrado para outro aluno (${existingStudentByRA.rowData.Nome_Completo}).`);
      }
    }

    // Telefones
    const phoneFields = ['Celular_Responsavel', 'Contato_Emergencia_Telefone'];
    phoneFields.forEach(field => {
        if (studentData[field]) {
            const cleanPhone = String(studentData[field]).replace(/\D/g, '');
            if (!CONFIG.VALIDATION.PATTERNS.CELULAR.test(cleanPhone)) {
                errors.push(`O campo '${field}' é inválido. Deve conter 10 ou 11 dígitos numéricos.`);
            }
        }
    });

    // ID_Rota
    const routeExists = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', studentData.ID_Rota);
    if (!routeExists) {
        errors.push(`A rota com ID '${studentData.ID_Rota}' não foi encontrada.`);
    }

    if (errors.length > 0) {
      return { success: false, message: errors.join(' ') };
    }

    return { success: true };
  },

  registerOrUpdate: function(formData) {
    try {
      // Mapeia formData do HTML para o formato da planilha
      const studentData = {
        ID_Aluno: formData.ID_Aluno || '', // Será gerado se for novo
        Nome_Completo: formData.Nome_Completo || '',
        CPF: formData.CPF ? String(formData.CPF).replace(/\D/g, '') : '',
        RA_Aluno: formData.RA_Aluno || '',
        ID_Rota: formData.ID_Rota || '',
        Nome_Acompanhante: formData.Nome_Acompanhante || '',
        Celular_Responsavel: formData.Celular_Responsavel ? String(formData.Celular_Responsavel).replace(/\D/g, '') : '',
        Endereco: formData.Endereco || '',
        Contato_Emergencia_Nome: formData.Contato_Emergencia_Nome || '',
        Contato_Emergencia_Telefone: formData.Contato_Emergencia_Telefone ? String(formData.Contato_Emergencia_Telefone).replace(/\D/g, '') : '',
        Informacoes_Medicas: formData.Informacoes_Medicas || '',
        Foto_Aluno_URL: '', // Será preenchido após upload
      };

      const isUpdate = !!studentData.ID_Aluno;
      const validation = this._validateStudentData(studentData, isUpdate);
      if (!validation.success) return validation;

      // A verificação de capacidade da rota permanece aqui, pois depende da lógica de acompanhante
      const route = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', studentData.ID_Rota);
      if (route) {
        const studentsOnRoute = this.getStudentsByRoute(studentData.ID_Rota);
        const maxCapacity = route.rowData.Vagas_Totais_no_Veiculo || 0;
        const requiredSeats = studentData.Nome_Acompanhante ? 2 : 1;

        // Lógica de verificação de capacidade para novos alunos e atualizações
        let currentStudentSeats = 0;
        if(isUpdate) {
            const existingStudent = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'ID_Aluno', studentData.ID_Aluno);
            if(existingStudent) {
                currentStudentSeats = existingStudent.rowData.Nome_Acompanhante ? 2 : 1;
            }
        }

        const occupiedSeats = studentsOnRoute.reduce((total, student) => {
          return total + (student.Nome_Acompanhante ? 2 : 1);
        }, 0);

        if ((occupiedSeats - currentStudentSeats + requiredSeats) > maxCapacity) {
            return { success: false, message: `A rota não tem capacidade suficiente. Vagas ocupadas: ${occupiedSeats}, Capacidade: ${maxCapacity}.` };
        }
      }

      // Lógica de upload de foto
      if (formData.studentPhotoBase64) {
        const photoFileName = `foto_aluno_${studentData.CPF || studentData.ID_Aluno}_${new Date().getTime()}.png`;
        const photoUrl = DriveService.saveFileFromBase64(formData.studentPhotoBase64, photoFileName);
        studentData.Foto_Aluno_URL = photoUrl;
      } else if (isUpdate) {
        const existingStudent = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'ID_Aluno', studentData.ID_Aluno);
        if (existingStudent && existingStudent.rowData.Foto_Aluno_URL) {
            studentData.Foto_Aluno_URL = existingStudent.rowData.Foto_Aluno_URL;
        }
      }

      if (isUpdate) {
        const existingStudent = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'ID_Aluno', studentData.ID_Aluno);
        SheetService.updateRow(CONFIG.SHEETS.ALUNOS, existingStudent.rowIndex, studentData);
        return { success: true, message: 'Aluno atualizado com sucesso!' };
      } else {
        studentData.ID_Aluno = this._generateStudentId();
        SheetService.appendRow(CONFIG.SHEETS.ALUNOS, studentData);
        return { success: true, message: 'Aluno cadastrado com sucesso!' };
      }

    } catch (e) {
      LoggerService.logEvent('StudentService', LoggerService.LEVELS.ERROR, 'Erro ao registrar/atualizar aluno.', { error: e.message, stack: e.stack, formData });
      return { success: false, message: 'Ocorreu um erro interno ao gerenciar o aluno.' };
    }
  },

  getStudentsByRoute: function(routeId) {
    // Always return students for the specified route, regardless of CPF validity
    const allStudents = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    return allStudents.filter(student => student.ID_Rota === routeId);
  },

  /**
   * Busca um aluno pelo seu Registro Acadêmico (RA_Aluno).
   * @param {string} raAluno O Registro Acadêmico do aluno.
   * @returns {{success: boolean, data: object|null, message?: string}} Objeto de resultado.
   */
  getStudentByRA: function(raAluno) {
    try {
      const student = SheetService.findRow(CONFIG.SHEETS.ALUNOS, 'RA_Aluno', raAluno);
      if (student) {
        return { success: true, data: student.rowData };
      } else {
        return { success: false, message: `Aluno com RA '${raAluno}' não encontrado.`, data: null };
      }
    } catch (e) {
      LoggerService.logEvent('StudentService', LoggerService.LEVELS.ERROR, 'Erro ao buscar aluno por RA.', { error: e.message, stack: e.stack, raAluno });
      return { success: false, message: 'Erro interno ao buscar aluno por RA.', data: null };
    }
  },

  // Função para ser chamada pelo frontend para obter dados iniciais (escolas, rotas, etc.)
  getInitialDataForStudentForm: function() {
    try {
      const schools = SheetService.getAllData(CONFIG.SHEETS.ESCOLAS).map(row => row.Nome_Escola);
      const routes = SheetService.getAllData(CONFIG.SHEETS.ROTAS).map(row => ({
        ID_Rota: row.ID_Rota,
        Nome_Rota: row.ID_Rota + ' - ' + row.Nome_Escola + ' (' + row.Turno + ')',
        Nome_Escola: row.Nome_Escola,
        Vagas_Totais_no_Veiculo: row.Vagas_Totais_no_Veiculo
      }));
      return { success: true, data: { schools, routes } };
    } catch (e) {
      LoggerService.logEvent('StudentService', LoggerService.LEVELS.ERROR, 'Erro ao obter dados iniciais para formulário de aluno.', { error: e.message, stack: e.stack });
      return { success: false, message: 'Erro ao carregar dados iniciais.' };
    }
  },

  // Função para ser chamada pelo frontend para obter informações de capacidade da rota
  getRouteCapacityInfo: function(routeId) {
    try {
      const route = SheetService.findRow(CONFIG.SHEETS.ROTAS, 'ID_Rota', routeId);
      if (!route) {
        return { success: false, message: 'Rota não encontrada.' };
      }

      const studentsOnRoute = this.getStudentsByRoute(routeId);
      const occupiedSeats = studentsOnRoute.reduce((total, student) => {
        return total + 1 + (student.Nome_Acompanhante ? 1 : 0);
      }, 0);

      const totalCapacity = route.rowData.Vagas_Totais_no_Veiculo;
      const availableSeats = totalCapacity - occupiedSeats;

      return { success: true, data: { totalCapacity, occupiedSeats, availableSeats } };
    } catch (e) {
      LoggerService.logEvent('StudentService', LoggerService.LEVELS.ERROR, 'Erro ao obter informações de capacidade da rota.', { error: e.message, stack: e.stack, routeId });
      return { success: false, message: 'Erro ao carregar capacidade da rota.' };
    }
  }
};