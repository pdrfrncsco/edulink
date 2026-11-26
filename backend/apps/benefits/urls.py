from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    BenefitCatalogAPIView,
    BenefitOfferViewSet,
    BenefitPartnerViewSet,
    BenefitRedeemAPIView,
    BenefitRedemptionViewSet,
)

app_name = 'benefits'

router = DefaultRouter()
router.register(r'partners', BenefitPartnerViewSet, basename='benefit-partner')
router.register(r'offers', BenefitOfferViewSet, basename='benefit-offer')
router.register(r'redemptions', BenefitRedemptionViewSet, basename='benefit-redemption')

urlpatterns = [
    path('catalog/', BenefitCatalogAPIView.as_view(), name='benefit-catalog'),
    path('redeem/', BenefitRedeemAPIView.as_view(), name='benefit-redeem'),
    path('', include(router.urls)),
]
