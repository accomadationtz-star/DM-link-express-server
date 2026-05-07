import type { PricingSummary, PropertyPurpose, PropertyRecord, RentalTerms } from './property';

export type ApiSuccessResponse<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiListResponse<T> = ApiSuccessResponse<T[]> & {
  totalPages: number;
  currentPage: number;
  total: number;
};

export type ClientAcknowledgement = {
  acceptedViewingFee: boolean;
  acceptedMinimumAdvanceMonths: boolean;
  acceptedAgentFee: boolean;
};

export type CommercialSnapshot = {
  monthlyRent: number;
  rentalTerms: RentalTerms;
  pricingSummary: PricingSummary;
  acknowledgedAt: string;
  acknowledgedByClientId: string;
  acknowledgedTermsVersion: number;
  clientAcknowledgement: ClientAcknowledgement;
};

export type InquiryRecord = {
  _id: string;
  propertyId: string;
  agentId: string;
  clientId: string;
  propertySnapshot: {
    title: string;
    price: number;
    purpose: PropertyPurpose;
    cover?: {
      url: string;
    };
    location: {
      region: string;
      district: string;
    };
    status?: 'available' | 'rented' | 'sold' | 'pending';
  };
  commercialSnapshot?: CommercialSnapshot | null;
  agentSnapshot: {
    username: string;
    phone?: string;
    phoneNumber?: string;
  };
  clientSnapshot: {
    username: string;
    phone: string;
    phoneNumber?: string;
  };
  message?: string;
  status: 'pending' | 'contacted' | 'booked' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyRequest = Omit<
  PropertyRecord,
  '_id' | 'cover' | 'media' | 'ownerId' | 'ownerUsername' | 'status' | 'inquiryCount' | 'createdAt' | 'updatedAt'
>;

export type CreateInquiryRequest = {
  propertyId: string;
  clientAcknowledgement?: ClientAcknowledgement;
};