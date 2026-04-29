from fastapi import APIRouter, HTTPException, File, UploadFile
from controllers.controller import get_all_data, reportanalyze, report_analyze_image

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/GetAllData")
def download(username: str):
    data = get_all_data(username)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No backup found for user '{username}'")
    return data

from pydantic import BaseModel

class ReportRequest(BaseModel):
    report_name: str

@router.post("/ReportAnalyze")
def analyze(request: ReportRequest):
    return reportanalyze(request.report_name)

@router.post("/AnalyzeImage")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    return await report_analyze_image(contents, file.content_type)
