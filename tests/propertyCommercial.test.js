import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePropertyCommercialState,
  buildCommercialSnapshot,
  serializeProperty,
} from '../utils/propertyCommercial.js';

test('normalizes rent property terms and computes pricing summary', () => {
  const state = normalizePropertyCommercialState({
    purpose: 'rent',
    price: 500000,
    rentalTerms: {
      minimumAdvanceMonths: 6,
      viewingFee: {
        required: true,
        amount: 20000,
      },
      agentFee: {
        required: true,
        mode: 'one_month_rent',
        amount: null,
      },
      notes: 'Viewing fee before visit',
    },
  });

  assert.equal(state.purpose, 'rent');
  assert.equal(state.rentalTerms.termsVersion, 1);
  assert.deepEqual(state.pricingSummary, {
    monthlyRent: 500000,
    minimumAdvanceMonths: 6,
    advanceRentTotal: 3000000,
    viewingFeeTotal: 20000,
    agentFeeTotal: 500000,
    estimatedMoveInTotal: 3520000,
    currency: 'TZS',
  });
});

test('sale properties reject rental terms and legacy sell normalizes to sale', () => {
  assert.throws(() => {
    normalizePropertyCommercialState({
      purpose: 'sale',
      price: 250000000,
      rentalTerms: {
        minimumAdvanceMonths: 6,
        viewingFee: { required: false, amount: 0 },
        agentFee: { required: true, mode: 'one_month_rent', amount: null },
      },
    });
  }, /rentalTerms are only allowed for sale properties/);

  const property = serializeProperty({
    purpose: 'sell',
    price: 250000000,
    status: 'available',
  });

  assert.equal(property.purpose, 'sale');
});

test('rent commercial updates increment terms version when terms change', () => {
  const existingProperty = {
    purpose: 'rent',
    price: 500000,
    rentalTerms: {
      minimumAdvanceMonths: 6,
      viewingFee: {
        required: true,
        amount: 20000,
        currency: 'TZS',
        dueStage: 'before_viewing',
      },
      agentFee: {
        required: true,
        mode: 'one_month_rent',
        amount: null,
        currency: 'TZS',
        dueStage: 'on_closing',
      },
      notes: null,
      termsVersion: 3,
    },
  };

  const updated = normalizePropertyCommercialState({
    purpose: 'rent',
    price: 550000,
    rentalTerms: existingProperty.rentalTerms,
    existingProperty,
  });

  assert.equal(updated.rentalTerms.termsVersion, 4);
  assert.equal(updated.pricingSummary.agentFeeTotal, 550000);
});

test('commercial snapshot remains immutable after property changes', () => {
  const property = {
    _id: 'property-id',
    purpose: 'rent',
    price: 500000,
    rentalTerms: {
      minimumAdvanceMonths: 6,
      viewingFee: {
        required: true,
        amount: 20000,
        currency: 'TZS',
        dueStage: 'before_viewing',
      },
      agentFee: {
        required: true,
        mode: 'one_month_rent',
        amount: null,
        currency: 'TZS',
        dueStage: 'on_closing',
      },
      notes: 'Initial terms',
      termsVersion: 1,
    },
  };

  const snapshot = buildCommercialSnapshot({
    property,
    clientId: 'client-id',
    clientAcknowledgement: {
      acceptedViewingFee: true,
      acceptedMinimumAdvanceMonths: true,
      acceptedAgentFee: true,
    },
  });

  property.price = 650000;
  property.rentalTerms.minimumAdvanceMonths = 12;
  property.rentalTerms.viewingFee.amount = 50000;

  assert.equal(snapshot.monthlyRent, 500000);
  assert.equal(snapshot.rentalTerms.minimumAdvanceMonths, 6);
  assert.equal(snapshot.pricingSummary.estimatedMoveInTotal, 3520000);
});