import { UserProfile } from "./StorageService";

export interface ReportData {
  title: string;
  lines: { label: string; value: string }[];
  rawText?: string;
}

export interface FormattedMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class ReportAnalyzeChat {
  private readonly MEDICAL_KEYWORDS = [
    "glucose", "hba1c", "pressure", "bp", "heart", "pulse", "cholesterol", "ldl", "hdl", "triglyceride",
    "kidney", "creatinine", "urea", "liver", "alt", "ast", "protein", "albumin", "hemoglobin", "hgb",
    "wbc", "rbc", "platelet", "sugar", "tsh", "thyroid", "vitamin", "iron", "ferritin", "calcium", "result"
  ];

  public generateReportMessages(
    reportData: ReportData,
    profile: UserProfile | null,
    history: { id?: string; role: string; content?: string; text?: string }[]
  ): FormattedMessage[] {


    // 2. High-Fidelity Proximity Parser: Extract specific values within medical ranges
    let findingsText = "PATIENT DATA:\n";
    if (reportData.rawText) {
      const text = reportData.rawText;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

      // Extraction Helpers
      const findNear = (keyword: string, min: number, max: number, unit: string) => {
        const idx = lines.findIndex(l => l.toLowerCase().includes(keyword.toLowerCase()));
        if (idx === -1) return null;

        // Scan 10 lines around the keyword
        for (let i = Math.max(0, idx - 2); i < Math.min(lines.length, idx + 8); i++) {
          const match = lines[i].match(/(\d+(\.\d+)?)/);
          if (match) {
            const val = parseFloat(match[1]);
            if (val >= min && val <= max) return `${val}${unit}`;
          }
        }
        return null;
      };

      const hba1c = findNear("HbA1C", 3, 20, "%");
      const glucose = findNear("Glucose", 40, 600, " mg/dL");

      // Build the requested format
      if (hba1c) findingsText += `- HbA1C: ${hba1c}\n`;
      if (glucose) findingsText += `- Estimated Average Glucose: ${glucose}\n`;

      // If none found specifically, don't use 'Finding 1' (confuses 0.5B)
      // Instead, just pass the raw findings to let the AI try to label them 
      if (!hba1c && !glucose) {
        findingsText += "- Lab Values: " + lines.filter(l => /\d/.test(l)).slice(0, 3).join(", ");
      }
      findingsText = findingsText.trim();
    } else {
      findingsText = "PATIENT DATA:\n" + reportData.lines
        .filter(l => l.label && l.value)
        .map(l => `- ${l.label}: ${l.value}`)
        .join("\n");
    }

    if (findingsText === "PATIENT DATA:") {
      findingsText = "PATIENT DATA:\n- (No clear values found. Please summarize the report findings manually.)";
    }

    // 3. Construct the prompt with Literal Grounding
    const systemContent = `You are MediNova, a medical report analyst. 🩺
Your goal is to explain results using these EXACT medical rules:
- HbA1C below 5.7% is NORMAL. (Congratulate the user!)
- HbA1C 5.7% to 6.4% is PRE-DIABETES.
- HbA1C 6.5% or higher is DIABETES.
- Glucose 70-100 mg/dL is NORMAL.

Profile: ${profile?.age || "Adult"}yo ${profile?.gender || "Person"}. 
Explain the findings in one warm paragraph. Be ultra-concise.`;

    const messages: FormattedMessage[] = [
      { role: "system", content: systemContent }
    ];
    const isInitialAnalysis = history.length <= 2 &&
      history.some(h => (h.content || h.text || "").toLowerCase().includes("explain"));

    if (isInitialAnalysis) {
      messages.push({
        role: "user",
        content: `${findingsText}\n\nTASK:\nExplain these results in simple words.`
      });
    } else {
      // Standard Chat Mode for follow-ups
      const cleanHistory = history.filter(h => h.id !== "1");
      messages.push({
        role: "user",
        content: `CONTEXT: ${findingsText}`
      });
      cleanHistory.forEach(h => {
        messages.push({ role: h.role as any, content: h.content || h.text || "" });
      });
    }

    return messages;
  }
}

export default new ReportAnalyzeChat();
