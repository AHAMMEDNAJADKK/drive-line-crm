const VEHICLE_SPECIALIZATIONS = [
  'German',
  'Korean',
  'Japanese',
  'Other'
];

/**
 * Normalize a vehicle specialization.
 *
 * Existing default values are returned using their standard casing.
 * Custom specializations are also allowed and stored after trimming.
 *
 * Examples:
 *   "german"   -> "German"
 *   "Japanese" -> "Japanese"
 *   "Japan Car" -> "Japan Car"
 */
const normalizeVehicleSpecialization = (value) => {
  if (value === undefined) return undefined;

  if (value === null || value === '') {
    return '';
  }

  const cleaned = String(value).trim();

  if (!cleaned) {
    return '';
  }

  // Preserve the standard casing of existing/default specializations.
  const existingSpecialization = VEHICLE_SPECIALIZATIONS.find(
    (item) => item.toLowerCase() === cleaned.toLowerCase()
  );

  if (existingSpecialization) {
    return existingSpecialization;
  }

  // Allow custom specializations.
  return cleaned;
};

/**
 * Check whether a supplier matches an employee's specialization.
 */
const supplierMatchesEmployeeSpecialization = (supplier, user) => {
  if (!user || user.role !== 'employee') {
    return true;
  }

  const employeeSpec = user.vehicleSpecialization;

  if (!employeeSpec) {
    return true;
  }

  const supplierSpec = supplier?.vehicleSpecialization;

  if (!supplierSpec) {
    return true;
  }

  return supplierSpec === employeeSpec;
};

/**
 * Build the supplier query for employees.
 *
 * Employees can see:
 * - Suppliers matching their specialization
 * - Suppliers without a specialization
 */
const employeeSupplierQuery = (user) => {
  if (!user || user.role !== 'employee') {
    return {};
  }

  const employeeSpec = user.vehicleSpecialization;

  if (!employeeSpec) {
    return {};
  }

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