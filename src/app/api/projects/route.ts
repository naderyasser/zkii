import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          where: { status: 'done' },
          select: { id: true },
        },
      },
    });

    const result = projects.map((project) => ({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      color: project.color,
      icon: project.icon,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: project._count.tasks,
      doneCount: project.tasks.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        userId,
        name: name.trim(),
        description: description || '',
        color: color || '#7aa2f7',
        icon: icon || '📁',
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
