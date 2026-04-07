const sensorState = {
  accuracy: 95,
  objectsDetected: 214,
  dataProcessed: 100,
  alignment: 95,
  inconsistencies: 12,
  anomalies: 5,
  cameraConfidence: 97,
  sonarRange: 5,
  gprDepth: 2,
  cycle: 0
};

const chartSeries = {
  labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
  alignment: [91, 92, 93, 95, 94, 95, 95],
  anomalies: [9, 8, 7, 6, 5, 5, 4]
};

let analysisChart = null;
let liveInterval = null;
let analysisRunning = false;

const accuracyEl = document.getElementById("accuracy");
const objectsEl = document.getElementById("objects");
const dataProcessedEl = document.getElementById("dataProcessed");
const alignmentEl = document.getElementById("alignment");
const inconsistenciesEl = document.getElementById("inconsistencies");
const anomaliesEl = document.getElementById("anomalies");
const cameraFeedEl = document.getElementById("cameraFeed");
const sonarFeedEl = document.getElementById("sonarFeed");
const gprFeedEl = document.getElementById("gprFeed");
const startAnalysisBtn = document.getElementById("startAnalysis");
const exportReportBtn = document.getElementById("exportReport");
const themeToggleBtn = document.getElementById("themeToggle");
const subsurfaceCanvas = document.getElementById("subsurfaceCanvas");

function injectAdditionalMarkup() {
  const analysisPanel = document.querySelector(".analysis-panel");
  const subsurfacePanel = document.querySelector(".subsurface-panel");
  const dashboardGrid = document.querySelector(".dashboard-grid");

  if (analysisPanel && !document.getElementById("analysisTrendChart")) {
    const chartWrap = document.createElement("div");
    chartWrap.className = "analysis-chart-wrap";
    chartWrap.innerHTML = 'anvas id="analysisTrendChart"></canvas>';
    analysisPanel.appendChild(chartWrap);
  }

  if (subsurfacePanel && !document.getElementById("subsurfaceNote")) {
    const note = document.createElement("div");
    note.id = "subsurfaceNote";
    note.className = "data-mini";
    note.innerHTML = `
      <span>Last validated metallic debris cluster: 0.9m</span>
      <span>Pipe structure confidence: 95%</span>
      <span>Subsurface cavity confidence: 88%</span>
    `;
    subsurfacePanel.appendChild(note);
  }

  if (dashboardGrid && !document.querySelector(".status-strip")) {
    const statusStrip = document.createElement("div");
    statusStrip.className = "status-strip";
    statusStrip.innerHTML = `
      <div class="status-card">
        <h4>Camera Validation</h4>
        <p id="cameraStatusText">Visual feed stable</p>
        <small id="cameraStatusMeta">Low false-positive variance</small>
      </div>
      <div class="status-card">
        <h4>Sonar Mapping</h4>
        <p id="sonarStatusText">Depth scan synchronized</p>
        <small id="sonarStatusMeta">Surface wave noise normalized</small>
      </div>
      <div class="status-card">
        <h4>GPR Reliability</h4>
        <p id="gprStatusText">Subsurface return aligned</p>
        <small id="gprStatusMeta">Layer penetration within target range</small>
      </div>
      <div class="status-card">
        <h4>Fusion Output</h4>
        <p id="fusionStatusText">Decision pipeline healthy</p>
        <small id="fusionStatusMeta">Cross-sensor consistency maintained</small>
      </div>
    `;
    dashboardGrid.appendChild(statusStrip);
  }
}

function createSensorDetailMarkup() {
  const cards = [
    {
      element: cameraFeedEl,
      html: `
        <div class="sensor-data">
          <span class="data-value" id="cameraObjectsValue">${sensorState.objectsDetected} objects</span>
          <span class="data-label">HD Visual Detection</span>
          <div class="data-mini">
            <span id="cameraConfidenceText">Confidence: ${sensorState.cameraConfidence}%</span>
            <span id="cameraAnomalyText">Flagged anomalies: 3</span>
            <span id="cameraTimeText">Last updated: 16:24</span>
          </div>
        </div>
      `
    },
    {
      element: sonarFeedEl,
      html: `
        <div class="sensor-data">
          <span class="data-value" id="sonarDepthValue">0-${sensorState.sonarRange}m depth</span>
          <span class="data-label">Surface Mapping</span>
          <div class="data-mini">
            <span id="sonarReflectionText">Reflection variance: 4.1%</span>
            <span id="sonarNoiseText">Noise normalized: Yes</span>
            <span id="sonarTimeText">Last updated: 16:24</span>
          </div>
        </div>
      `
    },
    {
      element: gprFeedEl,
      html: `
        <div class="sensor-data">
          <span class="data-value" id="gprDepthValue">0-${sensorState.gprDepth}m depth</span>
          <span class="data-label">Subsurface Scanning</span>
          <div class="data-mini">
            <span id="gprLayerText">Dense rock layer: 1.3m</span>
            <span id="gprCavityText">Cavity detection: 0.8m</span>
            <span id="gprTimeText">Last updated: 16:24</span>
          </div>
        </div>
      `
    }
  ];

  cards.forEach(({ element, html }) => {
    const title = element.querySelector("h3");
    element.innerHTML = "";
    element.appendChild(title);
    element.insertAdjacentHTML("beforeend", html);
  });
}

