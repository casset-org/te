/**
 * Renamed from getDashboard. Generates basic HTML statistics for the dashboard.
 * @returns {string} HTML string with basic dashboard statistics.
 */
function getBasicDashboardHtml() {
  try {
    let students = [];
    let vehicles = [];
    let incidents = [];
    let routes = [];

    try {
      students = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    } catch (e) {
      LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, `Erro ao carregar dados da aba '${CONFIG.SHEETS.ALUNOS}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Erro ao carregar dados da aba '${CONFIG.SHEETS.ALUNOS}': ${e.message}` };
    }

    try {
      vehicles = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    } catch (e) {
      LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, `Erro ao carregar dados da aba '${CONFIG.SHEETS.VEICULOS}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Erro ao carregar dados da aba '${CONFIG.SHEETS.VEICULOS}': ${e.message}` };
    }

    try {
      incidents = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
    } catch (e) {
      LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, `Erro ao carregar dados da aba '${CONFIG.SHEETS.INCIDENTES}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Erro ao carregar dados da aba '${CONFIG.SHEETS.INCIDENTES}': ${e.message}` };
    }

    try {
      routes = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    } catch (e) {
      LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, `Erro ao carregar dados da aba '${CONFIG.SHEETS.ROTAS}'.`, { error: e.message, stack: e.stack });
      return { success: false, message: `Erro ao carregar dados da aba '${CONFIG.SHEETS.ROTAS}': ${e.message}` };
    }

    const totalStudents = students.length;
    let totalCompanions = 0;
    students.forEach(student => {
      // Access by header name
      if (student.Nome_Acompanhante && student.Nome_Acompanhante.trim() !== '') {
        totalCompanions++; // Assuming one companion per student if field is not empty
      }
    });
    const totalPassengers = totalStudents + totalCompanions;

    const totalVehicles = vehicles.length;
    let totalFleetCapacity = 0;
    const buses = vehicles.map(vehicle => {
      // Access by header name
      const idOnibus = vehicle.ID_Onibus;
      const modelo = vehicle.Modelo;
      const capacidadeTotal = Number(vehicle.Capacidade_Total || 0);
      totalFleetCapacity += capacidadeTotal;

      // For occupied seats, we'd need to link students to vehicles/routes.
      // This would require more complex logic to accurately determine occupied seats per bus.
      // For demonstration, let's just say 70% of capacity for occupied seats.
      const occupiedSeats = Math.round(capacidadeTotal * 0.7); 

      return {
        idOnibus: idOnibus,
        modelo: modelo,
        occupiedSeats: occupiedSeats,
        totalSeats: capacidadeTotal
      };
    });

    const averagePassengersPerVehicle = (totalVehicles > 0) ? (totalPassengers / totalVehicles).toFixed(2) : 0;

    const stats = {
      totalStudents: totalStudents,
      totalCompanions: totalCompanions,
      totalPassengers: totalPassengers,
      totalVehicles: totalVehicles,
      totalFleetCapacity: totalFleetCapacity,
      averagePassengersPerVehicle: averagePassengersPerVehicle
    };

    let html = `
      <h4>Estatísticas Gerais</h4>
      <ul>
        <li>Total de Alunos: <b>${stats.totalStudents}</b></li>
        <li>Total de Acompanhantes: <b>${stats.totalCompanions}</b></li>
        <li>Total de Passageiros (Alunos + Acompanhantes): <b>${stats.totalPassengers}</b></li>
        <li>Total de Veículos: <b>${stats.totalVehicles}</b></li>
        <li>Capacidade Total da Frota: <b>${stats.totalFleetCapacity}</b></li>
        <li>Média de Passageiros por Veículo: <b>${stats.averagePassengersPerVehicle}</b></li>
      </ul>
      <h4>Frota de Ônibus</h4>
      <ul>
    `;

    buses.forEach(bus => {
      html += `<li><b>${bus.idOnibus}</b> - Modelo: ${bus.modelo}, Assentos Ocupados: ${bus.occupiedSeats}, Assentos Totais: ${bus.totalSeats}</li>`;
    });

    html += `</ul>`;

    return html;
  } catch (e) {
    LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, 'Erro ao obter dados do Dashboard.', { error: e.message, stack: e.stack });
    return `<i>Erro ao carregar dados do dashboard: ${e.message}</i>`;
  }
}

