from fastapi import APIRouter, HTTPException

from ..engine import session
from ..models import InjectFailureRequest, SessionSnapshot
from ..reference_data import FAILURE_TYPES

router = APIRouter(prefix="/api/failure", tags=["failure"])


@router.get("/types")
def list_failure_types():
    return [
        {"id": key, "label": meta["label"], "category": meta["category"],
         "directionLabel": meta["directionLabel"], "description": meta["description"],
         "defaultSeverity": meta["defaultSeverity"]}
        for key, meta in FAILURE_TYPES.items()
    ]


@router.post("/inject", response_model=SessionSnapshot)
def inject_failure(body: InjectFailureRequest):
    try:
        session.inject_failure(body.failureType)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return SessionSnapshot(state=session.state, logs=session.logs_since(0))
