import { useState, useEffect } from "react";
import { moneyApi } from "../../services/moneyService";
import { usePermission } from "../auth/usePermission";
import { X, Upload, FileText } from "lucide-react";
import { showError } from '../../utils/toast';

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Crypto", "Other"];
const TRANSACTION_TYPES = ["Revenue", "Expense"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "Other"];

export default function TransactionForm({ transactionId, onClose, onSaved, categories = [] }) {
  const isEdit = !!transactionId;
  const { allowed: canWrite } = usePermission("money", "write");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [data, setData] = useState({
    invoiceNo: "",
    date: new Date().toISOString().split("T")[0],
    type: "Expense",
    category: "",
    description: "",
    amount: "",
    currency: "USD",
    paymentMethod: "Cash",
    comment: "",
  });

  useEffect(() => {
    if (isEdit && transactionId) {
      loadTransaction();
    }
  }, [isEdit, transactionId]);

  const loadTransaction = async () => {
    try {
      const { data: transaction } = await moneyApi.getTransaction(transactionId);
      setData({
        invoiceNo: transaction.invoiceNo || "",
        date: new Date(transaction.date).toISOString().split("T")[0],
        type: transaction.type || "Expense",
        category: transaction.category || "",
        description: transaction.description || "",
        amount: transaction.amount || "",
        currency: transaction.currency || "USD",
        paymentMethod: transaction.paymentMethod || "Cash",
        comment: transaction.comment || "",
      });
      
      // Load files
      const filesRes = await moneyApi.listFiles(transactionId);
      setFiles(filesRes.data?.items || []);
    } catch (error) {
      console.error("Failed to load transaction:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.category || !data.amount || !data.type) {
      showError("Please fill in required fields (Category, Amount, Type)");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await moneyApi.updateTransaction(transactionId, data);
      } else {
        await moneyApi.createTransaction(data);
      }
      onSaved();
    } catch (error) {
      console.error("Failed to save:", error);
      showError(error?.response?.data?.error || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    const file = e.target.files?.[0];
    if (!file || !transactionId) {
      e.target.value = ''; // Reset input
      return;
    }

    try {
      await moneyApi.uploadFile(transactionId, file);
      const filesRes = await moneyApi.listFiles(transactionId);
      setFiles(filesRes.data?.items || []);
    } catch (error) {
      console.error('File upload error:', error);
      showError(error?.response?.data?.error || "Failed to upload file");
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await moneyApi.deleteFile(transactionId, fileId);
      const filesRes = await moneyApi.listFiles(transactionId);
      setFiles(filesRes.data?.items || []);
    } catch (error) {
      showError("Failed to delete file");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">{isEdit ? "Edit Transaction" : "New Transaction"}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="p-6 space-y-4"
          onKeyDown={(e) => {
            // Prevent form submission on Enter key when file input is focused
            if (e.key === 'Enter' && e.target.type === 'file') {
              e.preventDefault();
            }
          }}
        >
          {canWrite ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.invoiceNo}
                    onChange={(e) => setData({ ...data, invoiceNo: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required={isEdit}
                  />
                  {!isEdit && <p className="mt-1 text-xs text-slate-500">Leave empty for auto-generation</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={data.date}
                    onChange={(e) => setData({ ...data, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.type}
                    onChange={(e) => setData({ ...data, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {TRANSACTION_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.category}
                    onChange={(e) => setData({ ...data, category: e.target.value })}
                    list="category-list"
                    placeholder="e.g., Rent, Salaries, Sales..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <datalist id="category-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Short Description</label>
                <input
                  type="text"
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={data.amount}
                    onChange={(e) => setData({ ...data, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.currency}
                    onChange={(e) => setData({ ...data, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.paymentMethod}
                    onChange={(e) => setData({ ...data, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {data.paymentMethod === "Other" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method Details</label>
                  <input
                    type="text"
                    value={data.paymentMethod}
                    onChange={(e) => setData({ ...data, paymentMethod: e.target.value })}
                    placeholder="Specify payment method..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comment</label>
                <textarea
                  value={data.comment}
                  onChange={(e) => setData({ ...data, comment: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Invoice Number</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.invoiceNo || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Date</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.date || "—"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Type</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.type || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Category</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.category || "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Description</div>
                <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.description || "—"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Amount</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.amount || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Currency</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.currency || "—"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Payment Method</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.paymentMethod || "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Comment</div>
                <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900 min-h-[4rem]">{data.comment || "—"}</div>
              </div>
            </div>
          )}

          {/* Files Section (only for edit mode) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Attachments</label>
              <div className="space-y-2">
                {canWrite && (
                  <label 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Manually trigger file input click to avoid form submission
                      const fileInput = e.currentTarget.querySelector('input[type="file"]');
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload File</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  </label>
                )}
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((tf) => (
                      <div key={tf.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-700">
                            {tf.file?.path || `File #${tf.fileId}`}
                          </span>
                          <span className="text-xs text-slate-500">
                            {tf.file?.size ? `${Math.round(tf.file.size / 1024)} KB` : ""}
                          </span>
                        </div>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(tf.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              {canWrite ? "Cancel" : "Close"}
            </button>
            {canWrite && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

