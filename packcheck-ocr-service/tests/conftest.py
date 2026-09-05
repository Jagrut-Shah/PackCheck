"""
PackCheck AI - Pytest Configuration and Fixtures.
Adds application root directory to sys.path for clean module resolution.
"""

import sys
from pathlib import Path

# Ensure root packcheck-ocr-service folder is on sys.path
root_dir = Path(__file__).parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
