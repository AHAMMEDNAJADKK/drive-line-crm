import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  Car,
  User,
  ClipboardList,
  Settings2,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  CUSTOMER_TYPES,
  LEAD_SOURCES,
} from '../../utils/constants';

const FIELD_CLASS =
  'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500';

const LABEL_CLASS =
  'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5';

const SECTION_CLASS =
  'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden shadow-sm';

const VEHICLE_OPTIONS = [
  'Toyota',
  'Nissan',
  'Mitsubishi',
  'Honda',
  'Hyundai',
  'Kia',
  'Ford',
  'Chevrolet',
  'Mercedes-Benz',
  'BMW',
  'Volkswagen',
  'Audi',
  'Lexus',
  'Land Rover',
  'Jeep',
  'Isuzu',
  'Suzuki',
  'Mazda',
  'Other',
];

const PART_OPTIONS = [
  'Brake Pad',
  'Brake Disc',
  'Brake Shoe',
  'Oil Filter',
  'Air Filter',
  'Fuel Filter',
  'Cabin Filter',
  'Clutch Plate',
  'Clutch Cover',
  'Clutch Bearing',
  'Timing Belt',
  'Drive Belt',
  'Water Pump',
  'Radiator',
  'Alternator',
  'Starter Motor',
  'Battery',
  'Shock Absorber',
  'Wheel Bearing',
  'Control Arm',
  'Ball Joint',
  'Tie Rod',
  'Engine Mount',
  'AC Compressor',
  'AC Filter',
  'Headlight',
  'Tail Light',
  'Side Mirror',
  'Bumper',
  'Other',
];

const createEmptyRequirement = (
  vehicleName = '',
  vehicleModel = ''
) => ({
  vehicleName,
  vehicleModel,
  partName: '',
  partNumber: '',
  quantity: 1,
  remarks: '',
});

const normalizeRequirementsForForm = (initialData = {}) => {
  if (
    Array.isArray(initialData.requirements) &&
    initialData.requirements.length > 0
  ) {
    return initialData.requirements.map((item) => ({
      vehicleName:
        item?.vehicleName ||
        initialData.vehicleMake ||
        '',

      vehicleModel:
        item?.vehicleModel ||
        initialData.vehicleModel ||
        '',

      partName:
        item?.partName ||
        '',

      partNumber:
        item?.partNumber ||
        '',

      quantity:
        Number(item?.quantity) > 0
          ? Number(item.quantity)
          : 1,

      remarks:
        item?.remarks ||
        '',
    }));
  }

  const hasLegacyRequirement =
    initialData.vehicleMake ||
    initialData.vehicleModel ||
    initialData.partRequired ||
    initialData.partNumber ||
    initialData.quantity ||
    initialData.requirementDetails;

  if (hasLegacyRequirement) {
    return [
      {
        vehicleName:
          initialData.vehicleMake || '',

        vehicleModel:
          initialData.vehicleModel || '',

        partName:
          initialData.partRequired || '',

        partNumber:
          initialData.partNumber || '',

        quantity:
          Number(initialData.quantity) > 0
            ? Number(initialData.quantity)
            : 1,

        remarks:
          initialData.requirementDetails || '',
      },
    ];
  }

  return [createEmptyRequirement()];
};

/*
 * Searchable Vehicle / Part dropdown.
 *
 * This component is intentionally outside LeadForm.
 * Its component identity therefore remains stable between
 * LeadForm renders.
 */
