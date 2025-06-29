import { NextRequest, NextResponse } from 'next/server';
import { TwitterBotService } from '../../../../lib/twitter-bot-service';

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botService = new TwitterBotService();
    
    // Execute health change alerts (includes screenshots)
    await botService.executeHealthChangeAlerts();
    
    return NextResponse.json({
      success: true,
      message: 'Health change alerts executed successfully'
    });

  } catch (error) {
    console.error('Health alerts API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}