/**
 * Fetches and processes all data required for the advanced dynamic dashboard.
 * @returns {object} A structured object containing all dashboard data.
 */
function getAdvancedDashboardData() {
  try {
    // 1. Fetch all necessary data
    const students = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    const vehicles = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const incidents = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
    const routes = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    const attendanceIda = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
    const attendanceVolta = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
    const schools = SheetService.getAllData(CONFIG.SHEETS.ESCOLAS);
    const monitors = SheetService.getAllData(CONFIG.SHEETS.MONITORES);

    // 2. Calculate Basic Statistics
    const totalStudents = students.length;
    let totalCompanions = 0;
    students.forEach(student => {
      if (student.Nome_Acompanhante && student.Nome_Acompanhante.trim() !== '') {
        totalCompanions++;
      }
    });
    const totalPassengers = totalStudents + totalCompanions;

    const totalVehicles = vehicles.length;
    let totalFleetCapacity = 0;
    vehicles.forEach(vehicle => {
      totalFleetCapacity += Number(vehicle.Capacidade_Total || 0);
    });
    const averagePassengersPerVehicle = (totalVehicles > 0) ? (totalPassengers / totalVehicles).toFixed(2) : 0;
    const totalRoutes = routes.length;
    const totalMonitors = monitors.length;

    // 3. Prepare Data for Charts
    const chartData = {};

    // Frequency Chart Data (Last 7 Days Attendance)
    const allAttendance = attendanceIda.concat(attendanceVolta);
    const attendanceByDate = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      attendanceByDate[date.toISOString().split('T')[0]] = 0; // Initialize with 0
    }

    allAttendance.forEach(record => {
      try {
        const recordDate = new Date(record.Data_Frequencia); // Assuming a 'Data_Frequencia' field
        recordDate.setHours(0, 0, 0, 0);
        const dateString = recordDate.toISOString().split('T')[0];
        if (attendanceByDate.hasOwnProperty(dateString)) {
          attendanceByDate[dateString] += (Number(record.Qtd_Presentes__Ida || 0) + Number(record.Qtd_Presentes__Volta || 0));
        }
      } catch (e) {
        LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.WARNING, `Invalid date in attendance record: ${record.Data_Frequencia}`, { error: e.message });
      }
    });

    chartData.frequency = {
      labels: Object.keys(attendanceByDate).sort(),
      data: Object.values(attendanceByDate)
    };

    // Occupancy Chart Data (Route Occupancy)
    const occupancyLabels = [];
    const occupancyData = [];
    routes.forEach(route => {
      const routeId = route.ID_Rota;
      const totalCapacity = Number(route.Vagas_Totais_no_Veiculo || 0);
      
      const studentsOnRoute = students.filter(s => s.ID_Rota === routeId);
      let actualOccupied = studentsOnRoute.length;
      studentsOnRoute.forEach(s => {
        if (s.Nome_Acompanhante && s.Nome_Acompanhante.trim() !== '') {
          actualOccupied++; // Assuming companion takes one extra seat
        }
      });

      const occupancyPercentage = totalCapacity > 0 ? ((actualOccupied / totalCapacity) * 100).toFixed(2) : 0;
      occupancyLabels.push(`${route.ID_Rota} (${route.Nome_Escola})`);
      occupancyData.push(occupancyPercentage);
    });
    chartData.occupancy = { labels: occupancyLabels, data: occupancyData };

    // Distribution by Shift (Example)
    const shiftDistribution = {};
    students.forEach(student => {
      const shift = student.Turno || 'Não Informado'; // Assuming a 'Turno' field for students
      shiftDistribution[shift] = (shiftDistribution[shift] || 0) + 1;
    });
    chartData.distribution = {
      labels: Object.keys(shiftDistribution),
      data: Object.values(shiftDistribution)
    };

    // 4. Implement Alert Logic
    const alerts = [];

    // High Occupancy Routes
    routes.forEach(route => {
      const routeId = route.ID_Rota;
      const totalCapacity = Number(route.Vagas_Totais_no_Veiculo || 0);
      const studentsOnRoute = students.filter(s => s.ID_Rota === routeId);
      let actualOccupied = studentsOnRoute.length;
      studentsOnRoute.forEach(s => {
        if (s.Nome_Acompanhante && s.Nome_Acompanhante.trim() !== '') {
          actualOccupied++;
        }
      });
      const occupancyPercentage = totalCapacity > 0 ? ((actualOccupied / totalCapacity) * 100) : 0;

      if (occupancyPercentage > 90) {
        alerts.push({ type: 'critical', title: 'Rota com Alta Ocupação', message: `Rota ${route.ID_Rota} (${route.Nome_Escola}) está com alta ocupação: ${occupancyPercentage.toFixed(2)}%` });
      } else if (occupancyPercentage > 80) {
        alerts.push({ type: 'warning', title: 'Rota Próxima da Capacidade', message: `Rota ${route.ID_Rota} (${route.Nome_Escola}) está se aproximando da capacidade máxima: ${occupancyPercentage.toFixed(2)}%` });
      }
      if (actualOccupied === 0 && totalCapacity > 0) {
        alerts.push({ type: 'warning', title: 'Rota Vazia', message: `Rota ${route.ID_Rota} (${route.Nome_Escola}) está vazia, mas possui capacidade.` });
      }
    });

    // Inactive Monitors (Assuming a 'Status' field in monitors data)
    monitors.forEach(monitor => {
      if (monitor.Status === 'Inativo') { // Adjust field name and value as per actual data
        alerts.push({ type: 'warning', title: 'Monitor Inativo', message: `Monitor ${monitor.Nome_Completo} está inativo.` });
      }
    });

    // Recent Incidents
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentIncidents = incidents.filter(incident => {
      try {
        const incidentDate = new Date(incident.Data_Incidente);
        return incidentDate >= oneWeekAgo;
      } catch (e) {
        LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.WARNING, `Invalid incident date: ${incident.Data_Incidente}`, { error: e.message });
        return false;
      }
    });
    if (recentIncidents.length > 0) {
      alerts.push({ type: 'info', title: 'Incidentes Recentes', message: `Houve ${recentIncidents.length} incidente(s) registrado(s) na última semana.` });
    }

    // 5. Implement Trend Analysis (Total Students vs. previous period, simulated)
    const trends = {};
    const previousTotalStudents = Math.round(totalStudents * 0.95); // 5% less than current
    const studentChange = totalStudents - previousTotalStudents;
    const studentChangePercentage = previousTotalStudents > 0 ? ((studentChange / previousTotalStudents) * 100).toFixed(2) : 0;

    trends.totalStudents = {
      current: totalStudents,
      previous: previousTotalStudents,
      change: `${studentChange > 0 ? '+' : ''}${studentChange} (${studentChangePercentage}%)`,
      tendency: studentChange > 0 ? 'up' : (studentChange < 0 ? 'down' : 'stable')
    };

    // Simulated performance metrics
    const performance = {
      taxaUtilizacaoSistema: (totalPassengers / totalFleetCapacity * 100).toFixed(2),
      eficienciaOcupacaoMedia: (occupancyData.reduce((a, b) => Number(a) + Number(b), 0) / occupancyData.length).toFixed(2),
      coberturaInformacoes: (students.filter(s => s.CPF && s.Celular_Responsavel).length / totalStudents * 100).toFixed(2)
    };

    return {
      stats: {
        totalStudents,
        totalCompanions,
        totalPassengers,
        totalVehicles,
        totalFleetCapacity,
        averagePassengersPerVehicle,
        totalRoutes,
        totalMonitors
      },
      chartData,
      alerts,
      trends,
      performance
    };

  } catch (e) {
    LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, 'Erro ao obter dados avançados do Dashboard.', { error: e.message, stack: e.stack });
    return { success: false, message: `Erro ao carregar dados avançados do dashboard: ${e.message}` };
  }
}

