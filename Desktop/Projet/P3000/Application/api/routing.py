from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/drive/(?P<folder_path>.*)/$', consumers.DriveConsumer.as_asgi()),
]
