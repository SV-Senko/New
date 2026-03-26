from aiohttp import web
from pysnmp.hlapi import (
    bulkCmd,
    getCmd,
    setCmd,
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    Integer,
)
import asyncio
import contextlib
import logging
import telnetlib
import time
import uuid
from dataclasses import dataclass, field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("switch_api")

PORT = 161
DEFAULT_COMMUNITY_R = "system"
DEFAULT_COMMUNITY_RW = "system"
SESSION_TTL_SECONDS = 3600

IF_DESCR_OID = "1.3.6.1.2.1.2.2.1.2"
IF_OPER_STATUS_OID = "1.3.6.1.2.1.2.2.1.8"
IF_ADMIN_STATUS_OID = "1.3.6.1.2.1.2.2.1.7"
IF_SPEED_OID = "1.3.6.1.2.1.2.2.1.5"
IF_DUPLEX_OID = "1.3.6.1.2.1.10.7.2.1.19"
IF_VLAN_OID = "1.3.6.1.2.1.17.7.1.4.5.1.1"

SNMP_TO_LOGICAL = {
    17410: 1, 17411: 2, 17412: 3, 17413: 4, 17414: 5, 17415: 6, 17416: 7,
    17417: 8, 17418: 9, 17419: 10, 17420: 11, 17421: 12, 17422: 13, 17423: 14,
    17424: 15, 17425: 16, 17426: 17, 17427: 18, 17428: 19, 17429: 20,
    17430: 21, 17431: 22, 17432: 23, 17433: 24, 17474: 25, 17475: 26,
    17538: 27, 17539: 28, 49153: 0,
}
LOGICAL_TO_SNMP = {v: k for k, v in SNMP_TO_LOGICAL.items()}


@dataclass
class SwitchTarget:
    host: str
    community_r: str = DEFAULT_COMMUNITY_R
    community_rw: str = DEFAULT_COMMUNITY_RW
    port: int = PORT


@dataclass
class TerminalSession:
    session_id: str
    protocol: str
    host: str
    port: int
    username: str
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    history: list[str] = field(default_factory=list)
    process: asyncio.subprocess.Process | None = None
    telnet_client: telnetlib.Telnet | None = None
    reader_task: asyncio.Task | None = None


TERMINAL_SESSIONS: dict[str, TerminalSession] = {}


def build_target(request: web.Request) -> SwitchTarget:
    host = request.query.get("host", "192.168.0.5")
    community = request.query.get("community", DEFAULT_COMMUNITY_R)
    port = int(request.query.get("port", PORT))
    return SwitchTarget(host=host, community_r=community, community_rw=community, port=port)


def snmp_bulk_walk(target: SwitchTarget, oid: str):
    result = {}
    for (error_indication, error_status, error_index, var_binds) in bulkCmd(
        SnmpEngine(),
        CommunityData(target.community_r, mpModel=1),
        UdpTransportTarget((target.host, target.port)),
        ContextData(),
        0,
        25,
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False,
    ):
        if error_indication:
            logger.error("SNMP errorIndication: %s", error_indication)
            break
        if error_status:
            logger.error("SNMP errorStatus: %s at %s", error_status, error_index)
            break
        for oid_obj, val in var_binds:
            index = int(str(oid_obj).split(".")[-1])
            result[index] = str(val)
    return result


def snmp_get_single(target: SwitchTarget, oid: str, index: int):
    try:
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(target.community_r, mpModel=1),
            UdpTransportTarget((target.host, target.port)),
            ContextData(),
            ObjectType(ObjectIdentity(f"{oid}.{index}")),
        )
        error_indication, error_status, error_index, var_binds = next(iterator)
        if error_indication:
            return f"error: {error_indication}"
        if error_status:
            return f"error: {error_status.prettyPrint()} at {error_index}"
        for _, val in var_binds:
            return str(val)
    except Exception as exc:
        return f"error: {exc}"


def snmp_set_value(target: SwitchTarget, oid: str, index: int, value: int):
    try:
        iterator = setCmd(
            SnmpEngine(),
            CommunityData(target.community_rw, mpModel=1),
            UdpTransportTarget((target.host, target.port)),
            ContextData(),
            ObjectType(ObjectIdentity(f"{oid}.{index}"), Integer(value)),
        )
        error_indication, error_status, error_index, _ = next(iterator)
        if error_indication:
            return f"error: {error_indication}"
        if error_status:
            return f"error: {error_status.prettyPrint()} at {error_index}"
        return "ok"
    except Exception as exc:
        return f"error: {exc}"


def get_terminal_session(session_id: str) -> TerminalSession:
    session = TERMINAL_SESSIONS.get(session_id)
    if session is None:
        raise web.HTTPNotFound(text="Terminal session not found")
    session.updated_at = time.time()
    return session


