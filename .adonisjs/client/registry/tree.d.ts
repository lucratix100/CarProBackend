/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
    passwordResets: {
      store: typeof routes['auth.password_resets.store']
      show: typeof routes['auth.password_resets.show']
      update: typeof routes['auth.password_resets.update']
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
      changePassword: typeof routes['profile.profile.change_password']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  push: {
    pushSubscriptions: {
      vapidPublicKey: typeof routes['push.push_subscriptions.vapid_public_key']
      status: typeof routes['push.push_subscriptions.status']
      subscribe: typeof routes['push.push_subscriptions.subscribe']
      unsubscribe: typeof routes['push.push_subscriptions.unsubscribe']
    }
  }
  agencies: {
    agencies: {
      index: typeof routes['agencies.agencies.index']
      store: typeof routes['agencies.agencies.store']
      show: typeof routes['agencies.agencies.show']
      update: typeof routes['agencies.agencies.update']
      destroy: typeof routes['agencies.agencies.destroy']
      logoFile: typeof routes['agencies.agencies.logo_file']
      pendingLogoFile: typeof routes['agencies.agencies.pending_logo_file']
      approveLogo: typeof routes['agencies.agencies.approve_logo']
      rejectLogo: typeof routes['agencies.agencies.reject_logo']
      signatureFile: typeof routes['agencies.agencies.signature_file']
      pendingSignatureFile: typeof routes['agencies.agencies.pending_signature_file']
      approveSignature: typeof routes['agencies.agencies.approve_signature']
      rejectSignature: typeof routes['agencies.agencies.reject_signature']
      inviteAdmin: typeof routes['agencies.agencies.invite_admin']
      resendAdminInvitation: typeof routes['agencies.agencies.resend_admin_invitation']
      reactivateAdmin: typeof routes['agencies.agencies.reactivate_admin']
      revokeAdmin: typeof routes['agencies.agencies.revoke_admin']
    }
  }
  marketplacePublications: {
    marketplacePublications: {
      index: typeof routes['marketplace_publications.marketplace_publications.index']
      boostIndex: typeof routes['marketplace_publications.marketplace_publications.boost_index']
      agencies: typeof routes['marketplace_publications.marketplace_publications.agencies']
      bulkApprove: typeof routes['marketplace_publications.marketplace_publications.bulk_approve']
      photoFile: typeof routes['marketplace_publications.marketplace_publications.photo_file']
      history: typeof routes['marketplace_publications.marketplace_publications.history']
      show: typeof routes['marketplace_publications.marketplace_publications.show']
      approve: typeof routes['marketplace_publications.marketplace_publications.approve']
      reject: typeof routes['marketplace_publications.marketplace_publications.reject']
      unpublish: typeof routes['marketplace_publications.marketplace_publications.unpublish']
      approveBoost: typeof routes['marketplace_publications.marketplace_publications.approve_boost']
      rejectBoost: typeof routes['marketplace_publications.marketplace_publications.reject_boost']
    }
  }
  marketplaceReports: {
    marketplaceReport: {
      index: typeof routes['marketplace_reports.marketplace_report.index']
    }
  }
  partnerApplications: {
    partnerApplications: {
      index: typeof routes['partner_applications.partner_applications.index']
      approve: typeof routes['partner_applications.partner_applications.approve']
      reject: typeof routes['partner_applications.partner_applications.reject']
    }
  }
  homepageBanners: {
    homepageBanners: {
      adminIndex: typeof routes['homepage_banners.homepage_banners.admin_index']
      store: typeof routes['homepage_banners.homepage_banners.store']
      adminImageFile: typeof routes['homepage_banners.homepage_banners.admin_image_file']
      uploadImage: typeof routes['homepage_banners.homepage_banners.upload_image']
      destroyImage: typeof routes['homepage_banners.homepage_banners.destroy_image']
      adminShow: typeof routes['homepage_banners.homepage_banners.admin_show']
      update: typeof routes['homepage_banners.homepage_banners.update']
      destroy: typeof routes['homepage_banners.homepage_banners.destroy']
    }
  }
  owners: {
    owners: {
      index: typeof routes['owners.owners.index']
      store: typeof routes['owners.owners.store']
      statement: typeof routes['owners.owners.statement']
      emailStatement: typeof routes['owners.owners.email_statement']
      account: typeof routes['owners.owners.account']
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
      requestBoost: typeof routes['vehicles.vehicles.request_boost']
      cancelBoost: typeof routes['vehicles.vehicles.cancel_boost']
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
      scanIdentity: typeof routes['clients.clients.scan_identity']
      lookup: typeof routes['clients.clients.lookup']
      uploadLicense: typeof routes['clients.clients.upload_license']
      licenseFile: typeof routes['clients.clients.license_file']
      uploadIdCard: typeof routes['clients.clients.upload_id_card']
      idCardFile: typeof routes['clients.clients.id_card_file']
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
  sales: {
    vehicleSales: {
      index: typeof routes['sales.vehicle_sales.index']
      store: typeof routes['sales.vehicle_sales.store']
      accept: typeof routes['sales.vehicle_sales.accept']
      reject: typeof routes['sales.vehicle_sales.reject']
      markSold: typeof routes['sales.vehicle_sales.mark_sold']
      show: typeof routes['sales.vehicle_sales.show']
    }
  }
  invoices: {
    invoices: {
      index: typeof routes['invoices.invoices.index']
      store: typeof routes['invoices.invoices.store']
      pdf: typeof routes['invoices.invoices.pdf']
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
  complianceDocuments: {
    complianceDocuments: {
      index: typeof routes['complianceDocuments.compliance_documents.index']
      store: typeof routes['complianceDocuments.compliance_documents.store']
      show: typeof routes['complianceDocuments.compliance_documents.show']
      update: typeof routes['complianceDocuments.compliance_documents.update']
      destroy: typeof routes['complianceDocuments.compliance_documents.destroy']
    }
  }
  settings: {
    settings: {
      show: typeof routes['settings.settings.show']
      update: typeof routes['settings.settings.update']
      uploadLogo: typeof routes['settings.settings.upload_logo']
      destroyLogo: typeof routes['settings.settings.destroy_logo']
      logoFile: typeof routes['settings.settings.logo_file']
      pendingLogoFile: typeof routes['settings.settings.pending_logo_file']
      uploadSignature: typeof routes['settings.settings.upload_signature']
      destroySignature: typeof routes['settings.settings.destroy_signature']
      signatureFile: typeof routes['settings.settings.signature_file']
      pendingSignatureFile: typeof routes['settings.settings.pending_signature_file']
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
  staff: {
    staffRoles: {
      catalog: typeof routes['staff.staff_roles.catalog']
      index: typeof routes['staff.staff_roles.index']
      store: typeof routes['staff.staff_roles.store']
      update: typeof routes['staff.staff_roles.update']
    }
    staffCollaborators: {
      index: typeof routes['staff.staff_collaborators.index']
      store: typeof routes['staff.staff_collaborators.store']
      show: typeof routes['staff.staff_collaborators.show']
      update: typeof routes['staff.staff_collaborators.update']
      updateStatus: typeof routes['staff.staff_collaborators.update_status']
      resendInvitation: typeof routes['staff.staff_collaborators.resend_invitation']
      resendPasswordEmail: typeof routes['staff.staff_collaborators.resend_password_email']
    }
  }
  staffCollaborators: {
    myPermissions: typeof routes['staff_collaborators.my_permissions']
  }
  validations: {
    validations: {
      settings: typeof routes['validations.validations.settings']
      updateSettings: typeof routes['validations.validations.update_settings']
      index: typeof routes['validations.validations.index']
      pendingCount: typeof routes['validations.validations.pending_count']
      approve: typeof routes['validations.validations.approve']
      reject: typeof routes['validations.validations.reject']
    }
  }
  activityLogs: {
    activityLogs: {
      index: typeof routes['activity_logs.activity_logs.index']
      forEntity: typeof routes['activity_logs.activity_logs.for_entity']
    }
  }
  ownerPortal: {
    ownerPortal: {
      dashboard: typeof routes['owner_portal.owner_portal.dashboard']
      logoFile: typeof routes['owner_portal.owner_portal.logo_file']
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
      agencyLogo: typeof routes['marketplace.marketplace_catalog.agency_logo']
    }
    homepageBanners: {
      index: typeof routes['marketplace.homepage_banners.index']
      imageFile: typeof routes['marketplace.homepage_banners.image_file']
    }
    marketplaceReview: {
      forVehicle: typeof routes['marketplace.marketplace_review.for_vehicle']
      store: typeof routes['marketplace.marketplace_review.store']
    }
    marketplaceReport: {
      store: typeof routes['marketplace.marketplace_report.store']
    }
    partnerApplications: {
      agencies: typeof routes['marketplace.partner_applications.agencies']
      store: typeof routes['marketplace.partner_applications.store']
      mine: typeof routes['marketplace.partner_applications.mine']
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
    marketplaceSales: {
      index: typeof routes['marketplace.marketplace_sales.index']
      store: typeof routes['marketplace.marketplace_sales.store']
      show: typeof routes['marketplace.marketplace_sales.show']
      cancel: typeof routes['marketplace.marketplace_sales.cancel']
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
