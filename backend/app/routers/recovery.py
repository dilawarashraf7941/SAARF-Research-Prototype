from fastapi import APIRouter, HTTPException

from ..engine import session
from ..models import ExecuteRecoveryRequest, SessionSnapshot, RecoveryDecision
from ..reference_data import RECOVERY_ACTIONS

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


@router.get("/decision", response_model=RecoveryDecision | None)
def get_decision():
    return session.state.activeDecision


@router.get("/actions")
def list_actions():
    decision = session.state.activeDecision
    rejected_ids = {r["action"] for r in decision.rejectedActions} if decision else set()
    out = []
    for action_id, meta in RECOVERY_ACTIONS.items():
        if decision is None:
            compatibility = "idle"
        elif action_id == decision.selectedAction:
            compatibility = "selected"
        elif action_id in rejected_ids:
            compatibility = "rejected"
        elif decision.category in meta["applicableCategories"]:
            compatibility = "possible"
        else:
            compatibility = "not_applicable"
        out.append({
            "id": action_id, "name": meta["name"], "description": meta["description"],
            "applicableCategories": meta["applicableCategories"],
            "expectedEffect": meta["expectedEffect"], "compatibility": compatibility,
        })
    return out


@router.post("/execute", response_model=SessionSnapshot)
def execute_recovery(body: ExecuteRecoveryRequest):
    try:
        session.execute_recovery(action_override=body.action, force_outcome=body.simulateOutcome)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return SessionSnapshot(state=session.state, logs=session.logs_since(0))