function SearchableSelect({
  value = '',
  options = [],
  placeholder = 'Select',
  searchPlaceholder = 'Type to search...',
  onChange,
  className = '',
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(query)
    );
  }, [options, search]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
        setSearch('');
        setHighlightedIndex(0);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const openDropdown = () => {
    setOpen(true);
    setSearch('');
    setHighlightedIndex(0);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const selectOption = (option) => {
    onChange(option);
    setSearch('');
    setHighlightedIndex(0);
    setOpen(false);
  };

  const clearValue = (event) => {
    event.preventDefault();
    event.stopPropagation();

    onChange('');
    setSearch('');
    setHighlightedIndex(0);
    setOpen(false);
  };

  const closeDropdown = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setOpen(false);
    setSearch('');
    setHighlightedIndex(0);
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;

    setSearch(nextValue);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (
        event.key === 'Enter' ||
        event.key === 'ArrowDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openDropdown();
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (filteredOptions.length === 0) {
        return;
      }

      setHighlightedIndex((current) =>
        current >= filteredOptions.length - 1
          ? 0
          : current + 1
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (filteredOptions.length === 0) {
        return;
      }

      setHighlightedIndex((current) =>
        current <= 0
          ? filteredOptions.length - 1
          : current - 1
      );

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (filteredOptions.length > 0) {
        const selectedOption =
          filteredOptions[highlightedIndex] ||
          filteredOptions[0];

        selectOption(selectedOption);
      }

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();

      setOpen(false);
      setSearch('');
      setHighlightedIndex(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      {!open ? (
        <button
          type="button"
          onClick={openDropdown}
          onKeyDown={handleKeyDown}
          className={`${FIELD_CLASS} appearance-none pr-9 text-left ${
            value
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-500'
          }`}
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          {value || placeholder}

          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            placeholder={
              value
                ? `Current: ${value}`
                : searchPlaceholder
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`${FIELD_CLASS} pl-9 pr-9`}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
          />

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={closeDropdown}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close dropdown"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {open && (
        <div
          className="absolute z-50 mt-1.5 left-0 right-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(
                (option, optionIndex) => {
                  const isHighlighted =
                    optionIndex ===
                    highlightedIndex;

                  const isSelected =
                    option === value;

                  return (
                    <button
                      key={option}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() =>
                        selectOption(option)
                      }
                      onMouseEnter={() =>
                        setHighlightedIndex(
                          optionIndex
                        )
                      }
                      className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors ${
                        isHighlighted
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                      } ${
                        isSelected
                          ? 'font-semibold'
                          : ''
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{option}</span>

                        {isSelected && (
                          <span className="text-xs text-indigo-500">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                }
              )
            ) : (
              <div className="px-3.5 py-3 text-sm text-gray-500 dark:text-gray-400">
                No matching options found.
              </div>
            )}
          </div>

          {value && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-1">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={clearValue}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
 * IMPORTANT FOCUS FIX
 *
 * Field MUST remain outside LeadForm.
 *
 * Previously Field was declared inside LeadForm.
 * Every keystroke changed form state -> LeadForm rendered again
 * -> Field received a new component identity
 * -> input was remounted
 * -> browser focus was lost.
 *
 * This component is now stable and receives the current
 * value/change handler through props.
 */
function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  options,
  children,
  value = '',
  onChange,
  error = '',
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>
        {label}

        {required && (
          <span className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </label>

      {children ||
        (options ? (
          <select
            value={value || ''}
            onChange={onChange}
            className={`${FIELD_CLASS} ${
              error
                ? 'border-red-400 focus:ring-red-400'
                : ''
            }`}
          >
            {options.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className={`${FIELD_CLASS} ${
              error
                ? 'border-red-400 focus:ring-red-400'
                : ''
            }`}
          />
        ))}

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default function LeadForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  isNew = false,
}) {
  const [form, setForm] = useState({
    mobileNumber: '',
    customerName: '',
    alternateMobileNumber: '',
    companyName: '',
    customerType: 'Other',
    location: '',

    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',

    partRequired: '',
    partNumber: '',
    quantity: 1,

    requirementDetails: '',

    source: 'Phone',
    status: 'New',
    priority: 'Medium',
    assignedTo: '',
    nextFollowUpDate: '',
    remarks: '',
    lostReason: '',

    ...initialData,
  });

  const [requirements, setRequirements] =
    useState(() =>
      normalizeRequirementsForForm(initialData)
    );

  const [employees, setEmployees] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (
      initialData &&
      Object.keys(initialData).length > 0
    ) {
      setForm((prev) => ({
        ...prev,
        ...initialData,

        assignedTo:
          initialData.assignedTo?._id ||
          initialData.assignedTo ||
          '',

        nextFollowUpDate:
          initialData.nextFollowUpDate
            ? new Date(
                initialData.nextFollowUpDate
              )
                .toISOString()
                .slice(0, 10)
            : '',
      }));

      setRequirements(
        normalizeRequirementsForForm(initialData)
      );
    }
  }, [initialData?._id]);

  useEffect(() => {
    getActiveEmployeesApi()
      .then((res) => {
        setEmployees(res.data?.data || []);
      })
      .catch(() => {
        setEmployees([]);
      });
  }, []);

  const set = (field) => (e) => {
    const value =
      e.target.type === 'number'
        ? Number(e.target.value)
        : e.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const updateRequirement = (
    index,
    field,
    value
  ) => {
    setRequirements((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setErrors((prev) => ({
      ...prev,
      [`requirement_${index}_${field}`]: '',
    }));
  };

  const addRequirement = () => {
    const last =
      requirements[requirements.length - 1];

    setRequirements((prev) => [
      ...prev,
      createEmptyRequirement(
        last?.vehicleName || '',
        last?.vehicleModel || ''
      ),
    ]);
  };

  const removeRequirement = (index) => {
    if (requirements.length === 1) {
      setRequirements([
        createEmptyRequirement(),
      ]);
      return;
    }

    setRequirements((prev) =>
      prev.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const validateRequirements = () => {
    const requirementErrors = {};

    requirements.forEach((item, index) => {
      const hasAnyValue =
        item.vehicleName?.trim() ||
        item.vehicleModel?.trim() ||
        item.partName?.trim() ||
        item.partNumber?.trim() ||
        item.remarks?.trim();

      if (!hasAnyValue) {
        requirementErrors[
          `requirement_${index}_partName`
        ] =
          'Add at least one vehicle or part detail';
      }

      if (
        item.quantity &&
        Number(item.quantity) < 1
      ) {
        requirementErrors[
          `requirement_${index}_quantity`
        ] =
          'Quantity must be at least 1';
      }
    });

    return requirementErrors;
  };

  const validate = () => {
    const errs = {};

    if (!form.mobileNumber?.trim()) {
      errs.mobileNumber =
        'Mobile number is required';
    }

    const requirementErrors =
      validateRequirements();

    Object.assign(errs, requirementErrors);

    if (
      form.status === 'Lost' &&
      !form.lostReason?.trim()
    ) {
      errs.lostReason =
        'Lost reason is required';
    }

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errs = validate();

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const first =
      requirements[0] ||
      createEmptyRequirement();

    const payload = {
      ...form,

      requirements: requirements.map(
        (item) => ({
          vehicleName:
            item.vehicleName?.trim() || '',

          vehicleModel:
            item.vehicleModel?.trim() || '',

          partName:
            item.partName?.trim() || '',

          partNumber:
            item.partNumber?.trim() || '',

          quantity:
            Number(item.quantity) > 0
              ? Number(item.quantity)
              : 1,

          remarks:
            item.remarks?.trim() || '',
        })
      ),

      vehicleMake:
        first.vehicleName?.trim() ||
        form.vehicleMake ||
        '',

      vehicleModel:
        first.vehicleModel?.trim() ||
        form.vehicleModel ||
        '',

      partRequired:
        first.partName?.trim() ||
        form.partRequired ||
        '',

      partNumber:
        first.partNumber?.trim() ||
        form.partNumber ||
        '',

      quantity:
        Number(first.quantity) > 0
          ? Number(first.quantity)
          : 1,

      requirementDetails:
        form.requirementDetails || '',
    };

    onSubmit(payload);
  };

  const totalQuantity = useMemo(
    () =>
      requirements.reduce(
        (total, item) =>
          total +
          (Number(item.quantity) > 0
            ? Number(item.quantity)
            : 0),
        0
      ),
    [requirements]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* CUSTOMER DETAILS */}
      <section className={SECTION_CLASS}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <User className="w-4.5 h-4.5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Customer Details
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Customer contact and business information
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field
              label="Customer Name"
              name="customerName"
              value={form.customerName}
              onChange={set('customerName')}
              error={errors.customerName}
              placeholder="Enter customer name"
            />

            <Field
              label="Mobile Number"
              name="mobileNumber"
              value={form.mobileNumber}
              onChange={set('mobileNumber')}
              error={errors.mobileNumber}
              placeholder="+91 98765 43210"
              required
            />

            <Field
              label="Alternate Mobile"
              name="alternateMobileNumber"
              value={form.alternateMobileNumber}
              onChange={set(
                'alternateMobileNumber'
              )}
              error={
                errors.alternateMobileNumber
              }
              placeholder="+91 87654 32109"
            />

            <Field
              label="Company / Workshop"
              name="companyName"
              value={form.companyName}
              onChange={set('companyName')}
              error={errors.companyName}
              placeholder="ABC Motors"
            />

            <Field
              label="Customer Type"
              name="customerType"
              value={form.customerType}
              onChange={set('customerType')}
              error={errors.customerType}
              options={CUSTOMER_TYPES}
            />

            <Field
              label="Location"
              name="location"
              value={form.location}
              onChange={set('location')}
              error={errors.location}
              placeholder="Malappuram, Kerala"
            />
          </div>
        </div>
      </section>

      {/* VEHICLE & PART REQUIREMENTS */}
      <section className={SECTION_CLASS}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ClipboardList className="w-4.5 h-4.5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Vehicle & Part Requirements
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Add all required vehicles and parts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addRequirement}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* DESKTOP */}
          <div className="hidden lg:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
            <div className="grid grid-cols-[40px_1.05fr_1.05fr_1.4fr_1fr_90px_44px] gap-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                #
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Vehicle
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Model
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Part
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Part Number
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Quantity
              </div>

              <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">
                Remove
              </div>
            </div>

            {requirements.map(
              (item, index) => (
                <div
                  key={`requirement-${index}`}
                  className="grid grid-cols-[40px_1.05fr_1.05fr_1.4fr_1fr_90px_44px] gap-0 border-b last:border-b-0 border-gray-100 dark:border-gray-800 items-center"
                >
                  <div className="px-3 py-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500">
                      {index + 1}
                    </span>
                  </div>

                  <div className="px-2 py-3">
                    <SearchableSelect
                      value={
                        item.vehicleName || ''
                      }
                      options={VEHICLE_OPTIONS}
                      placeholder="Select vehicle"
                      searchPlaceholder="Type vehicle name..."
                      onChange={(value) =>
                        updateRequirement(
                          index,
                          'vehicleName',
                          value
                        )
                      }
                    />
                  </div>

                  <div className="px-2 py-3">
                    <input
                      type="text"
                      value={
                        item.vehicleModel || ''
                      }
                      onChange={(e) =>
                        updateRequirement(
                          index,
                          'vehicleModel',
                          e.target.value
                        )
                      }
                      placeholder="e.g. Corolla"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="px-2 py-3">
                    <SearchableSelect
                      value={
                        item.partName || ''
                      }
                      options={PART_OPTIONS}
                      placeholder="Select part"
                      searchPlaceholder="Type part name..."
                      onChange={(value) =>
                        updateRequirement(
                          index,
                          'partName',
                          value
                        )
                      }
                    />
                  </div>

                  <div className="px-2 py-3">
                    <input
                      type="text"
                      value={
                        item.partNumber || ''
                      }
                      onChange={(e) =>
                        updateRequirement(
                          index,
                          'partNumber',
                          e.target.value
                        )
                      }
                      placeholder="Optional"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="px-2 py-3">
                    <input
                      type="number"
                      min={1}
                      value={
                        item.quantity || 1
                      }
                      onChange={(e) =>
                        updateRequirement(
                          index,
                          'quantity',
                          Math.max(
                            1,
                            Number(
                              e.target.value
                            ) || 1
                          )
                        )
                      }
                      className={`${FIELD_CLASS} text-center`}
                    />
                  </div>

                  <div className="px-2 py-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        removeRequirement(
                          index
                        )
                      }
                      title="Remove line"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* MOBILE / TABLET */}
          <div className="lg:hidden space-y-3">
            {requirements.map(
              (item, index) => (
                <div
                  key={`requirement-mobile-${index}`}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                        {index + 1}
                      </span>

                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Requirement Line
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeRequirement(
                          index
                        )
                      }
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>
                        Vehicle
                      </label>

                      <SearchableSelect
                        value={
                          item.vehicleName || ''
                        }
                        options={VEHICLE_OPTIONS}
                        placeholder="Select vehicle"
                        searchPlaceholder="Type vehicle name..."
                        onChange={(value) =>
                          updateRequirement(
                            index,
                            'vehicleName',
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Vehicle Model
                      </label>

                      <input
                        type="text"
                        value={
                          item.vehicleModel || ''
                        }
                        onChange={(e) =>
                          updateRequirement(
                            index,
                            'vehicleModel',
                            e.target.value
                          )
                        }
                        placeholder="e.g. Innova Crysta"
                        className={FIELD_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Part
                      </label>

                      <SearchableSelect
                        value={
                          item.partName || ''
                        }
                        options={PART_OPTIONS}
                        placeholder="Select part"
                        searchPlaceholder="Type part name..."
                        onChange={(value) =>
                          updateRequirement(
                            index,
                            'partName',
                            value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Part Number
                      </label>

                      <input
                        type="text"
                        value={
                          item.partNumber || ''
                        }
                        onChange={(e) =>
                          updateRequirement(
                            index,
                            'partNumber',
                            e.target.value
                          )
                        }
                        placeholder="Optional"
                        className={FIELD_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Quantity
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={
                          item.quantity || 1
                        }
                        onChange={(e) =>
                          updateRequirement(
                            index,
                            'quantity',
                            Math.max(
                              1,
                              Number(
                                e.target.value
                              ) || 1
                            )
                          )
                        }
                        className={FIELD_CLASS}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>
                        Line Remarks
                      </label>

                      <input
                        type="text"
                        value={
                          item.remarks || ''
                        }
                        onChange={(e) =>
                          updateRequirement(
                            index,
                            'remarks',
                            e.target.value
                          )
                        }
                        placeholder="Optional note for this requirement"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={addRequirement}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Requirement
            </button>

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Lines:{' '}
                <strong className="text-gray-800 dark:text-gray-200">
                  {requirements.length}
                </strong>
              </span>

              <span>
                Total Qty:{' '}
                <strong className="text-gray-800 dark:text-gray-200">
                  {totalQuantity}
                </strong>
              </span>
            </div>
          </div>

          <div className="mt-4">
            <label className={LABEL_CLASS}>
              Overall Requirement Notes
            </label>

            <textarea
              rows={2}
              value={
                form.requirementDetails || ''
              }
              onChange={set(
                'requirementDetails'
              )}
              placeholder="Additional notes about the customer's complete requirement..."
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </section>

      {/* VEHICLE INFORMATION */}
      <section className={SECTION_CLASS}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Car className="w-4.5 h-4.5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Vehicle Information
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Additional vehicle information
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Vehicle Year"
              name="vehicleYear"
              value={form.vehicleYear}
              onChange={set('vehicleYear')}
              error={errors.vehicleYear}
              placeholder="2022"
            />

            <div>
              <label className={LABEL_CLASS}>
                Primary Vehicle
              </label>

              <div className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300">
                <Car className="w-4 h-4 text-gray-400" />

                <span>
                  {requirements[0]
                    ?.vehicleName ||
                  requirements[0]
                    ?.vehicleModel
                    ? `${requirements[0]?.vehicleName || ''}${
                        requirements[0]?.vehicleName &&
                        requirements[0]?.vehicleModel
                          ? ' · '
                          : ''
                      }${
                        requirements[0]
                          ?.vehicleModel || ''
                      }`
                    : 'Not selected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SALES INFORMATION */}
      <section className={SECTION_CLASS}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Settings2 className="w-4.5 h-4.5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Sales Information
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Lead source, assignment and follow-up
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Source"
              name="source"
              value={form.source}
              onChange={set('source')}
              error={errors.source}
              options={LEAD_SOURCES}
            />

            <Field
              label="Status"
              name="status"
              value={form.status}
              onChange={set('status')}
              error={errors.status}
              options={LEAD_STATUSES}
            />

            <Field
              label="Priority"
              name="priority"
              value={form.priority}
              onChange={set('priority')}
              error={errors.priority}
              options={LEAD_PRIORITIES}
            />

            <div>
              <label className={LABEL_CLASS}>
                Assigned Employee
              </label>

              <select
                value={
                  form.assignedTo || ''
                }
                onChange={set('assignedTo')}
                className={FIELD_CLASS}
              >
                <option value="">
                  — Unassigned —
                </option>

                {employees.map(
                  (employee) => (
                    <option
                      key={employee._id}
                      value={employee._id}
                    >
                      {employee.name} (
                      {employee.employeeId})
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>
                Next Follow-up Date
              </label>

              <input
                type="date"
                value={
                  form.nextFollowUpDate || ''
                }
                onChange={set(
                  'nextFollowUpDate'
                )}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>
                Lead Reference
              </label>

              <div className="flex items-center h-[42px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500">
                {isNew
                  ? 'New Lead'
                  : `Editing ${
                      initialData?._id
                        ? initialData._id.slice(
                            -8
                          )
                        : 'Lead'
                    }`}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>
                Remarks
              </label>

              <textarea
                rows={2}
                value={
                  form.remarks || ''
                }
                onChange={set('remarks')}
                placeholder="Any general remarks or notes..."
                className={FIELD_CLASS}
              />
            </div>

            {form.status === 'Lost' && (
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>
                  Lost Reason{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    form.lostReason || ''
                  }
                  onChange={set(
                    'lostReason'
                  )}
                  placeholder="Why was this lead lost?"
                  className={`${FIELD_CLASS} ${
                    errors.lostReason
                      ? 'border-red-400 focus:ring-red-400'
                      : ''
                  }`}
                />

                {errors.lostReason && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.lostReason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">
            {requirements.length}
          </span>{' '}
          requirement line
          {requirements.length !== 1
            ? 's'
            : ''}{' '}
          ·{' '}
          <span className="font-medium">
            {totalQuantity}
          </span>{' '}
          total item
          {totalQuantity !== 1
            ? 's'
            : ''}
        </div>

        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}

            {loading
              ? 'Saving...'
              : isNew
              ? 'Create Lead'
              : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}