import { Assignment } from '@/lib/types';

export function downloadPaperDocx(a: Assignment, facultyName: string) {
  let paperContent = (a as any).paper?.content;
  if (typeof paperContent === 'string') {
    try {
      paperContent = JSON.parse(paperContent);
    } catch (e) {
      console.error(e);
    }
  }

  const isInternal = a.examType?.includes('40 Marks') || false;
  let modulesHtml = '';

  if (paperContent && Array.isArray(paperContent)) {
    paperContent.forEach((m: any, mi: number) => {
      if (isInternal) {
        modulesHtml += `
          <div class="module"><b>MODULE ${m.id} — ${m.title}</b>
            <p class="q"><b>${mi * 2 + 1}.</b> (a) ${m.questions.q1.a.text} [${m.questions.q1.a.marks}M, ${m.questions.q1.a.coMapping}, ${m.questions.q1.a.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(b) ${m.questions.q1.b.text} [${m.questions.q1.b.marks}M, ${m.questions.q1.b.coMapping}, ${m.questions.q1.b.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(c) ${m.questions.q1.c.text} [${m.questions.q1.c.marks}M, ${m.questions.q1.c.coMapping}, ${m.questions.q1.c.bloomsLevel}]</p>
            <p class="or">OR</p>
            <p class="q"><b>${mi * 2 + 2}.</b> (a) ${m.questions.q2.a.text} [${m.questions.q2.a.marks}M, ${m.questions.q2.a.coMapping}, ${m.questions.q2.a.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(b) ${m.questions.q2.b.text} [${m.questions.q2.b.marks}M, ${m.questions.q2.b.coMapping}, ${m.questions.q2.b.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(c) ${m.questions.q2.c.text} [${m.questions.q2.c.marks}M, ${m.questions.q2.c.coMapping}, ${m.questions.q2.c.bloomsLevel}]</p>
          </div>
        `;
      } else {
        modulesHtml += `
          <div class="module"><b>MODULE ${m.id} — ${m.title}</b>
            <p class="q"><b>${m.id * 2 - 1}.</b> (a) ${m.questions.q1a.text} [${m.questions.q1a.marks}M, ${m.questions.q1a.coMapping}, ${m.questions.q1a.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(b) ${m.questions.q1b.text} [${m.questions.q1b.marks}M, ${m.questions.q1b.coMapping}, ${m.questions.q1b.bloomsLevel}]</p>
            <p class="or">OR</p>
            <p class="q"><b>${m.id * 2}.</b> (a) ${m.questions.q2a.text} [${m.questions.q2a.marks}M, ${m.questions.q2a.coMapping}, ${m.questions.q2a.bloomsLevel}]</p>
            <p class="q">&nbsp;&nbsp;&nbsp;&nbsp;(b) ${m.questions.q2b.text} [${m.questions.q2b.marks}M, ${m.questions.q2b.coMapping}, ${m.questions.q2b.bloomsLevel}]</p>
          </div>
        `;
      }
    });
  } else {
    modulesHtml = `
      <div class="module"><b>MODULE 1</b>
        <p class="q">1. (a) [No question paper content drafted yet]</p>
      </div>
    `;
  }

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${a.assessmentCode}</title>
<style>
  body { font-family: 'Times New Roman', serif; padding: 60px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #1A2B4A; padding-bottom: 12px; margin-bottom: 18px; }
  .id { display: inline-block; background:#E8A020;color:#1A2B4A;padding:3px 10px;border-radius:14px;font-family:monospace;font-weight:700;font-size:12px;}
  table { width:100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #444; padding: 6px 10px; font-size: 13px; }
  .meta { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; margin: 14px 0; font-size: 13px; }
  h2 { margin: 8px 0 4px; font-size: 16px; }
  .q { margin: 6px 0 6px 18px; font-size: 13px; }
  .module { margin-top: 14px; }
  .or { text-align: center; font-weight: bold; margin: 6px 0; }
</style></head>
<body onload="window.print()">
  <div class="header">
    <h2 style="margin:0">AMC ENGINEERING COLLEGE, BENGALURU</h2>
    <p style="margin:4px 0;">Affiliated to VTU · Autonomous Institution</p>
    <p style="margin:4px 0;"><span class="id">${a.assessmentCode}</span></p>
    <h3 style="margin:6px 0;">${a.examType}</h3>
  </div>
  <div class="meta">
    <div><b>Course:</b> ${a.course?.courseName || '—'}</div>
    <div><b>Course Code:</b> ${a.course?.courseCode || '—'}</div>
    <div><b>Semester:</b> ${a.course?.semester || '—'}</div>
    <div><b>Scheme:</b> ${a.course?.schemeYear || '—'}</div>
    <div><b>Set By:</b> ${facultyName}</div>
    <div><b>Date:</b> ${a.dueDate}</div>
  </div>
  ${a.description ? `<p><i>${a.description}</i></p>` : ''}
  <p><b>Instructions:</b> Answer ALL questions. Each main question carries equal marks.</p>

  ${modulesHtml}
  
  <p style="margin-top:30px;text-align:center;font-size:11px;color:#666;">--- End of Question Paper ---</p>
</body></html>`;

  const safeFac = facultyName.replace(/\s+/g, '');
  const filename = `QP_${a.assessmentCode}_${a.course?.courseCode || '—'}_${safeFac}.doc`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
