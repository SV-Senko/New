from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.protocols import CommandRequest


def run_ssh_command(payload: "CommandRequest") -> str:
    return (
        "SSH задача поставлена в очередь. "
        "Добавьте реальный драйвер (paramiko/netmiko) для выполнения команд."
    )
