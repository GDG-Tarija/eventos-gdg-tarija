import { EventRole } from '../../../../models/registration.model';

export interface CertificateItem {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventBannerUrl?: string | null;
  eventDateStart: Date;
  eventDateEnd?: Date | null;
  eventRole: EventRole;
  ticketName: string;
  checkInDate: Date;
}

export interface CertificateDetailData extends CertificateItem {
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userId?: string;
}
