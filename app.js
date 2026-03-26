const app = document.getElementById('app');
const templates = {
  main: document.getElementById('main-template'),
  switch: document.getElementById('switch-template'),
  about: document.getElementById('about-template'),
};

const state = {
  switches: [],
  terminal: {
    connected: false,
    protocol: 'ssh',
    host: '',
    history: ['BIOS terminal ready. Use SSH for secure access.'],
  },
};

const fallbackPorts = [
  { port: 1, name: 'GE1/0/1', status: '1', speed: '1000', duplex: 'full', vlan: '10' },
  { port: 2, name: 'GE1/0/2', status: '2', speed: '1000', duplex: 'full', vlan: '20' },
  { port: 3, name: 'GE1/0/3', status: '1', speed: '100', duplex: 'half', vlan: '30' },
  { port: 4, name: 'GE1/0/4', status: '2', speed: '1000', duplex: 'full', vlan: '99' },
];

function setActiveNav(route) {
  document.querySelectorAll('.nav a').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function render(route = location.hash.replace('#', '') || 'main') {
  const template = templates[route] || templates.main;
  app.innerHTML = template.innerHTML;
  setActiveNav(route);
  if (route === 'switch') initSwitchPage();
}

async function fetchPorts(switchItem) {
  const url = `http://localhost:5050/api/snmp/ports?host=${encodeURIComponent(switchItem.host)}&community=${encodeURIComponent(switchItem.community)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Backend unavailable');
    const payload = await response.json();
    return Object.values(payload);
  } catch (error) {
    return fallbackPorts;
  }
}

async function createSwitchCard(switchItem) {
  const ports = await fetchPorts(switchItem);
  switchItem.ports = ports;
  drawSwitches();
}

function drawSwitches() {
  const track = document.getElementById('switch-track');
  if (!track) return;
  if (!state.switches.length) {
    track.innerHTML = '<div class="switch-card"><p>Нет добавленных коммутаторов. Нажмите + чтобы создать первый.</p></div>';
    return;
  }

  track.innerHTML = state.switches.map((sw, swIndex) => {
    const active = sw.ports.filter((port) => String(port.status) === '1').length;
    return `
      <article class="switch-card">
        <p class="panel-label">[ ${sw.name} ]</p>
        <strong>${sw.host}</strong>
        <div class="switch-summary">
          <div class="stat"><span>Портов</span><strong>${sw.ports.length}</strong></div>
          <div class="stat"><span>Активных</span><strong>${active}</strong></div>
        </div>
        <div class="port-list">
          ${sw.ports.map((port, portIndex) => `
            <div class="port-row">
              <div>
                <strong>${port.name}</strong>
                <div>Port ${port.port} · VLAN ${port.vlan} · ${port.speed} Mbps</div>
              </div>
              <span class="badge ${String(port.status) === '1' ? 'up' : 'down'}">${String(port.status) === '1' ? 'ACTIVE' : 'DOWN'}</span>
              <button type="button" data-switch-index="${swIndex}" data-port-index="${portIndex}" class="toggle-port-btn">Toggle</button>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');

  track.querySelectorAll('.toggle-port-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const switchIndex = Number(button.dataset.switchIndex);
      const portIndex = Number(button.dataset.portIndex);
      await togglePort(switchIndex, portIndex);
    });
  });
}

async function togglePort(switchIndex, portIndex) {
  const sw = state.switches[switchIndex];
  const port = sw.ports[portIndex];
  const nextValue = String(port.status) === '1' ? 2 : 1;
  const url = `http://localhost:5050/api/snmp/port/${port.port}/status?host=${encodeURIComponent(sw.host)}&community=${encodeURIComponent(sw.community)}`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: nextValue }),
    });
  } catch (error) {
    console.warn('Using optimistic port update', error);
  }

  port.status = String(nextValue);
  drawSwitches();
}

function renderTerminal() {
  const screen = document.getElementById('terminal-screen');
  if (screen) screen.textContent = state.terminal.history.join('\n');
}

function initSwitchPage() {
  drawSwitches();
  renderTerminal();
  const addButton = document.getElementById('add-switch-btn');
  const formPanel = document.getElementById('switch-form-panel');
  const switchForm = document.getElementById('switch-form');
  const terminalConnect = document.getElementById('terminal-connect');
  const terminalForm = document.getElementById('terminal-form');

  addButton.addEventListener('click', () => formPanel.classList.toggle('hidden'));

  switchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(switchForm);
    const switchItem = {
      name: formData.get('name'),
      host: formData.get('host'),
      community: formData.get('community'),
      ports: [],
    };
    state.switches.push(switchItem);
    switchForm.reset();
    formPanel.classList.add('hidden');
    drawSwitches();
    await createSwitchCard(switchItem);
  });

  terminalConnect.addEventListener('click', async () => {
    const protocol = document.getElementById('terminal-protocol').value;
    const host = document.getElementById('terminal-host').value || 'not-set';
    state.terminal.protocol = protocol;
    state.terminal.host = host;

    try {
      const response = await fetch('http://localhost:5050/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, host, command: 'connect' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Terminal connection error');
      state.terminal.connected = true;
      state.terminal.history.push(`[SSH] Connected to ${host}`);
      state.terminal.history.push(`[SYSTEM] ${payload.output}`);
    } catch (error) {
      state.terminal.connected = false;
      state.terminal.history.push(`[SYSTEM] ${error.message}`);
    }
    renderTerminal();
  });

  terminalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('terminal-input');
    const command = input.value.trim();
    if (!command) return;

    state.terminal.history.push(`> ${command}`);
    if (!state.terminal.connected) {
      state.terminal.history.push(`[SYSTEM] No active SSH session.`);
      input.value = '';
      renderTerminal();
      return;
    }

    try {
      const response = await fetch('http://localhost:5050/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: state.terminal.protocol,
          host: state.terminal.host,
          command,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Terminal execution error');
      state.terminal.history.push(`[${payload.host}] ${payload.output}`);
    } catch (error) {
      state.terminal.history.push(`[SYSTEM] ${error.message}`);
    }

    input.value = '';
    renderTerminal();
  });
}

window.addEventListener('hashchange', () => render());
render();
