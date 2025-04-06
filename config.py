# config.py
import os

# Get the directory containing this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# API Keys
ALPHA_VANTAGE_API_KEY = "H2SU1HEM2F21X9W4"

# Database paths
DB_PATH = 'users.db'
CREDIT_RISK_DB_PATH = 'credit_risk.db'
CREDIT_RISK_DATA_DB_PATH = 'credit_risk_data.db'
NEWS_CACHE_FILE = 'news_cache.json'
REPORT_DIR = 'reports'

# News Config
MAX_NEWS_PER_PAGE = 10

# Default industries
DEFAULT_INDUSTRIES = [
    'Healthcare',
    'Solar Energy',
    'Technology',
    'AI'
]

# Sub-industries
HEALTHCARE_SUB_INDUSTRIES = [
    'Home Health Care Services',
    'Hospitals',
    'Medical Laboratories & Research',
    'Nursing Homes',
    'Pharmaceutical'
]

SOLAR_ENERGY_SUB_INDUSTRIES = [
    'Photovoltaic Systems',
    'Solar Panel Manufacturing',
    'Solar Thermal Systems',
    'Energy Storage',
    'Solar Financing'
]

TECHNOLOGY_SUB_INDUSTRIES = [
    'Software Development',
    'Cloud Computing',
    'Cybersecurity',
    'Hardware Manufacturing',
    'E-commerce'
]

AI_SUB_INDUSTRIES = [
    'Machine Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Robotics',
    'AI Infrastructure'
]

# User-defined industries will be stored in the database
