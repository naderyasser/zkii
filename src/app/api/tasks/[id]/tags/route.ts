import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const taskTags = await db.tagTask.findMany({
      where: { taskId: id },
      include: { tag: true },
    });

    const tags = taskTags.map((tt) => tt.tag);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching task tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task tags' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { error: 'tagId is required' },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = await db.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify tag exists
    const tag = await db.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Create the association (ignore if already exists)
    const tagTask = await db.tagTask.upsert({
      where: {
        tagId_taskId: { tagId, taskId: id },
      },
      create: { tagId, taskId: id },
      update: {},
      include: { tag: true },
    });

    return NextResponse.json(tagTask.tag, { status: 201 });
  } catch (error: unknown) {
    console.error('Error adding tag to task:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Tag already assigned to this task' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add tag to task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { error: 'tagId is required' },
        { status: 400 }
      );
    }

    const tagTask = await db.tagTask.findUnique({
      where: {
        tagId_taskId: { tagId, taskId: id },
      },
    });

    if (!tagTask) {
      return NextResponse.json(
        { error: 'Tag not assigned to this task' },
        { status: 404 }
      );
    }

    await db.tagTask.delete({
      where: {
        tagId_taskId: { tagId, taskId: id },
      },
    });

    return NextResponse.json({ message: 'Tag removed from task' });
  } catch (error) {
    console.error('Error removing tag from task:', error);
    return NextResponse.json(
      { error: 'Failed to remove tag from task' },
      { status: 500 }
    );
  }
}
