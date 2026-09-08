from pwdlib import PasswordHash 
from enum import Enum
import re

password_context = PasswordHash.recommended()
def hash_password(password: str) -> str:
    """Safely converts a plain text password into a secure cryptographic hash."""
    password_bytes = password.encode("utf-8")
    
    truncated_bytes = password_bytes[:72]
    
    safe_password_str = truncated_bytes.decode("utf-8", errors="ignore")
    
    return password_context.hash(safe_password_str)

def verify(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored database hash."""
    try:
        return password_context.verify(plain_password, hashed_password)
    except Exception:
        return False

from enum import Enum

DEPARTMENT_TAGS = {
    "billing_and_payments": {
        "payment_failure": ["failed", "declined", "error", "rejected", "transaction"],
        "refund_request": ["refund", "money back", "reimbursement", "return funds"],
        "invoice_issue": ["invoice", "receipt", "bill", "statement", "breakdown"],
        "overcharge": ["overcharged", "double charge", "wrong amount", "hidden fee"],
        "subscription_cycle": ["renewal", "cancel", "upgrade", "downgrade", "tier"],
        "payment_method": ["credit card", "paypal", "stripe", "bank transfer", "wallet"],
        "fraudulent_charge": ["unauthorized charge", "stolen card", "fraud", "not me"],
        "discounts_promos": ["coupon", "promo code", "discount", "voucher", "deal"],
        "grace_period": ["late payment", "overdue", "unpaid", "extension", "past due"],
        "currency_pricing": ["exchange rate", "currency", "usd", "pricing change", "tax"]
    },
    
    "customer_service": {
        "account_closure": ["delete account", "close account", "terminate", "leave"],
        "profile_update": ["change name", "update email", "phone number", "address"],
        "complaint": ["unhappy", "rude", "poor service", "frustrated", "terrible"],
        "feedback": ["suggestion", "feature request", "improvement", "review"],
        "vip_priority": ["enterprise client", "premium user", "vip", "priority support"],
        "language_barrier": ["translation", "spanish", "french", "language", "chinese"],
        "notification_settings": ["spam", "unsubscribe", "email alerts", "sms settings"],
        "escalation": ["manager", "supervisor", "higher up", "transfer"],
        "loyalty_program": ["rewards", "points", "benefits", "perks", "membership"],
        "contact_info": ["hours", "phone number", "office address", "location", "email"]
    },
    
    "general_inquiry": {
        "company_info": ["about us", "who are you", "history", "ceo", "founded"],
        "partnership": ["partner", "affiliate", "collaboration", "b2b", "sponsor"],
        "location_hours": ["opening hours", "holiday schedule", "address", "directions"],
        "careers": ["jobs", "hiring", "internship", "apply", "work with us"],
        "press_media": ["journalist", "interview", "press release", "marketing", "media kit"],
        "documentation": ["whitepaper", "guide", "manual", "terms of service", "api docs"],
        "pricing_sheet": ["how much", "cost", "plans", "quote", "rate card"],
        "events": ["webinar", "conference", "meetup", "workshop", "schedule"],
        "investor_relations": ["funding", "stocks", "shares", "investment", "financial report"],
        "faq_request": ["common questions", "help center", "where to find", "links"]
    },
    
    "human_resources": {
        "payroll": ["salary", "payslip", "bonus", "tax form", "w2", "direct deposit"],
        "benefits_insurance": ["health insurance", "dental", "401k", "medical", "perks"],
        "leave_request": ["pto", "vacation", "sick leave", "maternity", "time off"],
        "onboarding": ["new hire", "training", "contract", "welcome background"],
        "offboarding": ["resignation", "exit interview", "severance", "firing", "quit"],
        "grievance": ["harassment", "dispute", "toxic", "report coworker", "bullying"],
        "performance_review": ["appraisal", "promotion", "evaluation", "feedback", "raise"],
        "attendance": ["clock in", "late", "absence", "timesheet", "hours worked"],
        "policy_violation": ["dress code", "conduct", "warning", "breach of contract"],
        "internal_hiring": ["transfer", "internal role", "promotion application", "move team"]
    },
    
    "it_support": {
        "hardware_issue": ["broken laptop", "monitor dead", "keyboard", "mouse", "printer"],
        "software_install": ["install software", "download", "license key", "adobe", "office365"],
        "vpn_connectivity": ["vpn failed", "remote access", "anyconnect", "forticlient"],
        "wi_fi_network": ["office wifi", "no internet", "slow network", "ethernet", "router"],
        "device_provisioning": ["new laptop setup", "phone setup", "macbook", "workstation"],
        "email_setup": ["outlook config", "mailbox full", "cannot send email", "spam filter"],
        "active_directory": ["account locked", "domain login", "permissions", "access group"],
        "asset_return": ["return laptop", "handover hardware", "equipment return"],
        "printer_copier": ["paper jam", "toner empty", "cannot print", "scanner offline"],
        "os_update": ["windows update", "macos update", "frozen screen", "blue screen"]
    },
    
    "product_support": {
        "feature_explanation": ["how to use", "tutorial", "where is the button", "walkthrough"],
        "ui_bug": ["button misaligned", "broken link", "blank page", "text overlapping"],
        "data_export": ["download csv", "export pdf", "backup data", "report download"],
        "integration_failure": ["api error", "zapier broken", "webhook failed", "sync error"],
        "compatibility": ["safari browser", "mobile app view", "chrome extension", "ios bug"],
        "account_sync": ["data lagging", "not refreshing", "delayed update", "out of sync"],
        "feature_request": ["i wish it had", "add feature", "can you build", "suggestion"],
        "onboarding_tour": ["skip intro", "restart setup", "welcome wizard", "guide"],
        "limit_reached": ["max users", "storage full", "upgrade required", "quota exceeded"],
        "localization": ["time zone wrong", "date format", "metric system", "language bug"]
    },
    
    "returns_and_exchanges": {
        "return_label": ["shipping label", "qr code", "return slip", "how to ship back"],
        "damaged_item": ["broken on arrival", "shattered", "scratched", "defective"],
        "wrong_item_sent": ["not what i ordered", "received wrong size", "different color"],
        "size_exchange": ["too small", "too big", "swap size", "fit issue"],
        "tracking_return": ["did you receive it", "return status", "delivered back"],
        "missing_parts": ["missing pieces", "no manual", "incomplete package", "box empty"],
        "store_credit": ["gift card return", "store credit", "wallet balance", "no cash"],
        "warranty_claim": ["warranty policy", "replacement under warranty", "expired"],
        "return_policy": ["how many days", "can i return", "final sale", "conditions"],
        "restocking_fee": ["fee for return", "deduction", "return cost", "shipping fee"]
    },
    
    "sales_and_pre_sales": {
        "request_demo": ["book a demo", "see product tour", "live walkthrough", "schedule call"],
        "bulk_pricing": ["enterprise discount", "volume licensing", "wholesale", "quantity price"],
        "competitor_compare": ["vs competitor", "compared to", "why choose you", "alternative"],
        "custom_quote": ["rfp", "proposal", "custom plan", "price estimate"],
        "contract_negotiation": ["slas", "legal terms", "msa", "ndas", "contract review"],
        "partnership_inquiry": ["reseller", "distributor", "agency tier", "partner program"],
        "trial_extension": ["extend free trial", "need more time", "trial expired"],
        "feature_availability": ["does it support", "can your tool do", "road map", "upcoming"],
        "sales_callback": ["call me back", "phone sales", "speak to rep", "contact sales"],
        "rfp_submission": ["tender", "bid", "rfp questionnaire", "compliance form"]
    },
    
    "service_outages_and_maintenance": {
        "total_downtime": ["site is down", "error 502", "error 504", "server crashed", "dead"],
        "planned_maintenance": ["scheduled downtime", "maintenance window", "upgrade notice"],
        "database_lag": ["slow queries", "timeout error", "db overload", "slow database"],
        "api_outage": ["endpoint timeout", "api completely down", "connections failing"],
        "cloud_provider_issue": ["aws down", "azure outage", "cloudflare issues", "data center"],
        "degraded_performance": ["extremely slow", "loading spinner", "high latency", "lagging"],
        "third_party_dependency": ["stripe is down", "sendgrid failed", "auth0 issue"],
        "status_page": ["where is status", "is it just me", "system health check"],
        "data_loss_incident": ["records missing", "data corrupted", "tables wiped"],
        "backup_restoration": ["restoring server", "recovery mode", "failover rolled out"]
    },
    
    "technical_support": {
        "authentication_error": ["login failed", "invalid token", "password reset loop", "jwt expired"],
        "cors_issue": ["blocked by cors", "cross origin header", "options preflight"],
        "database_deadlock": ["transaction locked", "psycopg2 deadlock", "connection pool full"],
        "memory_leak": ["out of memory", "oom killer", "ram spike", "high memory usage"],
        "ssl_certificate": ["ssl expired", "untrusted certificate", "https broken", "certbot"],
        "webhook_failure": ["not receiving hooks", "403 forbidden webhook", "payload missing"],
        "dependency_conflict": ["pip install failed", "version mismatch", "pydantic validation error"],
        "environment_variable": ["missing env", "secret key null", "config error"],
        "file_permissions": ["permission denied", "chmod error", "cannot write file", "read only"],
        "background_worker": ["celery queue full", "redis connection lost", "task stuck", "network issue"]
    }
}
