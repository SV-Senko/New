const app = document.getElementById('app');
const COOKIE_DAYS = 30;
const STORAGE_KEYS = {
  language: 'bios_language',
  switches: 'bios_switches',
  terminal: 'bios_terminal_state',
};
const DEFAULT_API = 'http://localhost:5050';

const translations = {
  ru: {
    brand: 'BIOS SWITCH CONTROL v2.0',
    title: 'Консоль управления коммутаторами',
    navMain: 'Main',
    navSwitch: 'Switch',
    navAbout: 'About',
    langLabel: 'Язык',
    footerHelp: 'F1 Помощь',
    footerRefresh: 'F5 Обновить',
    footerBack: 'ESC Назад',
    productOverview: '[ PRODUCT OVERVIEW ]',
    productTitle: 'BIOS-style dashboard for switch operations',
    productDescription: 'Платформа объединяет мониторинг, управление портами и централизованную работу с сетевыми коммутаторами через единый интерфейс в эстетике классического BIOS.',
    goalTitle: 'Цель',
    goalText: 'Единая схема управления коммутаторами и состоянием портов.',
    approachTitle: 'Подход',
    approachText: 'Визуально строгий интерфейс без лишнего шума для NOC/лаборатории.',
    architectureTitle: 'Архитектура',
    architectureText: 'Frontend BIOS UI + backend API для SNMP/SSH/Telnet интеграции.',
    whyDirection: '[ WHY THIS DIRECTION ]',
    why1: 'Операторы сразу видят активные порты, состояние uplink и критические интерфейсы.',
    why2: 'Система упрощает onboarding: один интерфейс для нескольких моделей коммутаторов.',
    why3: 'SNMP используется для массового опроса и изменения состояния портов.',
    why4: 'SSH и Telnet доступны как инженерные каналы для реальной работы с CLI.',
    why5: 'Состояние интерфейса, язык и список коммутаторов сохраняются между перезагрузками.',
    protocolStack: '[ PROTOCOL STACK ]',
    snmpDesc: 'Основной транспорт для инвентаризации, статусов и управления портами.',
    telnetDesc: 'Legacy-канал для оборудования, где Telnet всё ещё нужен в эксплуатации.',
    sshDesc: 'Основной защищённый канал инженерного доступа и выполнения команд.',
    inventoryLabel: '[ SWITCH INVENTORY ]',
    inventoryTitle: 'Добавление и контроль коммутаторов',
    save: 'Сохранить',
    nameLabel: 'Имя',
    hostLabel: 'IP / Host',
    communityLabel: 'SNMP community',
    sshPortLabel: 'SSH port',
    telnetPortLabel: 'Telnet port',
    usernameLabel: 'Username',
    modeTabsLabel: 'Режим добавления',
    modeSnmp: 'Single SNMP',
    modeHybrid: 'SNMP + Terminal',
    modeTerminal: 'Single Telnet / SSH',
    accessOptional: 'Параметры доступа (необязательно)',
    snmpSection: 'SNMP',
    accessSection: 'SSH / Telnet',
    terminalOnlyHint: 'Этот тип устройства добавляется без SNMP-опроса и используется только для терминала.',
    noSnmpPorts: 'Для этого устройства SNMP не настроен, поэтому опрос портов недоступен.',
    swipeLabel: '[ SWIPE SWITCHES ]',
    terminalLabel: '[ TERMINAL ]',
    terminalTitle: 'Инженерная консоль',
    connect: 'Подключить',
    send: 'Отправить',
    sideLabel: '[ SERVER INTEGRATION ]',
    side1: 'После добавления коммутатор опрашивает backend по SNMP API.',
    side2: 'В карточке выводятся количество портов, активные интерфейсы и быстрая сводка.',
    side3: 'Каждый порт можно включить или отключить кнопкой toggle.',
    side4: 'Терминал хранит активную сессию и историю команд после обновления страницы.',
    side5: 'Для закрытия сессии введите команду disconnect прямо в терминале.',
    noSwitches: 'Нет добавленных коммутаторов. Нажмите + чтобы создать первый.',
    portsCount: 'Портов',
    activeCount: 'Активных',
    connectFirst: 'Сначала подключитесь к SSH или Telnet сессии.',
    authorsLabel: '[ AUTHORS ]',
    authorsTitle: 'Авторы проекта',
    author1: 'Отвечал за проектирование интерфейса, серверную адаптацию и BIOS-стилистику.',
    author2: 'Соавтор идеи, постановки задачи и направления по управлению коммутаторами.',
    descriptionLabel: '[ DESCRIPTION ]',
    aboutText1: 'Проект предназначен для централизованного управления сетевыми коммутаторами: визуализация состояния портов, управление по SNMP и инженерный доступ по SSH/Telnet.',
    aboutText2: 'Концепция BIOS подчёркивает надёжность, концентрацию на данных и ощущение системной панели.',
    statusConnected: 'Подключено',
    statusDisconnected: 'Отключено',
    removeSwitch: 'Удалить',
    refreshPorts: 'Обновить',
    toggle: 'Toggle',
    active: 'ACTIVE',
    down: 'DOWN',
    terminalReady: 'BIOS terminal ready. Restore session or connect to a switch.',
    terminalHint: 'Type disconnect to close the current session.',
    terminalClosed: 'Сессия закрыта.',
    connectSuccess: 'Сессия успешно восстановлена / подключена.',
    sessionGone: 'Сохранённая сессия больше не существует на сервере.',
    restoredSwitches: 'Список коммутаторов восстановлен из cookie.',
  },
  en: {
    brand: 'BIOS SWITCH CONTROL v2.0',
    title: 'Switch Management Console',
    navMain: 'Main',
    navSwitch: 'Switch',
    navAbout: 'About',
    langLabel: 'Language',
    footerHelp: 'F1 Help',
    footerRefresh: 'F5 Refresh',
    footerBack: 'ESC Back',
    productOverview: '[ PRODUCT OVERVIEW ]',
    productTitle: 'BIOS-style dashboard for switch operations',
    productDescription: 'The platform combines monitoring, port control, and centralized switch operations in a classic BIOS-inspired interface.',
    goalTitle: 'Goal',
    goalText: 'One control scheme for switches and port states.',
    approachTitle: 'Approach',
    approachText: 'Strict, low-noise visual language for NOC and lab workflows.',
    architectureTitle: 'Architecture',
    architectureText: 'Frontend BIOS UI + backend API for SNMP/SSH/Telnet integration.',
    whyDirection: '[ WHY THIS DIRECTION ]',
    why1: 'Operators immediately see active ports, uplinks, and critical interfaces.',
    why2: 'The system simplifies onboarding with one UI for multiple switch models.',
    why3: 'SNMP is used for bulk polling and port state changes.',
    why4: 'SSH and Telnet remain available as engineering CLI channels.',
    why5: 'UI state, language, and switch inventory persist across page reloads.',
    protocolStack: '[ PROTOCOL STACK ]',
    snmpDesc: 'Primary transport for inventory, statuses, and port control.',
    telnetDesc: 'Legacy channel for devices that still require Telnet in production.',
    sshDesc: 'Primary secure engineering access channel for command execution.',
    inventoryLabel: '[ SWITCH INVENTORY ]',
    inventoryTitle: 'Add and control switches',
    save: 'Save',
    nameLabel: 'Name',
    hostLabel: 'IP / Host',
    communityLabel: 'SNMP community',
    sshPortLabel: 'SSH port',
    telnetPortLabel: 'Telnet port',
    usernameLabel: 'Username',
    modeTabsLabel: 'Add mode',
    modeSnmp: 'Single SNMP',
    modeHybrid: 'SNMP + Terminal',
    modeTerminal: 'Single Telnet / SSH',
    accessOptional: 'Access settings (optional)',
    snmpSection: 'SNMP',
    accessSection: 'SSH / Telnet',
    terminalOnlyHint: 'This device type is added without SNMP polling and is used only for terminal access.',
    noSnmpPorts: 'SNMP is not configured for this device, so port polling is unavailable.',
    swipeLabel: '[ SWIPE SWITCHES ]',
    terminalLabel: '[ TERMINAL ]',
    terminalTitle: 'Engineering console',
    connect: 'Connect',
    send: 'Send',
    sideLabel: '[ SERVER INTEGRATION ]',
    side1: 'After adding a switch, the card polls the backend over SNMP.',
    side2: 'Each card shows total ports, active interfaces, and a quick summary.',
    side3: 'Every port can be enabled or disabled with a toggle button.',
    side4: 'The terminal keeps active session metadata and command history after reload.',
    side5: 'To close the session, type disconnect directly in the terminal.',
    noSwitches: 'No switches added yet. Press + to create the first one.',
    portsCount: 'Ports',
    activeCount: 'Active',
    connectFirst: 'Connect to an SSH or Telnet session first.',
    authorsLabel: '[ AUTHORS ]',
    authorsTitle: 'Project authors',
    author1: 'Responsible for interface design, server adaptation, and BIOS styling.',
    author2: 'Co-author of the product idea, requirements, and switch management direction.',
    descriptionLabel: '[ DESCRIPTION ]',
    aboutText1: 'The project is intended for centralized switch control: port visualization, SNMP management, and engineering access over SSH/Telnet.',
    aboutText2: 'The BIOS concept emphasizes reliability, focus, and a system-console feeling.',
    statusConnected: 'Connected',
    statusDisconnected: 'Disconnected',
    removeSwitch: 'Remove',
    refreshPorts: 'Refresh',
    toggle: 'Toggle',
    active: 'ACTIVE',
    down: 'DOWN',
    terminalReady: 'BIOS terminal ready. Restore session or connect to a switch.',
    terminalHint: 'Type disconnect to close the current session.',
    terminalClosed: 'Session closed.',
    connectSuccess: 'Session restored / connected successfully.',
    sessionGone: 'Saved session no longer exists on the server.',
    restoredSwitches: 'Switch inventory restored from cookies.',
  },
  ru_old: {
    langLabel: 'Языкъ',
    title: 'Консоль управленiя коммутаторами',
    inventoryTitle: 'Добавленiе и контроль коммутаторовъ',
    modeTabsLabel: 'Режимъ добавленiя',
    modeSnmp: 'Одиночный SNMP',
    modeHybrid: 'SNMP + Терминалъ',
    modeTerminal: 'Только Telnet / SSH',
    accessOptional: 'Параметры доступа (необязательно)',
    terminalTitle: 'Инженерная консоль',
    terminalOnlyHint: 'Се устройство добавляется безъ SNMP-опроса и служитъ токмо для терминала.',
    noSnmpPorts: 'SNMP не настроенъ, посему опросъ портовъ недоступенъ.',
    terminalClosed: 'Сессiя закрыта.',
  },
  de: {
    langLabel: 'Sprache',
    title: 'Switch-Verwaltungskonsole',
    inventoryTitle: 'Switches hinzufügen und steuern',
    modeTabsLabel: 'Hinzufügen-Modus',
    modeSnmp: 'Nur SNMP',
    modeHybrid: 'SNMP + Terminal',
    modeTerminal: 'Nur Telnet / SSH',
    accessOptional: 'Zugangsdaten (optional)',
    terminalTitle: 'Engineering-Konsole',
    terminalOnlyHint: 'Dieser Gerätetyp wird ohne SNMP hinzugefügt und nur für den Terminalzugang verwendet.',
    noSnmpPorts: 'Für dieses Gerät ist SNMP nicht konfiguriert; Portabfrage ist nicht verfügbar.',
    terminalClosed: 'Sitzung beendet.',
  },
  zh: {
    langLabel: '语言',
    title: '交换机管理控制台',
    inventoryTitle: '添加和管理交换机',
    modeTabsLabel: '添加模式',
    modeSnmp: '仅 SNMP',
    modeHybrid: 'SNMP + 终端',
    modeTerminal: '仅 Telnet / SSH',
    accessOptional: '访问参数（可选）',
    terminalTitle: '工程终端',
    terminalOnlyHint: '该设备类型不使用 SNMP，仅用于终端访问。',
    noSnmpPorts: '该设备未配置 SNMP，因此无法轮询端口。',
    terminalClosed: '会话已关闭。',
  },
};

