from django.urls import path
from planner.views import plan, health

urlpatterns = [
    path('api/plan/', plan),
    path('api/health/', health),
]
