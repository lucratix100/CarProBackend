/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invitations.invitations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['show']>>>
    }
  }
  'invitations.invitations.accept': {
    methods: ["POST"]
    pattern: '/api/v1/invitations/:token/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').acceptInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').acceptInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'agencies.agencies.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/agencies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['index']>>>
    }
  }
  'agencies.agencies.store': {
    methods: ["POST"]
    pattern: '/api/v1/agencies'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/agency').createAgencyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/agency').createAgencyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'agencies.agencies.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/agencies/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['show']>>>
    }
  }
  'agencies.agencies.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/agencies/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/agency').updateAgencyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/agency').updateAgencyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'agencies.agencies.invite_admin': {
    methods: ["POST"]
    pattern: '/api/v1/agencies/:id/admins'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/agency').inviteAgencyAdminValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/agency').inviteAgencyAdminValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['inviteAdmin']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['inviteAdmin']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'agencies.agencies.resend_admin_invitation': {
    methods: ["POST"]
    pattern: '/api/v1/agencies/:id/admins/:adminId/resend-invitation'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; adminId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['resendAdminInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['resendAdminInvitation']>>>
    }
  }
  'agencies.agencies.revoke_admin': {
    methods: ["DELETE"]
    pattern: '/api/v1/agencies/:id/admins/:adminId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; adminId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['revokeAdmin']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agencies_controller').default['revokeAdmin']>>>
    }
  }
  'marketplace_publications.marketplace_publications.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-publications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/marketplace_publication').listMarketplacePublicationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace_publications.marketplace_publications.agencies': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-publications/agencies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['agencies']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['agencies']>>>
    }
  }
  'marketplace_publications.marketplace_publications.bulk_approve': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace-publications/bulk-approve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace_publication').bulkApproveMarketplacePublicationsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace_publication').bulkApproveMarketplacePublicationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['bulkApprove']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['bulkApprove']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace_publications.marketplace_publications.photo_file': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-publications/:id/photos/:photoId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['photoFile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['photoFile']>>>
    }
  }
  'marketplace_publications.marketplace_publications.history': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-publications/:id/history'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['history']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['history']>>>
    }
  }
  'marketplace_publications.marketplace_publications.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-publications/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['show']>>>
    }
  }
  'marketplace_publications.marketplace_publications.approve': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace-publications/:id/approve'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['approve']>>>
    }
  }
  'marketplace_publications.marketplace_publications.reject': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace-publications/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace_publication').rejectMarketplacePublicationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace_publication').rejectMarketplacePublicationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace_publications.marketplace_publications.unpublish': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace-publications/:id/unpublish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['unpublish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_publications_controller').default['unpublish']>>>
    }
  }
  'marketplace_reports.marketplace_report.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace-reports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/marketplace_publication').listMarketplaceReportsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_report_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_report_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'owners.owners.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owners'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['index']>>>
    }
  }
  'owners.owners.store': {
    methods: ["POST"]
    pattern: '/api/v1/owners'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/owner').createOwnerValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/owner').createOwnerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'owners.owners.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owners/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['show']>>>
    }
  }
  'owners.owners.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/owners/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/owner').updateOwnerValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/owner').updateOwnerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'owners.owners.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/owners/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['destroy']>>>
    }
  }
  'owners.owners.resend_invitation': {
    methods: ["POST"]
    pattern: '/api/v1/owners/:id/resend-invitation'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['resendInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owners_controller').default['resendInvitation']>>>
    }
  }
  'marques.marques.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marques'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['index']>>>
    }
  }
  'marques.marques.store': {
    methods: ["POST"]
    pattern: '/api/v1/marques'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marque').createMarqueValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marque').createMarqueValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marques.marques.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marques/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marques_controller').default['show']>>>
    }
  }
  'modeles.modeles.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/modeles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/modeles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/modeles_controller').default['index']>>>
    }
  }
  'modeles.modeles.store': {
    methods: ["POST"]
    pattern: '/api/v1/modeles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marque').createModeleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marque').createModeleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/modeles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/modeles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicles.vehicles.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['index']>>>
    }
  }
  'vehicles.vehicles.store': {
    methods: ["POST"]
    pattern: '/api/v1/vehicles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle').createVehicleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle').createVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicles.vehicles.expenses': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicles/:id/expenses'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['expenses']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['expenses']>>>
    }
  }
  'vehicles.vehicles.summary': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicles/:id/summary'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['summary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['summary']>>>
    }
  }
  'vehicles.vehicles.upload_photos': {
    methods: ["POST"]
    pattern: '/api/v1/vehicles/:id/photos'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['uploadPhotos']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['uploadPhotos']>>>
    }
  }
  'vehicles.vehicles.photo_file': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicles/:id/photos/:photoId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['photoFile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['photoFile']>>>
    }
  }
  'vehicles.vehicles.destroy_photo': {
    methods: ["DELETE"]
    pattern: '/api/v1/vehicles/:id/photos/:photoId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroyPhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroyPhoto']>>>
    }
  }
  'vehicles.vehicles.submit_marketplace': {
    methods: ["POST"]
    pattern: '/api/v1/vehicles/:id/marketplace/submit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['submitMarketplace']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['submitMarketplace']>>>
    }
  }
  'vehicles.vehicles.unpublish_marketplace': {
    methods: ["POST"]
    pattern: '/api/v1/vehicles/:id/marketplace/unpublish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['unpublishMarketplace']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['unpublishMarketplace']>>>
    }
  }
  'vehicles.vehicles.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['show']>>>
    }
  }
  'vehicles.vehicles.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/vehicles/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle').updateVehicleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle').updateVehicleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicles.vehicles.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/vehicles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicles_controller').default['destroy']>>>
    }
  }
  'vehicle_expenses.vehicle_expenses.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicle-expenses'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['index']>>>
    }
  }
  'vehicle_expenses.vehicle_expenses.store': {
    methods: ["POST"]
    pattern: '/api/v1/vehicle-expenses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle_expense').createVehicleExpenseValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle_expense').createVehicleExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicle_expenses.vehicle_expenses.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicle-expenses/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['show']>>>
    }
  }
  'vehicle_expenses.vehicle_expenses.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/vehicle-expenses/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle_expense').updateVehicleExpenseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle_expense').updateVehicleExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'vehicle_expenses.vehicle_expenses.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/vehicle-expenses/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_expenses_controller').default['destroy']>>>
    }
  }
  'clients.clients.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/clients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['index']>>>
    }
  }
  'clients.clients.store': {
    methods: ["POST"]
    pattern: '/api/v1/clients'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/client').createClientValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/client').createClientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'clients.clients.upload_license': {
    methods: ["POST"]
    pattern: '/api/v1/clients/:id/license'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['uploadLicense']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['uploadLicense']>>>
    }
  }
  'clients.clients.license_file': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/clients/:id/license/:side'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; side: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['licenseFile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['licenseFile']>>>
    }
  }
  'clients.clients.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/clients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['show']>>>
    }
  }
  'clients.clients.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/clients/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/client').updateClientValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/client').updateClientValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'clients.clients.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/clients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/clients_controller').default['destroy']>>>
    }
  }
  'rentals.rentals.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rentals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['index']>>>
    }
  }
  'rentals.rentals.store': {
    methods: ["POST"]
    pattern: '/api/v1/rentals'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').createRentalValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').createRentalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rentals.rentals.contract': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rentals/:id/contract'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['contract']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['contract']>>>
    }
  }
  'rentals.rentals.extend': {
    methods: ["POST"]
    pattern: '/api/v1/rentals/:id/extend'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').extendRentalValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').extendRentalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['extend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['extend']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rentals.rentals.approve': {
    methods: ["POST"]
    pattern: '/api/v1/rentals/:id/approve'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['approve']>>>
    }
  }
  'rentals.rentals.reject': {
    methods: ["POST"]
    pattern: '/api/v1/rentals/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').rejectRentalValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').rejectRentalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rentals.rentals.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rentals/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['show']>>>
    }
  }
  'rentals.rentals.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/rentals/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').updateRentalValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').updateRentalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rentals.rentals.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/rentals/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').cancelRentalValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').cancelRentalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rentals_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoices.invoices.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invoices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['index']>>>
    }
  }
  'invoices.invoices.store': {
    methods: ["POST"]
    pattern: '/api/v1/invoices'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invoice').createInvoiceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/invoice').createInvoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoices.invoice_payments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invoices/:invoiceId/payments'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { invoiceId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['index']>>>
    }
  }
  'invoices.invoice_payments.store': {
    methods: ["POST"]
    pattern: '/api/v1/invoices/:invoiceId/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payment').createPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { invoiceId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payment').createPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoices.invoice_payments.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/invoices/:invoiceId/payments/:paymentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { invoiceId: ParamValue; paymentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoice_payments_controller').default['destroy']>>>
    }
  }
  'invoices.invoices.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/invoices/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['show']>>>
    }
  }
  'invoices.invoices.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/invoices/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invoice').updateInvoiceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/invoice').updateInvoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoices.invoices.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/invoices/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoices_controller').default['destroy']>>>
    }
  }
  'maintenances.maintenances.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/maintenances'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['index']>>>
    }
  }
  'maintenances.maintenances.store': {
    methods: ["POST"]
    pattern: '/api/v1/maintenances'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').createMaintenanceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').createMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maintenances.maintenances.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/maintenances/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['show']>>>
    }
  }
  'maintenances.maintenances.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/maintenances/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').updateMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').updateMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maintenances.maintenances.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/maintenances/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenances_controller').default['destroy']>>>
    }
  }
  'settings.settings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['show']>>>
    }
  }
  'settings.settings.update': {
    methods: ["PATCH"]
    pattern: '/api/v1/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/setting').updateSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/setting').updateSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_notifications.admin_notifications.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin-notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['index']>>>
    }
  }
  'admin_notifications.admin_notifications.unread_count': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin-notifications/unread-count'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['unreadCount']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['unreadCount']>>>
    }
  }
  'admin_notifications.admin_notifications.mark_read': {
    methods: ["PATCH"]
    pattern: '/api/v1/admin-notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['markRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['markRead']>>>
    }
  }
  'admin_notifications.admin_notifications.mark_all_read': {
    methods: ["POST"]
    pattern: '/api/v1/admin-notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['markAllRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_notifications_controller').default['markAllRead']>>>
    }
  }
  'owner_portal.owner_portal.dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['dashboard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['dashboard']>>>
    }
  }
  'owner_portal.owner_portal.vehicles': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/vehicles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicles']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicles']>>>
    }
  }
  'owner_portal.owner_portal.vehicle_expenses': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/vehicles/:id/expenses'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicleExpenses']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicleExpenses']>>>
    }
  }
  'owner_portal.owner_portal.vehicle_summary': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/vehicles/:id/summary'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicleSummary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicleSummary']>>>
    }
  }
  'owner_portal.owner_portal.vehicle': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/vehicles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['vehicle']>>>
    }
  }
  'owner_portal.owner_portal.rentals': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/rentals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['rentals']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['rentals']>>>
    }
  }
  'owner_portal.owner_portal.revenues': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/revenues'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['revenues']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['revenues']>>>
    }
  }
  'owner_portal.owner_portal.notifications': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['notifications']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['notifications']>>>
    }
  }
  'owner_portal.owner_portal.notifications_unread_count': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/owner/notifications/unread-count'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['notificationsUnreadCount']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['notificationsUnreadCount']>>>
    }
  }
  'owner_portal.owner_portal.mark_notification_read': {
    methods: ["PATCH"]
    pattern: '/api/v1/owner/notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['markNotificationRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['markNotificationRead']>>>
    }
  }
  'owner_portal.owner_portal.mark_all_notifications_read': {
    methods: ["POST"]
    pattern: '/api/v1/owner/notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['markAllNotificationsRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_portal_controller').default['markAllNotificationsRead']>>>
    }
  }
  'marketplace.marketplace_catalog.cities': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/cities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['cities']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['cities']>>>
    }
  }
  'marketplace.marketplace_catalog.vehicles': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/vehicles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['vehicles']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['vehicles']>>>
    }
  }
  'marketplace.marketplace_catalog.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/vehicles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['show']>>>
    }
  }
  'marketplace.marketplace_catalog.availability': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/vehicles/:id/availability'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['availability']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['availability']>>>
    }
  }
  'marketplace.marketplace_catalog.photo_file': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/vehicles/:id/photos/:photoId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['photoFile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_catalog_controller').default['photoFile']>>>
    }
  }
  'marketplace.marketplace_review.for_vehicle': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/vehicles/:id/reviews'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_review_controller').default['forVehicle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_review_controller').default['forVehicle']>>>
    }
  }
  'marketplace.marketplace_report.store': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/reports'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceReportValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceReportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_report_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_report_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_auth.sync': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/auth/sync'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceSyncValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceSyncValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['sync']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['sync']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_auth.me': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['me']>>>
    }
  }
  'marketplace.marketplace_auth.update_profile': {
    methods: ["PATCH"]
    pattern: '/api/v1/marketplace/me'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['updateProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_auth.logout': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['logout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_auth_controller').default['logout']>>>
    }
  }
  'marketplace.marketplace_bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['index']>>>
    }
  }
  'marketplace.marketplace_bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').marketplaceBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').marketplaceBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['show']>>>
    }
  }
  'marketplace.marketplace_bookings.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/bookings/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rental').cancelMarketplaceBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rental').cancelMarketplaceBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_review.store': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/bookings/:id/reviews'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceReviewValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceReviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_review_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_review_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_favorite.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/favorites'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['index']>>>
    }
  }
  'marketplace.marketplace_favorite.ids': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/marketplace/favorites/ids'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['ids']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['ids']>>>
    }
  }
  'marketplace.marketplace_favorite.store': {
    methods: ["POST"]
    pattern: '/api/v1/marketplace/favorites'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceFavoriteValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceFavoriteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_favorite.update_notify': {
    methods: ["PATCH"]
    pattern: '/api/v1/marketplace/favorites/:vehicleId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marketplace').marketplaceFavoriteNotifyValidator)>>
      paramsTuple: [ParamValue]
      params: { vehicleId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marketplace').marketplaceFavoriteNotifyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['updateNotify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['updateNotify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'marketplace.marketplace_favorite.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/marketplace/favorites/:vehicleId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { vehicleId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketplace_favorite_controller').default['destroy']>>>
    }
  }
  'cities.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/cities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cities_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cities_controller').default['index']>>>
    }
  }
  'vehicle_types.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/vehicle-types'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vehicle_types_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vehicle_types_controller').default['index']>>>
    }
  }
}
