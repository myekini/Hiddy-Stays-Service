import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🧪 Test API endpoint called");
  
  try {
    const body = await request.json();
    console.log("📝 Test body:", body);
    
    return NextResponse.json({
      success: true,
      message: "Test endpoint working",
      receivedData: body
    });
  } catch (error) {
    console.error("❌ Test API error:", error);
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
