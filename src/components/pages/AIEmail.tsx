import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../shared/Modal';
import { STAGE_COLORS, type Lead, type Activity } from '../../types';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function fmtCurrency(n: number): string {
  if (!n && n !== 0) return '$0';
  return '$' + Number(n).toLocaleString('en-US');
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function stagePillClass(s: string): string {
  const map: Record<string, string> = {
    'Prospecting': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'Qualification': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'Proposal': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    'Negotiation': 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    'Closed Won': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    'Closed Lost': 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[s] || 'bg-gray-100 text-gray-600';
}

const ACTIVITY_ICONS: Record<string, string> = {
  'Call': 'fa-phone',
  'Email': 'fa-envelope',
  'Meeting': 'fa-handshake',
  'Note': 'fa-note-sticky',
};

const ACTIVITY_BGS: Record<string, string> = {
  'Call': 'bg-green-100 dark:bg-green-900/30 text-green-600',
  'Email': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  'Meeting': 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  'Note': 'bg-slate-100 dark:bg-slate-800 text-slate-600',
};

// Stage meanings for AI context
const STAGE_MEANING: Record<string, string> = {
  'Prospecting': 'Earliest stage. First contact made; building awareness and qualifying basic interest. Keep it light, value-led, no hard sell.',
  'Qualification': 'Assessing fit, budget, authority and timeline. Focus on understanding needs and establishing credibility.',
  'Proposal': 'A formal proposal has been shared and is under evaluation. Reinforce value, address comparisons, make it easy to say yes.',
  'Negotiation': 'Terms and pricing are being finalized; decision is close. Be confident, create gentle urgency, remove final friction.',
  'Closed Won': 'Deal already won. This is relationship-building, onboarding or upsell — warm and appreciative.',
  'Closed Lost': 'Deal was lost. This is a respectful re-engagement; acknowledge the past, offer fresh value, low pressure.',
};

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

type Tone = 'Professional' | 'Friendly' | 'Urgent';
type Purpose = 'Initial Outreach' | 'Follow-up After Call' | 'Send Proposal' | 'Re-engage Cold Lead' | 'Thank You After Meeting' | 'Closing the Deal';
type Language = 'English' | 'Vietnamese';

export function AIEmail() {
  const { leads, activities, currentUser, showToast, addActivity } = useApp();

  // State
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [purpose, setPurpose] = useState<Purpose>('Initial Outreach');
  const [language, setLanguage] = useState<Language>('English');
  const [extraContext, setExtraContext] = useState('');
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);

  // Selected lead data
  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Lead activities
  const leadActivities = useMemo(() => {
    if (!selectedLeadId) return [];
    return activities
      .filter(a => a.lead_id === selectedLeadId || a.lead_name === selectedLead?.name)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [activities, selectedLeadId, selectedLead]);

  // ═══════════════════════════════════════════════════════════
  // BUILD PROMPT
  // ═══════════════════════════════════════════════════════════

  const buildPrompt = useCallback((lead: Lead, acts: Activity[]): string => {
    const senderRole = currentUser?.role === 'manager' ? 'Account Manager' : 'Account Sales';
    const stageMeaning = STAGE_MEANING[lead.stage] || '';
    const activityText = acts.length
      ? acts.map(a => `- ${a.type} on ${formatDate(a.date)}: ${a.notes || '(no notes)'}${a.next_action ? ` | Next action: ${a.next_action}` : ''}`).join('\n')
      : 'No previous interactions logged.';

    return `You are an expert B2B sales copywriter for SalesTrack, a CRM company.
Write a single, ready-to-send sales email. Be specific, human, and concise — no placeholders like [Name].

OUTPUT LANGUAGE: ${language}.

LEAD CONTEXT
- Contact name: ${lead.name}
- Company: ${lead.company}
- Deal size: ${fmtCurrency(lead.deal_size)}
- Pipeline stage: ${lead.stage}
- What this stage means in the sales cycle: ${stageMeaning}

RECENT ACTIVITY HISTORY (reference this so the email connects to prior interactions)
${activityText}

EMAIL BRIEF
- Tone: ${tone}
- Purpose: ${purpose}
${extraContext ? `- Additional context from the rep: ${extraContext}` : ''}

SENDER (sign off exactly as this, on the final two lines of the body)
${currentUser?.name || 'Sales Representative'}
${senderRole}, SalesTrack

REQUIREMENTS
- Match the tone and purpose. Tailor the message to the pipeline stage and reference the most recent activity naturally.
- 120–200 words. Plain text body (you may use "• " bullet lines for any list).
- End the body with the sender's name and role on the last two lines.

Return ONLY valid JSON, no markdown fences, in this exact shape:
{ "subject": "…", "body": "…" }`;
  }, [currentUser, tone, purpose, language, extraContext]);

  // ═══════════════════════════════════════════════════════════
  // FALLBACK EMAIL
  // ═══════════════════════════════════════════════════════════

  const getFallbackEmail = useCallback((lead: Lead, acts: Activity[]): { subject: string; body: string } => {
    const senderRole = currentUser?.role === 'manager' ? 'Account Manager' : 'Account Sales';
    const firstName = lead.name.split(' ').slice(-1)[0];
    const lastAct = acts[0];
    const isVi = language === 'Vietnamese';

    if (isVi) {
      return {
        subject: `${lead.company} — bước tiếp theo cùng SalesTrack`,
        body: `Chào ${firstName},\n\n${lastAct ? `Cảm ơn buổi ${lastAct.type.toLowerCase()} gần đây của chúng ta. ` : ''}Tôi viết email này để tiếp nối trao đổi về cách SalesTrack có thể hỗ trợ ${lead.company}.\n\nMột vài điểm chính:\n• Quy trình pipeline rõ ràng, dễ theo dõi\n• Tự động hoá hoạt động bán hàng\n• Báo cáo thời gian thực\n\nBạn có rảnh 15 phút trong tuần này để trao đổi thêm không?\n\nTrân trọng,\n${currentUser?.name || 'Sales Representative'}\n${senderRole}, SalesTrack`
      };
    }

    return {
      subject: `Next steps for ${lead.company} with SalesTrack`,
      body: `Hi ${firstName},\n\n${lastAct ? `Thanks for the recent ${lastAct.type.toLowerCase()}. ` : ''}I wanted to follow up on how SalesTrack can help ${lead.company} at this stage.\n\nA few highlights:\n• A clear, easy-to-track pipeline\n• Automated sales activity logging\n• Real-time reporting and forecasts\n\nWould you have 15 minutes this week for a quick chat?\n\nBest regards,\n${currentUser?.name || 'Sales Representative'}\n${senderRole}, SalesTrack`
    };
  }, [currentUser, language]);

  // ═══════════════════════════════════════════════════════════
  // GENERATE EMAIL
  // ═══════════════════════════════════════════════════════════

  const handleGenerate = useCallback(async () => {
    if (!selectedLead) {
      showToast('error', 'Please select a lead first');
      return;
    }

    setIsGenerating(true);
    setEmail(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    let generatedEmail = null;

    try {
      if (!apiKey) throw new Error('NO_KEY');

      const prompt = buildPrompt(selectedLead, leadActivities);
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) throw new Error('API ' + res.status);

      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      generatedEmail = JSON.parse(clean);

      if (!generatedEmail.subject || !generatedEmail.body) throw new Error('BAD_SHAPE');

      showToast('success', 'Email generated successfully');
    } catch (err) {
      generatedEmail = getFallbackEmail(selectedLead, leadActivities);
      if ((err as Error).message === 'NO_KEY') {
        showToast('warning', 'No API key set — showing a template draft. Add VITE_GEMINI_API_KEY to enable AI.');
      } else {
        showToast('warning', 'AI call failed — showing a template draft instead.');
      }
    }

    setEmail(generatedEmail);
    setIsGenerating(false);
  }, [selectedLead, leadActivities, buildPrompt, getFallbackEmail, showToast]);

  // ═══════════════════════════════════════════════════════════
  // EMAIL HTML BUILDER
  // ═══════════════════════════════════════════════════════════

  const bodyToHtmlBlocks = (body: string): string => {
    const lines = body.split('\n');
    let html = '';
    let bullets: string[] = [];

    const flushBullets = () => {
      if (!bullets.length) return;
      html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#eef2ff;border-left:4px solid #6366f1;border-radius:8px"><tr><td style="padding:16px 20px"><ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;font-family:'Times New Roman',Times,serif;line-height:1.8">${bullets.map(b => `<li style="margin-bottom:6px">${escapeHtml(b)}</li>`).join('')}</ul></td></tr></table>`;
      bullets = [];
    };

    lines.forEach(line => {
      const t = line.trim();
      if (/^[•\-\*]\s+/.test(t)) {
        bullets.push(t.replace(/^[•\-\*]\s+/, ''));
      } else {
        flushBullets();
        if (t) html += `<p style="margin:0 0 16px;color:#334155;font-size:14px;font-family:'Times New Roman',Times,serif;line-height:1.8">${escapeHtml(t)}</p>`;
      }
    });
    flushBullets();
    return html;
  };

  const buildEmailHtml = useCallback((): string => {
    if (!email) return '';
    const senderRole = currentUser?.role === 'manager' ? 'Account Manager' : 'Account Sales';

    // Split off signature lines
    const allLines = email.body.split('\n');
    const trimmedTail = [...allLines];
    while (trimmedTail.length && trimmedTail[trimmedTail.length - 1].trim() === '') trimmedTail.pop();
    const signLines = trimmedTail.length >= 2 ? trimmedTail.slice(-2) : [];
    const bodyForBlocks = trimmedTail.slice(0, Math.max(0, trimmedTail.length - 2)).join('\n');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(email.subject)}</title></head>
<body style="margin:0;padding:24px 0;background:#e9ecf3;font-family:'Plus Jakarta Sans',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.12)">
      <!-- Header banner -->
      <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:32px 40px;text-align:left">
        <div style="display:inline-block;width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:11px;text-align:center;line-height:40px;font-size:18px;color:#fff;margin-bottom:14px">⚡</div>
        <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">SalesTrack</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:2px">Your sales pipeline, simplified.</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px 28px">
        <h2 style="margin:0 0 16px;font-family:'Times New Roman',Times,serif;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;line-height:1.3">${escapeHtml(email.subject)}</h2>
        <div style="border-top:1.5px solid #e2e8f0;margin-bottom:24px"></div>
        ${bodyForBlocks ? bodyToHtmlBlocks(bodyForBlocks) : `<p style="color:#334155;font-size:14px;font-family:'Times New Roman',Times,serif;line-height:1.8">${escapeHtml(email.body)}</p>`}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:0 40px 32px">
        <div style="border-top:1px solid #e2e8f0;padding-top:20px">
          <div style="font-size:15px;font-weight:700;color:#0f172a">${escapeHtml(signLines[0] ? signLines[0].trim() : currentUser?.name || 'Sales Representative')}</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px">${escapeHtml(signLines[1] ? signLines[1].trim() : senderRole + ', SalesTrack')}</div>
          <div style="font-size:13px;color:#6366f1;margin-top:6px">${escapeHtml(currentUser?.email || '')}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:14px">SalesTrack CRM · Helping sales teams close faster</div>
        </div>
      </td></tr>
    </table>
    <div style="font-size:11px;color:#94a3b8;margin-top:16px">You received this email from SalesTrack.</div>
  </td></tr></table>
</body></html>`;
  }, [email, currentUser]);

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  const handleCopy = useCallback(async () => {
    if (!email) return;
    const fullEmail = `Subject: ${email.subject}\n\n${email.body}`;
    await navigator.clipboard.writeText(fullEmail);
    showToast('success', 'Email copied to clipboard');
  }, [email, showToast]);

  const handleCopyHtml = useCallback(async () => {
    const html = buildEmailHtml();
    await navigator.clipboard.writeText(html);
    showToast('success', 'Email HTML copied to clipboard');
  }, [buildEmailHtml, showToast]);

  const handleSendEmail = useCallback(() => {
    if (!selectedLead || !email) return;
    const to = selectedLead.email || '';
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = href;
    showToast('info', 'Opening your email client…');
  }, [selectedLead, email, showToast]);

  const handleLogAsActivity = useCallback(async () => {
    if (!selectedLead || !email) return;
    await addActivity({
      type: 'Email',
      lead_id: selectedLead.id,
      lead_name: selectedLead.name,
      company: selectedLead.company,
      stage: selectedLead.stage,
      date: new Date().toISOString().split('T')[0],
      duration: 0,
      notes: `Subject: ${email.subject}\n\n${email.body}`,
      next_action: 'Follow up on email',
      owner_id: currentUser?.id || '0',
    });
    showToast('success', 'Email logged as activity');
  }, [selectedLead, email, addActivity, currentUser, showToast]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-3">
            AI Email Composer
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
              AI Powered
            </span>
          </h1>
          <p className="text-sm text-text-muted mt-1">Draft context-aware sales emails powered by Gemini</p>
        </div>
      </div>

      {/* Top Row: Lead Info + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Information */}
        <div className="bg-bg-card dark:bg-gray-800 border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <i className="fa-solid fa-user-tag text-accent"></i>
            Lead Information
            <span className="ml-auto text-text-muted font-normal">from your pipeline</span>
          </div>

          {/* Lead Select */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Select Lead</label>
            <select
              value={selectedLeadId}
              onChange={e => { setSelectedLeadId(e.target.value); setEmail(null); }}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
            >
              <option value="">Choose a lead…</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} — {l.company}</option>
              ))}
            </select>
          </div>

          {/* Lead Detail */}
          {selectedLead ? (
            <div className="space-y-3">
              {/* Lead Info Rows */}
              <div className="divide-y divide-border-light">
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-text-muted">Name</span>
                  <span className="text-sm font-semibold text-text-primary">{selectedLead.name}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-text-muted">Company</span>
                  <span className="text-sm font-semibold text-text-primary">{selectedLead.company}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-text-muted">Pipeline Stage</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stagePillClass(selectedLead.stage)}`}>
                    {selectedLead.stage}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-text-muted">Deal Size</span>
                  <span className="text-sm font-bold text-accent">{fmtCurrency(selectedLead.deal_size)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-text-muted">Email</span>
                  <span className="text-sm text-accent">{selectedLead.email || '—'}</span>
                </div>
              </div>

              {/* Recent Activities */}
              <div>
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                  Recent Activity {leadActivities.length ? `(${leadActivities.length})` : ''}
                </div>
                {leadActivities.length > 0 ? (
                  <div className="space-y-2">
                    {leadActivities.map(act => (
                      <div key={act.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ACTIVITY_BGS[act.type] || 'bg-gray-100'}`}>
                          <i className={`fa-solid ${ACTIVITY_ICONS[act.type] || 'fa-circle'} text-xs`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text-primary">
                            {act.type} · <span className="font-normal text-text-muted">{formatDate(act.date)}</span>
                          </div>
                          <div className="text-[11px] text-text-secondary line-clamp-2 mt-0.5">{act.notes || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted py-2">No activity logged for this lead yet.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <i className="fa-solid fa-user-tag text-3xl mb-3 block opacity-30"></i>
              <p className="text-sm font-medium text-text-secondary">No lead selected</p>
              <p className="text-xs mt-1">Pick a lead to load its details and history.</p>
            </div>
          )}
        </div>

        {/* Email Configuration */}
        <div className="bg-bg-card dark:bg-gray-800 border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-accent"></i>
            Email Configuration
          </div>

          <div className="space-y-4">
            {/* Tone Grid */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Professional', 'Friendly', 'Urgent'] as Tone[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      tone === t
                        ? 'border-accent bg-indigo-50 dark:bg-indigo-900/30 text-accent'
                        : 'border-border text-text-secondary hover:border-accent hover:text-accent'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose Select */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Purpose</label>
              <select
                value={purpose}
                onChange={e => setPurpose(e.target.value as Purpose)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
              >
                <option>Initial Outreach</option>
                <option>Follow-up After Call</option>
                <option>Send Proposal</option>
                <option>Re-engage Cold Lead</option>
                <option>Thank You After Meeting</option>
                <option>Closing the Deal</option>
              </select>
            </div>

            {/* Language Toggle */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Language</label>
              <div className="inline-flex border border-border rounded-lg overflow-hidden">
                {(['English', 'Vietnamese'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-4 py-2 text-xs font-semibold transition-all ${
                      language === l
                        ? 'bg-accent text-white'
                        : 'bg-bg-page text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Additional Context <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={extraContext}
                onChange={e => setExtraContext(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm resize-none"
                placeholder="Any specific points, offers, or constraints to include…"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedLeadId || isGenerating}
              className="w-full py-3 bg-accent text-white rounded-lg font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Generating…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Generate Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Email */}
      <div className="bg-bg-card dark:bg-gray-800 border border-border rounded-xl p-5 shadow-sm">
        <div className="text-xs font-semibold text-text-secondary mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-envelope-open-text text-accent"></i>
            Generated Email
          </span>
          {email && <span className="text-green-600 text-[10px]">ready</span>}
        </div>

        {isGenerating ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <i className="fa-solid fa-spinner fa-spin text-2xl mr-3"></i>
            <span>Drafting your email…</span>
          </div>
        ) : email ? (
          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Subject</label>
              <input
                type="text"
                value={email.subject}
                onChange={e => setEmail({ ...email, subject: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Body</label>
              <textarea
                value={email.body}
                onChange={e => setEmail({ ...email, body: e.target.value })}
                rows={12}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-page text-sm resize-none font-mono"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleGenerate}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate"></i>
                Regenerate
              </button>
              <div className="flex-1"></div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-copy"></i>
                Copy Text
              </button>
              <button
                onClick={() => setShowDesignModal(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-palette"></i>
                Design Email
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-paper-plane"></i>
                Send Email
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-light">
              <button
                onClick={handleLogAsActivity}
                className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-accent transition-all flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                Log as Activity
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-text-muted">
            <i className="fa-solid fa-envelope-open-text text-4xl mb-4 block opacity-30"></i>
            <p className="text-sm font-medium text-text-secondary">Your email will appear here</p>
            <p className="text-xs mt-1">Select a lead, configure the settings, then click Generate Email.</p>
          </div>
        )}
      </div>

      {/* Design Email Modal */}
      <Modal isOpen={showDesignModal} onClose={() => setShowDesignModal(false)} title="Email Preview" size="lg">
        <div className="space-y-4">
          {/* Copy HTML Button */}
          <div className="flex justify-end">
            <button
              onClick={handleCopyHtml}
              className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-code"></i>
              Copy HTML
            </button>
          </div>

          {/* Email Preview */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6">
            <iframe
              srcDoc={buildEmailHtml()}
              className="w-full h-[500px] border-none rounded-lg bg-white"
              title="Email Preview"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowDesignModal(false)}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg font-semibold text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => { handleSendEmail(); setShowDesignModal(false); }}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-paper-plane"></i>
              Send Email
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