const translationFallbacks = { ru_old: ["ru", "en"], de: ["en", "ru"], zh: ["en", "ru"], ru: ["en"], en: ["ru"] };

const state = {
  language: readCookie(STORAGE_KEYS.language) || 'ru',
  switches: readJsonCookie(STORAGE_KEYS.switches, []),
  addMode: "snmp",
  terminal: readJsonCookie(STORAGE_KEYS.terminal, {
    connected: false,
    protocol: 'ssh',
    host: '',
    port: '',
    username: '',
    password: '',
    sessionId: '',
    history: [],
  }),
};

if (!Array.isArray(state.terminal.history) || !state.terminal.history.length) {
  state.terminal.history = [t('terminalReady')];
}

function t(key) {
  const chain = [state.language, ...(translationFallbacks[state.language] || []), "ru", "en"];
  for (const lang of chain) {
    if (translations[lang] && translations[lang][key]) return translations[lang][key];
  }
  return key;
}

function setCookie(name, value, days = COOKIE_DAYS) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function readCookie(name) {
  const item = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.split('=').slice(1).join('=')) : '';
}

function setJsonCookie(name, value) {
  setCookie(name, JSON.stringify(value));
}

function readJsonCookie(name, fallback) {
  try {
    const value = readCookie(name);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function persistSwitches() {
  setJsonCookie(STORAGE_KEYS.switches, state.switches.map(({ password, ...item }) => item));
}

function persistTerminal() {
  setJsonCookie(STORAGE_KEYS.terminal, {
    ...state.terminal,
    history: state.terminal.history.slice(-40),
  });
}

function setActiveNav(route) {
  document.querySelectorAll('.nav a').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
    const key = link.dataset.route === 'main' ? 'navMain' : link.dataset.route === 'switch' ? 'navSwitch' : 'navAbout';
    link.textContent = t(key);
  });
}

