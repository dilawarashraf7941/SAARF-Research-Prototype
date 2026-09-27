from fastapi import APIRouter, HTTPException

from ..models import ScenarioRunRequest
from ..scenarios import run_scenario, committee_demo_frames

router = APIRouter(prefix="/api/scenario", tags=["scenario"])


@router.post("/run")
def run(body: ScenarioRunRequest):
    try:
        frames = run_scenario(body.scenarioId)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"scenarioId": body.scenarioId, "frames": frames}


@router.get("/committee-demo")
def committee_demo():
    return {"frames": committee_demo_frames()}
