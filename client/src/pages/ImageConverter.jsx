// client/src/pages/ImageConverter.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  createJob,
  uploadFiles,
  planTargets,
  enqueueJob,
  getJob,
  downloadOutput,
  downloadZip,
} from "../services/imageService";
import PageContainer from "../components/PageContainer";
import PageHeader from "../components/PageHeader";
import { showError, showSuccess } from "../utils/toast";
import { X, CheckSquare, Square, Download } from "lucide-react";

const ALL_FORMATS = ["jpg", "png", "bmp", "gif", "tiff", "webp"];

export default function ImageConverter() {
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState({});
  const [fileFormats, setFileFormats] = useState({});
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [job, setJob] = useState(null);
  const fileInputRef = useRef(null);

  // Generate previews for uploaded files
  useEffect(() => {
    const newPreviews = {};
    const newFormats = {};
    
    files.forEach((file, index) => {
      if (!filePreviews[file.name]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => ({ ...prev, [file.name]: e.target.result }));
        };
        reader.readAsDataURL(file);
      }
      // Set default format to webp if not set
      if (!fileFormats[file.name]) {
        newFormats[file.name] = 'webp';
      }
    });
    
    if (Object.keys(newFormats).length > 0) {
      setFileFormats(prev => ({ ...prev, ...newFormats }));
    }
  }, [files]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach(url => {
        if (url.startsWith('data:')) {
          // Cleanup data URLs if needed
        }
      });
    };
  }, []);

  const totalBytes = useMemo(
    () => files.reduce((s, f) => s + f.size, 0),
    [files]
  );

  const canConvert = files.length >= 1 && 
    files.length <= 100 && 
    totalBytes <= 200 * 1024 * 1024 &&
    selectedFiles.size > 0;

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
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    // Auto-select new files
    setSelectedFiles(prev => {
      const next = new Set(prev);
      list.forEach(f => next.add(f.name));
      return next;
    });
  };

  const onSelect = (e) => {
    e.stopPropagation();
    const list = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    // Auto-select new files
    setSelectedFiles(prev => {
      const next = new Set(prev);
      list.forEach(f => next.add(f.name));
      return next;
    });
    e.target.value = "";
  };

  const handleChooseFiles = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.delete(fileName);
      return next;
    });
    setFilePreviews(prev => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    setFileFormats(prev => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  const toggleFileSelection = (fileName) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  };

  const setFileFormat = (fileName, format) => {
    setFileFormats(prev => ({ ...prev, [fileName]: format }));
  };

  const applyFormatToSelected = (format) => {
    const newFormats = { ...fileFormats };
    selectedFiles.forEach(fileName => {
      newFormats[fileName] = format;
    });
    setFileFormats(newFormats);
  };

  const start = async () => {
    if (!canConvert) {
      showError(
        "Please select at least one image and ensure they meet the requirements (1–100 files, ≤ 200MB total)"
      );
      return;
    }

    // Get selected files with their formats
    const selectedFilesList = files.filter(f => selectedFiles.has(f.name));
    const formats = new Set(selectedFilesList.map(f => fileFormats[f.name] || 'webp'));
    
    if (selectedFilesList.length === 0) {
      showError("Please select at least one image to convert");
      return;
    }

    try {
      const { data: j } = await createJob(Array.from(formats).join(","));
      setJob(j);
      const up = await uploadFiles(j.id, selectedFilesList);
      const fileIds = (up.data?.files || []).map((f) => f.id);
      
      // Plan targets for each file with its specific format
      const allTargets = Array.from(formats);
      await planTargets(j.id, allTargets, fileIds);
      await enqueueJob(j.id);
      
      showSuccess(`Conversion started for ${selectedFilesList.length} image(s)`);
      
      // Poll for job completion
      const checkJob = async () => {
        try {
          const { data } = await getJob(j.id);
          setJob(data);
          if (data.status === 'DONE' || data.status === 'FAILED') {
            showSuccess('Conversion completed!');
          } else {
            setTimeout(checkJob, 2000);
          }
        } catch (err) {
          console.error('Error checking job:', err);
        }
      };
      setTimeout(checkJob, 2000);
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

  const refresh = async () => {
    if (job) {
      const { data } = await getJob(job.id);
      setJob(data);
    }
  };

  const bytesMB = (totalBytes / 1024 / 1024).toFixed(1);
  const allSelected = files.length > 0 && selectedFiles.size === files.length;

  return (
    <PageContainer>
      <PageHeader
        title="Image Converter"
        description={`Convert images to ${ALL_FORMATS.map((f) =>
          f.toUpperCase()
        ).join(", ")}. Up to 100 files, total ≤ 200MB.`}
      />

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
      </section>

      {/* Image Previews with Format Selection */}
      {files.length > 0 && (
        <section className="mt-5 bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Uploaded Images</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select images and choose output format for each
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedFiles.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    Apply format to selected:
                  </span>
                  <select
                    onChange={(e) => applyFormatToSelected(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>Select format</option>
                    {ALL_FORMATS.map(f => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium"
              >
                {allSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    Select All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => {
              const isSelected = selectedFiles.has(file.name);
              const preview = filePreviews[file.name];
              const format = fileFormats[file.name] || 'webp';
              
              return (
                <div
                  key={file.name}
                  className={`relative rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleFileSelection(file.name)}
                    className="absolute top-2 left-2 z-10 p-1 rounded bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="absolute top-2 right-2 z-10 p-1 rounded bg-white/90 backdrop-blur-sm shadow-sm hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Preview */}
                  <div className="aspect-square overflow-hidden rounded-t-lg bg-slate-100">
                    {preview ? (
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Loading...
                      </div>
                    )}
                  </div>

                  {/* File info and format selector */}
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-slate-700 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <select
                      value={format}
                      onChange={(e) => setFileFormat(file.name, e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {ALL_FORMATS.map(f => (
                        <option key={f} value={f}>{f.toUpperCase()}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Convert button */}
          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-600">
              {selectedFiles.size} of {files.length} image(s) selected
            </div>
            <button
              type="button"
              disabled={!canConvert}
              onClick={start}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm transition
                ${
                  canConvert
                    ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[.99] cursor-pointer"
                    : "bg-slate-400 cursor-not-allowed opacity-60"
                }`}
            >
              Convert Selected Images
            </button>
          </div>
        </section>
      )}

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

    </PageContainer>
  );
}