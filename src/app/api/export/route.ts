import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Only CSV format is supported' },
        { status: 400 }
      );
    }

    const tasks = await db.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'title',
      'status',
      'priority',
      'category',
      'dueDatetime',
      'createdAt',
      'completedAt',
      'boardColumn',
      'projectId',
    ];

    const csvRows: string[] = [headers.map(escapeCsvField).join(',')];

    for (const task of tasks) {
      const row = [
        escapeCsvField(task.title),
        escapeCsvField(task.status),
        escapeCsvField(task.priority),
        escapeCsvField(task.category),
        escapeCsvField(task.dueDatetime?.toISOString()),
        escapeCsvField(task.createdAt.toISOString()),
        escapeCsvField(task.completedAt?.toISOString()),
        escapeCsvField(task.boardColumn),
        escapeCsvField(task.projectId),
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tasks-export.csv"',
      },
    });
  } catch (error) {
    console.error('Error exporting tasks:', error);
    return NextResponse.json(
      { error: 'Failed to export tasks' },
      { status: 500 }
    );
  }
}