function applyShellTranslations() {
  document.documentElement.lang = state.language;
  document.querySelector('.brand').textContent = t('brand');
  document.querySelector('.topbar h1').textContent = t('title');
  document.querySelector('.lang-label').textContent = t('langLabel');
  document.querySelector('.footer span:nth-child(1)').textContent = t('footerHelp');
  document.querySelector('.footer span:nth-child(2)').textContent = t('footerRefresh');
  document.querySelector('.footer span:nth-child(3)').textContent = t('footerBack');
}

function render(route = location.hash.replace('#', '') || 'main') {
  app.innerHTML = templates()[route] || templates().main;
  setActiveNav(route);
  applyShellTranslations();
  if (route === 'switch') initSwitchPage();
}

function templates() {
  return {
    main: `
      <section class="page-grid">
        <article class="panel hero-panel">
          <p class="panel-label">${t('productOverview')}</p>
          <h2>${t('productTitle')}</h2>
          <p>${t('productDescription')}</p>
          <div class="info-grid">
            <div class="info-box"><strong>${t('goalTitle')}</strong><span>${t('goalText')}</span></div>
            <div class="info-box"><strong>${t('approachTitle')}</strong><span>${t('approachText')}</span></div>
            <div class="info-box"><strong>${t('architectureTitle')}</strong><span>${t('architectureText')}</span></div>
          </div>
        </article>
        <article class="panel">
          <p class="panel-label">${t('whyDirection')}</p>
          <ul class="bios-list">
            <li>${t('why1')}</li>
            <li>${t('why2')}</li>
            <li>${t('why3')}</li>
            <li>${t('why4')}</li>
            <li>${t('why5')}</li>
          </ul>
        </article>
        <article class="panel">
          <p class="panel-label">${t('protocolStack')}</p>
          <div class="protocols">
            <div class="protocol-card"><h3>SNMP</h3><p>${t('snmpDesc')}</p></div>
            <div class="protocol-card"><h3>Telnet</h3><p>${t('telnetDesc')}</p></div>
            <div class="protocol-card"><h3>SSH</h3><p>${t('sshDesc')}</p></div>
          </div>
        </article>
      </section>
    `,
    switch: `
      <section class="switch-layout">
        <div class="panel toolbar-panel">
          <div>
            <p class="panel-label">${t('inventoryLabel')}</p>
            <h2>${t('inventoryTitle')}</h2>
          </div>
          <button class="add-switch-btn" id="add-switch-btn" type="button">+</button>
        </div>
        <div class="panel form-panel hidden" id="switch-form-panel">
          <div class="tab-label">${t('modeTabsLabel')}</div>
          <div class="mode-tabs">
            <button type="button" class="mode-tab ${state.addMode === 'snmp' ? 'active' : ''}" data-mode="snmp">${t('modeSnmp')}</button>
            <button type="button" class="mode-tab ${state.addMode === 'hybrid' ? 'active' : ''}" data-mode="hybrid">${t('modeHybrid')}</button>
            <button type="button" class="mode-tab ${state.addMode === 'terminal' ? 'active' : ''}" data-mode="terminal">${t('modeTerminal')}</button>
          </div>
          <form id="switch-form" class="switch-form">
            ${state.addMode !== 'terminal' ? `
            <div class="form-section">
              <p class="panel-label">${t('snmpSection')}</p>
              <div class="form-grid">
                <label>${t('nameLabel')}<input name="name" placeholder="Core-SW-01" required /></label>
                <label>${t('hostLabel')}<input name="host" placeholder="192.168.0.5" required /></label>
                <label>${t('communityLabel')}<input name="community" placeholder="system" value="system" ${state.addMode === 'terminal' ? '' : 'required'} /></label>
              </div>
            </div>` : ''}
            <div class="form-section">
              <p class="panel-label">${state.addMode === 'snmp' ? t('accessOptional') : t('accessSection')}</p>
              <div class="form-grid">
                <label>${t('nameLabel')}<input name="terminalName" placeholder="Edge-Term-01" ${state.addMode === 'terminal' ? 'required' : ''} /></label>
                <label>${t('hostLabel')}<input name="terminalHost" placeholder="192.168.0.15" ${state.addMode === 'terminal' ? 'required' : ''} /></label>
                <label>${t('sshPortLabel')}<input name="sshPort" type="number" value="22" /></label>
                <label>${t('telnetPortLabel')}<input name="telnetPort" type="number" value="23" /></label>
                <label>${t('usernameLabel')}<input name="username" placeholder="admin" /></label>
              </div>
              ${state.addMode === 'terminal' ? `<div class="mode-hint">${t('terminalOnlyHint')}</div>` : ''}
            </div>
            <div class="form-submit"><button type="submit">${t('save')}</button></div>
          </form>
        </div>
        <div class="swipe-zone panel">
          <p class="panel-label">${t('swipeLabel')}</p>
          <div id="switch-track" class="switch-track"></div>
        </div>
        <div class="terminal-grid">
          <section class="panel terminal-panel">
            <div class="terminal-header">
              <div>
                <p class="panel-label">${t('terminalLabel')}</p>
                <h2>${t('terminalTitle')}</h2>
                <div class="terminal-status" id="terminal-status"></div>
              </div>
              <div class="terminal-controls">
                <div class="terminal-control-grid">
                  <select id="terminal-protocol"><option value="ssh">SSH</option><option value="telnet">Telnet</option></select>
                  <input id="terminal-host" placeholder="host" />
                  <input id="terminal-port" placeholder="port" type="number" />
                  <input id="terminal-username" placeholder="username" />
                  <input id="terminal-password" placeholder="password" type="password" />
                  <button id="terminal-connect" type="button">${t('connect')}</button>
                </div>
              </div>
            </div>
            <div class="terminal-screen" id="terminal-screen"></div>
            <form id="terminal-form" class="terminal-form">
              <span>&gt;</span>
              <input id="terminal-input" autocomplete="off" spellcheck="false" placeholder="show interface status / disconnect" />
              <button type="submit">${t('send')}</button>
            </form>
          </section>
          <section class="panel side-panel">
            <p class="panel-label">${t('sideLabel')}</p>
            <ul class="bios-list compact">
              <li>${t('side1')}</li>
              <li>${t('side2')}</li>
              <li>${t('side3')}</li>
              <li>${t('side4')}</li>
              <li>${t('side5')}</li>
            </ul>
          </section>
        </div>
      </section>
    `,
    about: `
      <section class="page-grid about-grid">
        <article class="panel">
          <p class="panel-label">${t('authorsLabel')}</p>
          <h2>${t('authorsTitle')}</h2>
          <div class="authors">
            <div class="author-card"><h3>OpenAI / GPT-5.2-Codex</h3><p>${t('author1')}</p></div>
            <div class="author-card"><h3>Senko</h3><p>${t('author2')}</p></div>
          </div>
        </article>
        <article class="panel">
          <p class="panel-label">${t('descriptionLabel')}</p>
          <p>${t('aboutText1')}</p>
          <p>${t('aboutText2')}</p>
        </article>
      </section>
    `,
  };
}

