import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import task, state, failure, recovery, scenarios, experiments


DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


def configured_cors_origins() -> list[str]:
    """Return explicit browser origins for local or hosted frontends."""
    configured = os.getenv("SAARF_CORS_ORIGINS")
    origins = configured.split(",") if configured else DEFAULT_CORS_ORIGINS
    cleaned = [origin.strip().rstrip("/") for origin in origins if origin.strip()]
    if "*" in cleaned:
        raise RuntimeError("SAARF_CORS_ORIGINS must list explicit origins; wildcard '*' is not allowed.")
    return cleaned

app = FastAPI(
    title="SAARF Simulation API",
    description="State-Aware Adaptive Recovery Framework -- deterministic "
                 "simulation engine for the MSc research prototype. All state, "
                 "logs and recovery decisions are produced by explicit "
                 "deterministic logic; no LLM calls are made in this version.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(task.router)
app.include_router(state.router)
app.include_router(failure.router)
app.include_router(recovery.router)
app.include_router(scenarios.router)
app.include_router(experiments.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "simulation"}
