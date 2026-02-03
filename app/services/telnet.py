from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.protocols import CommandRequest


def run_telnet_command(payload: "CommandRequest") -> str:
    return (
        "Telnet задача поставлена в очередь. "
        "Добавьте реальный драйвер (telnetlib3) для выполнения команд."
    )