async function api(path, options = {}) {
  const response = await fetch(`${DEFAULT_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const isJson = (response.headers.get('Content-Type') || '').includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.error || payload.message || 'Request failed';
    throw new Error(message);
  }
  return payload;
}

async function fetchPorts(switchItem) {
  if (!switchItem.hasSnmp) return [];
  const query = new URLSearchParams({ host: switchItem.host, community: switchItem.community });
  return Object.values(await api(`/api/snmp/ports?${query.toString()}`));
}

async function refreshSwitch(index) {
  const switchItem = state.switches[index];
  if (!switchItem.hasSnmp) {
    switchItem.ports = [];
    switchItem.error = "";
    persistSwitches();
    drawSwitches();
    return;
  }
  switchItem.loading = true;
  drawSwitches();
  switchItem.error = '';
  try {
    switchItem.ports = await fetchPorts(switchItem);
  } catch (error) {
    switchItem.error = error.message;
  } finally {
    switchItem.loading = false;
    persistSwitches();
    drawSwitches();
  }
}

function drawSwitches() {
  const track = document.getElementById('switch-track');
  if (!track) return;
  if (!state.switches.length) {
    track.innerHTML = `<div class="switch-card"><p>${t('noSwitches')}</p></div>`;
    return;
  }

  track.innerHTML = state.switches.map((sw, swIndex) => {
    const ports = Array.isArray(sw.ports) ? sw.ports : [];
    const active = ports.filter((port) => String(port.status) === '1').length;
    return `
      <article class="switch-card">
        <p class="panel-label">[ ${sw.name} ]</p>
        <strong>${sw.host}</strong>
        <div class="switch-meta">${sw.mode || "snmp"} · SSH ${sw.sshPort || 22} · Telnet ${sw.telnetPort || 23} · ${sw.username || 'n/a'}</div>
        <div class="switch-summary">
          <div class="stat"><span>${t('portsCount')}</span><strong>${ports.length}</strong></div>
          <div class="stat"><span>${t('activeCount')}</span><strong>${active}</strong></div>
        </div>
        <div class="switch-actions">
          ${sw.hasSnmp ? `<button type="button" data-refresh-index="${swIndex}">${t('refreshPorts')}</button>` : ``}
          <button type="button" data-remove-index="${swIndex}">${t('removeSwitch')}</button>
        </div>
        ${sw.error ? `<div class="error-box">${sw.error}</div>` : ''}
        ${sw.loading ? '<div class="loading-box">Loading…</div>' : ''}
        ${sw.hasSnmp ? '' : `<div class="loading-box">${t('noSnmpPorts')}</div>`}
        <div class="port-list">
          ${ports.map((port, portIndex) => `
            <div class="port-row">
              <div>
                <strong>${port.name}</strong>
                <div>Port ${port.port} · VLAN ${port.vlan} · ${port.speed} Mbps</div>
              </div>
              <span class="badge ${String(port.status) === '1' ? 'up' : 'down'}">${String(port.status) === '1' ? t('active') : t('down')}</span>
              <button type="button" data-switch-index="${swIndex}" data-port-index="${portIndex}" class="toggle-port-btn">${t('toggle')}</button>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');

  track.querySelectorAll('.toggle-port-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      await togglePort(Number(button.dataset.switchIndex), Number(button.dataset.portIndex));
    });
  });
  track.querySelectorAll('[data-refresh-index]').forEach((button) => {
    button.addEventListener('click', async () => refreshSwitch(Number(button.dataset.refreshIndex)));
  });
  track.querySelectorAll('[data-remove-index]').forEach((button) => {
    button.addEventListener('click', () => {
      state.switches.splice(Number(button.dataset.removeIndex), 1);
      persistSwitches();
      drawSwitches();
    });
  });
}

async function togglePort(switchIndex, portIndex) {
  const sw = state.switches[switchIndex];
  if (!sw.hasSnmp) return;
  const port = sw.ports[portIndex];
  const nextValue = String(port.status) === '1' ? 2 : 1;
  const query = new URLSearchParams({ host: sw.host, community: sw.community });
  await api(`/api/snmp/port/${port.port}/status?${query.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ value: nextValue }),
  });
  port.status = String(nextValue);
  persistSwitches();
  drawSwitches();
}

