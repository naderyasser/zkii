import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai';

// POST /api/ai/fill — يملأ قيمة خاصية واحدة لصف بالاعتماد على باقي خصائصه.
// body: { property: {name,type,options?}, context: {propName: value}, instruction? }
// بيرجّع { value } — للـ select بيرجّع id الخيار.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { property, context, instruction } = body as {
      property: { name: string; type: string; options?: { id: string; name: string }[] };
      context: Record<string, unknown>;
      instruction?: string;
    };

    if (!property?.name) {
      return NextResponse.json({ error: 'property required' }, { status: 400 });
    }

    const optionsHint =
      property.options && property.options.length
        ? `\nالقيمة لازم تكون واحدة من الخيارات دي (استخدم الـ id): ${property.options
            .map((o) => `${o.id} (${o.name})`)
            .join(' / ')}`
        : '';

    const typeHint: Record<string, string> = {
      number: 'القيمة لازم تكون رقم.',
      checkbox: 'القيمة لازم تكون true أو false.',
      date: 'القيمة لازم تكون تاريخ بصيغة YYYY-MM-DD.',
      url: 'القيمة لازم تكون رابط صالح.',
      multiSelect: 'القيمة لازم تكون مصفوفة من الـ ids.',
    };

    const system =
      'أنت زكي، مساعد ذكي يملأ خصائص قواعد البيانات. رد بـ JSON فقط على الشكل {"value": ...} بدون أي شرح أو نص إضافي.';
    const prompt = `بيانات الصف الحالية:
${JSON.stringify(context, null, 2)}

المطلوب: استنتج قيمة مناسبة للخاصية «${property.name}» (النوع: ${property.type}).${optionsHint}
${typeHint[property.type] || ''}
${instruction ? `تعليمات إضافية: ${instruction}` : ''}

رد بـ JSON فقط: {"value": <القيمة>}`;

    const completion = await chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 256,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    // استخرج أول كتلة JSON من الرد
    const match = raw.match(/\{[\s\S]*\}/);
    let value: unknown = null;
    if (match) {
      try {
        value = JSON.parse(match[0]).value;
      } catch {
        value = null;
      }
    }
    if (value === null) {
      // fallback: استخدم النص الخام بعد التنظيف
      value = raw.replace(/```json|```/g, '').trim();
    }

    return NextResponse.json({ value });
  } catch (error) {
    console.error('[ai/fill] error', error);
    return NextResponse.json({ error: 'fill failed' }, { status: 500 });
  }
}
