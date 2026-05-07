const PURPOSE_RENT = 'rent';
const PURPOSE_SALE = 'sale';
const PURPOSE_LEGACY_SALE = 'sell';
const CURRENCY_TZS = 'TZS';

const VIEWING_FEE_DUE_STAGE = 'before_viewing';
const AGENT_FEE_DUE_STAGE = 'on_closing';

const isNil = value => value === undefined || value === null;

const clonePlain = value => {
  if (isNil(value)) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
};

const toPlainObject = value => {
  if (isNil(value)) {
    return value;
  }

  if (typeof value.toObject === 'function') {
    return value.toObject();
  }

  return clonePlain(value);
};

const parseBoolean = (value, fieldName) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  throw new Error(`${fieldName} must be a boolean`);
};

const parseNumber = (value, fieldName, options = {}) => {
  const { minimum = undefined, integer = false, allowNull = false, positive = false } = options;

  if (allowNull && (value === '' || isNil(value))) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (integer && !Number.isInteger(numericValue)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  if (minimum !== undefined && numericValue < minimum) {
    throw new Error(`${fieldName} must be at least ${minimum}`);
  }

  if (positive && numericValue <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }

  return numericValue;
};

export const normalizePurpose = purpose => {
  if (typeof purpose !== 'string') {
    return purpose;
  }

  const normalized = purpose.trim().toLowerCase();

  if (normalized === PURPOSE_LEGACY_SALE) {
    return PURPOSE_SALE;
  }

  return normalized;
};

export const isRentPurpose = purpose => normalizePurpose(purpose) === PURPOSE_RENT;

export const isSalePurpose = purpose => normalizePurpose(purpose) === PURPOSE_SALE;

export const parseJsonField = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid ${fieldName} format`);
    }
  }

  return toPlainObject(value);
};

export const normalizeRentalTerms = rawRentalTerms => {
  const rentalTerms = toPlainObject(rawRentalTerms);

  if (!rentalTerms || typeof rentalTerms !== 'object') {
    throw new Error('rentalTerms are required for rent properties');
  }

  const minimumAdvanceMonths = parseNumber(
    rentalTerms.minimumAdvanceMonths,
    'minimumAdvanceMonths',
    { minimum: 1, integer: true }
  );

  const viewingFeeInput = rentalTerms.viewingFee || {};
  const viewingFeeRequired = parseBoolean(
    viewingFeeInput.required ?? false,
    'viewingFee.required'
  );

  let viewingFeeAmount = 0;
  if (viewingFeeRequired) {
    viewingFeeAmount = parseNumber(viewingFeeInput.amount, 'viewingFee.amount', { minimum: 0 });
  } else if (!isNil(viewingFeeInput.amount) && Number(viewingFeeInput.amount) < 0) {
    throw new Error('viewingFee.amount must be at least 0');
  }

  const agentFeeInput = rentalTerms.agentFee || {};
  const agentFeeRequired = parseBoolean(
    agentFeeInput.required ?? true,
    'agentFee.required'
  );

  const agentFeeMode = String(agentFeeInput.mode ?? '').trim().toLowerCase() || 'one_month_rent';
  if (!['fixed', 'one_month_rent'].includes(agentFeeMode)) {
    throw new Error('agentFee.mode must be fixed or one_month_rent');
  }

  if (!agentFeeRequired) {
    throw new Error('agentFee.mode must be fixed or one_month_rent');
  }

  let agentFeeAmount = null;
  if (agentFeeMode === 'fixed') {
    if (agentFeeInput.amount === undefined || agentFeeInput.amount === null || agentFeeInput.amount === '') {
      throw new Error('agentFee.amount is required when agentFee.mode is fixed');
    }

    agentFeeAmount = parseNumber(agentFeeInput.amount, 'agentFee.amount', { positive: true });
  } else if (!isNil(agentFeeInput.amount) && agentFeeInput.amount !== '') {
    const providedAmount = parseNumber(agentFeeInput.amount, 'agentFee.amount', { minimum: 0 });
    if (providedAmount < 0) {
      throw new Error('agentFee.amount must be at least 0');
    }
  }

  const notes =
    rentalTerms.notes === undefined || rentalTerms.notes === null || rentalTerms.notes === ''
      ? null
      : String(rentalTerms.notes).trim();

  const parsedTermsVersion = rentalTerms.termsVersion === undefined || rentalTerms.termsVersion === null
    ? 1
    : parseNumber(rentalTerms.termsVersion, 'termsVersion', { minimum: 1, integer: true });

  return {
    minimumAdvanceMonths,
    viewingFee: {
      required: viewingFeeRequired,
      amount: viewingFeeRequired ? viewingFeeAmount : 0,
      currency: CURRENCY_TZS,
      dueStage: VIEWING_FEE_DUE_STAGE,
    },
    agentFee: {
      required: true,
      mode: agentFeeMode,
      amount: agentFeeMode === 'fixed' ? agentFeeAmount : null,
      currency: CURRENCY_TZS,
      dueStage: AGENT_FEE_DUE_STAGE,
    },
    notes,
    termsVersion: parsedTermsVersion,
  };
};

export const buildPricingSummary = ({ purpose, price, rentalTerms }) => {
  if (!isRentPurpose(purpose)) {
    return undefined;
  }

  const monthlyRent = parseNumber(price, 'price', { minimum: 0 });
  const normalizedRentalTerms = normalizeRentalTerms(rentalTerms);

  const advanceRentTotal = monthlyRent * normalizedRentalTerms.minimumAdvanceMonths;
  const viewingFeeTotal = normalizedRentalTerms.viewingFee.required
    ? normalizedRentalTerms.viewingFee.amount
    : 0;
  const agentFeeTotal = normalizedRentalTerms.agentFee.mode === 'one_month_rent'
    ? monthlyRent
    : normalizedRentalTerms.agentFee.amount || 0;

  return {
    monthlyRent,
    minimumAdvanceMonths: normalizedRentalTerms.minimumAdvanceMonths,
    advanceRentTotal,
    viewingFeeTotal,
    agentFeeTotal,
    estimatedMoveInTotal: advanceRentTotal + viewingFeeTotal + agentFeeTotal,
    currency: CURRENCY_TZS,
  };
};

const comparableCommercialTerms = propertyLike => {
  if (!propertyLike || !isRentPurpose(propertyLike.purpose)) {
    return null;
  }

  const normalizedRentalTerms = normalizeRentalTerms(propertyLike.rentalTerms);

  return {
    price: parseNumber(propertyLike.price, 'price', { minimum: 0 }),
    rentalTerms: {
      minimumAdvanceMonths: normalizedRentalTerms.minimumAdvanceMonths,
      viewingFee: normalizedRentalTerms.viewingFee,
      agentFee: normalizedRentalTerms.agentFee,
      notes: normalizedRentalTerms.notes,
    },
  };
};

export const hasRentalCommercialChange = (previousProperty, nextProperty) => {
  const previousComparable = comparableCommercialTerms(previousProperty);
  const nextComparable = comparableCommercialTerms(nextProperty);

  return JSON.stringify(previousComparable) !== JSON.stringify(nextComparable);
};

export const normalizePropertyCommercialState = ({ purpose, price, rentalTerms, existingProperty = null }) => {
  const normalizedPurpose = normalizePurpose(purpose);

  if (![PURPOSE_RENT, PURPOSE_SALE].includes(normalizedPurpose)) {
    throw new Error('Invalid purpose value. Use rent or sale');
  }

  const normalizedPrice = parseNumber(price, 'price', { minimum: 0 });

  if (normalizedPurpose === PURPOSE_SALE) {
    if (!isNil(rentalTerms)) {
      throw new Error('rentalTerms are only allowed for sale properties');
    }

    return {
      purpose: normalizedPurpose,
      price: normalizedPrice,
      rentalTerms: undefined,
      pricingSummary: undefined,
      commercialTermsChanged: !existingProperty || normalizePurpose(existingProperty.purpose) !== PURPOSE_SALE || Number(existingProperty.price) !== normalizedPrice,
    };
  }

  const normalizedRentalTerms = normalizeRentalTerms(rentalTerms);

  const commercialTermsChanged = !existingProperty || hasRentalCommercialChange(existingProperty, {
    purpose: normalizedPurpose,
    price: normalizedPrice,
    rentalTerms: normalizedRentalTerms,
  });

  const existingTermsVersion = existingProperty?.rentalTerms?.termsVersion || 1;
  normalizedRentalTerms.termsVersion = existingProperty
    ? commercialTermsChanged
      ? existingTermsVersion + 1
      : existingTermsVersion
    : 1;

  return {
    purpose: normalizedPurpose,
    price: normalizedPrice,
    rentalTerms: normalizedRentalTerms,
    pricingSummary: buildPricingSummary({
      purpose: normalizedPurpose,
      price: normalizedPrice,
      rentalTerms: normalizedRentalTerms,
    }),
    commercialTermsChanged,
  };
};

export const serializeProperty = property => {
  const plainProperty = toPlainObject(property);

  if (!plainProperty) {
    return plainProperty;
  }

  plainProperty.purpose = normalizePurpose(plainProperty.purpose);

  if (isRentPurpose(plainProperty.purpose)) {
    if (plainProperty.rentalTerms) {
      plainProperty.rentalTerms = normalizeRentalTerms(plainProperty.rentalTerms);
    }

    if (plainProperty.rentalTerms) {
      plainProperty.pricingSummary = buildPricingSummary({
        purpose: plainProperty.purpose,
        price: plainProperty.price,
        rentalTerms: plainProperty.rentalTerms,
      });
    }
  } else {
    delete plainProperty.rentalTerms;
    delete plainProperty.pricingSummary;
  }

  return plainProperty;
};

export const validateClientAcknowledgement = ({ property, clientAcknowledgement }) => {
  if (!isRentPurpose(property?.purpose) || !property?.rentalTerms) {
    return null;
  }

  if (!clientAcknowledgement || typeof clientAcknowledgement !== 'object') {
    throw new Error('This property requires acknowledgement of rental terms before inquiry');
  }

  const normalizedAcknowledgement = {
    acceptedViewingFee: property.rentalTerms.viewingFee.required
      ? parseBoolean(clientAcknowledgement.acceptedViewingFee, 'clientAcknowledgement.acceptedViewingFee')
      : false,
    acceptedMinimumAdvanceMonths: parseBoolean(
      clientAcknowledgement.acceptedMinimumAdvanceMonths,
      'clientAcknowledgement.acceptedMinimumAdvanceMonths'
    ),
    acceptedAgentFee: property.rentalTerms.agentFee.required
      ? parseBoolean(clientAcknowledgement.acceptedAgentFee, 'clientAcknowledgement.acceptedAgentFee')
      : false,
  };

  if (
    normalizedAcknowledgement.acceptedMinimumAdvanceMonths !== true ||
    (property.rentalTerms.viewingFee.required && normalizedAcknowledgement.acceptedViewingFee !== true) ||
    (property.rentalTerms.agentFee.required && normalizedAcknowledgement.acceptedAgentFee !== true)
  ) {
    throw new Error('This property requires acknowledgement of rental terms before inquiry');
  }

  return normalizedAcknowledgement;
};

export const buildCommercialSnapshot = ({ property, clientId, clientAcknowledgement, acknowledgedAt = new Date() }) => {
  if (!isRentPurpose(property?.purpose) || !property?.rentalTerms) {
    return null;
  }

  const rentalTerms = normalizeRentalTerms(property.rentalTerms);
  const pricingSummary = buildPricingSummary({
    purpose: property.purpose,
    price: property.price,
    rentalTerms,
  });

  return {
    monthlyRent: Number(property.price),
    rentalTerms,
    pricingSummary,
    acknowledgedAt,
    acknowledgedByClientId: clientId,
    acknowledgedTermsVersion: rentalTerms.termsVersion,
    clientAcknowledgement: clonePlain(clientAcknowledgement),
  };
};

export const COMMERCIAL_CONSTANTS = {
  PURPOSE_RENT,
  PURPOSE_SALE,
  PURPOSE_LEGACY_SALE,
  CURRENCY_TZS,
  VIEWING_FEE_DUE_STAGE,
  AGENT_FEE_DUE_STAGE,
};