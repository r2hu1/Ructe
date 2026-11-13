from django.urls import path
from routing_app.views import (
    AnalyzeView,
    GeocodeAutocompleteView,
    HealthView,
)

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("geocode/autocomplete", GeocodeAutocompleteView.as_view(), name="geocode-autocomplete"),
    path("analyze", AnalyzeView.as_view(), name="analyze"),
]
