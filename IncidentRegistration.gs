function registerIncident(date, type, description, involved) {
  const formData = {
    Data_Incidente: date,
    Tipo_Incidente: type,
    Descricao: description,
    Envolvidos: involved
  };
  return IncidentService.register(formData);
}

function getIncidentInfo(date, type) {
  const incidents = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
  const filteredIncidents = incidents.filter(incident => {
    const incidentDate = new Date(incident.Data_Incidente);
    const searchDate = new Date(date);
    return incidentDate.toDateString() === searchDate.toDateString() && incident.Tipo_Incidente === type;
  });

  return filteredIncidents.map(incident => ({
    date: new Date(incident.Data_Incidente).toLocaleDateString(),
    type: incident.Tipo_Incidente,
    description: incident.Descricao,
    involved: incident.Envolvidos
  }));
}
