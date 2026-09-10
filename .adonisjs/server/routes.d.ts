import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'invitations.invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'invitations.invitations.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'agencies.agencies.index': { paramsTuple?: []; params?: {} }
    'agencies.agencies.store': { paramsTuple?: []; params?: {} }
    'agencies.agencies.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agencies.agencies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agencies.agencies.invite_admin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agencies.agencies.resend_admin_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'adminId': ParamValue} }
    'agencies.agencies.revoke_admin': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'adminId': ParamValue} }
    'marketplace_publications.marketplace_publications.index': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.agencies': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.bulk_approve': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace_publications.marketplace_publications.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_reports.marketplace_report.index': { paramsTuple?: []; params?: {} }
    'owners.owners.index': { paramsTuple?: []; params?: {} }
    'owners.owners.store': { paramsTuple?: []; params?: {} }
    'owners.owners.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owners.owners.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owners.owners.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owners.owners.resend_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marques.marques.index': { paramsTuple?: []; params?: {} }
    'marques.marques.store': { paramsTuple?: []; params?: {} }
    'marques.marques.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'modeles.modeles.index': { paramsTuple?: []; params?: {} }
    'modeles.modeles.store': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.store': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.upload_photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'vehicles.vehicles.destroy_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'vehicles.vehicles.submit_marketplace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.unpublish_marketplace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.index': { paramsTuple?: []; params?: {} }
    'vehicle_expenses.vehicle_expenses.store': { paramsTuple?: []; params?: {} }
    'vehicle_expenses.vehicle_expenses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.index': { paramsTuple?: []; params?: {} }
    'clients.clients.store': { paramsTuple?: []; params?: {} }
    'clients.clients.upload_license': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.license_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'side': ParamValue} }
    'clients.clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.index': { paramsTuple?: []; params?: {} }
    'rentals.rentals.store': { paramsTuple?: []; params?: {} }
    'rentals.rentals.contract': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.extend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.invoices.store': { paramsTuple?: []; params?: {} }
    'invoices.invoice_payments.index': { paramsTuple: [ParamValue]; params: {'invoiceId': ParamValue} }
    'invoices.invoice_payments.store': { paramsTuple: [ParamValue]; params: {'invoiceId': ParamValue} }
    'invoices.invoice_payments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'invoiceId': ParamValue,'paymentId': ParamValue} }
    'invoices.invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.index': { paramsTuple?: []; params?: {} }
    'maintenances.maintenances.store': { paramsTuple?: []; params?: {} }
    'maintenances.maintenances.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.settings.show': { paramsTuple?: []; params?: {} }
    'settings.settings.update': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.index': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.unread_count': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_notifications.admin_notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.dashboard': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicles': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicle_expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle_summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.rentals': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.revenues': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications_unread_count': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.mark_notification_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.mark_all_notifications_read': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.cities': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.vehicles': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace.marketplace_review.for_vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_report.store': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.sync': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.me': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.update_profile': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.logout': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.store': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_review.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_favorite.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.ids': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.store': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.update_notify': { paramsTuple: [ParamValue]; params: {'vehicleId': ParamValue} }
    'marketplace.marketplace_favorite.destroy': { paramsTuple: [ParamValue]; params: {'vehicleId': ParamValue} }
    'cities.index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'invitations.invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'agencies.agencies.index': { paramsTuple?: []; params?: {} }
    'agencies.agencies.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.index': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.agencies': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace_publications.marketplace_publications.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_reports.marketplace_report.index': { paramsTuple?: []; params?: {} }
    'owners.owners.index': { paramsTuple?: []; params?: {} }
    'owners.owners.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marques.marques.index': { paramsTuple?: []; params?: {} }
    'marques.marques.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'modeles.modeles.index': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'vehicles.vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.index': { paramsTuple?: []; params?: {} }
    'vehicle_expenses.vehicle_expenses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.index': { paramsTuple?: []; params?: {} }
    'clients.clients.license_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'side': ParamValue} }
    'clients.clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.index': { paramsTuple?: []; params?: {} }
    'rentals.rentals.contract': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.invoice_payments.index': { paramsTuple: [ParamValue]; params: {'invoiceId': ParamValue} }
    'invoices.invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.index': { paramsTuple?: []; params?: {} }
    'maintenances.maintenances.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.settings.show': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.index': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.unread_count': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.dashboard': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicles': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicle_expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle_summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.rentals': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.revenues': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications_unread_count': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.cities': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.vehicles': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace.marketplace_review.for_vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_auth.me': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_favorite.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.ids': { paramsTuple?: []; params?: {} }
    'cities.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'invitations.invitations.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'agencies.agencies.index': { paramsTuple?: []; params?: {} }
    'agencies.agencies.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.index': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.agencies': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace_publications.marketplace_publications.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_reports.marketplace_report.index': { paramsTuple?: []; params?: {} }
    'owners.owners.index': { paramsTuple?: []; params?: {} }
    'owners.owners.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marques.marques.index': { paramsTuple?: []; params?: {} }
    'marques.marques.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'modeles.modeles.index': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.index': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'vehicles.vehicles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.index': { paramsTuple?: []; params?: {} }
    'vehicle_expenses.vehicle_expenses.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.index': { paramsTuple?: []; params?: {} }
    'clients.clients.license_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'side': ParamValue} }
    'clients.clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.index': { paramsTuple?: []; params?: {} }
    'rentals.rentals.contract': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.invoice_payments.index': { paramsTuple: [ParamValue]; params: {'invoiceId': ParamValue} }
    'invoices.invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.index': { paramsTuple?: []; params?: {} }
    'maintenances.maintenances.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.settings.show': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.index': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.unread_count': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.dashboard': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicles': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.vehicle_expenses': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle_summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.rentals': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.revenues': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.notifications_unread_count': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.cities': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.vehicles': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_catalog.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.availability': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_catalog.photo_file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'marketplace.marketplace_review.for_vehicle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_auth.me': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_favorite.index': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.ids': { paramsTuple?: []; params?: {} }
    'cities.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'invitations.invitations.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'agencies.agencies.store': { paramsTuple?: []; params?: {} }
    'agencies.agencies.invite_admin': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agencies.agencies.resend_admin_invitation': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'adminId': ParamValue} }
    'marketplace_publications.marketplace_publications.bulk_approve': { paramsTuple?: []; params?: {} }
    'marketplace_publications.marketplace_publications.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace_publications.marketplace_publications.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owners.owners.store': { paramsTuple?: []; params?: {} }
    'owners.owners.resend_invitation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marques.marques.store': { paramsTuple?: []; params?: {} }
    'modeles.modeles.store': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.store': { paramsTuple?: []; params?: {} }
    'vehicles.vehicles.upload_photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.submit_marketplace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.unpublish_marketplace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.store': { paramsTuple?: []; params?: {} }
    'clients.clients.store': { paramsTuple?: []; params?: {} }
    'clients.clients.upload_license': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.store': { paramsTuple?: []; params?: {} }
    'rentals.rentals.extend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.approve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.store': { paramsTuple?: []; params?: {} }
    'invoices.invoice_payments.store': { paramsTuple: [ParamValue]; params: {'invoiceId': ParamValue} }
    'maintenances.maintenances.store': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'owner_portal.owner_portal.mark_all_notifications_read': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_report.store': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.sync': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_auth.logout': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.store': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_review.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_favorite.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'agencies.agencies.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owners.owners.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.settings.update': { paramsTuple?: []; params?: {} }
    'admin_notifications.admin_notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_portal.owner_portal.mark_notification_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_auth.update_profile': { paramsTuple?: []; params?: {} }
    'marketplace.marketplace_favorite.update_notify': { paramsTuple: [ParamValue]; params: {'vehicleId': ParamValue} }
  }
  DELETE: {
    'agencies.agencies.revoke_admin': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'adminId': ParamValue} }
    'owners.owners.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicles.vehicles.destroy_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'vehicles.vehicles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'vehicle_expenses.vehicle_expenses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rentals.rentals.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.invoice_payments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'invoiceId': ParamValue,'paymentId': ParamValue} }
    'invoices.invoices.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenances.maintenances.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'marketplace.marketplace_favorite.destroy': { paramsTuple: [ParamValue]; params: {'vehicleId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}