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
import logging
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("switch_api")

PORT = 161
DEFAULT_COMMUNITY_R = "system"
DEFAULT_COMMUNITY_RW = "system"

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


async def terminal_session(request: web.Request):
    payload = await request.json()
    protocol = payload.get("protocol", "ssh")
    host = payload.get("host", "")
    command = payload.get("command", "")

    if protocol.lower() == "telnet":
        return web.json_response(
            {
                "ok": False,
                "message": "Telnet removed from backend integration. Use SSH instead.",
                "host": host,
            },
            status=400,
        )

    return web.json_response(
        {
            "ok": True,
            "protocol": "ssh",
            "host": host,
            "output": f"SSH gateway stub received command: {command}",
        }
    )


@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=200)
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


app = web.Application(middlewares=[cors_middleware])
app.router.add_get("/api/snmp/ports", get_all_ports)
app.router.add_get("/api/snmp/port/{port}", get_single_port)
app.router.add_post("/api/snmp/port/{port}/status", set_port_status)
app.router.add_post("/api/snmp/port/{port}/speed", set_port_speed)
app.router.add_post("/api/snmp/port/{port}/duplex", set_port_duplex)
app.router.add_post("/api/snmp/port/{port}/vlan", set_port_vlan)
app.router.add_post("/api/terminal/session", terminal_session)

if __name__ == "__main__":
    logger.info("Switch API server running at http://localhost:5050")
    web.run_app(app, port=5050)
