/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  invitations: {
    invitations: {
      show: typeof routes['invitations.invitations.show']
      accept: typeof routes['invitations.invitations.accept']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  agencies: {
    agencies: {
      index: typeof routes['agencies.agencies.index']
      store: typeof routes['agencies.agencies.store']
      show: typeof routes['agencies.agencies.show']
      update: typeof routes['agencies.agencies.update']
      inviteAdmin: typeof routes['agencies.agencies.invite_admin']
      resendAdminInvitation: typeof routes['agencies.agencies.resend_admin_invitation']
      revokeAdmin: typeof routes['agencies.agencies.revoke_admin']
    }
  }
  marketplacePublications: {
    marketplacePublications: {
      index: typeof routes['marketplace_publications.marketplace_publications.index']
      agencies: typeof routes['marketplace_publications.marketplace_publications.agencies']
      bulkApprove: typeof routes['marketplace_publications.marketplace_publications.bulk_approve']
      photoFile: typeof routes['marketplace_publications.marketplace_publications.photo_file']
      history: typeof routes['marketplace_publications.marketplace_publications.history']
      show: typeof routes['marketplace_publications.marketplace_publications.show']
      approve: typeof routes['marketplace_publications.marketplace_publications.approve']
      reject: typeof routes['marketplace_publications.marketplace_publications.reject']
      unpublish: typeof routes['marketplace_publications.marketplace_publications.unpublish']
    }
  }
  marketplaceReports: {
    marketplaceReport: {
      index: typeof routes['marketplace_reports.marketplace_report.index']
    }
  }
  owners: {
    owners: {
      index: typeof routes['owners.owners.index']
      store: typeof routes['owners.owners.store']
      show: typeof routes['owners.owners.show']
      update: typeof routes['owners.owners.update']
      destroy: typeof routes['owners.owners.destroy']
      resendInvitation: typeof routes['owners.owners.resend_invitation']
    }
  }
  marques: {
    marques: {
      index: typeof routes['marques.marques.index']
      store: typeof routes['marques.marques.store']
      show: typeof routes['marques.marques.show']
    }
  }
  modeles: {
    modeles: {
      index: typeof routes['modeles.modeles.index']
      store: typeof routes['modeles.modeles.store']
    }
  }
  vehicles: {
    vehicles: {
      index: typeof routes['vehicles.vehicles.index']
      store: typeof routes['vehicles.vehicles.store']
      expenses: typeof routes['vehicles.vehicles.expenses']
      summary: typeof routes['vehicles.vehicles.summary']
      uploadPhotos: typeof routes['vehicles.vehicles.upload_photos']
      photoFile: typeof routes['vehicles.vehicles.photo_file']
      destroyPhoto: typeof routes['vehicles.vehicles.destroy_photo']
      submitMarketplace: typeof routes['vehicles.vehicles.submit_marketplace']
      unpublishMarketplace: typeof routes['vehicles.vehicles.unpublish_marketplace']
      show: typeof routes['vehicles.vehicles.show']
      update: typeof routes['vehicles.vehicles.update']
      destroy: typeof routes['vehicles.vehicles.destroy']
    }
  }
  vehicleExpenses: {
    vehicleExpenses: {
      index: typeof routes['vehicle_expenses.vehicle_expenses.index']
      store: typeof routes['vehicle_expenses.vehicle_expenses.store']
      show: typeof routes['vehicle_expenses.vehicle_expenses.show']
      update: typeof routes['vehicle_expenses.vehicle_expenses.update']
      destroy: typeof routes['vehicle_expenses.vehicle_expenses.destroy']
    }
  }
  clients: {
    clients: {
      index: typeof routes['clients.clients.index']
      store: typeof routes['clients.clients.store']
      uploadLicense: typeof routes['clients.clients.upload_license']
      licenseFile: typeof routes['clients.clients.license_file']
      show: typeof routes['clients.clients.show']
      update: typeof routes['clients.clients.update']
      destroy: typeof routes['clients.clients.destroy']
    }
  }
  rentals: {
    rentals: {
      index: typeof routes['rentals.rentals.index']
      store: typeof routes['rentals.rentals.store']
      contract: typeof routes['rentals.rentals.contract']
      extend: typeof routes['rentals.rentals.extend']
      approve: typeof routes['rentals.rentals.approve']
      reject: typeof routes['rentals.rentals.reject']
      show: typeof routes['rentals.rentals.show']
      update: typeof routes['rentals.rentals.update']
      destroy: typeof routes['rentals.rentals.destroy']
    }
  }
  invoices: {
    invoices: {
      index: typeof routes['invoices.invoices.index']
      store: typeof routes['invoices.invoices.store']
      show: typeof routes['invoices.invoices.show']
      update: typeof routes['invoices.invoices.update']
      destroy: typeof routes['invoices.invoices.destroy']
    }
    invoicePayments: {
      index: typeof routes['invoices.invoice_payments.index']
      store: typeof routes['invoices.invoice_payments.store']
      destroy: typeof routes['invoices.invoice_payments.destroy']
    }
  }
  maintenances: {
    maintenances: {
      index: typeof routes['maintenances.maintenances.index']
      store: typeof routes['maintenances.maintenances.store']
      show: typeof routes['maintenances.maintenances.show']
      update: typeof routes['maintenances.maintenances.update']
      destroy: typeof routes['maintenances.maintenances.destroy']
    }
  }
  settings: {
    settings: {
      show: typeof routes['settings.settings.show']
      update: typeof routes['settings.settings.update']
    }
  }
  adminNotifications: {
    adminNotifications: {
      index: typeof routes['admin_notifications.admin_notifications.index']
      unreadCount: typeof routes['admin_notifications.admin_notifications.unread_count']
      markRead: typeof routes['admin_notifications.admin_notifications.mark_read']
      markAllRead: typeof routes['admin_notifications.admin_notifications.mark_all_read']
    }
  }
  ownerPortal: {
    ownerPortal: {
      dashboard: typeof routes['owner_portal.owner_portal.dashboard']
      vehicles: typeof routes['owner_portal.owner_portal.vehicles']
      vehicleExpenses: typeof routes['owner_portal.owner_portal.vehicle_expenses']
      vehicleSummary: typeof routes['owner_portal.owner_portal.vehicle_summary']
      vehicle: typeof routes['owner_portal.owner_portal.vehicle']
      rentals: typeof routes['owner_portal.owner_portal.rentals']
      revenues: typeof routes['owner_portal.owner_portal.revenues']
      notifications: typeof routes['owner_portal.owner_portal.notifications']
      notificationsUnreadCount: typeof routes['owner_portal.owner_portal.notifications_unread_count']
      markNotificationRead: typeof routes['owner_portal.owner_portal.mark_notification_read']
      markAllNotificationsRead: typeof routes['owner_portal.owner_portal.mark_all_notifications_read']
    }
  }
  marketplace: {
    marketplaceCatalog: {
      cities: typeof routes['marketplace.marketplace_catalog.cities']
      vehicles: typeof routes['marketplace.marketplace_catalog.vehicles']
      show: typeof routes['marketplace.marketplace_catalog.show']
      availability: typeof routes['marketplace.marketplace_catalog.availability']
      photoFile: typeof routes['marketplace.marketplace_catalog.photo_file']
    }
    marketplaceReview: {
      forVehicle: typeof routes['marketplace.marketplace_review.for_vehicle']
      store: typeof routes['marketplace.marketplace_review.store']
    }
    marketplaceReport: {
      store: typeof routes['marketplace.marketplace_report.store']
    }
    marketplaceAuth: {
      sync: typeof routes['marketplace.marketplace_auth.sync']
      me: typeof routes['marketplace.marketplace_auth.me']
      updateProfile: typeof routes['marketplace.marketplace_auth.update_profile']
      logout: typeof routes['marketplace.marketplace_auth.logout']
    }
    marketplaceBookings: {
      index: typeof routes['marketplace.marketplace_bookings.index']
      store: typeof routes['marketplace.marketplace_bookings.store']
      show: typeof routes['marketplace.marketplace_bookings.show']
      cancel: typeof routes['marketplace.marketplace_bookings.cancel']
    }
    marketplaceFavorite: {
      index: typeof routes['marketplace.marketplace_favorite.index']
      ids: typeof routes['marketplace.marketplace_favorite.ids']
      store: typeof routes['marketplace.marketplace_favorite.store']
      updateNotify: typeof routes['marketplace.marketplace_favorite.update_notify']
      destroy: typeof routes['marketplace.marketplace_favorite.destroy']
    }
  }
  cities: {
    index: typeof routes['cities.index']
  }
  vehicleTypes: {
    index: typeof routes['vehicle_types.index']
  }
}
