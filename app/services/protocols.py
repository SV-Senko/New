from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.services.ssh import run_ssh_command
from app.services.telnet import run_telnet_command
from app.services.snmp import run_snmp_command


class Protocol(str, Enum):
    ssh = "ssh"
    telnet = "telnet"
    snmp = "snmp"


class CommandRequest(BaseModel):
    protocol: Protocol = Field(..., description="Протокол подключения")
    host: str = Field(..., description="IP или имя хоста")
    port: Optional[int] = Field(None, description="Порт подключения")
    username: Optional[str] = Field(None, description="Имя пользователя")
    password: Optional[str] = Field(None, description="Пароль")
    command: str = Field(..., description="Команда или OID")


class CommandResponse(BaseModel):
    protocol: Protocol
    host: str
    output: str
    status: str


def execute_command(payload: CommandRequest) -> CommandResponse:
    if payload.protocol == Protocol.ssh:
        output = run_ssh_command(payload)
    elif payload.protocol == Protocol.telnet:
        output = run_telnet_command(payload)
    else:
        output = run_snmp_command(payload)

    return CommandResponse(
        protocol=payload.protocol,
        host=payload.host,
        output=output,
        status="queued",
    )