function generateReport(type) {
  try {
    const students = SheetService.getAllData(CONFIG.SHEETS.ALUNOS);
    const vehicles = SheetService.getAllData(CONFIG.SHEETS.VEICULOS);
    const incidents = SheetService.getAllData(CONFIG.SHEETS.INCIDENTES);
    const routes = SheetService.getAllData(CONFIG.SHEETS.ROTAS);
    const attendanceIda = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_IDA);
    const attendanceVolta = SheetService.getAllData(CONFIG.SHEETS.FREQUENCIA_VOLTA);
    const schools = SheetService.getAllData(CONFIG.SHEETS.ESCOLAS);
    const monitors = SheetService.getAllData(CONFIG.SHEETS.MONITORES);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let html = '';

    switch (type) {
      case 'capacity':
        let totalCapacity = 0;
        vehicles.forEach(vehicle => {
          totalCapacity += Number(vehicle.Capacidade_Total || 0);
        });
        let totalStudents = students.length;
        let totalCompanions = 0;
        students.forEach(student => {
          if (student.Nome_Acompanhante && student.Nome_Acompanhante.trim() !== '') {
            totalCompanions++; // Assuming one companion per student if field is not empty
          }
        });
        let totalPassengers = totalStudents + totalCompanions;
        html = `<h4>Relatório de Capacidade da Frota</h4>`;
        html += `<p>Total de passageiros (alunos + acompanhantes): <b>${totalPassengers}</b></p>`;
        html += `<p>Capacidade total da frota: <b>${totalCapacity}</b></p>`;
        html += `<p>Média de passageiros por veículo: <b>${(totalPassengers / (vehicles.length || 1)).toFixed(2)}</b></p>`;
        if (totalPassengers > totalCapacity) {
          html += `<p><span style="color:red;">Atenção: Número de passageiros excede a capacidade da frota!</span></p>`;
        }
        break;

      case 'incidents':
        const monthlyIncidents = incidents.filter(incident => {
          const incidentDate = new Date(incident.Data_Incidente);
          return incidentDate.getMonth() === currentMonth && incidentDate.getFullYear() === currentYear;
        });
        const byType = {};
        monthlyIncidents.forEach(incident => {
          const incidentType = incident.Tipo_Incidente;
          byType[incidentType] = (byType[incidentType] || 0) + 1;
        });
        html = `<h4>Incidentes Mensais (${currentMonth + 1}/${currentYear})</h4>`;
        html += `<p>Total de incidentes: <b>${monthlyIncidents.length}</b></p>`;
        html += `<p>Por tipo:</p><ul>`;
        for (let t in byType) {
          html += `<li>${t}: ${byType[t]}</li>`;
        }
        html += `</ul>`;
        break;

      case 'companions':
        const studentsWithCompanions = students.filter(student => student.Nome_Acompanhante && student.Nome_Acompanhante.trim() !== '');
        html = `<h4>Alunos com Acompanhantes</h4>`;
        html += `<p>Total de alunos com acompanhantes: <b>${studentsWithCompanions.length}</b></p>`;
        html += `<ul>`;
        studentsWithCompanions.forEach(student => {
          html += `<li>${student.Nome_Completo} - Acompanhante: ${student.Nome_Acompanhante}</li>`;
        });
        html += `</ul>`;
        break;

      case 'insights':
        let insights = [];
        // Overcapacity
        let currentTotalStudents = students.length;
        let currentTotalCompanions = 0;
        students.forEach(student => {
          if (student.Nome_Acompanhante && student.Nome_Acompanhante.trim() !== '') {
            currentTotalCompanions++;
          }
        });
        let currentTotalPassengers = currentTotalStudents + currentTotalCompanions;
        let currentTotalCapacity = 0;
        vehicles.forEach(vehicle => {
          currentTotalCapacity += Number(vehicle.Capacidade_Total || 0);
        });
        if (currentTotalPassengers > currentTotalCapacity) {
          insights.push('Atenção: O número total de passageiros excede a capacidade da frota. Considere revisar as rotas ou expandir a frota.');
        }
        // Verifica inconsistências de frequência
        const freqConsistency = AttendanceService.checkAttendanceConsistency();
        if (freqConsistency.success && freqConsistency.inconsistencies.length > 0) {
          insights.push(`Inconsistências de frequência detectadas:`);
          freqConsistency.inconsistencies.forEach(inc => {
            insights.push(
              `Rota ${inc.routeId} em ${inc.date} (${inc.sheet}): Presentes + Ausentes = ${inc.present + inc.absent}, Esperado = ${inc.expected}.`
            );
          });
        }
        // Recurring incidents
        const currentMonthlyIncidents = incidents.filter(incident => {
          const incidentDate = new Date(incident.Data_Incidente);
          return incidentDate.getMonth() === currentMonth && incidentDate.getFullYear() === currentYear;
        });
        const incidentTypes = {};
        currentMonthlyIncidents.forEach(incident => {
          const type = incident.Tipo_Incidente;
          incidentTypes[type] = (incidentTypes[type] || 0) + 1;
        });
        for (let t in incidentTypes) {
          if (incidentTypes[t] > 3) { // Threshold for "recurring"
            insights.push(`Alerta: Incidentes do tipo "${t}" estão acima do esperado este mês.`);
          }
        }
        // Students with most incidents
        const incidentsByStudent = {};
        incidents.forEach(incident => {
          const involved = incident.Envolvidos ? incident.Envolvidos.split(',') : [];
          involved.forEach(name => {
            name = name.trim();
            if (name) incidentsByStudent[name] = (incidentsByStudent[name] || 0) + 1;
          });
        });
        const topStudent = Object.keys(incidentsByStudent).sort((a, b) => incidentsByStudent[b] - incidentsByStudent[a])[0];
        if (topStudent && incidentsByStudent[topStudent] > 1) { // More than one incident
          insights.push(`Aluno com mais incidentes: ${topStudent} (${incidentsByStudent[topStudent]} incidentes). Considere monitoramento.`);
        }
        // Gemini suggestion (simulated)
        insights.push('Sugestão Gemini: Analise a distribuição dos pontos de embarque para otimizar rotas e reduzir atrasos.');
        html = `<h4>Insights do Processo</h4><ul>`;
        insights.forEach(insight => {
          html += `<li>${insight}</li>`;
        });
        html += `</ul>`;
        break;

      case 'attendance_rate':
        // Attendance Rate by Route/School/Monitor
        const allAttendance = attendanceIda.concat(attendanceVolta);
        const attendanceSummary = {}; // { routeId: { totalPresent: X, totalAbsent: Y, totalStudents: Z } }

        allAttendance.forEach(record => {
          const routeId = record.ID_Rota;
          const present = Number(record.Qtd_Presentes__Ida || record.Qtd_Presentes__Volta || 0);
          const absent = Number(record.Qtd_Ausentes_Ida || record.Qtd_Ausentes__Volta || 0);

          if (!attendanceSummary[routeId]) {
            attendanceSummary[routeId] = { totalPresent: 0, totalAbsent: 0, totalRecords: 0 };
          }
          attendanceSummary[routeId].totalPresent += present;
          attendanceSummary[routeId].totalAbsent += absent;
          attendanceSummary[routeId].totalRecords++;
        });

        html = `<h4>Taxa de Frequência por Rota</h4>`;
        html += `<ul>`;
        for (const routeId in attendanceSummary) {
          const summary = attendanceSummary[routeId];
          const totalStudentsRecorded = summary.totalPresent + summary.totalAbsent;
          const attendanceRate = totalStudentsRecorded > 0 ? ((summary.totalPresent / totalStudentsRecorded) * 100).toFixed(2) : 0;
          const routeInfo = routes.find(r => r.ID_Rota === routeId);
          const routeName = routeInfo ? `${routeInfo.ID_Rota} - ${routeInfo.Nome_Escola} (${routeInfo.Turno})` : routeId;
          html += `<li><b>${routeName}</b>: Presentes: ${summary.totalPresent}, Ausentes: ${summary.totalAbsent}, Taxa: ${attendanceRate}%</li>`;
        }
        html += `</ul>`;
        break;

      case 'route_occupancy':
        // Route Occupancy Analysis
        html = `<h4>Análise de Ocupação das Rotas</h4>`;
        html += `<ul>`;
        routes.forEach(route => {
          const routeId = route.ID_Rota;
          const totalCapacity = Number(route.Vagas_Totais_no_Veiculo || 0);
          
          // Calculate actual occupied seats based on student registrations for this route
          const studentsOnRoute = students.filter(s => s.ID_Rota === routeId);
          let actualOccupied = studentsOnRoute.length;
          studentsOnRoute.forEach(s => {
            if (s.Nome_Acompanhante && s.Nome_Acompanhante.trim() !== '') {
              actualOccupied++; // Assuming companion takes one extra seat
            }
          });

          const occupancyPercentage = totalCapacity > 0 ? ((actualOccupied / totalCapacity) * 100).toFixed(2) : 0;
          const status = occupancyPercentage > 90 ? 'Alta Ocupação' : (occupancyPercentage < 50 ? 'Baixa Ocupação' : 'Ocupação Moderada');
          
          html += `<li><b>${route.ID_Rota} - ${route.Nome_Escola} (${route.Turno})</b>: Capacidade: ${totalCapacity}, Ocupação Real: ${actualOccupied}, Percentual: ${occupancyPercentage}% (${status})</li>`;
        });
        html += `</ul>`;
        break;

      default:
        html = '<i>Relatório não encontrado.</i>';
        break;
    }
    return html;
  } catch (e) {
    LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, 'Erro ao gerar relatório.', { error: e.message, stack: e.stack, reportType: type });
    return `<i>Erro ao gerar relatório: ${e.message}</i>`;
  }
}

