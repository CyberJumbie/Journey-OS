from fastapi import FastAPI

app = FastAPI(title="Journey OS MIP Solver")

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/solve")
def solve_exam(request: dict):
    """Phase 4 — exam assembly via PuLP MIP constraint satisfaction."""
    raise NotImplementedError("Phase 4 story P4-006")
