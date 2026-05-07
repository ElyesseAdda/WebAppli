"""
URL configuration for Application project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/dev/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from frontend.views import FrontendAppView


urlpatterns = [
    # Route SPA explicite pour éviter le 404 Django admin sur /admin/agences
    path('admin/agences', FrontendAppView.as_view(), name='admin-agences-spa'),
    path('admin/agences/', FrontendAppView.as_view(), name='admin-agences-spa-slash'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('',include('frontend.urls')),

]
