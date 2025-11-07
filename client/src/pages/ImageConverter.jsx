// client/src/pages/ImageConverter.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { createJob, uploadFiles, planTargets, enqueueJob, getJob, sseUrl, downloadOutput, downloadZip } from '../services/imageService';

const ALL_FORMATS = ['jpg','png','bmp','gif','tiff','webp'];

export default function ImageConverter() {
  const [targets, setTargets] = useState(['jpg','webp']);
  const [files, setFiles] = useState([]);
  const [job, setJob] = useState(null);
  const [events, setEvents] = useState([]);
  const token = localStorage.getItem('accessToken');

  const totalBytes = useMemo(()=> files.reduce((s,f)=>s+f.size,0), [files]);
  const canUpload = files.length >= 1 && files.length <= 100 && totalBytes <= 200*1024*1024;

  const onDrop = (e) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    if (!list.length) return;
    setFiles(prev => [...prev, ...list]);
  };
  const onSelect = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setFiles(prev => [...prev, ...list]);
  };

  const toggle = (fmt) => setTargets(t => t.includes(fmt) ? t.filter(x=>x!==fmt) : [...t,fmt]);

  const start = async () => {
    try {
      const { data: j } = await createJob(targets.join(','));
      setJob(j);
      const up = await uploadFiles(j.id, files);
      const fileIds = (up.data?.files || []).map(f => f.id);
      await planTargets(j.id, targets, fileIds);
      await enqueueJob(j.id);
      attachSSE(j.id);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to start conversion';
      alert(msg);
      console.error(err);
    }
  };

  const attachSSE = (jobId) => {
    const url = sseUrl(jobId, localStorage.getItem('accessToken'));
    const es = new EventSource(url, { withCredentials: false });
    es.onmessage = (ev) => {
      const payload = JSON.parse(ev.data);
      setEvents(prev => [...prev, payload]);
      if (payload.type === 'job-done') es.close();
    };
  };

  const refresh = async () => {
    if (job) {
      const { data } = await getJob(job.id);
      setJob(data);
    }
  };

  useEffect(()=>{ const t = setInterval(refresh, 1500); return ()=> clearInterval(t); }, [job?.id]);

  const bytesMB = (totalBytes/1024/1024).toFixed(1);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">Image Converter</h1>
          <p className="text-slate-600 text-sm mt-1">
            Convert images to {ALL_FORMATS.map(f=>f.toUpperCase()).join(', ')}. Up to 100 files, total ≤ 200MB.
          </p>
        </header>

        {/* Targets */}
        <section className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-medium text-slate-700">Target formats</div>
              <div className="text-xs text-slate-500">Pick one or more formats to generate</div>
            </div>
            <div className="text-xs text-slate-500">
              Selected: <span className="font-semibold text-slate-700">{targets.length}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_FORMATS.map(f => {
              const active = targets.includes(f);
              return (
                <label
                  key={f}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border cursor-pointer transition
                    ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  title={`Toggle ${f.toUpperCase()}`}
                >
                  <input type="checkbox" checked={active} onChange={()=>toggle(f)} className="sr-only" />
                  <span className="font-medium">{f.toUpperCase()}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Uploader */}
        <section
          onDrop={onDrop}
          onDragOver={(e)=> e.preventDefault()}
          className="mt-5 bg-white/90 backdrop-blur rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-300 transition shadow-sm p-6 sm:p-8 text-center"
        >
          <div className="text-slate-700 font-medium">Drag & drop images here</div>
          <div className="text-slate-500 text-sm">or choose files</div>

          <div className="mt-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-sm font-semibold">
              <input type="file" accept="image/*" multiple onChange={onSelect} className="hidden" />
              <span>Choose Files</span>
            </label>
          </div>

          <div className="mt-3 text-xs text-slate-600">
            {files.length} file(s), {bytesMB} MB total
          </div>

          <div className="mt-4">
            <button
              disabled={!canUpload}
              onClick={start}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm
                ${canUpload ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[.99]' : 'bg-slate-400 cursor-not-allowed'}`}
            >
              Start Conversion
            </button>
          </div>
        </section>

        {/* Actions */}
        {job && (
          <section className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={()=> downloadZip(job.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold"
              title="Download all outputs as ZIP"
            >
              Download ZIP
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold"
              title="Refresh status"
            >
              Refresh
            </button>
          </section>
        )}

        {/* Status */}
        {job && (
          <section className="mt-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="text-sm text-slate-600">Job #{job.id} • {job.status}</div>
              <div className="text-xs text-slate-500">{job.items?.length || 0} outputs planned</div>
            </div>

            <div className="space-y-2">
              {job.items?.map(it => {
                const srcName = it.sourceFile?.path ? it.sourceFile.path.split(/[\\/]/).pop() : 'file';
                const badgeColor = it.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : it.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';
                return (
                  <div key={it.id} className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2">
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-slate-800 truncate">{srcName}</div>
                      <div className="text-xs text-slate-500">
                        → {it.targetFormat.toUpperCase()} • {it.status}{it.error ? ` • ${it.error}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${badgeColor}`}>
                        {it.status}
                      </span>
                      {it.outputFileId && (
                        <button
                          onClick={()=> downloadOutput(job.id, it.outputFileId)}
                          className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md text-sm hover:bg-indigo-100"
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Events log */}
        {events.length > 0 && (
          <section className="mt-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="text-sm font-medium text-slate-700 mb-2">Progress</div>
            <ul className="text-xs text-slate-600 space-y-1 max-h-48 overflow-auto">
              {events.slice(-200).map((e, i) => <li key={i} className="font-mono">{JSON.stringify(e)}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
