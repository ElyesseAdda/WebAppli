# Configuration Gunicorn pour la production

import multiprocessing

# Nombre de workers
workers = multiprocessing.cpu_count() * 2 + 1

# Type de worker
worker_class = 'sync'

# Port d'écoute
bind = '127.0.0.1:8000'

# Timeout
timeout = 120

# Keep-alive
keepalive = 2

# Max requests
max_requests = 1000
max_requests_jitter = 50

# Logs
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'

# Process name
proc_name = 'p3000_app'

# User et group (à adapter selon votre configuration)
# user = 'www-data'
# group = 'www-data'

# Preload app
preload_app = True

# Daemon
daemon = False
