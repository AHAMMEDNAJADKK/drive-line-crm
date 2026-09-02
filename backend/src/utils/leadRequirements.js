const sanitizeRequirement = (item = {}) => {
  const quantity = Number(item.quantity);
  return {
    vehicleName: item.vehicleName ? String(item.vehicleName).trim() : '',
    partName: item.partName ? String(item.partName).trim() : (item.partRequired ? String(item.partRequired).trim() : ''),
    partNumber: item.partNumber ? String(item.partNumber).trim() : '',
    quantity: Number.isFinite(quantity) && quantity >= 1 ? quantity : 1,
    remarks: item.remarks ? String(item.remarks).trim() : ''
  };
};

const buildRequirementsFromLegacy = (data = {}) => {
  const vehicleName = [data.vehicleMake, data.vehicleModel].filter(Boolean).join(' ').trim()
    || (data.vehicleName ? String(data.vehicleName).trim() : '');
  const partName = data.partRequired ? String(data.partRequired).trim() : (data.partName ? String(data.partName).trim() : '');
  if (!vehicleName && !partName && !data.partNumber) return [];
  return [sanitizeRequirement({
    vehicleName,
    partName,
    partNumber: data.partNumber,
    quantity: data.quantity,
    remarks: data.requirementDetails || data.remarks
  })];
};

const normalizeRequirements = (data = {}) => {
  if (Array.isArray(data.requirements)) {
    return data.requirements
      .map(sanitizeRequirement)
      .filter((row) => row.vehicleName || row.partName || row.partNumber);
  }
  return buildRequirementsFromLegacy(data);
};

const syncLegacyRequirementFields = (leadLike) => {
  const first = (leadLike.requirements && leadLike.requirements[0]) || null;
  if (!first) return leadLike;
  leadLike.partRequired = first.partName || leadLike.partRequired || '';
  leadLike.partNumber = first.partNumber || leadLike.partNumber || '';
  leadLike.quantity = first.quantity || leadLike.quantity || 1;
  if (first.vehicleName && !leadLike.vehicleModel) {
    leadLike.vehicleModel = first.vehicleName;
  }
  if (first.remarks && !leadLike.requirementDetails) {
    leadLike.requirementDetails = first.remarks;
  }
  return leadLike;
};

const summarizeRequirements = (lead) => {
  if (lead.requirements && lead.requirements.length) {
    return lead.requirements
      .map((r) => [r.vehicleName, r.partName].filter(Boolean).join(' / '))
      .filter(Boolean)
      .join(', ');
  }
  return [lead.vehicleModel, lead.partRequired].filter(Boolean).join(' / ');
};

module.exports = {
  sanitizeRequirement,
  normalizeRequirements,
  syncLegacyRequirementFields,
  summarizeRequirements
};
