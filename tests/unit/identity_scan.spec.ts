import { test } from '@japa/runner'
import IdentityScanService from '#services/identity_scan_service'

const service = new IdentityScanService()

test.group('Identity scan document type', () => {
  test('une CNI CEDEAO sépare prénoms et nom', ({ assert }) => {
    const result = service.parseOcrText(`
      REPUBLIQUE DU SENEGAL
      CARTE D'IDENTITE CEDEAO
      Prenoms / Given names
      SERIGNE SALIOU
      Nom / Surname
      NDIAYE
      Date de naissance
      12/03/1990
    `)

    assert.equal(result.documentType, 'cni')
    assert.equal(result.fields.firstNames, 'Serigne Saliou')
    assert.equal(result.fields.lastName, 'Ndiaye')
    assert.equal(result.fields.fullName, 'Serigne Saliou Ndiaye')
    assert.isNull(result.fields.licenseNumber)
  })

  test('un permis n’est pas classé CNI à cause d’une catégorie', ({ assert }) => {
    const result = service.parseOcrText(`
      PERMIS DE CONDUIRE
      NOM PRENOM
      SALIOU NDIAYE
      N° de permis
      SN123456
      Categorie B
      Date d'expiration
      01/06/2030
    `)

    assert.equal(result.documentType, 'driving_license')
    assert.equal(result.fields.licenseNumber, 'SN123456')
    assert.equal(result.fields.licenseExpiresAt, '2030-06-01')
    assert.isNull(result.fields.idCardNumber)
  })

  test('une mention de catégorie seule ne suffit pas à conclure un permis', ({ assert }) => {
    const result = service.parseOcrText(`
      CARTE NATIONALE D'IDENTITE
      Prenoms
      ALIOU
      Nom
      DIOP
      CAT B
    `)

    assert.equal(result.documentType, 'cni')
    assert.isNull(result.fields.licenseNumber)
    assert.isNull(result.fields.licenseCategories)
  })
})
