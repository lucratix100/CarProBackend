/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world', app: 'Profil Car Service API' }
})

router
  .group(() => {
    /**
     * Auth
     */
    router
      .group(() => {
        router.post('login', [controllers.AccessTokens, 'store'])
        router.post('forgot-password', [controllers.PasswordResets, 'store'])
        router.get('reset-password/:token', [controllers.PasswordResets, 'show'])
        router.post('reset-password/:token', [controllers.PasswordResets, 'update'])
      })
      .prefix('auth')
      .as('auth')

    /**
     * Public owner invitation (accept mandate terms + set password)
     */
    router
      .group(() => {
        router.get(':token', [controllers.Invitations, 'show'])
        router.post(':token/accept', [controllers.Invitations, 'accept'])
      })
      .prefix('invitations')
      .as('invitations')

    /**
     * Authenticated account
     */
    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('change-password', [controllers.Profile, 'changePassword'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    /**
     * Super-admin: agencies & agency admins
     */
    router
      .group(() => {
        router.get('/', [controllers.Agencies, 'index'])
        router.post('/', [controllers.Agencies, 'store'])
        router.get('/:id', [controllers.Agencies, 'show'])
        router.patch('/:id', [controllers.Agencies, 'update'])
        router.delete('/:id', [controllers.Agencies, 'destroy'])
        router.get('/:id/logo', [controllers.Agencies, 'logoFile'])
        router.get('/:id/logo/pending', [controllers.Agencies, 'pendingLogoFile'])
        router.post('/:id/logo/approve', [controllers.Agencies, 'approveLogo'])
        router.post('/:id/logo/reject', [controllers.Agencies, 'rejectLogo'])
        router.post('/:id/admins', [controllers.Agencies, 'inviteAdmin'])
        router.post('/:id/admins/:adminId/resend-invitation', [
          controllers.Agencies,
          'resendAdminInvitation',
        ])
        router.delete('/:id/admins/:adminId', [controllers.Agencies, 'revokeAdmin'])
      })
      .prefix('agencies')
      .as('agencies')
      .use([middleware.auth(), middleware.superAdmin()])

    /**
     * Super-admin: marketplace vehicle publications
     */
    router
      .group(() => {
        router.get('/', [controllers.MarketplacePublications, 'index'])
        router.get('/agencies', [controllers.MarketplacePublications, 'agencies'])
        router.post('/bulk-approve', [controllers.MarketplacePublications, 'bulkApprove'])
        router.get('/:id/photos/:photoId', [controllers.MarketplacePublications, 'photoFile'])
        router.get('/:id/history', [controllers.MarketplacePublications, 'history'])
        router.get('/:id', [controllers.MarketplacePublications, 'show'])
        router.post('/:id/approve', [controllers.MarketplacePublications, 'approve'])
        router.post('/:id/reject', [controllers.MarketplacePublications, 'reject'])
        router.post('/:id/unpublish', [controllers.MarketplacePublications, 'unpublish'])
      })
      .prefix('marketplace-publications')
      .as('marketplace_publications')
      .use([middleware.auth(), middleware.superAdmin()])

    router
      .group(() => {
        router.get('/', [controllers.MarketplaceReport, 'index'])
      })
      .prefix('marketplace-reports')
      .as('marketplace_reports')
      .use([middleware.auth(), middleware.superAdmin()])

    /**
     * Partner applications (super-admin: agency + owner; admin: own agency owners)
     */
    router
      .group(() => {
        router.get('/', [controllers.PartnerApplications, 'index'])
        router.post('/:id/approve', [controllers.PartnerApplications, 'approve'])
        router.post('/:id/reject', [controllers.PartnerApplications, 'reject'])
      })
      .prefix('partner-applications')
      .as('partner_applications')
      .use([middleware.auth()])

    /**
     * Super-admin: homepage advertising banners
     */
    router
      .group(() => {
        router.get('/', [controllers.HomepageBanners, 'adminIndex'])
        router.post('/', [controllers.HomepageBanners, 'store'])
        router.get('/:id/image', [controllers.HomepageBanners, 'adminImageFile'])
        router.post('/:id/image', [controllers.HomepageBanners, 'uploadImage'])
        router.delete('/:id/image', [controllers.HomepageBanners, 'destroyImage'])
        router.get('/:id', [controllers.HomepageBanners, 'adminShow'])
        router.patch('/:id', [controllers.HomepageBanners, 'update'])
        router.delete('/:id', [controllers.HomepageBanners, 'destroy'])
      })
      .prefix('homepage-banners')
      .as('homepage_banners')
      .use([middleware.auth(), middleware.superAdmin()])

    /**
     * Admin-only resources (gérant + collaborateurs avec permissions)
     */
    router
      .group(() => {
        router
          .get('/', [controllers.Owners, 'index'])
          .use(middleware.permission({ permission: 'owners.view' }))
        router
          .post('/', [controllers.Owners, 'store'])
          .use(middleware.permission({ permission: 'owners.manage' }))
        router
          .get('/:id/statement', [controllers.Owners, 'statement'])
          .use(middleware.permission({ permission: 'owners.view' }))
        router
          .get('/:id', [controllers.Owners, 'show'])
          .use(middleware.permission({ permission: 'owners.view' }))
        router
          .patch('/:id', [controllers.Owners, 'update'])
          .use(middleware.permission({ permission: 'owners.manage' }))
        router
          .delete('/:id', [controllers.Owners, 'destroy'])
          .use(middleware.permission({ permission: 'owners.manage' }))
        router
          .post('/:id/resend-invitation', [controllers.Owners, 'resendInvitation'])
          .use(middleware.permission({ permission: 'owners.manage' }))
      })
      .prefix('owners')
      .as('owners')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Marques, 'index']).use(
          middleware.permission({ permission: 'vehicles.view' })
        )
        router.post('/', [controllers.Marques, 'store']).use(
          middleware.permission({ permission: 'vehicles.create' })
        )
        router.get('/:id', [controllers.Marques, 'show']).use(
          middleware.permission({ permission: 'vehicles.view' })
        )
      })
      .prefix('marques')
      .as('marques')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Modeles, 'index']).use(
          middleware.permission({ permission: 'vehicles.view' })
        )
        router.post('/', [controllers.Modeles, 'store']).use(
          middleware.permission({ permission: 'vehicles.create' })
        )
      })
      .prefix('modeles')
      .as('modeles')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Vehicles, 'index'])
          .use(middleware.permission({ permission: 'vehicles.view' }))
        router
          .post('/', [controllers.Vehicles, 'store'])
          .use(middleware.permission({ permission: 'vehicles.create' }))
        router
          .get('/:id/expenses', [controllers.Vehicles, 'expenses'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
        router
          .get('/:id/summary', [controllers.Vehicles, 'summary'])
          .use(middleware.permission({ permission: 'vehicles.view' }))
        router
          .post('/:id/photos', [controllers.Vehicles, 'uploadPhotos'])
          .use(middleware.permission({ permission: 'vehicles.manage_documents' }))
        router
          .get('/:id/photos/:photoId', [controllers.Vehicles, 'photoFile'])
          .use(middleware.permission({ permission: 'vehicles.view' }))
        router
          .delete('/:id/photos/:photoId', [controllers.Vehicles, 'destroyPhoto'])
          .use(middleware.permission({ permission: 'vehicles.manage_documents' }))
        router
          .post('/:id/marketplace/submit', [controllers.Vehicles, 'submitMarketplace'])
          .use(middleware.permission({ permission: 'vehicles.update' }))
        router
          .post('/:id/marketplace/unpublish', [controllers.Vehicles, 'unpublishMarketplace'])
          .use(middleware.permission({ permission: 'vehicles.update' }))
        router
          .get('/:id', [controllers.Vehicles, 'show'])
          .use(middleware.permission({ permission: 'vehicles.view' }))
        router
          .patch('/:id', [controllers.Vehicles, 'update'])
          .use(middleware.permission({ permission: 'vehicles.update' }))
        router
          .delete('/:id', [controllers.Vehicles, 'destroy'])
          .use(middleware.permission({ permission: 'vehicles.delete' }))
      })
      .prefix('vehicles')
      .as('vehicles')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.VehicleExpenses, 'index'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
        router
          .post('/', [controllers.VehicleExpenses, 'store'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
        router
          .get('/:id', [controllers.VehicleExpenses, 'show'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
        router
          .patch('/:id', [controllers.VehicleExpenses, 'update'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
        router
          .delete('/:id', [controllers.VehicleExpenses, 'destroy'])
          .use(middleware.permission({ permission: 'reports.expenses' }))
      })
      .prefix('vehicle-expenses')
      .as('vehicle_expenses')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Clients, 'index'])
          .use(middleware.permission({ permission: 'clients.view' }))
        router
          .post('/', [controllers.Clients, 'store'])
          .use(middleware.permission({ permission: 'clients.create' }))
        router
          .post('/scan-identity', [controllers.Clients, 'scanIdentity'])
          .use(middleware.permission({ permission: 'clients.manage_identity' }))
        router
          .get('/lookup', [controllers.Clients, 'lookup'])
          .use(middleware.permission({ permission: 'clients.view' }))
        router
          .post('/:id/license', [controllers.Clients, 'uploadLicense'])
          .use(middleware.permission({ permission: 'clients.manage_identity' }))
        router
          .get('/:id/license/:side', [controllers.Clients, 'licenseFile'])
          .use(middleware.permission({ permission: 'clients.view_documents' }))
        router
          .get('/:id', [controllers.Clients, 'show'])
          .use(middleware.permission({ permission: 'clients.view' }))
        router
          .patch('/:id', [controllers.Clients, 'update'])
          .use(middleware.permission({ permission: 'clients.update' }))
        router
          .delete('/:id', [controllers.Clients, 'destroy'])
          .use(middleware.permission({ permission: 'clients.delete' }))
      })
      .prefix('clients')
      .as('clients')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Rentals, 'index'])
          .use(middleware.permission({ permission: 'rentals.view' }))
        router
          .post('/', [controllers.Rentals, 'store'])
          .use(middleware.permission({ permission: 'rentals.create' }))
        router
          .get('/:id/contract', [controllers.Rentals, 'contract'])
          .use(middleware.permission({ permission: 'rentals.view' }))
        router
          .post('/:id/extend', [controllers.Rentals, 'extend'])
          .use(middleware.permission({ permission: 'rentals.update_dates' }))
        router
          .post('/:id/approve', [controllers.Rentals, 'approve'])
          .use(middleware.permission({ permission: 'rentals.update' }))
        router
          .post('/:id/reject', [controllers.Rentals, 'reject'])
          .use(middleware.permission({ permission: 'rentals.cancel' }))
        router
          .get('/:id', [controllers.Rentals, 'show'])
          .use(middleware.permission({ permission: 'rentals.view' }))
        router
          .patch('/:id', [controllers.Rentals, 'update'])
          .use(middleware.permission({ permission: 'rentals.update' }))
        router
          .delete('/:id', [controllers.Rentals, 'destroy'])
          .use(middleware.permission({ permission: 'rentals.cancel' }))
      })
      .prefix('rentals')
      .as('rentals')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Invoices, 'index'])
          .use(middleware.permission({ permission: 'invoices.view' }))
        router
          .post('/', [controllers.Invoices, 'store'])
          .use(middleware.permission({ permission: 'invoices.create' }))
        router
          .get('/:invoiceId/payments', [controllers.InvoicePayments, 'index'])
          .use(middleware.permission({ permission: 'payments.view' }))
        router
          .post('/:invoiceId/payments', [controllers.InvoicePayments, 'store'])
          .use(middleware.permission({ permission: 'payments.create' }))
        router
          .delete('/:invoiceId/payments/:paymentId', [controllers.InvoicePayments, 'destroy'])
          .use(middleware.permission({ permission: 'payments.cancel' }))
        router
          .get('/:id', [controllers.Invoices, 'show'])
          .use(middleware.permission({ permission: 'invoices.view' }))
        router
          .patch('/:id', [controllers.Invoices, 'update'])
          .use(middleware.permission({ permission: 'invoices.update' }))
        router
          .delete('/:id', [controllers.Invoices, 'destroy'])
          .use(middleware.permission({ permission: 'invoices.cancel' }))
      })
      .prefix('invoices')
      .as('invoices')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Maintenances, 'index'])
          .use(middleware.permission({ permission: 'maintenances.view' }))
        router
          .post('/', [controllers.Maintenances, 'store'])
          .use(middleware.permission({ permission: 'maintenances.create' }))
        router
          .get('/:id', [controllers.Maintenances, 'show'])
          .use(middleware.permission({ permission: 'maintenances.view' }))
        router
          .patch('/:id', [controllers.Maintenances, 'update'])
          .use(middleware.permission({ permission: 'maintenances.update' }))
        router
          .delete('/:id', [controllers.Maintenances, 'destroy'])
          .use(middleware.permission({ permission: 'maintenances.delete' }))
      })
      .prefix('maintenances')
      .as('maintenances')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router
          .get('/', [controllers.Settings, 'show'])
          .use(middleware.permission({ permission: 'settings.view' }))
        router
          .patch('/', [controllers.Settings, 'update'])
          .use(middleware.permission({ permission: 'settings.update' }))
        router
          .post('/logo', [controllers.Settings, 'uploadLogo'])
          .use(middleware.permission({ permission: 'settings.update' }))
        router
          .delete('/logo', [controllers.Settings, 'destroyLogo'])
          .use(middleware.permission({ permission: 'settings.update' }))
        router
          .get('/logo', [controllers.Settings, 'logoFile'])
          .use(middleware.permission({ permission: 'settings.view' }))
        router
          .get('/logo/pending', [controllers.Settings, 'pendingLogoFile'])
          .use(middleware.permission({ permission: 'settings.view' }))
      })
      .prefix('settings')
      .as('settings')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.AdminNotifications, 'index'])
        router.get('/unread-count', [controllers.AdminNotifications, 'unreadCount'])
        router.patch('/:id/read', [controllers.AdminNotifications, 'markRead'])
        router.post('/read-all', [controllers.AdminNotifications, 'markAllRead'])
      })
      .prefix('admin-notifications')
      .as('admin_notifications')
      .use([middleware.auth(), middleware.admin()])

    /**
     * Collaborateurs, rôles, permissions — gérant d’agence uniquement
     */
    router
      .group(() => {
        router.get('/permissions/catalog', [controllers.StaffRoles, 'catalog'])
        router.get('/roles', [controllers.StaffRoles, 'index'])
        router.post('/roles', [controllers.StaffRoles, 'store'])
        router.patch('/roles/:id', [controllers.StaffRoles, 'update'])
        router.get('/collaborators', [controllers.StaffCollaborators, 'index'])
        router.post('/collaborators', [controllers.StaffCollaborators, 'store'])
        router.get('/collaborators/:id', [controllers.StaffCollaborators, 'show'])
        router.patch('/collaborators/:id', [controllers.StaffCollaborators, 'update'])
        router.patch('/collaborators/:id/status', [
          controllers.StaffCollaborators,
          'updateStatus',
        ])
        router.post('/collaborators/:id/resend-invitation', [
          controllers.StaffCollaborators,
          'resendInvitation',
        ])
      })
      .prefix('staff')
      .as('staff')
      .use([middleware.auth(), middleware.admin(), middleware.agencyAdmin()])

    router
      .get('/me/permissions', [controllers.StaffCollaborators, 'myPermissions'])
      .use([middleware.auth(), middleware.admin()])

    /**
     * Validations & paramètres de sécurité — gérant d’agence
     */
    router
      .group(() => {
        router.get('/settings', [controllers.Validations, 'settings'])
        router.put('/settings', [controllers.Validations, 'updateSettings'])
        router.get('/requests', [controllers.Validations, 'index'])
        router.get('/requests/pending-count', [controllers.Validations, 'pendingCount'])
        router.post('/requests/:id/approve', [controllers.Validations, 'approve'])
        router.post('/requests/:id/reject', [controllers.Validations, 'reject'])
      })
      .prefix('validations')
      .as('validations')
      .use([middleware.auth(), middleware.admin(), middleware.agencyAdmin()])

    /**
     * Journal d’activités — lecture seule, gérant d’agence
     */
    router
      .group(() => {
        router.get('/', [controllers.ActivityLogs, 'index'])
        router.get('/entity/:entityType/:entityId', [controllers.ActivityLogs, 'forEntity'])
      })
      .prefix('activity-logs')
      .as('activity_logs')
      .use([middleware.auth(), middleware.admin(), middleware.agencyAdmin()])

    /**
     * Owner read-only portal
     */
    router
      .group(() => {
        router.get('dashboard', [controllers.OwnerPortal, 'dashboard'])
        router.get('logo', [controllers.OwnerPortal, 'logoFile'])
        router.get('vehicles', [controllers.OwnerPortal, 'vehicles'])
        router.get('vehicles/:id/expenses', [controllers.OwnerPortal, 'vehicleExpenses'])
        router.get('vehicles/:id/summary', [controllers.OwnerPortal, 'vehicleSummary'])
        router.get('vehicles/:id', [controllers.OwnerPortal, 'vehicle'])
        router.get('rentals', [controllers.OwnerPortal, 'rentals'])
        router.get('revenues', [controllers.OwnerPortal, 'revenues'])
        router.get('notifications', [controllers.OwnerPortal, 'notifications'])
        router.get('notifications/unread-count', [
          controllers.OwnerPortal,
          'notificationsUnreadCount',
        ])
        router.patch('notifications/:id/read', [
          controllers.OwnerPortal,
          'markNotificationRead',
        ])
        router.post('notifications/read-all', [
          controllers.OwnerPortal,
          'markAllNotificationsRead',
        ])
      })
      .prefix('owner')
      .as('owner_portal')
      .use([middleware.auth(), middleware.owner()])

    /**
     * Marketplace public catalogue (web-client)
     */
    router
      .group(() => {
        router.get('cities', [controllers.MarketplaceCatalog, 'cities'])
        router.get('banners', [controllers.HomepageBanners, 'index'])
        router.get('banners/:id/image', [controllers.HomepageBanners, 'imageFile'])
        router.get('vehicles', [controllers.MarketplaceCatalog, 'vehicles'])
        router.get('vehicles/:id', [controllers.MarketplaceCatalog, 'show'])
        router.get('vehicles/:id/availability', [controllers.MarketplaceCatalog, 'availability'])
        router.get('vehicles/:id/photos/:photoId', [controllers.MarketplaceCatalog, 'photoFile'])
        router.get('agencies/:id/logo', [controllers.MarketplaceCatalog, 'agencyLogo'])
        router.get('vehicles/:id/reviews', [controllers.MarketplaceReview, 'forVehicle'])
        router.post('reports', [controllers.MarketplaceReport, 'store'])
        router.get('partner-agencies', [controllers.PartnerApplications, 'agencies'])
        router.post('auth/sync', [controllers.MarketplaceAuth, 'sync'])
        router
          .group(() => {
            router.get('me', [controllers.MarketplaceAuth, 'me'])
            router.patch('me', [controllers.MarketplaceAuth, 'updateProfile'])
            router.post('logout', [controllers.MarketplaceAuth, 'logout'])
            router.post('partner-applications', [controllers.PartnerApplications, 'store'])
            router.get('partner-applications/mine', [controllers.PartnerApplications, 'mine'])
            router.get('bookings', [controllers.MarketplaceBookings, 'index'])
            router.post('bookings', [controllers.MarketplaceBookings, 'store'])
            router.get('bookings/:id', [controllers.MarketplaceBookings, 'show'])
            router.post('bookings/:id/cancel', [controllers.MarketplaceBookings, 'cancel'])
            router.post('bookings/:id/reviews', [controllers.MarketplaceReview, 'store'])
            router.get('favorites', [controllers.MarketplaceFavorite, 'index'])
            router.get('favorites/ids', [controllers.MarketplaceFavorite, 'ids'])
            router.post('favorites', [controllers.MarketplaceFavorite, 'store'])
            router.patch('favorites/:vehicleId', [controllers.MarketplaceFavorite, 'updateNotify'])
            router.delete('favorites/:vehicleId', [controllers.MarketplaceFavorite, 'destroy'])
          })
          .use(middleware.marketplaceAuth())
      })
      .prefix('marketplace')
      .as('marketplace')

    /**
     * Cities reference (super-admin + shared)
     */
    router
      .get('cities', [controllers.Cities, 'index'])
      .use([middleware.auth(), middleware.superAdmin()])

    /**
     * Vehicle types catalog
     */
    router
      .get('vehicle-types', [controllers.VehicleTypes, 'index'])
      .use([middleware.auth()])

  })
  .prefix('/api/v1')