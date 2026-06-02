import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '请提供搜索关键词' }, { status: 400 });
    }

    const response = await fetch(
      `https://bytew.net/OIer/search.php?method=normal&q=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          'User-Agent': 'ICP-Camp-Registration/1.0',
          'Accept': 'application/json',
          'Referer': 'https://bytew.net/OIer/',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'OIerDB 搜索服务暂时不可用' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Parse the awards field from Python-style string to proper JSON
    if (data.result && Array.isArray(data.result)) {
      data.result = data.result.map((item: any) => {
        if (item.awards && typeof item.awards === 'string') {
          try {
            // Convert Python-style dict strings to valid JSON
            const jsonStr = item.awards
              .replace(/'/g, '"')
              .replace(/None/g, 'null')
              .replace(/True/g, 'true')
              .replace(/False/g, 'false');
            item.awards_parsed = JSON.parse(jsonStr);
          } catch {
            item.awards_parsed = [];
          }
        } else {
          item.awards_parsed = [];
        }
        return item;
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OIerDB search error:', error);
    return NextResponse.json(
      { error: '搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}
