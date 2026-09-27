from fastapi import APIRouter, HTTPException

from ..experiments import APPROACHES, simulate
from ..models import ExperimentRunRequest

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("/approaches")
def list_approaches():
    return [{"id": k, **v} for k, v in APPROACHES.items()]


@router.post("/simulate")
def run_simulation(body: ExperimentRunRequest):
    try:
        result = simulate(body.approach, body.failureSequence)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.get("/metrics")
def metrics():
    """
    Headline research metrics. These are intentionally NOT computed from the
    demo simulation trace above -- see module docstring in experiments.py.
    They remain unavailable until real experiments are conducted.
    """
    return {
        "taskSuccessRate": "Experimental data not available",
        "recoveryRate": "Experimental data not available",
        "recoveryCost": "Experimental data not available",
    }
