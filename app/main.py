from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.services.protocols import CommandRequest, CommandResponse, execute_command

app = FastAPI(title="SwitchOps Web", version="0.1.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/execute", response_model=CommandResponse)
async def run_command(payload: CommandRequest) -> CommandResponse:
    return execute_command(payload)
