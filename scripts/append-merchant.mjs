import { readFileSync, writeFileSync } from 'fs'

const seam = 'src/lib/db.mjs'
const src = readFileSync(seam, 'utf8')
const trimmed = src.replace(/\s+$/, '')
const tail = trimmed.slice(-40)

const block = `


// QPay merchant application intake.
// THIS IS STORAGE-ONLY. It writes the operator's submitted application row to
// our own SQLite as PENDING. It does NOT connect to QPay, does NOT mint a
// merchant_id, does NOT return a fake "approved" status. Real QPay activation
// requires a QPay merchant credential (QPAY_* env) which this sandbox does not
// hold — and we will not pretend it does.
export function createMerchantApplication(f) {
  const db = getDb()
  const required = [
    'entityType', 'lastName', 'firstName', 'registryNo', 'phone',
    'businessActivity', 'businessName', 'integrationSystem', 'email',
    'provinceCity', 'sumDistrict', 'bagKhoroo', 'address',
    'contractName', 'contractPhone', 'contractEmail',
    'financeName', 'financePhone', 'financeEmail',
    'itCompany', 'itEmployeeName', 'itEmail', 'itPhone',
    'bankName', 'bankAccountName', 'bankAccountNo',
  ]
  const missing = required.filter((k) => typeof f[k] !== 'string' || f[k].trim() === '')
  if (missing.length) return { error: 'MISSING_FIELDS', missing }

  const id = 'mapp_' + crypto.randomUUID()
  const insert = db.prepare(\`
    INSERT INTO merchant_applications (
      id, entity_type, last_name, first_name, registry_no, phone,
      business_activity, business_name, integration_system, email,
      province_city, sum_district, bag_khoroo, address,
      contract_name, contract_phone, contract_email,
      finance_name, finance_phone, finance_email,
      it_company, it_employee_name, it_email, it_phone,
      bank_name, bank_account_name, bank_account_no, status, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
      'PENDING', datetime('now'))
  \`)
  db.transaction(() => {
    insert.run(
      id, f.entityType.trim(), f.lastName.trim(), f.firstName.trim(), f.registryNo.trim(), f.phone.trim(),
      f.businessActivity.trim(), f.businessName.trim(), f.integrationSystem.trim(), f.email.trim(),
      f.provinceCity.trim(), f.sumDistrict.trim(), f.bagKhoroo.trim(), f.address.trim(),
      f.contractName.trim(), f.contractPhone.trim(), f.contractEmail.trim(),
      f.financeName.trim(), f.financePhone.trim(), f.financeEmail.trim(),
      f.itCompany.trim(), f.itEmployeeName.trim(), f.itEmail.trim(), f.itPhone.trim(),
      f.bankName.trim(), f.bankAccountName.trim(), f.bankAccountNo.trim(),
    )
  })()
  return { application: { id, status: 'PENDING', createdAt: new Date().toISOString() } }
}
`

if (!tail.endsWith('}')) throw new Error('db.mjs seam not a top-level close-brace: ' + JSON.stringify(tail))
writeFileSync(seam, trimmed + block + '\n')
console.log('APPENDED. db.mjs now ends with:\n' + readFileSync(seam, 'utf8').replace(/\s+$/, '').slice(-80))
