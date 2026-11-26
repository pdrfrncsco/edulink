from django.contrib import admin
from apps.billing.models import AGTInvoice, KwanzaPayment, SchoolSubscription

admin.site.register(SchoolSubscription)
admin.site.register(KwanzaPayment)
admin.site.register(AGTInvoice)
