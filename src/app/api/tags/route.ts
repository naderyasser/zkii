import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const tag = await db.tag.create({
      data: {
        userId: DEFAULT_USER_ID,
        name: name.trim(),
        color: color || '#7aa2f7',
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating tag:', error);
    // Handle unique constraint violation
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