/**
 * Generates the HTML content for the advanced dynamic dashboard.
 * This function fetches all necessary data and constructs the full HTML structure.
 * @returns {object} The complete HTML string for the dashboard.
 */
function generateAdvancedDashboardHTML() {
  try {
    const dashboardData = getAdvancedDashboardData();
    if (!dashboardData.success && dashboardData.message) {
      return { success: false, html: `<div class="error-message">${dashboardData.message}</div>` };
    }

    const stats = dashboardData.stats;
    const alerts = dashboardData.alerts;
    const trends = dashboardData.trends;
    const performance = dashboardData.performance;

    // --- Overview Tab HTML ---
    let overviewHtml = `
      <div class="stats-grid">
        <div class="stat-item"><span>Total de Alunos</span><strong>${stats.totalStudents}</strong></div>
        <div class="stat-item"><span>Total de Passageiros</span><strong>${stats.totalPassengers}</strong></div>
        <div class="stat-item"><span>Total de Veículos</span><strong>${stats.totalVehicles}</strong></div>
        <div class="stat-item"><span>Total de Rotas</span><strong>${stats.totalRoutes}</strong></div>
        <div class="stat-item"><span>Total de Monitores</span><strong>${stats.totalMonitors}</strong></div>
        <div class="stat-item"><span>Capacidade da Frota</span><strong>${stats.totalFleetCapacity}</strong></div>
        <div class="stat-item"><span>Média Passageiros/Veículo</span><strong>${stats.averagePassengersPerVehicle}</strong></div>
      </div>
    `;

    // --- Analytics Tab HTML ---
    let analyticsHtml = `
      <div class="analytics-container">
        <h3>Análises Avançadas</h3>
        <div class="analytics-grid">
          <div class="analytics-card">
            <h4>Tendências de Alunos</h4>
            <div class="trend-info">
              <p>Atual: <strong>${trends.totalStudents.current}</strong></p>
              <p>Anterior: <strong>${trends.totalStudents.previous}</strong></p>
              <p>Mudança: <span class="trend-${trends.totalStudents.tendency}">${trends.totalStudents.change}</span></p>
            </div>
          </div>
          <div class="analytics-card">
            <h4>Performance do Sistema</h4>
            <div class="performance-info">
              <p>Utilização: <strong>${performance.taxaUtilizacaoSistema}%</strong></p>
              <p>Ocupação Média: <strong>${performance.eficienciaOcupacaoMedia}%</strong></p>
              <p>Cobertura Dados: <strong>${performance.coberturaInformacoes}%</strong></p>
            </div>
          </div>
        </div>
        <div class="charts-section">
          <h4>Gráficos de Análise</h4>
          <div class="charts-grid">
            <div class="chart-container">
              <canvas id="frequencyChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
              <canvas id="occupancyChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
              <canvas id="shiftDistributionChart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // --- Alerts Tab HTML ---
    let alertsHtml = `
      <div class="alerts-container">
        <h3>Alertas do Sistema</h3>
        <div class="alerts-list">
    `;
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        alertsHtml += `
          <div class="alert alert-${alert.type}">
            <div class="alert-icon">${alert.type === 'critical' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}</div>
            <div class="alert-content">
              <h5>${alert.title}</h5>
              <p>${alert.message}</p>
            </div>
          </div>
        `;
      });
    } else {
      alertsHtml += '<div class="info-message">✅ Nenhum alerta no momento. Sistema funcionando normalmente.</div>';
    }
    alertsHtml += `
        </div>
      </div>
    `;

    // --- Reports Tab HTML (Placeholder, actual reports generated by generateReport) ---
    let reportsHtml = `
      <h3>Relatórios Disponíveis</h3>
      <div class="reports-grid">
        <div class="report-card" onclick="generateReport('capacity')">
            <h4>Capacidade da Frota</h4>
            <p>Análise da capacidade total e utilização dos veículos</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="report-card" onclick="generateReport('incidents')">
            <h4>Incidentes Mensais</h4>
            <p>Relatório de incidentes registrados no mês atual</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="report-card" onclick="generateReport('companions')">
            <h4>Alunos com Acompanhantes</h4>
            <p>Lista de alunos que possuem acompanhantes</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="report-card" onclick="generateReport('insights')">
            <h4>Insights do Processo</h4>
            <p>Análises e recomendações baseadas nos dados</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="report-card" onclick="generateReport('attendance_rate')">
            <h4>Taxa de Frequência por Rota</h4>
            <p>Análise da frequência de alunos por rota</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="report-card" onclick="generateReport('route_occupancy')">
            <h4>Ocupação das Rotas</h4>
            <p>Análise detalhada da ocupação de cada rota</p>
            <button class="btn btn-primary">Gerar Relatório</button>
        </div>
      </div>
      <div id="report-output" style="margin-top: var(--space-6);"></div>
    `;

    // Combine all into a single structure that DashboardForm.html expects
    return {
      success: true,
      html: {
        overview: overviewHtml,
        analytics: analyticsHtml,
        alerts: alertsHtml,
        reports: reportsHtml
      },
      chartData: dashboardData.chartData // Pass chart data separately for client-side rendering
    };

  } catch (e) {
    LoggerService.logEvent('Dashboard.gs', LoggerService.LEVELS.ERROR, 'Erro ao gerar HTML do Dashboard Avançado.', { error: e.message, stack: e.stack });
    return { success: false, message: `Erro ao gerar HTML do dashboard: ${e.message}` };
  }
}