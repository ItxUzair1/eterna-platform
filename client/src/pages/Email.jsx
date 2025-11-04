// src/pages/Email.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  sendEmail, saveDraft, sendDraft, updateDraft,
  getSentEmails, getDrafts, getTrash,
  getEmailTemplates, saveEmailTemplate, deleteEmailTemplate,
  previewTemplate, previewTemplateForLead,
  moveMessage, restoreMessage, hardDeleteMessage,
  uploadEmailAttachment,
  getInbox, syncInbox
} from '../services/emailService';

const tabs = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'spam', label: 'Spam' },
  { key: 'compose', label: 'Compose' },
  { key: 'sent', label: 'Sent' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'trash', label: 'Trash' },
  { key: 'templates', label: 'Templates' },
];

export default function Email() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState('compose');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [replyToMessageId, setReplyToMessageId] = useState(null);

  const [emails, setEmails] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [spam, setSpam] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [trash, setTrash] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [leadId, setLeadId] = useState('');
  const [status, setStatus] = useState(null);
  const [showBcc, setShowBcc] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [viewingEmail, setViewingEmail] = useState(null);

  // Lead deep-link handling
  useEffect(() => {
    if (location.state?.composeTo) {
      setTo(location.state.composeTo);
      if (location.state.leadId) setLeadId(String(location.state.leadId));
      setTab('compose');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Data loading per tab
  useEffect(() => {
    if (tab === 'inbox' || tab === 'spam') {
      getInbox({ limit: 100 }).then(r => {
        const msgs = Array.isArray(r.data) ? r.data : [];
        setInbox(msgs.filter(m => m.folder === 'Inbox'));
        setSpam(msgs.filter(m => m.folder === 'Spam'));
      }).catch(e => setStatus('Error loading inbox: ' + (e.response?.data?.error || e.message)));
    }
    if (tab === 'sent') getSentEmails().then(r => setEmails(r.data));
    if (tab === 'drafts') getDrafts().then(r => setDrafts(r.data));
    if (tab === 'trash') getTrash().then(r => setTrash(r.data));
    if (tab === 'templates') getEmailTemplates().then(r => setTemplates(r.data));
    if (tab === 'compose' && templates.length === 0) {
      getEmailTemplates().then(r => setTemplates(r.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Attachments
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setStatus('Uploading attachments...');
      const results = await Promise.all(files.map(file => uploadEmailAttachment(file)));
      const newAttachments = results.map((result, idx) => ({
        id: result.data.fileId,
        name: result.data.originalName || files[idx].name,
        originalName: result.data.originalName || files[idx].name,
        size: result.data.size || files[idx].size,
        mime: result.data.mime || files[idx].type
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
      setStatus(null);
    } catch (err) {
      setStatus('Error uploading files: ' + (err.response?.data?.error || err.message));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeAttachment = (id) => setAttachments(attachments.filter(a => a.id !== id));
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Sending / Drafts / Templates
  const handleSend = async (e) => {
    e.preventDefault();
    setStatus('Sending...');
    try {
      await sendEmail({
        to, cc, bcc, subject,
        bodyHtml: `<div>${body.replace(/\n/g, '<br>')}</div>`,
        bodyText: body,
        attachments: attachments.map(a => ({ id: a.id })),
        replyToMessageId
      });
      setStatus('Email sent successfully');
      clearComposeForm();
      setTab('sent');
      getSentEmails().then(r => setEmails(r.data));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setStatus('Error: ' + errorMsg);
      if (errorMsg.includes('No SMTP configuration')) {
        setTimeout(() => {
          if (confirm('No email configuration found. Configure it now?')) navigate('/dashboard/email-settings');
        }, 400);
      }
      if (errorMsg.includes('Decryption failed') || errorMsg.includes('encryption key')) {
        setTimeout(() => {
          if (confirm('SMTP password decryption failed. Update the SMTP password in Settings now?')) {
            navigate('/dashboard/email-settings');
          }
        }, 400);
      }
    }
  };
  const handleSaveTemplate = async () => {
    if (!subject || !body) return alert('Please provide subject and body.');
    await saveEmailTemplate({ name: subject, subject, body });
    setStatus('Template saved successfully');
    getEmailTemplates().then(r => setTemplates(r.data));
  };
  const handleSaveDraft = async () => {
    try {
      if (editingDraftId) {
        // Update existing draft
        await updateDraft(editingDraftId, {
          to, cc, bcc, subject,
          bodyHtml: `<div>${body.replace(/\n/g, '<br>')}</div>`,
          bodyText: body
        });
        setStatus('Draft updated');
        setEditingDraftId(null);
      } else {
        // Create new draft
        await saveDraft({
          to, cc, bcc, subject,
          bodyHtml: `<div>${body.replace(/\n/g, '<br>')}</div>`,
          bodyText: body,
          attachments: attachments.map(a => ({ id: a.id }))
        });
        setStatus('Draft saved');
      }
      setTab('drafts');
      getDrafts().then(r => setDrafts(r.data));
    } catch (err) {
      setStatus('Error: ' + (err.response?.data?.error || err.message));
    }
  };
  
  const loadDraftForEdit = (draft) => {
    setEditingDraftId(draft.id);
    setTo(draft.to || '');
    setCc(draft.cc || '');
    setBcc(draft.bcc || '');
    setSubject(draft.subject || '');
    // Extract text from HTML or use bodyText
    if (draft.bodyHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = draft.bodyHtml;
      setBody(tempDiv.textContent || tempDiv.innerText || '');
    } else {
      setBody(draft.bodyText || '');
    }
    // Load attachments if any
    if (draft.attachments && draft.attachments.length > 0) {
      const loadedAttachments = draft.attachments.map(att => ({
        id: att.fileId || att.file?.id,
        name: att.file?.originalName || att.file?.path?.split('/').pop() || 'attachment',
        originalName: att.file?.originalName || att.file?.path?.split('/').pop() || 'attachment',
        size: att.file?.size || 0,
        mime: att.file?.mime || 'application/octet-stream'
      })).filter(a => a.id);
      setAttachments(loadedAttachments);
    } else {
      setAttachments([]);
    }
    setTab('compose');
    setStatus('Draft loaded. Make your changes and save.');
  };
  
  const clearComposeForm = () => {
    setEditingDraftId(null);
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBody('');
    setAttachments([]);
    setReplyToMessageId(null);
    setStatus(null);
  };
  const applyTemplateToLead = async () => {
    if (!selectedTemplate || !leadId) return;
    const { data } = await previewTemplateForLead({ templateName: selectedTemplate, leadId: +leadId });
    setSubject(data.subject);
    setBody(data.bodyHtml);
    setStatus('Template applied to lead');
  };
  const applyTemplate = (templateName) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setTab('compose');
      setSelectedTemplate(templateName);
      setSubject(template.subject);
      setBody(template.body);
      setStatus('Template applied. You can customize it or add a Lead ID to auto-fill variables.');
    }
  };
  const sanitized = (html) => ({ __html: DOMPurify.sanitize(html) });

  // Responsive, Gmail-like layout:
  // - Top App Bar: sticky, with page title and Settings action
  // - Left Rail (md+): vertical tab navigation
  // - Main Content: scrollable card with consistent gutters and max width
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Email</h1>
            {/* Mobile Tabs (horizontally scrollable) */}
            <nav className="ml-2 sm:hidden overflow-x-auto no-scrollbar">
              <ul className="flex gap-1">
                {tabs.map(t => (
                  <li key={t.key}>
                    <button
                      onClick={() => setTab(t.key)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors
                        ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      aria-current={tab === t.key ? 'page' : undefined}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <button
            onClick={() => navigate('/dashboard/email-settings')}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Email Settings"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Body: Left rail + Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Rail (desktop) */}
            <aside className="hidden sm:block col-span-3 lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-[4.5rem]">
                <nav className="p-2">
                  {tabs.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors
                        ${tab === t.key ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
                      aria-current={tab === t.key ? 'page' : undefined}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="col-span-12 sm:col-span-9 lg:col-span-10">
              {/* Inbox */}
              {(tab === 'inbox' || tab === 'spam') && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900">{tab === 'inbox' ? 'Inbox' : 'Spam'}</h2>
                      <button
                        onClick={async () => {
                          try {
                            setStatus('Syncing inbox...');
                            await syncInbox({ sinceDays: 7, max: 200 });
                            const r = await getInbox({ limit: 100 });
                            const msgs = Array.isArray(r.data) ? r.data : [];
                            setInbox(msgs.filter(m => m.folder === 'Inbox'));
                            setSpam(msgs.filter(m => m.folder === 'Spam'));
                            setStatus('Inbox synced');
                          } catch (e) {
                            setStatus('Error syncing inbox: ' + (e.response?.data?.error || e.message));
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                      >
                        Sync
                      </button>
                    </div>
                    {((tab === 'inbox' ? inbox : spam) || []).length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-base">No emails found.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {(tab === 'inbox' ? inbox : spam).map(m => (
                          <li key={m.id} className="py-4 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">From:</span>
                                  <span className="text-sm text-gray-700 truncate">{m.from || 'Unknown'}</span>
                                </div>
                                <div className="mb-1">
                                  <span className="text-sm font-semibold text-gray-900 truncate block">{m.subject || '(no subject)'}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}
                                </div>
                              </div>
                              <div className="flex gap-2 items-start flex-shrink-0">
                                <button
                                  onClick={() => setViewingEmail(m)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                                  type="button"
                                >
                                  Open
                                </button>
                                <button
                                  onClick={() => moveMessage(m.id, 'Trash').then(async () => {
                                    const r = await getInbox({ limit: 100 });
                                    const msgs = Array.isArray(r.data) ? r.data : [];
                                    setInbox(msgs.filter(x => x.folder === 'Inbox'));
                                    setSpam(msgs.filter(x => x.folder === 'Spam'));
                                  })}
                                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded border border-gray-300"
                                  type="button"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {/* Config notice */}
              {tab === 'compose' && status && status.includes('No SMTP configuration') && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 rounded pr-4">
                  <div className="p-3 pl-4">
                    <h3 className="font-semibold text-yellow-900 mb-1">Email configuration required</h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      Configure your SMTP account once to enable sending.
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/email-settings')}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                    >
                      Configure now
                    </button>
                  </div>
                </div>
              )}

              {/* Compose */}
              {tab === 'compose' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  {editingDraftId && (
                    <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-gray-200 bg-blue-50">
                      <p className="text-sm text-blue-800">
                        Editing draft. Changes will be saved when you click "Save Draft" or send the email.
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* To */}
                      <div className="flex items-start gap-3">
                        <label className="text-sm text-gray-700 pt-2 w-16 sm:w-20 flex-shrink-0">To</label>
                        <div className="flex-1">
                          <input
                            type="email"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm"
                            placeholder="recipient@example.com"
                            required
                          />
                        </div>
                      </div>

                      {/* CC */}
                      {showBcc || cc ? (
                        <div className="flex items-start gap-3">
                          <label className="text-sm text-gray-700 pt-2 w-16 sm:w-20 flex-shrink-0">Cc</label>
                          <div className="flex-1">
                            <input
                              type="email"
                              value={cc}
                              onChange={e => setCc(e.target.value)}
                              className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm"
                              placeholder="Cc"
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* BCC */}
                      {showBcc && (
                        <div className="flex items-start gap-3">
                          <label className="text-sm text-gray-700 pt-2 w-16 sm:w-20 flex-shrink-0">Bcc</label>
                          <div className="flex-1">
                            <input
                              type="email"
                              value={bcc}
                              onChange={e => setBcc(e.target.value)}
                              className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm"
                              placeholder="Bcc"
                            />
                          </div>
                        </div>
                      )}

                      {!showBcc && (
                        <div className="flex items-center gap-3">
                          <span className="w-16 sm:w-20" />
                          <button
                            type="button"
                            onClick={() => setShowBcc(true)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Bcc
                          </button>
                        </div>
                      )}

                      {/* Subject */}
                      <div className="flex items-start gap-3">
                        <label className="text-sm text-gray-700 pt-2 w-16 sm:w-20 flex-shrink-0">Subject</label>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0 py-2 text-sm"
                            placeholder="Subject"
                          />
                        </div>
                      </div>

                      {/* Template + Lead */}
                      <div className="flex items-start gap-3 flex-wrap">
                        <label className="text-sm text-gray-700 pt-2 w-16 sm:w-20 flex-shrink-0">Template</label>
                        <div className="flex-1 flex gap-2 flex-wrap">
                          <select
                            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTemplate}
                            onChange={e => setSelectedTemplate(e.target.value)}
                          >
                            <option value="">None</option>
                            {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                          {selectedTemplate && leadId && (
                            <button
                              type="button"
                              onClick={applyTemplateToLead}
                              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                            >
                              Apply to Lead
                            </button>
                          )}
                          <input
                            type="text"
                            placeholder="Lead ID (optional)"
                            value={leadId}
                            onChange={e => setLeadId(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                          />
                        </div>
                      </div>

                      {/* Attachments */}
                      {attachments.length > 0 && (
                        <div className="flex items-start gap-3">
                          <span className="w-16 sm:w-20" />
                          <div className="flex-1 space-y-2">
                            {attachments.map(att => (
                              <div key={att.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                                <span className="text-xs text-gray-600">{att.name}</span>
                                <span className="text-xs text-gray-400">({formatFileSize(att.size)})</span>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(att.id)}
                                  className="ml-auto text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Body */}
                      <div className="flex items-start gap-3">
                        <span className="w-16 sm:w-20" />
                        <div className="flex-1">
                          <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={12}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[240px]"
                            placeholder="Compose email..."
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveTemplate}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            Save Template
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            className="hidden"
                            id="file-attachment"
                          />
                          <label
                            htmlFor="file-attachment"
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            Attach
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Sent */}
              {tab === 'sent' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6">
                    {emails.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-base">No sent emails found.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {emails.map(email => (
                          <li key={email.id} className="py-4 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">To:</span>
                                  <span className="text-sm text-gray-700">{email.to}</span>
                                  {email.cc && (
                                    <>
                                      <span className="text-sm text-gray-400">•</span>
                                      <span className="text-sm text-gray-600">Cc: {email.cc}</span>
                                    </>
                                  )}
                                </div>
                                <div className="mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{email.subject || '(no subject)'}</span>
                                </div>
                                <div
                                  className="text-sm text-gray-600 line-clamp-2"
                                  dangerouslySetInnerHTML={sanitized(email.bodyHtml || email.bodyText)}
                                />
                              </div>
                              <div className="flex gap-2 items-start flex-shrink-0">
                                <button
                                  onClick={() => {
                                    console.log('Viewing email:', email);
                                    setViewingEmail(email);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                                  type="button"
                                >
                                  View
                                </button>
                                {email.sentAt && (
                                  <div className="text-xs text-gray-500 whitespace-nowrap pt-1.5">
                                    {new Date(email.sentAt).toLocaleDateString()} {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Drafts */}
              {tab === 'drafts' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6">
                    {drafts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-base">No drafts found.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {drafts.map(d => (
                          <li key={d.id} className="py-4 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{d.subject || '(no subject)'}</span>
                                </div>
                                <div
                                  className="text-sm text-gray-600 line-clamp-2"
                                  dangerouslySetInnerHTML={sanitized(d.bodyHtml || d.bodyText)}
                                />
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={async () => {
                                    try {
                                      setStatus('Sending draft...');
                                      await sendDraft(d.id);
                                      setStatus('Draft sent successfully');
                                      setTab('sent');
                                      getSentEmails().then(r => setEmails(r.data));
                                      getDrafts().then(r => setDrafts(r.data));
                                    } catch (err) {
                                      const errorMsg = err.response?.data?.error || err.message;
                                      setStatus('Error: ' + errorMsg);
                                      if (errorMsg.includes('missing recipient')) {
                                        setTimeout(() => {
                                          if (confirm('Draft is missing recipient. Edit it now?')) {
                                            loadDraftForEdit(d);
                                          }
                                        }, 400);
                                      } else if (errorMsg.includes('No SMTP configuration')) {
                                        setTimeout(() => {
                                          if (confirm('No email configuration found. Configure it now?')) {
                                            navigate('/dashboard/email-settings');
                                          }
                                        }, 400);
                                      } else if (errorMsg.includes('Decryption failed') || errorMsg.includes('encryption key')) {
                                        setTimeout(() => {
                                          if (confirm('SMTP password decryption failed. Update the SMTP password in Settings now?')) {
                                            navigate('/dashboard/email-settings');
                                          }
                                        }, 400);
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                                >
                                  Send
                                </button>
                                <button
                                  onClick={() => loadDraftForEdit(d)}
                                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => moveMessage(d.id, 'Trash').then(() => { setTab('trash'); getTrash().then(r => setTrash(r.data)); getDrafts().then(r => setDrafts(r.data)); })}
                                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded border border-gray-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Trash */}
              {tab === 'trash' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6">
                    {trash.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-base">Trash is empty.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {trash.map(m => (
                          <li key={m.id} className="py-4 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{m.subject || '(no subject)'}</span>
                                </div>
                                <div
                                  className="text-sm text-gray-600 line-clamp-2"
                                  dangerouslySetInnerHTML={sanitized(m.bodyHtml || m.bodyText)}
                                />
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => restoreMessage(m.id).then(() => { setTab('drafts'); getDrafts().then(r => setDrafts(r.data)); })}
                                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded border border-gray-300"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => hardDeleteMessage(m.id).then(() => { getTrash().then(r => setTrash(r.data)); })}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Templates */}
              {tab === 'templates' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6">
                    {templates.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-base">No templates found. Use “Save Template” in Compose.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {templates.map(tpl => (
                          <div
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl.name)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                                  <span className="text-gray-400 mx-2">•</span>
                                  <span className="text-sm text-blue-600">{tpl.subject}</span>
                                </div>
                                <div
                                  className="text-sm text-gray-600 line-clamp-2"
                                  dangerouslySetInnerHTML={sanitized(tpl.body)}
                                />
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); applyTemplate(tpl.name); }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                                >
                                  Use
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete template "${tpl.name}"?`)) {
                                      try {
                                        await deleteEmailTemplate(tpl.name);
                                        setStatus('Template deleted successfully');
                                        getEmailTemplates().then(r => setTemplates(r.data));
                                      } catch (err) {
                                        setStatus('Error: ' + (err.response?.data?.error || err.message));
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              {status && (
                <div className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
                  status.includes('Error')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {status}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Email View Modal */}
      {viewingEmail && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto" 
          style={{ zIndex: 9999 }}
          onClick={() => setViewingEmail(null)}
        >
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
              style={{ zIndex: 9998 }}
              onClick={() => setViewingEmail(null)}
            ></div>
            
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative" 
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {viewingEmail.subject || '(no subject)'}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">From:</span> {viewingEmail.from || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">To:</span> {viewingEmail.to || 'N/A'}
                      </div>
                      {viewingEmail.cc && (
                        <div>
                          <span className="font-medium">Cc:</span> {viewingEmail.cc}
                        </div>
                      )}
                      {viewingEmail.bcc && (
                        <div>
                          <span className="font-medium">Bcc:</span> {viewingEmail.bcc}
                        </div>
                      )}
                      {viewingEmail.sentAt && (
                        <div>
                          <span className="font-medium">Sent:</span> {new Date(viewingEmail.sentAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingEmail(null)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  {viewingEmail.bodyHtml || viewingEmail.bodyText ? (
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={sanitized(viewingEmail.bodyHtml || viewingEmail.bodyText || '')}
                    />
                  ) : (
                    <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">No content available</div>
                  )}
                </div>
                {viewingEmail.attachments && viewingEmail.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-900 mb-2">Attachments:</div>
                    <div className="space-y-1">
                      {viewingEmail.attachments.map((att, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          {att.file?.originalName || att.file?.path?.split('/').pop() || `Attachment ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setViewingEmail(null)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
