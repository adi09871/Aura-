// File: app/api/mesh/route.ts
import { NextResponse } from 'next/server';

// Hackathon demo के लिए In-memory database (सिर्फ़ असली कनेक्टेड डिवाइस स्टोर करेगा)
let activeNodes: any[] = [];

export async function GET() {
  // जो डिवाइस पिछले 10 सेकंड से एक्टिव नहीं हैं, उन्हें हटा दो (Disconnected)
  const now = Date.now();
  activeNodes = activeNodes.filter(n => now - n.lastSeen < 10000);
  return NextResponse.json(activeNodes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, type } = body;

  const existingIndex = activeNodes.findIndex(n => n.id === id);
  if (existingIndex > -1) {
    // अगर डिवाइस पहले से है, तो उसका टाइम अपडेट कर दो
    activeNodes[existingIndex].lastSeen = Date.now();
  } else {
    // नया डिवाइस आया है, उसे मैप पर एक असली जगह (x, y) दे दो
    activeNodes.push({
      id,
      type,
      x: Math.random() * 60 + 20, 
      y: Math.random() * 60 + 20,
      lastSeen: Date.now()
    });
  }
  return NextResponse.json({ success: true, totalNodes: activeNodes.length });
}