function initializeChart() {
  const chartCanvas = document.getElementById("analysisTrendChart");
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext("2d");

  analysisChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [...chartSeries.labels],
      datasets: [
        {
          label: "Alignment %",
          data: [...chartSeries.alignment],
          borderColor: "#00d4ff",
          backgroundColor: "rgba(0, 212, 255, 0.15)",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: "#00d4ff"
        },
        {
          label: "Anomalies",
          data: [...chartSeries.anomalies],
          borderColor: "#f7b955",
          backgroundColor: "rgba(247, 185, 85, 0.08)",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: "#f7b955",
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#a8bdd9"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#a8bdd9"
          },
          grid: {
            color: "rgba(120, 150, 200, 0.1)"
          }
        },
        y: {
          beginAtZero: false,
          min: 85,
          max: 100,
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#a8bdd9"
          },
          grid: {
            color: "rgba(120, 150, 200, 0.1)"
          }
        },
        y1: {
          position: "right",
          beginAtZero: true,
          min: 0,
          max: 12,
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#a8bdd9"
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function refreshChartTheme() {
  if (!analysisChart) return;

  const color = getComputedStyle(document.body).getPropertyValue("--text-secondary").trim() || "#a8bdd9";
  analysisChart.options.plugins.legend.labels.color = color;
  analysisChart.options.scales.x.ticks.color = color;
  analysisChart.options.scales.y.ticks.color = color;
  analysisChart.options.scales.y1.ticks.color = color;
  analysisChart.update();
}

function updateTopMetrics() {
  accuracyEl.textContent = `${sensorState.accuracy}%`;
  objectsEl.textContent = sensorState.objectsDetected;
  dataProcessedEl.textContent = `${sensorState.dataProcessed}GB`;
  alignmentEl.textContent = `${sensorState.alignment}%`;
  inconsistenciesEl.textContent = sensorState.inconsistencies;
  anomaliesEl.textContent = sensorState.anomalies;
}

function updateSensorCards() {
  const cameraObjectsValue = document.getElementById("cameraObjectsValue");
  const cameraConfidenceText = document.getElementById("cameraConfidenceText");
  const cameraAnomalyText = document.getElementById("cameraAnomalyText");
  const cameraTimeText = document.getElementById("cameraTimeText");
  const sonarDepthValue = document.getElementById("sonarDepthValue");
  const sonarReflectionText = document.getElementById("sonarReflectionText");
  const sonarNoiseText = document.getElementById("sonarNoiseText");
  const sonarTimeText = document.getElementById("sonarTimeText");
  const gprDepthValue = document.getElementById("gprDepthValue");
  const gprLayerText = document.getElementById("gprLayerText");
  const gprCavityText = document.getElementById("gprCavityText");
  const gprTimeText = document.getElementById("gprTimeText");

  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  cameraObjectsValue.textContent = `${sensorState.objectsDetected} objects`;
  cameraConfidenceText.textContent = `Confidence: ${sensorState.cameraConfidence}%`;
  cameraAnomalyText.textContent = `Flagged anomalies: ${Math.max(1, sensorState.anomalies - 2)}`;
  cameraTimeText.textContent = `Last updated: ${now}`;

  sonarDepthValue.textContent = `0-${sensorState.sonarRange}m depth`;
  sonarReflectionText.textContent = `Reflection variance: ${(3 + Math.random() * 2).toFixed(1)}%`;
  sonarNoiseText.textContent = `Noise normalized: ${sensorState.inconsistencies <= 10 ? "Yes" : "Monitoring"}`;
  sonarTimeText.textContent = `Last updated: ${now}`;

  gprDepthValue.textContent = `0-${sensorState.gprDepth}m depth`;
  gprLayerText.textContent = `Dense rock layer: ${(1.1 + Math.random() * 0.4).toFixed(1)}m`;
  gprCavityText.textContent = `Cavity detection: ${(0.5 + Math.random() * 0.5).toFixed(1)}m`;
  gprTimeText.textContent = `Last updated: ${now}`;
}

function updateStatusCards() {
  const cameraStatusText = document.getElementById("cameraStatusText");
  const cameraStatusMeta = document.getElementById("cameraStatusMeta");
  const sonarStatusText = document.getElementById("sonarStatusText");
  const sonarStatusMeta = document.getElementById("sonarStatusMeta");
  const gprStatusText = document.getElementById("gprStatusText");
  const gprStatusMeta = document.getElementById("gprStatusMeta");
  const fusionStatusText = document.getElementById("fusionStatusText");
  const fusionStatusMeta = document.getElementById("fusionStatusMeta");

  cameraStatusText.textContent = sensorState.cameraConfidence >= 96 ? "Visual feed stable" : "Visual noise elevated";
  cameraStatusMeta.textContent = sensorState.cameraConfidence >= 96 ? "Low false-positive variance" : "Confidence drift under review";

  sonarStatusText.textContent = sensorState.inconsistencies <= 10 ? "Depth scan synchronized" : "Depth mismatch detected";
  sonarStatusMeta.textContent = sensorState.inconsistencies <= 10 ? "Surface wave noise normalized" : "Follow-up calibration suggested";

  gprStatusText.textContent = sensorState.anomalies <= 5 ? "Subsurface return aligned" : "Subsurface variance elevated";
  gprStatusMeta.textContent = sensorState.anomalies <= 5 ? "Layer penetration within target range" : "Cavity signal needs validation";

  fusionStatusText.textContent = sensorState.alignment >= 95 ? "Decision pipeline healthy" : "Fusion confidence reduced";
  fusionStatusMeta.textContent = sensorState.alignment >= 95 ? "Cross-sensor consistency maintained" : "Review alignment thresholds";
}

function drawSubsurfaceMap() {
  if (!subsurfaceCanvas) return;

  const ctx = subsurfaceCanvas.getContext("2d");
  const width = subsurfaceCanvas.width;
  const height = subsurfaceCanvas.height;

  ctx.clearRect(0, 0, width, height);

  const grd = ctx.createLinearGradient(0, 0, 0, height);
  grd.addColorStop(0, "rgba(12, 26, 48, 0.85)");
  grd.addColorStop(1, "rgba(7, 10, 18, 0.98)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  for (let x = 0; x < width; x += 32) {
    ctx.strokeStyle = "rgba(120, 160, 220, 0.12)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 32) {
    ctx.strokeStyle = "rgba(120, 160, 220, 0.12)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const surfaceY = 58;
  ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, surfaceY);
  ctx.quadraticCurveTo(width * 0.22, surfaceY - 8, width * 0.45, surfaceY + 4);
  ctx.quadraticCurveTo(width * 0.68, surfaceY + 14, width, surfaceY + 2);
  ctx.stroke();

  const metallicX = 92 + (sensorState.cycle % 20);
  const metallicY = 178;
  ctx.fillStyle = "rgba(110, 211, 255, 0.95)";
  ctx.shadowColor = "rgba(110, 211, 255, 0.8)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(metallicX, metallicY, 11, 0, Math.PI * 2);
  ctx.fill();

  const pipeY = 222;
  ctx.strokeStyle = "rgba(155, 123, 255, 0.95)";
  ctx.lineWidth = 8;
  ctx.shadowColor = "rgba(155, 123, 255, 0.6)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(164, pipeY);
  ctx.lineTo(322, pipeY - 18);
  ctx.stroke();

  const cavityX = 286;
  const cavityY = 154 + Math.sin(sensorState.cycle / 2) * 4;
  ctx.fillStyle = "rgba(255, 192, 106, 0.95)";
  ctx.shadowColor = "rgba(255, 192, 106, 0.7)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(cavityX, cavityY, 24, 15, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(232, 241, 255, 0.92)";
  ctx.font = "12px Rajdhani";
  ctx.fillText("Metallic Debris", metallicX - 28, metallicY - 18);
  ctx.fillText("Pipe Structure", 188, pipeY - 18);
  ctx.fillText("Subsurface Cavity", cavityX - 38, cavityY - 20);

  ctx.strokeStyle = "rgba(0, 212, 255, 0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(80 + i * 60, height);
    ctx.stroke();
  }
}

