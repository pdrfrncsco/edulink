"""
Configuração para execução local da EduLink fora do Docker.

Uso:
  set DJANGO_SETTINGS_MODULE=config.settings_local   (Windows CMD)
  $env:DJANGO_SETTINGS_MODULE='config.settings_local' (PowerShell)
  export DJANGO_SETTINGS_MODULE=config.settings_local (bash/zsh)

Por padrão utiliza SQLite (`backend/db.sqlite3`) e Celery síncrono (EAGER) em memória.
Para ligar PostgreSQL ou Redis locais via opt-in, defina `USE_LOCAL_POSTGRES=True`
ou `USE_LOCAL_REDIS=True`.
"""

import os
from .settings import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]', '.localhost', '*']

USE_LOCAL_POSTGRES = os.getenv('USE_LOCAL_POSTGRES', 'False').lower() in ('true', '1', 'yes')
if not USE_LOCAL_POSTGRES:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
        }
    }

USE_LOCAL_REDIS = os.getenv('USE_LOCAL_REDIS', 'False').lower() in ('true', '1', 'yes')
if not USE_LOCAL_REDIS:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+memory://'

MEDIA_ROOT = BASE_DIR / 'media'  # noqa: F405
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
