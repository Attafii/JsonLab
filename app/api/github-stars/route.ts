import { NextResponse } from 'next/server';

const repoUrl = 'https://github.com/Attafii/JsonLab';
const githubApiUrl = 'https://api.github.com/repos/Attafii/JsonLab';

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(githubApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'JsonLab'
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error('Unable to fetch repository metadata.');
    }

    const payload = (await response.json()) as { stargazers_count?: number };

    return NextResponse.json(
      {
        repoUrl,
        stars: typeof payload.stargazers_count === 'number' ? payload.stargazers_count : null
      },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        repoUrl,
        stars: null
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=3600'
        }
      }
    );
  }
}