function animatePipeline() {
  const stages = document.querySelectorAll(".pipeline-stage");
  stages.forEach((stage, index) => {
    stage.classList.remove("active");
    if (index === sensorState.cycle % stages.length) {
      stage.classList.add("active");
      stage.classList.add("pulse");
      setTimeout(() => stage.classList.remove("pulse"), 900);
    }
  });
}

function updateChartData() {
  if (!analysisChart) return;

  const nextLabel = `T${chartSeries.labels.length + 1}`;
  chartSeries.labels.push(nextLabel);
  chartSeries.alignment.push(sensorState.alignment);
  chartSeries.anomalies.push(sensorState.anomalies);

  if (chartSeries.labels.length > 10) {
    chartSeries.labels.shift();
    chartSeries.alignment.shift();
    chartSeries.anomalies.shift();
  }

  analysisChart.data.labels = [...chartSeries.labels];
  analysisChart.data.datasets[0].data = [...chartSeries.alignment];
  analysisChart.data.datasets[1].data = [...chartSeries.anomalies];
  analysisChart.update();
}

function applyAlertStates() {
  if (sensorState.inconsistencies >= 14) {
    sonarFeedEl.classList.add("flash-warning");
    setTimeout(() => sonarFeedEl.classList.remove("flash-warning"), 1200);
  }

  if (sensorState.anomalies >= 7) {
    gprFeedEl.classList.add("flash-warning");
    setTimeout(() => gprFeedEl.classList.remove("flash-warning"), 1200);
  }
}