function renderTerminal() {
  const screen = document.getElementById('terminal-screen');
  const status = document.getElementById('terminal-status');
  if (screen) screen.textContent = state.terminal.history.join('\n');
  if (status) {
    status.textContent = `${state.terminal.connected ? t('statusConnected') : t('statusDisconnected')} · ${state.terminal.protocol.toUpperCase()} ${state.terminal.host || '-'}`;
  }
}

async function restoreTerminalSession() {
  if (!state.terminal.sessionId) {
    renderTerminal();
    return;
  }
  try {
    const payload = await api(`/api/terminal/session/${state.terminal.sessionId}`);
    state.terminal.connected = true;
    state.terminal.protocol = payload.protocol;
    state.terminal.host = payload.host;
    state.terminal.port = payload.port;
    state.terminal.username = payload.username || '';
    if (!state.terminal.history.includes(t('connectSuccess'))) {
      state.terminal.history.push(t('connectSuccess'));
    }
  } catch (error) {
    state.terminal.connected = false;
    state.terminal.sessionId = '';
    state.terminal.history.push(t('sessionGone'));
  }
  persistTerminal();
  renderTerminal();
}

async function connectTerminal() {
  const protocol = document.getElementById('terminal-protocol').value;
  const host = document.getElementById('terminal-host').value.trim();
  const port = document.getElementById('terminal-port').value.trim();
  const username = document.getElementById('terminal-username').value.trim();
  const password = document.getElementById('terminal-password').value;

  const payload = await api('/api/terminal/session/connect', {
    method: 'POST',
    body: JSON.stringify({ protocol, host, port: Number(port || (protocol === 'ssh' ? 22 : 23)), username, password }),
  });

  Object.assign(state.terminal, {
    connected: true,
    protocol,
    host,
    port: payload.port,
    username,
    password,
    sessionId: payload.session_id,
  });
  state.terminal.history.push(`[${protocol.toUpperCase()}] ${payload.message}`);
  state.terminal.history.push(payload.output || '');
  state.terminal.history.push(`[SYSTEM] ${t('terminalHint')}`);
  persistTerminal();
  renderTerminal();
}

