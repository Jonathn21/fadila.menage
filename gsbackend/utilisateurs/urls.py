from django.urls import path
from . import views


urlpatterns = [
    path('2fa/toggle/', views.toggle_2fa, name='toggle_2fa'),
  
]
