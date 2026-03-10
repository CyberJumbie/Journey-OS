from fastapi import FastAPI

app = FastAPI(title="Journey OS IRT Service")

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/calibrate")
def calibrate(data: dict):
    """Phase 5 — 2PL IRT parameter estimation."""
    raise NotImplementedError("Phase 5 story P5-012")
