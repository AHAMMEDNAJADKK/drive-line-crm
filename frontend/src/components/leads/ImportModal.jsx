import { useState } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  ArrowRight, ArrowLeft, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import Modal from '../common/Modal';
import {
  parseImportFileApi, executeImportApi, downloadImportTemplateApi,
  downloadImportErrorsApi
} from '../../services/importApi';
import toast from 'react-hot-toast';

const CRM_FIELDS = [
  { key: 'mobileNumber', label: 'Mobile Number *', required: true },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'alternateMobileNumber', label: 'Alternate Mobile' },
  { key: 'companyName', label: 'Company / Workshop Name' },
  { key: 'customerType', label: 'Customer Type' },
  { key: 'location', label: 'Location' },
  { key: 'vehicleMake', label: 'Vehicle Make' },
  { key: 'vehicleModel', label: 'Vehicle Model' },
  { key: 'vehicleYear', label: 'Vehicle Year' },
  { key: 'partRequired', label: 'Part Required' },
  { key: 'partNumber', label: 'Part Number (OEM)' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'requirementDetails', label: 'Requirement Details' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignedEmployee', label: 'Assigned Employee (ID / Email / Name)' },
  { key: 'nextFollowUpDate', label: 'Next Follow-up Date' },
  { key: 'remarks', label: 'Remarks' },
];

