from fastapi import APIRouter, HTTPException

from ..engine import session
from ..models import SessionSnapshot

router = APIRouter(prefix="/api", tags=["task"])


def _snapshot() -> SessionSnapshot:
    return SessionSnapshot(state=session.state, logs=session.logs_since(0))


@router.post("/session/reset", response_model=SessionSnapshot)
def reset_session():
    session.reset()
    return _snapshot()


@router.get("/session", response_model=SessionSnapshot)
def get_session():
    return _snapshot()


@router.post("/execute/step", response_model=SessionSnapshot)
def execute_step():
    try:
        session.step()
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _snapshot()
