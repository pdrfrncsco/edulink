export { API_BASE, apiJson, type FeedbackState } from './contracts/api';
export type { OnboardingDocumentItem, School, SetupStage } from './contracts/school';
export type { CloudIntegration, ProvisioningLog } from './contracts/provisioning';
export type { AcademicUser } from './contracts/directory';
export type { DNSRecord, DomainConfig } from './contracts/domains';
export type { APDDossier, ParentalConsent } from './contracts/compliance';
export type { ERPConnection, ERPSyncEvent, GlobalVerifierApp } from './contracts/erp';
export type {
  AGTInvoice,
  BenefitOffer,
  BenefitPartner,
  CommercialPlan,
  KwanzaPayment,
  SchoolSubscription,
} from './contracts/billing';
export type { AdminUserProfile } from './contracts/ops';