export default function ImportModal({ isOpen, onClose, onSuccess }) {
  // Wizard steps: 1 (Upload), 2 (Map Fields), 3 (Options & Preview), 4 (Result)
  const [step, setStep] = useState(1);

  // Upload data
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [parsedData, setParsedData] = useState(null);

  // Mapping state: { [crmKey]: excelColumnName }
  const [mapping, setMapping] = useState({});

  // Import options
  const [duplicateHandling, setDuplicateHandling] = useState('skip'); // 'skip' | 'update' | 'both'
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setFilePath('');
    setParsedData(null);
    setMapping({});
    setImportResult(null);
    setUploading(false);
    setImporting(false);
  };

  const handleModalClose = () => {
    resetWizard();
    onClose();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validExts = ['.xlsx', '.xls', '.csv'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExts.includes(fileExt)) {
        toast.error('Please select an Excel (.xlsx, .xls) or CSV (.csv) file');
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds the 10MB limit');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      toast.error('Please select an Excel or CSV file');
      return;
    }
    setUploading(true);
    try {
      const res = await parseImportFileApi(file);
      const { filePath: fPath, data } = res.data;
      setFilePath(fPath);
      setParsedData(data);

      // Auto-map heuristics based on suggestedMapping from backend or client heuristics
      const initialMap = {};
      const headers = data.headers || [];
      const suggested = data.suggestedMapping || {};

      CRM_FIELDS.forEach(({ key }) => {
        // Check if backend already suggested a match
        const foundHeader = Object.keys(suggested).find(h => suggested[h] === key);
        if (foundHeader) {
          initialMap[key] = foundHeader;
        } else {
          const cleanKey = key.toLowerCase();
          const matched = headers.find((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              cleanH === cleanKey ||
              cleanH.includes(cleanKey) ||
              cleanKey.includes(cleanH) ||
              (cleanKey.includes('mobile') && cleanH.includes('phone')) ||
              (cleanKey.includes('customername') && (cleanH.includes('customer') || cleanH.includes('name')))
            );
          });
          if (matched) initialMap[key] = matched;
        }
      });

      setMapping(initialMap);
      setStep(2);
      toast.success('File uploaded and analyzed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!mapping.mobileNumber) {
      toast.error('Mobile Number mapping is required');
      return;
    }
    setImporting(true);
    try {
      const res = await executeImportApi({
        filePath,
        mapping,
        options: { duplicateHandling },
      });
      const result = res.data.data;
      setImportResult(result);
      setStep(4);
      toast.success('Import completed successfully');
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Import Leads" size="lg">
      <div className="space-y-5 p-1">
        {/* Wizard Progress Steps Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 text-xs font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${step >= 1 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}>1</span>
            Upload
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${step >= 2 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}>2</span>
            Map Columns
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${step >= 3 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}>3</span>
            Options
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${step >= 4 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}>4</span>
            Result
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload a spreadsheet containing leads. Supported formats: .xlsx, .xls, .csv (Max 10MB)
              </p>
              <button
                type="button"
                onClick={downloadImportTemplateApi}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Download Template
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors bg-gray-50/50 dark:bg-gray-900/20">
              <Upload className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {file ? file.name : 'Choose an Excel (.xlsx, .xls) or CSV file'}
              </p>
              {file && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                  {(file.size / 1024).toFixed(1)} KB selected
                </p>
              )}
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="lead-file-upload"
              />
              <label
                htmlFor="lead-file-upload"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors"
              >
                Browse Spreadsheet
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleUploadAndParse}
                disabled={!file || uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow transition-colors"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue to Field Mapping <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Field Mapping */}
        {step === 2 && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Map Spreadsheet Columns to CRM Fields
                </h3>
                <p className="text-xs text-gray-500">
                  Total {parsedData.totalRows || parsedData.totalRowsCount} data rows found in file
                </p>
              </div>
              {!mapping.mobileNumber && (
                <span className="text-xs text-red-500 font-medium">
                  * Mobile Number must be mapped
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {CRM_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    f.required && !mapping[f.key]
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
                  }`}
                >
                  <span className={`text-xs font-medium ${f.required ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {f.label}
                  </span>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) =>
                      setMapping({ ...mapping, [f.key]: e.target.value || undefined })
                    }
                    className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 max-w-[150px] truncate"
                  >
                    <option value="">— Ignore —</option>
                    {parsedData.headers?.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!mapping.mobileNumber}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow transition-colors"
              >
                Next: Duplicate Options <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Options */}
        {step === 3 && parsedData && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-xs space-y-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                Ready to process {parsedData.totalRows || parsedData.totalRowsCount} rows from spreadsheet
              </p>
              <p className="text-indigo-700 dark:text-indigo-300">
                Primary identifier column:{' '}
                <span className="font-mono font-bold">{mapping.mobileNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Duplicate Mobile Number Handling:
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'skip',
                    title: 'Skip Duplicates (Recommended)',
                    desc: 'Leave existing leads untouched and skip imported duplicate rows.',
                  },
                  {
                    id: 'update',
                    title: 'Update Existing Leads',
                    desc: 'Overwrite existing customer details with the new values from spreadsheet.',
                  },
                  {
                    id: 'both',
                    title: 'Import Both (Allow Duplicates)',
                    desc: 'Create new lead entries even if mobile number already exists.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      duplicateHandling === opt.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dup"
                      value={opt.id}
                      checked={duplicateHandling === opt.id}
                      onChange={(e) => setDuplicateHandling(e.target.value)}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow transition-colors"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Execute Import
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Result */}
        {step === 4 && importResult && (
          <div className="space-y-5 py-2 text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Import Completed</h3>
              <p className="text-xs text-gray-500 mt-0.5">Summary of processed records</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <span className="text-[11px] text-gray-500">Total Rows</span>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {importResult.totalRows ?? 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-[11px] text-emerald-600">Created New</span>
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  {importResult.imported ?? importResult.importedCount ?? 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-[11px] text-blue-600">Updated</span>
                <p className="text-base font-bold text-blue-600 mt-0.5">
                  {importResult.updated ?? importResult.updatedCount ?? 0}
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <span className="text-[11px] text-amber-600">Duplicates Skipped</span>
                <p className="text-base font-bold text-amber-600 mt-0.5">
                  {importResult.duplicatesSkipped ?? importResult.skippedCount ?? 0}
                </p>
              </div>
            </div>

            {importResult.errorRows && importResult.errorRows.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => downloadImportErrorsApi(importResult.errorRows)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" /> Download Error Report ({importResult.errorRows.length} errors)
                </button>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <button
                type="button"
                onClick={resetWizard}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
