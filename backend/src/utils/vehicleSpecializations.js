const VEHICLE_SPECIALIZATIONS = [
  'German',
  'Korean',
  'Japanese',
  'Other'
];

const normalizeVehicleSpecialization = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '';

  const cleaned = String(value).trim();

  if (!cleaned) return '';

  const match = VEHICLE_SPECIALIZATIONS.find(
    (item) => item.toLowerCase() === cleaned.toLowerCase()
  );

  if (!match) {
    throw new Error(
      `Invalid vehicle specialization. Allowed values: ${VEHICLE_SPECIALIZATIONS.join(', ')}`
    );
  }

  return match;
};

/**
 * Employees with a specialization only see matching suppliers.
 * Unclassified suppliers (empty specialization) remain visible so
 * existing records continue to work.
 * Employees without a specialization keep full supplier visibility.
 */
const supplierMatchesEmployeeSpecialization = (supplier, user) => {
  if (!user || user.role !== 'employee') return true;

  const employeeSpec = user.vehicleSpecialization;
  if (!employeeSpec) return true;

  const supplierSpec = supplier?.vehicleSpecialization;
  if (!supplierSpec) return true;

  return supplierSpec === employeeSpec;
};

const employeeSupplierQuery = (user) => {
  if (!user || user.role !== 'employee') return {};

  const employeeSpec = user.vehicleSpecialization;
  if (!employeeSpec) return {};

  return {
    $or: [
      { vehicleSpecialization: employeeSpec },
      { vehicleSpecialization: '' },
      { vehicleSpecialization: { $exists: false } },
      { vehicleSpecialization: null }
    ]
  };
};

module.exports = {
  VEHICLE_SPECIALIZATIONS,
  normalizeVehicleSpecialization,
  supplierMatchesEmployeeSpecialization,
  employeeSupplierQuery
};
