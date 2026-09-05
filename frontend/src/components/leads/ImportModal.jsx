import { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Modal from '../common/Modal';
import {
  parseImportFileApi,
  executeImportApi,
  downloadImportTemplateApi,
  downloadImportErrorsApi,
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
  const [duplicateHandling, setDuplicateHandling] = useState('skip');
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
      const fileExt = selectedFile.name
        .substring(selectedFile.name.lastIndexOf('.'))
        .toLowerCase();

      if (!validExts.includes(fileExt)) {
        toast.error(
          'Please select an Excel (.xlsx, .xls) or CSV (.csv) file'
        );
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

      const initialMap = {};
      const headers = data.headers || [];
      const suggested = data.suggestedMapping || {};

      CRM_FIELDS.forEach(({ key }) => {
        const foundHeader = Object.keys(suggested).find(
          (h) => suggested[h] === key
        );

        if (foundHeader) {
          initialMap[key] = foundHeader;
        } else {
          const cleanKey = key.toLowerCase();

          const matched = headers.find((h) => {
            const cleanH = h
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');

            return (
              cleanH === cleanKey ||
              cleanH.includes(cleanKey) ||
              cleanKey.includes(cleanH) ||
              (cleanKey.includes('mobile') &&
                cleanH.includes('phone')) ||
              (cleanKey.includes('customername') &&
                (cleanH.includes('customer') || cleanH.includes('name')))
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

  const steps = [
    { number: 1, label: 'Upload' },
    { number: 2, label: 'Map Columns' },
    { number: 3, label: 'Options' },
    { number: 4, label: 'Result' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Import Leads"
      size="lg"
    >
      <div className="p-5 sm:p-6">
        {/* Wizard Progress */}
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex min-w-[480px] items-center">
            {steps.map((item, index) => {
              const active = step >= item.number;
              const current = step === item.number;

              return (
                <div
                  key={item.number}
                  className="flex flex-1 items-center"
                >
                  <div
                    className={`flex items-center gap-2 ${
                      active
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span
                      className={`
                        flex h-7 w-7 flex-shrink-0 items-center justify-center
                        rounded-full border
                        text-xs font-bold
                        transition-all
                        ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                        }
                        ${
                          current
                            ? 'ring-4 ring-indigo-500/10'
                            : ''
                        }
                      `}
                    >
                      {item.number}
                    </span>

                    <span className="hidden text-xs font-semibold sm:block">
                      {item.label}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={`
                        mx-2 h-px flex-1 transition-colors
                        ${
                          step > item.number
                            ? 'bg-indigo-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-700/60 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Upload your lead spreadsheet
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  Supported formats: .xlsx, .xls, .csv · Maximum size: 10MB
                </p>
              </div>

              <button
                type="button"
                onClick={downloadImportTemplateApi}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 hover:underline dark:text-indigo-400"
              >
                <Download className="h-3.5 w-3.5" />
                Download Template
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-gray-700 dark:bg-gray-900/20 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5 sm:p-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {file ? (
                  <FileSpreadsheet className="h-7 w-7" />
                ) : (
                  <Upload className="h-7 w-7" />
                )}
              </div>

              <p className="break-all text-sm font-semibold text-gray-900 dark:text-gray-100">
                {file
                  ? file.name
                  : 'Choose an Excel or CSV file'}
              </p>

              {file && (
                <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
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
                className="
                  mt-5
                  inline-flex
                  cursor-pointer
                  items-center
                  gap-2
                  rounded-xl
                  border border-gray-200
                  bg-white
                  px-4 py-2.5
                  text-xs
                  font-semibold
                  text-gray-700
                  shadow-sm
                  transition-all
                  hover:bg-gray-50
                  dark:border-gray-700
                  dark:bg-gray-800
                  dark:text-gray-300
                  dark:hover:bg-gray-700
                "
              >
                <Upload className="h-3.5 w-3.5" />
                Browse Spreadsheet
              </label>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-5 dark:border-gray-700/60">
              <button
                type="button"
                onClick={handleUploadAndParse}
                disabled={!file || uploading}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-indigo-600
                  px-5 py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-indigo-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-auto
                "
              >
                {uploading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {uploading
                  ? 'Analyzing...'
                  : 'Continue to Field Mapping'}

                {!uploading && (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Field Mapping */}
        {step === 2 && parsedData && (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-700/60 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Map Spreadsheet Columns
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {parsedData.totalRows ||
                    parsedData.totalRowsCount ||
                    0}{' '}
                  data rows found in the file
                </p>
              </div>

              {!mapping.mobileNumber && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Mobile Number is required
                </span>
              )}
            </div>

            <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto pr-1 scrollbar-thin md:grid-cols-2">
              {CRM_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className={`
                    rounded-xl
                    border
                    p-3
                    transition-all
                    ${
                      f.required && !mapping[f.key]
                        ? 'border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10'
                        : 'border-gray-100 bg-gray-50/70 dark:border-gray-700/60 dark:bg-gray-800/40'
                    }
                  `}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`
                        min-w-0 text-xs
                        ${
                          f.required
                            ? 'font-semibold text-gray-900 dark:text-gray-100'
                            : 'font-medium text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {f.label}
                    </span>
                  </div>

                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [f.key]: e.target.value || undefined,
                      })
                    }
                    className="
                      block
                      w-full
                      rounded-lg
                      border border-gray-200
                      bg-white
                      px-3 py-2
                      text-xs
                      text-gray-800
                      shadow-sm
                      transition-all
                      focus:border-indigo-500
                      focus:outline-none
                      focus:ring-2
                      focus:ring-indigo-500/20
                      dark:border-gray-700
                      dark:bg-gray-900
                      dark:text-gray-200
                    "
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

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  px-4 py-2.5
                  text-xs
                  font-semibold
                  text-gray-600
                  transition-colors
                  hover:bg-gray-100
                  hover:text-gray-900
                  dark:text-gray-400
                  dark:hover:bg-gray-800
                  dark:hover:text-gray-100
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!mapping.mobileNumber}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  bg-indigo-600
                  px-5 py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-indigo-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-auto
                "
              >
                Next: Duplicate Options
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Options */}
        {step === 3 && parsedData && (
          <div className="space-y-5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-800/40 dark:bg-indigo-900/20">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    Ready to process{' '}
                    {parsedData.totalRows ||
                      parsedData.totalRowsCount ||
                      0}{' '}
                    rows
                  </p>

                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                    Primary identifier:{' '}
                    <span className="font-mono font-bold">
                      {mapping.mobileNumber}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Duplicate Mobile Number Handling
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choose how existing mobile numbers should be handled.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'skip',
                    title: 'Skip Duplicates',
                    desc: 'Leave existing leads untouched and skip imported duplicate rows.',
                    recommended: true,
                  },
                  {
                    id: 'update',
                    title: 'Update Existing Leads',
                    desc: 'Overwrite existing customer details with the new spreadsheet values.',
                  },
                  {
                    id: 'both',
                    title: 'Import Both',
                    desc: 'Create a new lead even when the mobile number already exists.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`
                      flex
                      cursor-pointer
                      items-start
                      gap-3
                      rounded-xl
                      border
                      p-4
                      transition-all
                      ${
                        duplicateHandling === opt.id
                          ? 'border-indigo-500 bg-indigo-50/60 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="dup"
                      value={opt.id}
                      checked={duplicateHandling === opt.id}
                      onChange={(e) =>
                        setDuplicateHandling(e.target.value)
                      }
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {opt.title}
                        </p>

                        {opt.recommended && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Recommended
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-1.5
                  rounded-xl
                  px-4 py-2.5
                  text-xs
                  font-semibold
                  text-gray-600
                  transition-colors
                  hover:bg-gray-100
                  hover:text-gray-900
                  dark:text-gray-400
                  dark:hover:bg-gray-800
                  dark:hover:text-gray-100
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Mapping
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-indigo-600
                  px-6 py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-indigo-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-auto
                "
              >
                {importing && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {importing ? 'Importing...' : 'Execute Import'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Result */}
        {step === 4 && importResult && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                Import Completed
              </h3>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Summary of processed records
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-800/50">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Total Rows
                </span>

                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {importResult.totalRows ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Created New
                </span>

                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {importResult.imported ??
                    importResult.importedCount ??
                    0}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  Updated
                </span>

                <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                  {importResult.updated ??
                    importResult.updatedCount ??
                    0}
                </p>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Duplicates Skipped
                </span>

                <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                  {importResult.duplicatesSkipped ??
                    importResult.skippedCount ??
                    0}
                </p>
              </div>
            </div>

            {importResult.errorRows &&
              importResult.errorRows.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50/70 p-4 dark:border-red-800/40 dark:bg-red-900/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />

                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                          Some rows could not be imported
                        </p>

                        <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
                          {importResult.errorRows.length} error
                          {importResult.errorRows.length !== 1
                            ? 's'
                            : ''}{' '}
                          found.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        downloadImportErrorsApi(
                          importResult.errorRows
                        )
                      }
                      className="
                        inline-flex
                        w-full
                        items-center
                        justify-center
                        gap-1.5
                        rounded-xl
                        bg-red-600
                        px-4 py-2.5
                        text-xs
                        font-semibold
                        text-white
                        transition-colors
                        hover:bg-red-500
                        sm:w-auto
                      "
                    >
                      <Download className="h-4 w-4" />
                      Download Error Report
                    </button>
                  </div>
                </div>
              )}

            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetWizard}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border border-gray-200
                  bg-white
                  px-5 py-2.5
                  text-sm
                  font-semibold
                  text-gray-700
                  transition-all
                  hover:bg-gray-50
                  dark:border-gray-700
                  dark:bg-gray-900
                  dark:text-gray-300
                  dark:hover:bg-gray-800
                  sm:w-auto
                "
              >
                <RefreshCw className="h-4 w-4" />
                Import Another File
              </button>

              <button
                type="button"
                onClick={handleModalClose}
                className="
                  w-full
                  rounded-xl
                  bg-indigo-600
                  px-5 py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-indigo-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/30
                  sm:w-auto
                "
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