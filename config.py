# config.py
import os

# Get the directory of the current file
current_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory
project_root = os.path.dirname(current_dir)

# API Keys
ALPHA_VANTAGE_API_KEY = "H2SU1HEM2F21X9W4"

# Database Config
DB_PATH = os.path.join(project_root, "credit_risk_data.db")
print(f"Database path: {DB_PATH}")

# News Config
MAX_NEWS_PER_PAGE = 10

# Default industry list - Healthcare, Solar Energy, Technology, and AI
DEFAULT_INDUSTRIES = [
    "Healthcare",
    "Solar Energy",
    "Technology",
    "AI"
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

# Technology sub-industries
TECHNOLOGY_SUB_INDUSTRIES = [
    "Software Development",
    "Cloud Computing",
    "Cybersecurity",
    "Semiconductor Manufacturing",
    "Consumer Electronics",
    "Enterprise IT Services",
    "Telecommunications",
    "E-commerce & Digital Platforms"
]

# AI sub-industries
AI_SUB_INDUSTRIES = [
    "Machine Learning",
    "Natural Language Processing",
    "Computer Vision",
    "Robotics & Automation",
    "AI Hardware & Chips",
    "AI Research & Development",
    "AI Applications & Services",
    "Generative AI"
]

# User-defined industries will be stored in the database