function simulateSensorUpdate() {
  sensorState.cycle += 1;

  const objectDelta = Math.floor(Math.random() * 9) - 3;
  const inconsistencyDelta = Math.floor(Math.random() * 5) - 2;
  const anomalyDelta = Math.floor(Math.random() * 3) - 1;
  const alignmentDelta = Math.floor(Math.random() * 3) - 1;

  sensorState.objectsDetected = Math.max(190, Math.min(240, sensorState.objectsDetected + objectDelta));
  sensorState.inconsistencies = Math.max(6, Math.min(18, sensorState.inconsistencies + inconsistencyDelta));
  sensorState.anomalies = Math.max(2, Math.min(9, sensorState.anomalies + anomalyDelta));
  sensorState.alignment = Math.max(90, Math.min(98, sensorState.alignment + alignmentDelta));
  sensorState.accuracy = Math.max(92, Math.min(97, Math.round((sensorState.alignment * 0.6 + (100 - sensorState.inconsistencies) * 0.4))));
  sensorState.cameraConfidence = Math.max(93, Math.min(99, sensorState.cameraConfidence + (Math.random() > 0.5 ? 1 : -1)));
  sensorState.dataProcessed = Math.max(100, Math.min(140, sensorState.dataProcessed + (Math.random() > 0.5 ? 2 : 1)));

  updateTopMetrics();
  updateSensorCards();
  updateStatusCards();
  drawSubsurfaceMap();
  animatePipeline();
  updateChartData();
  applyAlertStates();
}

function toggleAnalysis() {
  analysisRunning = !analysisRunning;

  if (analysisRunning) {
    startAnalysisBtn.textContent = "Pause Analysis";
    liveInterval = setInterval(simulateSensorUpdate, 2200);
    startAnalysisBtn.classList.add("pulse");
  } else {
    startAnalysisBtn.textContent = "Start Data Analysis";
    clearInterval(liveInterval);
    startAnalysisBtn.classList.remove("pulse");
  }
}

function exportReport() {
  const report = `
AQUA TERRA EXPLORER - SENSOR FUSION REPORT
=========================================
Operational Accuracy: ${sensorState.accuracy}%
Objects Detected: ${sensorState.objectsDetected}
Data Processed: ${sensorState.dataProcessed}GB
Cross-Sensor Alignment: ${sensorState.alignment}%
Inconsistencies: ${sensorState.inconsistencies}
Anomalies Detected: ${sensorState.anomalies}
Camera Confidence: ${sensorState.cameraConfidence}%
Sonar Scan Range: 0-${sensorState.sonarRange}m
GPR Scan Depth: 0-${sensorState.gprDepth}m

Summary:
The multi-sensor validation pipeline shows ${sensorState.alignment >= 95 ? "strong" : "moderate"} cross-sensor consistency.
Current anomaly count indicates ${sensorState.anomalies <= 5 ? "stable" : "elevated"} environmental variance.
Subsurface interpretation confidence remains suitable for downstream decision workflows.
  `.trim();

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aqua-terra-explorer-report.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  themeToggleBtn.textContent = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
  refreshChartTheme();
  drawSubsurfaceMap();
}

function initDashboard() {
  injectAdditionalMarkup();
  createSensorDetailMarkup();
  updateTopMetrics();
  updateSensorCards();
  updateStatusCards();
  drawSubsurfaceMap();
  initializeChart();

  startAnalysisBtn.addEventListener("click", toggleAnalysis);
  exportReportBtn.addEventListener("click", exportReport);
  themeToggleBtn.addEventListener("click", toggleTheme);
}

initDashboard();