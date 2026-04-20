import { NextResponse } from 'next/server';

import { generateMockJsonText } from '@/lib/mock-data';

type AiMode = 'chat' | 'code-fix' | 'mock-data';

interface AiRequestBody {
  mode?: AiMode;
  message?: string;
  prompt?: string;
  instruction?: string;
  snippet?: string;
  template?: string;
  count?: number;
}

function localResponse(body: AiRequestBody) {
  if (body.mode === 'mock-data') {
    if (!body.template) {
      return 'Paste a JSON template to generate mock data.';
    }

    try {
      return generateMockJsonText(body.template);
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to generate mock data from the provided template.';
    }
  }

  if (body.mode === 'code-fix') {
    const snippet = body.snippet?.trim() || '// No snippet provided.';
    const instruction = body.instruction?.trim() || 'Improve the snippet.';
    return [
      'Explanation: I tightened the snippet into a safer, more readable form with minimal structural changes.',
      '',
      `Instruction: ${instruction}`,
      '',
      'Suggested code:',
      '```ts',
      snippet,
      '```'
    ].join('\n');
  }

  const message = body.message?.trim() || body.prompt?.trim() || 'JSONLab';
  return [
    `JsonLab helper response for: ${message}`,
    '',
    '- Keep the workspace focused on the primary JSON source.',
    '- Use the tree view for structure, the table view for leaf inspection, and the diff view for comparisons.',
    '- When schema validation is available, generate types from the schema to preserve the contract.'
  ].join('\n');
}

async function tryRemoteAiResponse(body: AiRequestBody) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_AI_MODEL ?? 'meta/llama-3.3-70b-instruct';
  const apiUrl = process.env.NVIDIA_AI_URL ?? 'https://integrate.api.nvidia.com/v1/chat/completions';

  if (!apiKey) {
    return null;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are a precise JSONLab assistant. Return concise, practical answers. For code-fix requests, provide a corrected code block and a short explanation. For mock-data requests, return valid JSON only when possible.'
    },
    {
      role: 'user',
      content: JSON.stringify(body, null, 2)
    }
  ];

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1200
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const content = extractAiContent(payload);
  return content || null;
}

function extractAiContent(payload: Record<string, unknown>): string | null {
  const choice = Array.isArray(payload.choices) ? (payload.choices[0] as Record<string, unknown> | undefined) : undefined;
  const choiceMessage = choice && typeof choice.message === 'object' && choice.message !== null ? (choice.message as Record<string, unknown>) : undefined;
  const messageContent = typeof choiceMessage?.content === 'string' ? choiceMessage.content : null;

  if (messageContent) {
    return messageContent;
  }

  const output = Array.isArray(payload.output) ? (payload.output[0] as Record<string, unknown> | undefined) : undefined;
  const outputContent = Array.isArray(output?.content) ? (output?.content[0] as Record<string, unknown> | undefined) : undefined;

  if (typeof outputContent?.text === 'string') {
    return outputContent.text;
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AiRequestBody;

  try {
    const remoteResponse = await tryRemoteAiResponse(body);
    const response = remoteResponse ?? localResponse(body);
    return NextResponse.json({ response, provider: remoteResponse ? 'nvidia' : 'local' });
  } catch (error) {
    return NextResponse.json(
      {
        response: localResponse(body),
        provider: 'local',
        error: error instanceof Error ? error.message : 'AI request failed.'
      },
      { status: 200 }
    );
  }
}