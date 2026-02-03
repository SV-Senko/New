# SwitchOps Web

Web-приложение для автоматизации работы над сетевыми коммутаторами через SSH, Telnet и SNMP.

## Возможности
- Веб-интерфейс для запуска команд и опроса устройств.
- Единая API-модель для SSH/Telnet/SNMP.
- Базовая архитектура для расширения (очереди задач, аудит, шаблоны команд).

## Быстрый старт

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Откройте: http://127.0.0.1:8000

## Структура
- `app/main.py` — FastAPI приложение и маршруты.
- `app/services/` — заготовки для SSH/Telnet/SNMP клиентов.
- `app/templates/` и `app/static/` — базовый UI.

## Следующие шаги
- Добавить реальные драйверы (например, `paramiko`, `telnetlib3`, `pysnmp`).
- Ввести хранение инвентаря устройств.
- Запустить очереди задач для массовых операций.
