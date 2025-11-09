// client/src/pages/ImageConverter.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  createJob,
  uploadFiles,
  planTargets,
  enqueueJob,
  getJob,
  sseUrl,
  downloadOutput,
  downloadZip,
} from "../services/imageService";
import PageContainer from "../components/PageContainer";
import PageHeader from "../components/PageHeader";
import { showError } from "../utils/toast";

const ALL_FORMATS = ["jpg", "png", "bmp", "gif", "tiff", "webp"];

export default function ImageConverter() {
  const [targets, setTargets] = useState(["jpg", "webp"]);
  const [files, setFiles] = useState([]);
  const [job, setJob] = useState(null);
  const [events, setEvents] = useState([]);
  const fileInputRef = useRef(null);

  // ADD THIS: Component mount/unmount tracking
  useEffect(() => {
    console.log('🟢 ImageConverter MOUNTED');
    return () => {
      console.log('🔴 ImageConverter UNMOUNTING');
    };
  }, []);

  // ADD THIS: Track files state changes
  useEffect(() => {
    console.log('📁 Files state changed:', files.length, 'files');
  }, [files]);

  const totalBytes = useMemo(
    () => files.reduce((s, f) => s + f.size, 0),
    [files]
  );

  const canUpload =
    files.length >= 1 && files.length <= 100 && totalBytes <= 200 * 1024 * 1024;

  // ✅ Prevent browser refresh / navigation when dragging files
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("drop", preventDefaults);

    return () => {
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("drop", preventDefaults);
    };
  }, []);

  const onDrop = (e) => {
    console.log('🎯 onDrop called');
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
  };

  const onSelect = (e) => {
    e.stopPropagation();
    console.log('🚀 onSelect CALLED!', e);
    console.log('🚀 Event type:', e.type);
    console.log('🚀 Target:', e.target);
    console.log('🚀 Files:', e.target.files);
    
    try {
      const list = Array.from(e.target.files || []);
      console.log('🚀 Files array:', list);
      
      if (!list.length) {
        console.log('⚠️ No files in list');
        return;
      }
      
      console.log('✅ Setting files state...');
      setFiles((prev) => {
        const newFiles = [...prev, ...list];
        console.log('✅ New files state:', newFiles);
        return newFiles;
      });
      
      e.target.value = "";
      console.log('✅ Input value reset');
    } catch (error) {
      console.error('❌ Error in onSelect:', error);
    }
  };

  const handleChooseFiles = (e) => {
    e.stopPropagation();
    console.log('🖱️ Choose Files button clicked');
    console.log('🖱️ File input ref:', fileInputRef.current);
    
    if (fileInputRef.current) {
      console.log('🖱️ Triggering file input click...');
      fileInputRef.current.click();
      console.log('🖱️ Click triggered');
    }
  };

  const toggle = (fmt) =>
    setTargets((t) =>
      t.includes(fmt) ? t.filter((x) => x !== fmt) : [...t, fmt]
    );

  const start = async () => {
    if (!canUpload) {
      showError(
        "Please select files and ensure they meet the requirements (1–100 files, ≤ 200MB total)"
      );
      return;
    }

    try {
      const { data: j } = await createJob(targets.join(","));
      setJob(j);
      const up = await uploadFiles(j.id, files);
      const fileIds = (up.data?.files || []).map((f) => f.id);
      await planTargets(j.id, targets, fileIds);
      await enqueueJob(j.id);
      attachSSE(j.id);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to start conversion";
      if (
        msg.includes("Spaces") ||
        msg.includes("DigitalOcean") ||
        msg.includes("SPACES_CONFIG")
      ) {
        showError(
          "File storage is not configured. Please contact your administrator."
        );
      } else {
        showError(msg);
      }
      console.error(err);
    }
  };

  const attachSSE = (jobId) => {
    try {
      const url = sseUrl(jobId, localStorage.getItem("accessToken"));
      const es = new EventSource(url, { withCredentials: false });
      es.onmessage = (ev) => {
        const payload = JSON.parse(ev.data);
        setEvents((prev) => [...prev, payload]);
        if (payload.type === "job-done") es.close();
      };
      es.onerror = (err) => {
        console.error("SSE error:", err);
        es.close();
      };
    } catch (err) {
      console.error("Failed to attach SSE:", err);
    }
  };

  const refresh = async () => {
    if (job) {
      const { data } = await getJob(job.id);
      setJob(data);
    }
  };

  useEffect(() => {
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [job?.id]);

  const bytesMB = (totalBytes / 1024 / 1024).toFixed(1);

  // ADD THIS: Log when component renders
  console.log('🔄 ImageConverter rendering, files:', files.length);

  return (
    <PageContainer>
      <PageHeader
        title="Image Converter"
        description={`Convert images to ${ALL_FORMATS.map((f) =>
          f.toUpperCase()
        ).join(", ")}. Up to 100 files, total ≤ 200MB.`}
      />

      {/* Target Formats */}
      <section className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium text-slate-700">
              Target formats
            </div>
            <div className="text-xs text-slate-500">
              Pick one or more formats to generate
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Selected:{" "}
            <span className="font-semibold text-slate-700">
              {targets.length}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_FORMATS.map((f) => {
            const active = targets.includes(f);
            return (
              <label
                key={f}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border cursor-pointer transition
                  ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                title={`Toggle ${f.toUpperCase()}`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(f)}
                  className="sr-only"
                />
                <span className="font-medium">{f.toUpperCase()}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* File Uploader */}
      <section
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-5 bg-white/90 backdrop-blur rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-300 transition shadow-sm p-6 sm:p-8 text-center"
      >
        <div className="text-slate-700 font-medium">Drag & drop images here</div>
        <div className="text-slate-500 text-sm">or choose files</div>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onSelect}
            className="hidden"
            id="image-converter-file-input"
            onClick={(e) => {console.log('📌 Input clicked', e); e.stopPropagation()}}
            onFocus={() => console.log('📌 Input focused')}
            onBlur={() => console.log('📌 Input blurred')}
          />
          <button
            type="button"
            onClick={handleChooseFiles}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-sm font-semibold transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            Choose Files
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-600">
          {files.length} file(s), {bytesMB} MB total
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={!canUpload}
            onClick={start}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm transition
              ${
                canUpload
                  ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[.99] cursor-pointer"
                  : "bg-slate-400 cursor-not-allowed opacity-60"
              }`}
          >
            Start Conversion
          </button>
          {!canUpload && files.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {files.length > 100
                ? "Too many files (max 100)"
                : totalBytes > 200 * 1024 * 1024
                ? "Total size too large (max 200MB)"
                : "Please select at least one file"}
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      {job && (
        <section className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadZip(job.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold"
            title="Download all outputs as ZIP"
          >
            Download ZIP
          </button>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold"
            title="Refresh status"
          >
            Refresh
          </button>
        </section>
      )}

      {/* Job Status */}
      {job && (
        <section className="mt-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="text-sm text-slate-600">
              Job #{job.id} • {job.status}
            </div>
            <div className="text-xs text-slate-500">
              {job.items?.length || 0} outputs planned
            </div>
          </div>

          <div className="space-y-2">
            {job.items?.map((it) => {
              const srcName = it.sourceFile?.path
                ? it.sourceFile.path.split(/[\\/]/).pop()
                : "file";
              const badgeColor =
                it.status === "DONE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : it.status === "FAILED"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-slate-800 truncate">
                      {srcName}
                    </div>
                    <div className="text-xs text-slate-500">
                      → {it.targetFormat.toUpperCase()} • {it.status}
                      {it.error ? ` • ${it.error}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${badgeColor}`}
                    >
                      {it.status}
                    </span>
                    {it.outputFileId && (
                      <button
                        type="button"
                        onClick={() => downloadOutput(job.id, it.outputFileId)}
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

      {/* Events Log */}
      {events.length > 0 && (
        <section className="mt-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="text-sm font-medium text-slate-700 mb-2">Progress</div>
          <ul className="text-xs text-slate-600 space-y-1 max-h-48 overflow-auto">
            {events
              .slice(-200)
              .map((e, i) => (
                <li key={i} className="font-mono">
                  {JSON.stringify(e)}
                </li>
              ))}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}