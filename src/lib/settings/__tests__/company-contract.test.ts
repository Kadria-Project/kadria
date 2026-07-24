import assert from 'node:assert/strict'
import test from 'node:test'
import { companyPanelStatus } from '../company-contract.ts'

const values = { companyName: '', websiteUrl: '', googleReviewUrl: '', phone: '', notificationEmail: '', adressePro: '', cpPro: '', villePro: '', logoUrl: '', raisonSociale: '', formeJuridique: '', siret: '', tvaNumber: '', tvaAssujetti: true, assureur: '', numAssurance: '', assuranceNonRequise: false, devisMentionLegale: '' }

test('company panel statuses remain conservative for partial data', () => {
  assert.equal(companyPanelStatus('identity', values), 'incomplete')
  assert.equal(companyPanelStatus('branding', values), 'optional')
  assert.equal(companyPanelStatus('legal', { ...values, siret: '123' }), 'complete')
  assert.equal(companyPanelStatus('contact', { ...values, phone: '0102030405' }), 'complete')
})