async def read_ssh_output(session: TerminalSession):
    if session.process is None or session.process.stdout is None:
        return
    while True:
        chunk = await session.process.stdout.read(4096)
        if not chunk:
            break
        decoded = chunk.decode("utf-8", errors="replace")
        session.history.append(decoded)
        session.updated_at = time.time()


async def read_telnet_output(session: TerminalSession):
    while session.telnet_client is not None:
        chunk = await asyncio.to_thread(session.telnet_client.read_very_eager)
        if chunk:
            decoded = chunk.decode("utf-8", errors="replace")
            session.history.append(decoded)
            session.updated_at = time.time()
        await asyncio.sleep(0.2)


async def create_ssh_session(host: str, port: int, username: str, password: str) -> TerminalSession:
    destination = f"{username}@{host}" if username else host
    process = await asyncio.create_subprocess_exec(
        "ssh",
        "-tt",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-p",
        str(port),
        destination,
        env={"LANG": "C.UTF-8", "LC_ALL": "C.UTF-8"},
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    session = TerminalSession(
        session_id=str(uuid.uuid4()),
        protocol="ssh",
        host=host,
        port=port,
        username=username,
        process=process,
    )
    session.reader_task = asyncio.create_task(read_ssh_output(session))
    await asyncio.sleep(1)
    if password and process.stdin is not None:
        process.stdin.write(f"{password}\n".encode("utf-8"))
        await process.stdin.drain()
        await asyncio.sleep(0.5)
    session.history.append(f"SSH session created for {destination}:{port}\n")
    TERMINAL_SESSIONS[session.session_id] = session
    return session


async def create_telnet_session(host: str, port: int, username: str, password: str) -> TerminalSession:
    telnet_client = await asyncio.to_thread(telnetlib.Telnet, host, port, 10)
    session = TerminalSession(
        session_id=str(uuid.uuid4()),
        protocol="telnet",
        host=host,
        port=port,
        username=username,
        telnet_client=telnet_client,
    )
    session.reader_task = asyncio.create_task(read_telnet_output(session))
    await asyncio.sleep(1)
    if username:
        await asyncio.to_thread(telnet_client.write, f"{username}\n".encode("utf-8"))
    if password:
        await asyncio.to_thread(telnet_client.write, f"{password}\n".encode("utf-8"))
    session.history.append(f"Telnet session created for {host}:{port}\n")
    TERMINAL_SESSIONS[session.session_id] = session
    return session


async def close_terminal_session(session: TerminalSession):
    if session.reader_task is not None:
        session.reader_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await session.reader_task
    if session.process is not None:
        if session.process.stdin is not None:
            session.process.stdin.write(b"exit\n")
            await session.process.stdin.drain()
        with contextlib.suppress(ProcessLookupError):
            session.process.terminate()
        await session.process.wait()
    if session.telnet_client is not None:
        await asyncio.to_thread(session.telnet_client.close)
    TERMINAL_SESSIONS.pop(session.session_id, None)


async def cleanup_terminal_sessions(app: web.Application):
    while True:
        now = time.time()
        expired = [session for session in TERMINAL_SESSIONS.values() if now - session.updated_at > SESSION_TTL_SECONDS]
        for session in expired:
            await close_terminal_session(session)
        await asyncio.sleep(60)


async def get_all_ports(request: web.Request):
    target = build_target(request)
    logger.info("Fetching ports for switch %s", target.host)
    descrs = snmp_bulk_walk(target, IF_DESCR_OID)
    statuses = snmp_bulk_walk(target, IF_OPER_STATUS_OID)
    speeds = snmp_bulk_walk(target, IF_SPEED_OID)
    duplexes = snmp_bulk_walk(target, IF_DUPLEX_OID)
    vlans = snmp_bulk_walk(target, IF_VLAN_OID)

    results = {}
    for index in descrs:
        logical = SNMP_TO_LOGICAL.get(index)
        if logical is None:
            continue
        results[f"port_{logical}"] = {
            "port": logical,
            "name": descrs.get(index, "unknown"),
            "status": statuses.get(index, "unknown"),
            "speed": speeds.get(index, "unknown"),
            "duplex": duplexes.get(index, "unknown"),
            "vlan": vlans.get(index, "unknown"),
        }

    return web.json_response(results)


async def get_single_port(request: web.Request):
    target = build_target(request)
    port = int(request.match_info["port"])
    index = LOGICAL_TO_SNMP.get(port)
    if index is None:
        return web.json_response({"error": f"Порт {port} не найден."}, status=404)

    data = {
        "port": port,
        "name": snmp_get_single(target, IF_DESCR_OID, index),
        "status": snmp_get_single(target, IF_OPER_STATUS_OID, index),
        "speed": snmp_get_single(target, IF_SPEED_OID, index),
        "duplex": snmp_get_single(target, IF_DUPLEX_OID, index),
        "vlan": snmp_get_single(target, IF_VLAN_OID, index),
    }
    return web.json_response(data)


async def set_port_value(request: web.Request, oid: str):
    target = build_target(request)
    port = int(request.match_info["port"])
    index = LOGICAL_TO_SNMP.get(port)
    if index is None:
        return web.json_response({"error": f"Порт {port} не найден."}, status=404)

    data = await request.json()
    value = data.get("value")
    if not isinstance(value, int):
        return web.json_response({"error": "Значение должно быть числом"}, status=400)

    result = snmp_set_value(target, oid, index, value)
    return web.json_response({"result": result})


async def set_port_status(request: web.Request):
    return await set_port_value(request, IF_ADMIN_STATUS_OID)


async def set_port_speed(request: web.Request):
    return await set_port_value(request, IF_SPEED_OID)


async def set_port_duplex(request: web.Request):
    return await set_port_value(request, IF_DUPLEX_OID)


async def set_port_vlan(request: web.Request):
    return await set_port_value(request, IF_VLAN_OID)


async def terminal_connect(request: web.Request):
    payload = await request.json()
    protocol = payload.get("protocol", "ssh").lower()
    host = payload.get("host")
    port = int(payload.get("port", 22 if protocol == "ssh" else 23))
    username = payload.get("username", "")
    password = payload.get("password", "")

    if not host:
        return web.json_response({"error": "host is required"}, status=400)

    if protocol == "ssh":
        session = await create_ssh_session(host, port, username, password)
    elif protocol == "telnet":
        session = await create_telnet_session(host, port, username, password)
    else:
        return web.json_response({"error": f"Unsupported protocol {protocol}"}, status=400)

    return web.json_response(
        {
            "session_id": session.session_id,
            "protocol": session.protocol,
            "host": session.host,
            "port": session.port,
            "username": session.username,
            "message": f"Connected to {session.host}:{session.port}",
            "output": "".join(session.history[-5:]),
        }
    )


async def terminal_state(request: web.Request):
    session = get_terminal_session(request.match_info["session_id"])
    return web.json_response(
        {
            "session_id": session.session_id,
            "protocol": session.protocol,
            "host": session.host,
            "port": session.port,
            "username": session.username,
            "output": "".join(session.history[-10:]),
        }
    )


async def terminal_command(request: web.Request):
    session = get_terminal_session(request.match_info["session_id"])
    payload = await request.json()
    command = payload.get("command", "")
    if not command:
        return web.json_response({"error": "command is required"}, status=400)

    before = len(session.history)
    if session.protocol == "ssh":
        if session.process is None or session.process.stdin is None:
            raise web.HTTPBadRequest(text="SSH session is not writable")
        session.process.stdin.write(f"{command}\n".encode("utf-8"))
        await session.process.stdin.drain()
    else:
        if session.telnet_client is None:
            raise web.HTTPBadRequest(text="Telnet session is not writable")
        await asyncio.to_thread(session.telnet_client.write, f"{command}\n".encode("utf-8"))

    await asyncio.sleep(1)
    output = "".join(session.history[before:]) or f"Command sent: {command}\n"
    session.history.append(f"$ {command}\n")
    session.updated_at = time.time()
    return web.json_response({"ok": True, "output": output})


async def terminal_disconnect(request: web.Request):
    session = get_terminal_session(request.match_info["session_id"])
    await close_terminal_session(session)
    return web.json_response({"ok": True})


@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


async def start_background_tasks(app: web.Application):
    app["terminal_cleanup"] = asyncio.create_task(cleanup_terminal_sessions(app))


async def cleanup_background_tasks(app: web.Application):
    app["terminal_cleanup"].cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await app["terminal_cleanup"]
    for session in list(TERMINAL_SESSIONS.values()):
        await close_terminal_session(session)


app = web.Application(middlewares=[cors_middleware])
app.router.add_get("/api/snmp/ports", get_all_ports)
app.router.add_get("/api/snmp/port/{port}", get_single_port)
app.router.add_post("/api/snmp/port/{port}/status", set_port_status)
app.router.add_post("/api/snmp/port/{port}/speed", set_port_speed)
app.router.add_post("/api/snmp/port/{port}/duplex", set_port_duplex)
app.router.add_post("/api/snmp/port/{port}/vlan", set_port_vlan)
app.router.add_post("/api/terminal/session/connect", terminal_connect)
app.router.add_get("/api/terminal/session/{session_id}", terminal_state)
app.router.add_post("/api/terminal/session/{session_id}/command", terminal_command)
app.router.add_delete("/api/terminal/session/{session_id}", terminal_disconnect)
app.on_startup.append(start_background_tasks)
app.on_cleanup.append(cleanup_background_tasks)

if __name__ == "__main__":
    logger.info("Switch API server running at http://localhost:5050")
    web.run_app(app, port=5050)
