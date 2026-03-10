from fastapi import FastAPI, UploadFile, File
from .models import ParseResponse

app = FastAPI(title="Journey OS PDF Parser")

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/parse", response_model=ParseResponse)
async def parse_pdf(file: UploadFile = File(...)):
    """Fallback PDF parser using pdfplumber. Use LlamaParse API first (SOL-006)."""
    raise NotImplementedError("See SOL-006")
