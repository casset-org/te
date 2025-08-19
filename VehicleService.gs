/**
 * @file VehicleService.gs
 * @description Serviço de Negócio para a entidade Veículo.
 */

const VehicleService = {

  _generateVehicleId: function() {
    const allData = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    if (allData.length === 0) return 'VEI-0001';
    const maxNumber = allData.reduce((max, row) => {
      const id = row.ID_Onibus;
      if (id && id.startsWith('VEI-')) {
        const num = parseInt(id.split('-')[1], 10);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    return 'VEI-' + String(maxNumber + 1).padStart(4, '0');
  },

  _validateVehicleData: function(vehicleData) {
    const errors = [];

    // 1. Validação de Campos Obrigatórios
    const requiredFields = ['Placa', 'Modelo', 'Capacidade_Total'];
    requiredFields.forEach(field => {
      if (!vehicleData[field]) {
        errors.push(`O campo obrigatório '${field}' não foi preenchido.`);
      }
    });

    if (errors.length > 0) return { success: false, message: errors.join(' ') };

    // 2. Validação de Formato e Unicidade
    // Placa
    const placa = vehicleData.Placa.toUpperCase();
    if (!CONFIG.VALIDATION.PATTERNS.PLACA_MERCOSUL.test(placa)) {
      errors.push('Placa inválida. Use o formato Mercosul (AAA1B23).');
    } else {
      const existingVehicle = SheetService.findRow(CONFIG.SHEETS.VEICULOS, 'Placa', placa);
      if (existingVehicle && existingVehicle.rowData.ID_Onibus !== vehicleData.ID_Onibus) {
        errors.push(`A placa '${placa}' já está cadastrada para outro veículo.`);
      }
    }

    // Capacidade Total
    const capacidade = parseInt(vehicleData.Capacidade_Total, 10);
    if (isNaN(capacidade) || capacidade <= 0) {
      errors.push('Capacidade Total deve ser um número inteiro positivo.');
    }

    if (errors.length > 0) {
      return { success: false, message: errors.join(' ') };
    }

    return { success: true };
  },

  registerOrUpdate: function(formData) {
    try {
      const vehicleData = {
        ID_Onibus: formData.ID_Onibus || this._generateVehicleId(),
        Placa: formData.Placa || '',
        Modelo: formData.Modelo || '',
        Capacidade_Total: formData.Capacidade_Total || ''
      };

      const validation = this._validateVehicleData(vehicleData);
      if (!validation.success) return validation;

      const existingVehicle = SheetService.findRow(CONFIG.SHEETS.VEICULOS, 'Placa', vehicleData.Placa.toUpperCase());

      if (existingVehicle) {
        SheetService.updateRow(CONFIG.SHEETS.VEICULOS, existingVehicle.rowIndex, vehicleData);
        return { success: true, message: 'Veículo atualizado com sucesso!' };
      } else {
        SheetService.appendRow(CONFIG.SHEETS.VEICULOS, vehicleData);
        return { success: true, message: 'Veículo cadastrado com sucesso!' };
      }

    } catch (e) {
      LoggerService.logEvent('VehicleService', LoggerService.LEVELS.ERROR, 'Erro ao registrar/atualizar veículo.', { error: e.message, stack: e.stack, formData });
      return { success: false, message: 'Ocorreu um erro interno ao gerenciar o veículo.' };
    }
  }
};