# Gunicorn configuration file
bind = "0.0.0.0:8080"
workers = 4
worker_class = "sync"
worker_connections = 1000
keepalive = 5
errorlog = "-"
accesslog = "-"
log_level = "info"