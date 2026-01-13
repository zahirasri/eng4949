
import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseRawSchedule = async (rawText: string): Promise<ScheduleEntry[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse the following raw text from an Excel or Google Sheets schedule into a structured JSON array. 
    Look for columns like Student Name, Supervisor, Examiners (1 and 2), Date, Time, and Location/Venue.
    
    Raw Text:
    ${rawText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            supervisor: { type: Type.STRING },
            examiner1: { type: Type.STRING },
            examiner2: { type: Type.STRING },
            date: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            location: { type: Type.STRING },
            projectTitle: { type: Type.STRING }
          },
          required: ['studentName', 'supervisor', 'examiner1', 'date', 'startTime', 'location']
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      ...item,
      id: `parsed-${index}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};

export const getLecturerAdvice = async (initials: string, entries: ScheduleEntry[]): Promise<string> => {
  const summary = entries.map(e => `${e.date} at ${e.startTime} in ${e.location} with student ${e.studentName}`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The lecturer with initials "${initials}" has the following schedule for research proposal presentations: ${summary}. 
    Provide a very brief (max 3 sentences) professional summary/encouragement for their busy day. Mention if they have back-to-back sessions.`
  });
  return response.text || "";
};
