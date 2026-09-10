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
     * Admin-only resources
     */
    router
      .group(() => {
        router.get('/', [controllers.Owners, 'index'])
        router.post('/', [controllers.Owners, 'store'])
        router.get('/:id', [controllers.Owners, 'show'])
        router.patch('/:id', [controllers.Owners, 'update'])
        router.delete('/:id', [controllers.Owners, 'destroy'])
        router.post('/:id/resend-invitation', [controllers.Owners, 'resendInvitation'])
      })
      .prefix('owners')
      .as('owners')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Marques, 'index'])
        router.post('/', [controllers.Marques, 'store'])
        router.get('/:id', [controllers.Marques, 'show'])
      })
      .prefix('marques')
      .as('marques')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Modeles, 'index'])
        router.post('/', [controllers.Modeles, 'store'])
      })
      .prefix('modeles')
      .as('modeles')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Vehicles, 'index'])
        router.post('/', [controllers.Vehicles, 'store'])
        router.get('/:id/expenses', [controllers.Vehicles, 'expenses'])
        router.get('/:id/summary', [controllers.Vehicles, 'summary'])
        router.post('/:id/photos', [controllers.Vehicles, 'uploadPhotos'])
        router.get('/:id/photos/:photoId', [controllers.Vehicles, 'photoFile'])
        router.delete('/:id/photos/:photoId', [controllers.Vehicles, 'destroyPhoto'])
        router.post('/:id/marketplace/submit', [controllers.Vehicles, 'submitMarketplace'])
        router.post('/:id/marketplace/unpublish', [controllers.Vehicles, 'unpublishMarketplace'])
        router.get('/:id', [controllers.Vehicles, 'show'])
        router.patch('/:id', [controllers.Vehicles, 'update'])
        router.delete('/:id', [controllers.Vehicles, 'destroy'])
      })
      .prefix('vehicles')
      .as('vehicles')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.VehicleExpenses, 'index'])
        router.post('/', [controllers.VehicleExpenses, 'store'])
        router.get('/:id', [controllers.VehicleExpenses, 'show'])
        router.patch('/:id', [controllers.VehicleExpenses, 'update'])
        router.delete('/:id', [controllers.VehicleExpenses, 'destroy'])
      })
      .prefix('vehicle-expenses')
      .as('vehicle_expenses')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Clients, 'index'])
        router.post('/', [controllers.Clients, 'store'])
        router.post('/:id/license', [controllers.Clients, 'uploadLicense'])
        router.get('/:id/license/:side', [controllers.Clients, 'licenseFile'])
        router.get('/:id', [controllers.Clients, 'show'])
        router.patch('/:id', [controllers.Clients, 'update'])
        router.delete('/:id', [controllers.Clients, 'destroy'])
      })
      .prefix('clients')
      .as('clients')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Rentals, 'index'])
        router.post('/', [controllers.Rentals, 'store'])
        router.get('/:id/contract', [controllers.Rentals, 'contract'])
        router.post('/:id/extend', [controllers.Rentals, 'extend'])
        router.post('/:id/approve', [controllers.Rentals, 'approve'])
        router.post('/:id/reject', [controllers.Rentals, 'reject'])
        router.get('/:id', [controllers.Rentals, 'show'])
        router.patch('/:id', [controllers.Rentals, 'update'])
        router.delete('/:id', [controllers.Rentals, 'destroy'])
      })
      .prefix('rentals')
      .as('rentals')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Invoices, 'index'])
        router.post('/', [controllers.Invoices, 'store'])
        router.get('/:invoiceId/payments', [controllers.InvoicePayments, 'index'])
        router.post('/:invoiceId/payments', [controllers.InvoicePayments, 'store'])
        router.delete('/:invoiceId/payments/:paymentId', [controllers.InvoicePayments, 'destroy'])
        router.get('/:id', [controllers.Invoices, 'show'])
        router.patch('/:id', [controllers.Invoices, 'update'])
        router.delete('/:id', [controllers.Invoices, 'destroy'])
      })
      .prefix('invoices')
      .as('invoices')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Maintenances, 'index'])
        router.post('/', [controllers.Maintenances, 'store'])
        router.get('/:id', [controllers.Maintenances, 'show'])
        router.patch('/:id', [controllers.Maintenances, 'update'])
        router.delete('/:id', [controllers.Maintenances, 'destroy'])
      })
      .prefix('maintenances')
      .as('maintenances')
      .use([middleware.auth(), middleware.admin()])

    router
      .group(() => {
        router.get('/', [controllers.Settings, 'show'])
        router.patch('/', [controllers.Settings, 'update'])
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
     * Owner read-only portal
     */
    router
      .group(() => {
        router.get('dashboard', [controllers.OwnerPortal, 'dashboard'])
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
        router.get('vehicles', [controllers.MarketplaceCatalog, 'vehicles'])
        router.get('vehicles/:id', [controllers.MarketplaceCatalog, 'show'])
        router.get('vehicles/:id/availability', [controllers.MarketplaceCatalog, 'availability'])
        router.get('vehicles/:id/photos/:photoId', [controllers.MarketplaceCatalog, 'photoFile'])
        router.get('vehicles/:id/reviews', [controllers.MarketplaceReview, 'forVehicle'])
        router.post('reports', [controllers.MarketplaceReport, 'store'])
        router.post('auth/sync', [controllers.MarketplaceAuth, 'sync'])
        router
          .group(() => {
            router.get('me', [controllers.MarketplaceAuth, 'me'])
            router.patch('me', [controllers.MarketplaceAuth, 'updateProfile'])
            router.post('logout', [controllers.MarketplaceAuth, 'logout'])
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

  })
  .prefix('/api/v1')
