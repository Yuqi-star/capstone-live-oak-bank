# config.py
import os

# 获取当前文件的目录
current_dir = os.path.dirname(os.path.abspath(__file__))
# 获取项目根目录
project_root = os.path.dirname(current_dir)

# API Keys
ALPHA_VANTAGE_API_KEY = "H2SU1HEM2F21X9W4"

# Database Config
DB_PATH = os.path.join(project_root, "credit_risk_data.db")
print(f"数据库路径: {DB_PATH}")

# News Config
MAX_NEWS_PER_PAGE = 10

# Default industry list - Only Healthcare and Solar Energy
DEFAULT_INDUSTRIES = [
    "Healthcare",
    "Solar Energy"
]

# Sub-industries for Healthcare and Solar Energy
HEALTHCARE_SUB_INDUSTRIES = [
    "Physician Offices & Specialty Clinics",
    "Home Health Care Services",
    "General Hospitals",
    "Pharmaceutical Manufacturing",
    "Biotechnology R&D",
    "Surgical & Medical Instrument Manufacturing",
    "Health Insurance & Managed Care",
    "Medical Laboratories & Diagnostics"
]

SOLAR_ENERGY_SUB_INDUSTRIES = [
    "Solar Electric Power Generation",
    "Semiconductor & PV Cell Manufacturing",
    "Solar Inverter & Electrical Components",
    "Solar EPC & Construction",
    "Solar Project Financing & Leasing"
]

# User-defined industries will be stored in the database