async function sendTerminalCommand(command) {
  if (!state.terminal.connected || !state.terminal.sessionId) {
    state.terminal.history.push(t('connectFirst'));
    persistTerminal();
    renderTerminal();
    return;
  }
  const payload = await api(`/api/terminal/session/${state.terminal.sessionId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
  if (payload.output) {
    state.terminal.history.push(payload.output);
  }
  persistTerminal();
  renderTerminal();
}

async function disconnectTerminal() {
  if (state.terminal.sessionId) {
    try {
      await api(`/api/terminal/session/${state.terminal.sessionId}`, { method: 'DELETE' });
    } catch (error) {
      state.terminal.history.push(error.message);
    }
  }
  state.terminal.connected = false;
  state.terminal.sessionId = '';
  state.terminal.password = '';
  state.terminal.history.push(`[SYSTEM] ${t('terminalClosed')}`);
  persistTerminal();
  renderTerminal();
}

function fillTerminalFieldsFromState() {
  document.getElementById('terminal-protocol').value = state.terminal.protocol || 'ssh';
  document.getElementById('terminal-host').value = state.terminal.host || '';
  document.getElementById('terminal-port').value = state.terminal.port || '';
  document.getElementById('terminal-username').value = state.terminal.username || '';
  document.getElementById('terminal-password').value = state.terminal.password || '';
}

function initSwitchPage() {
  drawSwitches();
  fillTerminalFieldsFromState();
  restoreTerminalSession();
  const addButton = document.getElementById('add-switch-btn');
  const formPanel = document.getElementById('switch-form-panel');
  const switchForm = document.getElementById('switch-form');
  const terminalConnect = document.getElementById('terminal-connect');
  const terminalForm = document.getElementById('terminal-form');

  addButton.addEventListener('click', () => formPanel.classList.toggle('hidden'));

  document.querySelectorAll('.mode-tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.addMode = button.dataset.mode;
      render('switch');
    });
  });

  switchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(switchForm);
    const mode = state.addMode;
    const hasSnmp = mode !== 'terminal';
    const hasTerminal = mode !== 'snmp' || Boolean(formData.get('terminalHost'));
    const switchItem = {
      mode,
      hasSnmp,
      hasTerminal,
      name: hasSnmp ? formData.get('name') : formData.get('terminalName'),
      host: hasSnmp ? formData.get('host') : formData.get('terminalHost'),
      community: hasSnmp ? formData.get('community') : '',
      sshPort: Number(formData.get('sshPort') || 22),
      telnetPort: Number(formData.get('telnetPort') || 23),
      username: formData.get('username'),
      terminalHost: formData.get('terminalHost') || formData.get('host'),
      ports: [],
      error: '',
      loading: false,
    };
    state.switches.push(switchItem);
    persistSwitches();
    switchForm.reset();
    formPanel.classList.add('hidden');
    drawSwitches();
    if (switchItem.hasSnmp) {
      await refreshSwitch(state.switches.length - 1);
    }
  });

  terminalConnect.addEventListener('click', async () => {
    try {
      await connectTerminal();
    } catch (error) {
      state.terminal.history.push(`[SYSTEM] ${error.message}`);
      persistTerminal();
      renderTerminal();
    }
  });

  terminalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('terminal-input');
    const command = input.value.trim();
    if (!command) return;
    state.terminal.history.push(`> ${command}`);
    input.value = '';
    persistTerminal();
    renderTerminal();

    if (command.toLowerCase() === 'disconnect') {
      await disconnectTerminal();
      return;
    }

    try {
      await sendTerminalCommand(command);
    } catch (error) {
      state.terminal.history.push(`[SYSTEM] ${error.message}`);
      persistTerminal();
      renderTerminal();
    }
  });
}

function initLanguageSelector() {
  const select = document.getElementById('language-select');
  select.value = state.language;
  select.addEventListener('change', () => {
    state.language = select.value;
    setCookie(STORAGE_KEYS.language, state.language);
    if (!state.terminal.history.length) {
      state.terminal.history = [t('terminalReady')];
    }
    persistTerminal();
    render(location.hash.replace('#', '') || 'main');
  });
}

window.addEventListener('hashchange', () => render());

initLanguageSelector();
render();
