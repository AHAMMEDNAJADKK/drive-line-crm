import { useState } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  FileText, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import {
  parseImportFileApi, executeImportApi, downloadImportTemplateApi,
  downloadImportErrorsApi
} from '../services/importApi';
import { exportExcelApi, exportPDFApi } from '../services/leadApi';
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
  { key: 'partNumber', label: 'Part Number' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'requirementDetails', label: 'Requirement Details' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignedTo', label: 'Assigned Employee (ID or Email)' },
  { key: 'nextFollowUpDate', label: 'Next Follow-up Date' },
  { key: 'remarks', label: 'Remarks' },
];

export default function ImportExport() {
  // Wizard state: 1 (Upload), 2 (Map), 3 (Preview & Option), 4 (Result)
  const [step, setStep] = useState(1);

  // Upload data
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [parsedData, setParsedData] = useState(null);

  // Mapping state: { [crmKey]: excelColumnName }
  const [mapping, setMapping] = useState({});

  // Import options
  const [duplicateHandling, setDuplicateHandling] = useState('skip'); // skip | update | create_anyway
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Handle file select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

      // Auto-map heuristics
      const initialMap = {};
      const headers = data.headers || [];
      CRM_FIELDS.forEach(({ key, label }) => {
        const cleanKey = key.toLowerCase();
        const found = headers.find((h) => {
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            cleanH === cleanKey ||
            cleanH.includes(cleanKey) ||
            cleanKey.includes(cleanH) ||
            (cleanKey.includes('mobile') && cleanH.includes('phone')) ||
            (cleanKey.includes('customername') && (cleanH.includes('customer') || cleanH.includes('name')))
          );
        });
        if (found) initialMap[key] = found;
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
      setImportResult(res.data.data);
      setStep(4);
      toast.success('Import completed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setFilePath('');
    setParsedData(null);
    setMapping({});
    setImportResult(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Import & Export</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Bulk import leads from spreadsheets or export your database into Excel/PDF
        </p>
      </div>

      {/* Main Import Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Bulk Lead Import Wizard
            </h2>
          </div>
          <button
            onClick={downloadImportTemplateApi}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download Sample Template (.xlsx)
          </button>
        </div>

        {/* Wizard Progress Steps */}
        <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-semibold text-gray-500">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center">1</span>
            Upload
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center">2</span>
            Map Columns
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center">3</span>
            Options & Preview
          </div>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
            <span className="w-6 h-6 rounded-full border flex items-center justify-center">4</span>
            Results
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 max-w-md mx-auto py-6">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {file ? file.name : 'Choose an Excel (.xlsx, .xls) or CSV file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Maximum size: 10MB</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200"
              >
                Browse File
              </label>
            </div>

            <button
              onClick={handleUploadAndParse}
              disabled={!file || uploading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue to Field Mapping <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Field Mapping */}
        {step === 2 && parsedData && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Map Spreadsheet Columns to CRM Fields
              </h3>
              <p className="text-xs text-gray-500">
                Found {parsedData.totalRows} rows and {parsedData.headers?.length} columns in file.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
              {CRM_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50"
                >
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {f.label}
                  </span>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) =>
                      setMapping({ ...mapping, [f.key]: e.target.value || undefined })
                    }
                    className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5"
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

            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!mapping.mobileNumber}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Next: Review & Options <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Options */}
        {step === 3 && parsedData && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-sm space-y-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                Ready to import {parsedData.totalRows} records
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Mapped mobile column:{' '}
                <span className="font-mono font-bold">{mapping.mobileNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
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
                    id: 'create_anyway',
                    title: 'Import Both (Allow Duplicates)',
                    desc: 'Create new lead entries even if mobile number already exists.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
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
                      className="mt-1 text-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {opt.title}
                      </p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Mapping
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Execute Import
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 4 && importResult && (
          <div className="space-y-6 max-w-lg mx-auto py-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Completed</h3>
              <p className="text-xs text-gray-500 mt-1">Summary of processed records</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <span className="text-xs text-gray-500">Total Rows</span>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {importResult.totalRows}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-xs text-emerald-600">Created New</span>
                <p className="text-lg font-bold text-emerald-600">
                  {importResult.importedCount}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-xs text-blue-600">Updated</span>
                <p className="text-lg font-bold text-blue-600">{importResult.updatedCount}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <span className="text-xs text-amber-600">Duplicates Skipped</span>
                <p className="text-lg font-bold text-amber-600">{importResult.skippedCount}</p>
              </div>
            </div>

            {importResult.errorRows && importResult.errorRows.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => downloadImportErrorsApi(importResult.errorRows)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 text-xs font-semibold hover:bg-red-100"
                >
                  <AlertCircle className="w-4 h-4" /> Download Error Report (.xlsx)
                </button>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={resetWizard}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
              >
                Done / Import Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Database Export Section */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Full Lead Database Export
        </h2>
        <p className="text-xs text-gray-500">
          Generate full company reports in formatted spreadsheets or printable landscape PDFs.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={() => exportExcelApi({})}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 shadow transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export All Leads (.xlsx)
          </button>
          <button
            onClick={() => exportPDFApi({})}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 shadow transition-colors"
          >
            <FileText className="w-4 h-4" /> Export Landscape Report (.pdf)
          </button>
        </div>
      </div>
    </div>
  );
}
