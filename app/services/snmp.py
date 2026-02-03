from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.protocols import CommandRequest


def run_snmp_command(payload: "CommandRequest") -> str:
    return (
        "SNMP запрос поставлен в очередь. "
        "Добавьте реальный драйвер (pysnmp) для выполнения запросов."
    )
