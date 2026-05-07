export type PropertyPurpose = 'rent' | 'sale';

export type CurrencyCode = 'TZS';

export type RentalTerms = {
  minimumAdvanceMonths: number;
  viewingFee: {
    required: boolean;
    amount: number;
    currency: CurrencyCode;
    dueStage: 'before_viewing';
  };
  agentFee: {
    required: true;
    mode: 'fixed' | 'one_month_rent';
    amount: number | null;
    currency: CurrencyCode;
    dueStage: 'on_closing';
  };
  notes?: string | null;
  termsVersion: number;
};

export type PricingSummary = {
  monthlyRent: number;
  minimumAdvanceMonths: number;
  advanceRentTotal: number;
  viewingFeeTotal: number;
  agentFeeTotal: number;
  estimatedMoveInTotal: number;
  currency: CurrencyCode;
};

export type PropertyLocation = {
  region: string;
  district: string;
  street?: string;
};

export type PropertyMedia = {
  url: string;
  public_id: string;
  type: 'image' | 'video';
};

export type PropertyRecord = {
  _id: string;
  title: string;
  description: string;
  type: 'office' | 'apartment' | 'house' | 'hotel';
  purpose: PropertyPurpose;
  price: number;
  bedrooms: number;
  area: number;
  location: PropertyLocation;
  cover: {
    url: string;
    public_id: string;
  };
  media: PropertyMedia[];
  ownerId: string;
  ownerUsername: string;
  status: 'available' | 'rented' | 'sold' | 'pending';
  inquiryCount: number;
  rentalTerms?: RentalTerms;
  pricingSummary?: PricingSummary;
  createdAt: string;
  updatedAt: string;
};