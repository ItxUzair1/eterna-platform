import React, { useState, useEffect } from 'react';
import { sendEmail, getSentEmails, getEmailTemplates, saveEmailTemplate } from '../services/emailService';
import Button from '../components/Button';
import InputField from '../components/InputField';

const tabs = [
  { key: 'compose', label: '✉️ Compose' },
  { key: 'sent', label: '📬 Sent' },
  { key: 'templates', label: '📝 Templates' },
];

export default function Email() {
  const [tab, setTab] = useState('compose');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emails, setEmails] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (tab === 'sent') getSentEmails().then(r => setEmails(r.data));
    if (tab === 'templates') getEmailTemplates().then(r => setTemplates(r.data));
  }, [tab]);

  const handleSend = async (e) => {
    e.preventDefault();
    setStatus('Sending...');
    try {
      await sendEmail({ to, subject, bodyHtml: `<p>${body}</p>`, bodyText: body });
      setStatus('Email sent!');
      setTo(''); setSubject(''); setBody('');
      setTab('sent');
      getSentEmails().then(r => setEmails(r.data));
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject || !body) return alert('Please provide subject and body.');
    await saveEmailTemplate({ name: subject, subject, body });
    setStatus('Template saved!');
    getEmailTemplates().then(r => setTemplates(r.data));
  };

  return (
    // Remove outer padding so it touches navbar/sidebar edges
    <div className="w-full h-[calc(100vh-56px)] bg-gray-50 flex">
      {/* Main content wrapper fills remaining space next to sidebar */}
      <div className="flex-1 h-full overflow-y-auto">
        {/* Top bar with tabs - stick to top for quick access */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 py-3">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-sm sm:text-base px-4 py-2 rounded-full font-semibold transition
                    ${tab === t.key
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  aria-current={tab === t.key ? 'page' : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200">
            <div className="p-6 sm:p-8">
              {tab === 'compose' && (
                <form onSubmit={handleSend} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5">
                    <InputField
                      label="Recipient"
                      placeholder="e.g., hafeez@example.com"
                      value={to}
                      onChange={e => setTo(e.target.value)}
                    />
                    <InputField
                      label="Subject"
                      placeholder="Email subject..."
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={10}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-400"
                        placeholder="Write your message here..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl shadow"
                    >
                      🚀 Send
                    </Button>
                    <Button
                      type="button"
                      className="bg-white border border-indigo-400 text-indigo-700 hover:bg-indigo-50 font-semibold px-5 py-2 rounded-xl"
                      onClick={handleSaveTemplate}
                    >
                      💾 Save as Template
                    </Button>
                  </div>
                </form>
              )}

              {tab === 'sent' && (
                <div>
                  {emails.length === 0 ? (
                    <div className="text-gray-500 text-center py-12 text-lg">
                      📭 No sent emails found.
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {emails.map(email => (
                        <li key={email.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="text-gray-800">
                              <span className="font-semibold text-gray-700">To:</span> {email.to}
                            </div>
                            {email.sentAt && (
                              <div className="text-xs text-gray-500 italic">
                                Sent: {new Date(email.sentAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="font-semibold text-gray-700">Subject:</span>{' '}
                            <span className="text-indigo-700">{email.subject}</span>
                          </div>
                          <div
                            className="mt-3 bg-white rounded-lg p-3 text-gray-800 border border-gray-200"
                            dangerouslySetInnerHTML={{ __html: email.bodyHtml || email.bodyText }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'templates' && (
                <div>
                  {templates.length === 0 ? (
                    <div className="text-gray-500 text-center py-12 text-lg">
                      🗂️ No templates found.
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {templates.map(tpl => (
                        <li key={tpl.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition">
                          <div className="font-semibold text-gray-800">
                            📝 {tpl.name} <span className="text-gray-400 mx-2">•</span>
                            <span className="text-indigo-700">{tpl.subject}</span>
                          </div>
                          <div
                            className="mt-3 bg-white rounded-lg p-3 text-gray-800 border border-gray-200"
                            dangerouslySetInnerHTML={{ __html: tpl.body }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {status && (
                <div className="mt-6 text-center text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg">
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
