from fastapi import APIRouter

from ..engine import session
from ..models import AgentState, LogEntry

router = APIRouter(prefix="/api", tags=["state"])


@router.get("/state", response_model=AgentState)
def get_state():
    return session.state


@router.get("/logs", response_model=list[LogEntry])
def get_logs(since: int = 0):
    return session.logs_since(since)
