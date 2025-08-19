/**
 * @file VehicleRegistration.gs
 * @description Handles vehicle registration and information retrieval.
 */

/**
 * Registers a new vehicle or updates an existing one based on its plate.
 * This function acts as a high-level interface for the UI, delegating the core logic
 * to the VehicleService.
 *
 * @param {string} plate The vehicle's license plate.
 * @param {string} model The model of the vehicle.
 * @param {number} capacity The total passenger capacity of the vehicle.
 * @returns {object} An object indicating the result of the operation, as returned by VehicleService.
 */
function registerVehicle(plate, model, capacity) {
  const formData = {
    Placa: plate,
    Modelo: model,
    Capacidade_Total: capacity
  };
  return VehicleService.registerOrUpdate(formData);
}

/**
 * Retrieves information for a specific vehicle by its license plate.
 *
 * @param {string} plate The license plate of the vehicle to find.
 * @returns {object|null} An object containing the vehicle's data {plate, model, capacity} or null if not found.
 */
function getVehicleInfo(plate) {
  const vehicle = SheetService.findRow(CONFIG.SHEETS.VEICULOS, 'Placa', plate);
  if (vehicle && vehicle.rowData) {
    return {
      plate: vehicle.rowData.Placa,
      model: vehicle.rowData.Modelo,
      capacity: vehicle.rowData.Capacidade_Total
    };
  }
  return null;
}