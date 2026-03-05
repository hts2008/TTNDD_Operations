# TTNDD_OPS — DPIA Checklist

## 1. Data Inventory
- [x] Personal data: name, birth date, ID card, address, phone, email, photo
- [x] Guardian data: name, phone, Zalo, relation
- [x] Sensitive data: spiritual logs, ngu gioi assessments, child safety incidents
- [x] Financial data: fee payments, transaction records

## 2. Purpose Limitation
- [x] All data collected for explicit purposes (member management, education tracking)
- [x] No secondary use without consent

## 3. Data Minimization
- [x] Only necessary fields collected per module
- [x] Optional fields clearly marked

## 4. Access Control
- [x] Role-based access (super_admin, admin, user, guest)
- [x] RLS on all tables (org_id isolation)
- [x] Spiritual logs: only member can view own data
- [x] Ngu Gioi: hidden from leaders
- [x] Child safety incidents: designated personnel only

## 5. Data Retention
- [x] Child safety incidents: 90-day retention policy with auto-redaction
- [x] Audit logs: retained indefinitely
- [x] Financial records: retained per legal requirements

## 6. Security Measures
- [x] Encryption in transit (HTTPS/TLS)
- [x] Encryption at rest (Cloud SQL default)
- [x] Rate limiting on API endpoints
- [x] Security headers (HSTS, CSP, X-Frame-Options)
- [x] Input validation (class-validator, Zod)

## 7. Rights of Data Subjects
- [ ] Right to access (export personal data)
- [ ] Right to rectification (update profile)
- [ ] Right to erasure (deactivate account)
- [ ] Right to data portability (CSV export)

## 8. Incident Response
- [x] Incident reporting system (child safety module)
- [x] Escalation engine with SLA
- [x] Tamper-proof audit trail
