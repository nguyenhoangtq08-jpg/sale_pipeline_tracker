import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { STAGE_COLORS, EMAIL_TYPES, EMAIL_TONES, type Lead } from '../../types';

const SYSTEM_PROMPT = `You are a professional sales email writer. Write compelling, personalized sales emails that are:
- Professional yet engaging
- Clear and concise
- Action-oriented
- Tailored to the recipient's stage in the sales process
- Include a clear call-to-action

Format the response as:
Subject: [email subject]

[Email body]`;

export function AIEmail() {
  const { leads, addActivity, currentUser, showToast } = useApp();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailType, setEmailType] = useState<(typeof EMAIL_TYPES)[number]>('First Outreach');
  const [tone, setTone] = useState<(typeof EMAIL_TONES)[number]>('Professional');
  const [keyPoints, setKeyPoints] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLead) {
      showToast('error', 'Please select a lead first');
      return;
    }

    setIsGenerating(true);
    setGeneratedEmail(null);

    try {
      const prompt = `Write a ${emailType.toLowerCase()} email for a sales lead with the following details:

Lead Information:
- Name: ${selectedLead.name}
- Company: ${selectedLead.company || 'N/A'}
- Current Stage: ${selectedLead.stage}
- Deal Size: $${selectedLead.deal_size?.toLocaleString() || 'N/A'}

Email Requirements:
- Tone: ${tone}
- Type: ${emailType}
${keyPoints ? `- Key Points to Include: ${keyPoints}` : ''}

Write a personalized, professional sales email.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate email');
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Parse subject and body
      const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `${emailType} - ${selectedLead.company || selectedLead.name}`;
      const body = content.replace(/Subject:\s*.+?\n/i, '').trim();

      setGeneratedEmail({ subject, body });
      showToast('success', 'Email generated successfully');
    } catch (error) {
      console.error('Error generating email:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedEmail) return;

    const fullEmail = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    showToast('success', 'Email copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogAsActivity = async () => {
    if (!selectedLead || !generatedEmail) return;

    await addActivity({
      type: 'Email',
      lead_id: selectedLead.id,
      lead_name: selectedLead.name,
      company: selectedLead.company,
      stage: selectedLead.stage,
      date: new Date().toISOString().split('T')[0],
      duration: 0,
      notes: `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`,
      next_action: 'Follow up on email',
      user_id: currentUser?.id || '0',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">AI Email Composer</h1>
        <p className="text-text-secondary dark:text-text-muted">Generate personalized sales emails with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Panel */}
        <div className="bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-pen-to-square text-accent"></i>
            Compose
          </h2>

          <div className="space-y-4">
            {/* Lead Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Select Lead</label>
              <select
                value={selectedLead?.id || ''}
                onChange={(e) => {
                  const lead = leads.find(l => l.id === e.target.value);
                  setSelectedLead(lead || null);
                  setGeneratedEmail(null);
                }}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
              >
                <option value="">Choose a lead...</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} - {l.company || 'No company'}</option>
                ))}
              </select>
            </div>

            {/* Selected Lead Info */}
            {selectedLead && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS] }}
                  >
                    {selectedLead.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary dark:text-white">{selectedLead.name}</p>
                    <p className="text-sm text-text-secondary dark:text-text-muted">{selectedLead.company}</p>
                  </div>
                  <Badge variant="stage" color={STAGE_COLORS[selectedLead.stage as keyof typeof STAGE_COLORS]}>
                    {selectedLead.stage}
                  </Badge>
                </div>
              </div>
            )}

            {/* Email Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Email Type</label>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setEmailType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      emailType === type
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tone === t
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Points */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">Key Points (Optional)</label>
              <textarea
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white resize-none"
                placeholder="Mention specific features, pricing, timeline..."
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-white mb-1">API Key (Optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border dark:border-border bg-transparent text-text-primary dark:text-white"
                placeholder="Anthropic API key or use env default"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedLead || isGenerating}
              className="w-full py-3 bg-gradient-to-r from-accent to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-bg-card dark:bg-bg-card rounded-xl p-6 shadow-sm border border-border dark:border-border">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-eye text-purple-500"></i>
            Preview
          </h2>

          {isGenerating ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            </div>
          ) : generatedEmail ? (
            <div className="space-y-4">
              {/* To */}
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">To</p>
                <p className="text-text-primary dark:text-white">
                  {selectedLead?.name} {selectedLead?.email && `<${selectedLead.email}>`}
                </p>
              </div>

              {/* Subject */}
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Subject</p>
                <p className="text-text-primary dark:text-white font-medium">{generatedEmail.subject}</p>
              </div>

              {/* Body */}
              <div>
                <p className="text-xs text-text-muted uppercase font-semibold mb-1">Body</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <p className="text-text-secondary dark:text-text-muted whitespace-pre-wrap">{generatedEmail.body}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 px-4 py-2 border border-border dark:border-border rounded-lg text-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleLogAsActivity}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i>
                  Log as Activity
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <i className="fa-solid fa-envelope-open text-2xl text-text-muted"></i>
              </div>
              <p className="text-text-secondary dark:text-text-muted">Select a lead and generate an email</p>
              <p className="text-sm text-text-muted mt-1">to see the preview here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
