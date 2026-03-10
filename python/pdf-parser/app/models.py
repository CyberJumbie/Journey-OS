from pydantic import BaseModel

class ParseResponse(BaseModel):
    markdown: str
    page_count: int
    has_tables: bool
    extraction_method: str = "pdfplumber"
