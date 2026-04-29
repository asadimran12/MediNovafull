from db import get_database
from bson import ObjectId
from google import genai

def get_all_data(username: str):
    client, db = get_database()
    data = db.collection.find_one({"primary_username": {"$regex": f"^{username}$", "$options": "i"}})
    if data is None:
        return None
    if "_id" in data:
        data["_id"] = str(data["_id"])
    return data

import os

from google.genai import types

def reportanalyze(report_content: str):
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=f"Please analyze the following report content and provide a summary of the key findings:\n\n{report_content}"
    )

    print(response.text)
    return {"analysis": response.text}

async def report_analyze_image(image_bytes: bytes, mime_type: str):
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    system_prompt = """
You are MediNova, an advanced AI medical report analyzer. 🩺

Your job is to intelligently ANALYZE any medical report image.

--------------------------------------------------
🎯 TASK
--------------------------------------------------
1. Extract ALL important medical values found in the report.
   Examples (not limited to):
   - Blood Sugar (Glucose, HbA1C)
   - Hemoglobin (HGB)
   - WBC, RBC, Platelets
   - Cholesterol (LDL, HDL, Total)
   - Creatinine, Urea
   - Liver enzymes (ALT, AST)
   - Any other measurable lab values

2. For EACH value:
   - Extract: name + value + unit
   - Determine status:
     → "Normal"
     → "High"
     → "Low"
     → "Unknown" (if no reference available)

3. If reference range is present in report:
   - Use it to classify (VERY IMPORTANT)

4. If no range is given:
   - Use general medical knowledge safely

--------------------------------------------------
📦 OUTPUT FORMAT (STRICT JSON ONLY)
--------------------------------------------------

{
  "extracted_values": [
    {
      "name": "Glucose",
      "value": "110 mg/dL",
      "status": "High"
    }
  ],
  "summary": {
    "normal_count": 0,
    "abnormal_count": 0,
    "unknown_count": 0
  },
  "analysis": "2–3 simple sentences explaining overall health condition.",
  "risk_level": "Low / Moderate / High",
  "advice": [
    "Short actionable advice 1",
    "Short actionable advice 2",
    "Short actionable advice 3"
  ],
  "final_status": "Fit / Attention Needed / Critical"
}

--------------------------------------------------
⚠️ STRICT RULES
--------------------------------------------------
- DO NOT describe the report layout
- DO NOT include personal info (name, ID, passport)
- DO NOT hallucinate values
- Extract ONLY visible data
- If a value is unclear → SKIP it
- Keep response SHORT and CLEAN
- ALWAYS return VALID JSON
- No markdown, no explanation outside JSON

--------------------------------------------------
🧠 INTELLIGENCE RULES
--------------------------------------------------
- If most values are normal → risk = Low
- If few abnormal → risk = Moderate
- If many abnormal → risk = High

- If all normal → final_status = "Fit"
- If some abnormal → "Attention Needed"
- If serious abnormalities → "Critical"

--------------------------------------------------
🎯 GOAL
--------------------------------------------------
Act like a smart doctor giving quick, accurate insight for a mobile app.
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            system_prompt,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        ]
    )

    return {"analysis": response.text}